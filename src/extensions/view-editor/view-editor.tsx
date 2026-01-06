import { Input } from "@/components/ui/input";
import { useStudioContext } from "@/context/driver-provider";
import { useSchema } from "@/context/schema-provider";
import { DatabaseViewSchema, ViewConfig } from "@/drivers/base-driver";
import { produce } from "immer";
import { useCallback, useEffect, useMemo, useState } from "react";
import SchemaNameSelect from "../../components/gui/schema-editor/schema-name-select";
import SqlEditor from "../../components/gui/sql-editor";
import BoardConfigPanel from "./board-config-panel";
import ViewStyleSelector from "./view-style-selector";

interface Props {
  value: DatabaseViewSchema;
  onChange: (value: DatabaseViewSchema) => void;
  viewConfig: ViewConfig;
  onViewConfigChange: (config: ViewConfig) => void;
}

export default function ViewEditor(props: Props) {
  const { value, onChange, viewConfig, onViewConfigChange } = props;
  const { databaseDriver } = useStudioContext();
  const { autoCompleteSchema, schema } = useSchema();
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);

  const extendedAutoCompleteSchema = useMemo(() => {
    const currentSchema = schema[value.schemaName];
    if (!currentSchema) return autoCompleteSchema;

    return autoCompleteSchema;
  }, [autoCompleteSchema, schema, value.schemaName]);

  // Parse SQL to extract column names when statement changes
  const parseColumnsFromStatement = useCallback(async () => {
    if (!value.statement.trim()) {
      setAvailableColumns([]);
      return;
    }

    setIsLoadingColumns(true);
    try {
      // Execute the query with LIMIT 0 to get column headers without data
      const result = await databaseDriver.query(
        `SELECT * FROM (${value.statement}) AS _view_preview LIMIT 0`
      );
      const columns = result.headers.map((h) => h.name);
      setAvailableColumns(columns);

      // Auto-set the first column as groupByColumn if board mode and not set
      if (
        viewConfig.style === "board" &&
        (!viewConfig.boardConfig?.groupByColumn ||
          viewConfig.boardConfig.groupByColumn === "") &&
        columns.length > 0
      ) {
        onViewConfigChange(
          produce(viewConfig, (draft) => {
            if (!draft.boardConfig) {
              draft.boardConfig = { groupByColumn: columns[0] };
            } else {
              draft.boardConfig.groupByColumn = columns[0];
            }
          })
        );
      }
    } catch {
      // If parsing fails, clear columns
      setAvailableColumns([]);
    } finally {
      setIsLoadingColumns(false);
    }
  }, [value.statement, databaseDriver, viewConfig, onViewConfigChange]);

  // Debounce the column parsing when SQL changes
  useEffect(
    () => {
      const timer = setTimeout(() => {
        parseColumnsFromStatement();
      }, 500);
      return () => clearTimeout(timer);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value.statement] // Only depend on statement to avoid infinite loops
  );

  return (
    <>
      <div className="flex flex-col gap-2 px-4 py-2">
        <div className="flex flex-row gap-2">
          <Input
            value={value.name}
            placeholder="View Name"
            onChange={(e) =>
              onChange(
                produce(value, (draft) => {
                  draft.name = e.currentTarget.value;
                })
              )
            }
          />
          <div className="w-[200px]">
            <SchemaNameSelect
              value={value.schemaName}
              onChange={(schemaName) => {
                onChange(
                  produce(value, (draft) => {
                    draft.schemaName = schemaName;
                  })
                );
              }}
            />
          </div>
          <ViewStyleSelector
            value={viewConfig.style}
            onChange={(style) => {
              onViewConfigChange(
                produce(viewConfig, (draft) => {
                  draft.style = style;
                  // Initialize board config when switching to board
                  if (style === "board" && !draft.boardConfig) {
                    draft.boardConfig = {
                      groupByColumn: availableColumns[0] || "",
                    };
                  }
                })
              );
            }}
          />
        </div>

        {viewConfig.style === "board" && (
          <BoardConfigPanel
            columns={availableColumns}
            config={viewConfig.boardConfig || { groupByColumn: "" }}
            onChange={(boardConfig) => {
              onViewConfigChange(
                produce(viewConfig, (draft) => {
                  draft.boardConfig = boardConfig;
                })
              );
            }}
            onRefreshColumns={parseColumnsFromStatement}
            isLoadingColumns={isLoadingColumns}
          />
        )}
      </div>
      <div className="grow overflow-hidden">
        <div className="h-full">
          <SqlEditor
            value={value?.statement ?? ""}
            dialect={databaseDriver.getFlags().dialect}
            schema={extendedAutoCompleteSchema}
            onChange={(newStatement) =>
              onChange(
                produce(value, (draft) => {
                  draft.statement = newStatement;
                })
              )
            }
          />
        </div>
      </div>
    </>
  );
}
