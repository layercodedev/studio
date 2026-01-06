import { useCommonDialog } from "@/components/common-dialog";
import OpacityLoading from "@/components/gui/loading-opacity";
import { useStudioContext } from "@/context/driver-provider";
import { useSchema } from "@/context/schema-provider";
import { DatabaseViewSchema, ViewConfig } from "@/drivers/base-driver";
import { loadViewConfig, saveViewConfig } from "@/lib/view-config-service";
import { produce } from "immer";
import { isEqual } from "lodash";
import { LucideLoader, LucideSave } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { viewEditorExtensionTab } from ".";
import { ViewController } from "./view-controller";
import ViewEditor from "./view-editor";

export interface ViewTabProps {
  name: string;
  schemaName?: string;
}

const EMPTY_DEFAULT_VIEW: DatabaseViewSchema = {
  name: "",
  statement: "",
  schemaName: "",
};

const DEFAULT_VIEW_CONFIG: ViewConfig = {
  style: "table",
};

export default function ViewTab(props: ViewTabProps) {
  const { showDialog } = useCommonDialog();
  const { refresh: refreshSchema, currentSchemaName } = useSchema();
  const { databaseDriver } = useStudioContext();

  // Determine the effective schema name
  const effectiveSchemaName = useMemo(() => {
    return props.schemaName || currentSchemaName || "";
  }, [props.schemaName, currentSchemaName]);

  // If name is specified, it means the view already exists
  const isEditing = !!props.name;
  const [loading, setLoading] = useState(isEditing);

  // Track the original name for DROP statement when editing
  const [originalName, setOriginalName] = useState(props.name);

  // Loading the initial value
  const [initialValue, setInitialValue] = useState<DatabaseViewSchema>(() => {
    return produce(EMPTY_DEFAULT_VIEW, (draft) => {
      draft.schemaName = effectiveSchemaName;
    });
  });
  const [value, setValue] = useState<DatabaseViewSchema>(initialValue);

  // View config state
  const [initialViewConfig, setInitialViewConfig] =
    useState<ViewConfig>(DEFAULT_VIEW_CONFIG);
  const [viewConfig, setViewConfig] = useState<ViewConfig>(DEFAULT_VIEW_CONFIG);

  const [isExecuting, setIsExecuting] = useState(false);

  const hasChanged =
    !isEqual(initialValue, value) || !isEqual(initialViewConfig, viewConfig);

  // Generate preview script - use originalName for DROP when editing
  const previewScript = useMemo(() => {
    const statements: string[] = [];

    // If editing an existing view, add DROP statement first
    if (originalName) {
      const drop = databaseDriver.dropView(
        value.schemaName || effectiveSchemaName,
        originalName
      );
      statements.push(drop);
    }

    // Always add CREATE statement
    const viewToCreate: DatabaseViewSchema = {
      name: value.name,
      schemaName: value.schemaName || effectiveSchemaName,
      statement: value.statement,
    };
    const create = databaseDriver.createView(viewToCreate);
    statements.push(create);

    return statements;
  }, [value, databaseDriver, originalName, effectiveSchemaName]);

  // Loading the view and its config
  useEffect(() => {
    if (isEditing && effectiveSchemaName) {
      const schemaToUse = effectiveSchemaName;

      setLoading(true);
      Promise.all([
        databaseDriver.view(schemaToUse, props.name),
        loadViewConfig(databaseDriver, schemaToUse, props.name),
      ])
        .then(([viewValue, configValue]) => {
          setValue(viewValue);
          setInitialValue(viewValue);
          setOriginalName(viewValue.name);

          const config = configValue || DEFAULT_VIEW_CONFIG;
          setViewConfig(config);
          setInitialViewConfig(config);
        })
        .catch((error) => {
          console.error("Failed to load view:", error);
        })
        .finally(() => setLoading(false));
    }
  }, [props.name, effectiveSchemaName, databaseDriver, isEditing]);

  const onContinue = useCallback(async () => {
    setIsExecuting(true);

    const schemaToUse = value.schemaName || effectiveSchemaName;

    try {
      if (
        schemaToUse !== currentSchemaName &&
        databaseDriver.getFlags().supportUseStatement
      ) {
        const oldSchemaName = currentSchemaName;
        await databaseDriver.query(
          "USE " + databaseDriver.escapeId(schemaToUse)
        );
        await databaseDriver.transaction(previewScript);
        if (oldSchemaName !== "") {
          await databaseDriver.query(
            "USE " + databaseDriver.escapeId(oldSchemaName)
          );
        }
      } else {
        await databaseDriver.transaction(previewScript);
      }

      // Save the view config after successfully creating/updating the view
      await saveViewConfig(databaseDriver, schemaToUse, value.name, viewConfig);
    } catch (error) {
      console.error("Failed to save view:", error);
      throw error;
    }
  }, [
    currentSchemaName,
    databaseDriver,
    previewScript,
    value.schemaName,
    value.name,
    viewConfig,
    effectiveSchemaName,
  ]);

  const onSave = useCallback(() => {
    // Validate that view name is not empty
    if (!value.name.trim()) {
      showDialog({
        title: "Error",
        content: <p>View name cannot be empty.</p>,
        actions: [],
      });
      return;
    }

    showDialog({
      title: isEditing ? "Edit View" : "Create View",
      content: <p>Are you sure you want to run this change?</p>,
      previewCode: previewScript.join(";\n"),
      actions: [
        {
          text: "Continue",
          icon: isExecuting ? LucideLoader : LucideSave,
          onClick: onContinue,
          onComplete: () => {
            refreshSchema();

            // Update the original name to the new name after successful save
            setOriginalName(value.name);
            setInitialValue(value);
            setInitialViewConfig(viewConfig);

            viewEditorExtensionTab.replace({
              schemaName: value.schemaName || effectiveSchemaName,
              name: value.name,
            });

            setIsExecuting(false);
          },
        },
      ],
    });
  }, [
    showDialog,
    isEditing,
    previewScript,
    isExecuting,
    onContinue,
    refreshSchema,
    value,
    viewConfig,
    effectiveSchemaName,
  ]);

  if (loading) {
    return <OpacityLoading />;
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ViewController
        onSave={onSave}
        onDiscard={() => {
          setValue(initialValue);
          setViewConfig(initialViewConfig);
        }}
        disabled={!hasChanged}
        previewScript={previewScript.join(";\n")}
      />
      <ViewEditor
        value={value}
        onChange={setValue}
        viewConfig={viewConfig}
        onViewConfigChange={setViewConfig}
      />
    </div>
  );
}
