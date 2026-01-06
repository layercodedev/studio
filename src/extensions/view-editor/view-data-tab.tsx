import OpacityLoading from "@/components/gui/loading-opacity";
import { useCurrentTab } from "@/components/gui/windows-tab";
import { useStudioContext } from "@/context/driver-provider";
import { DatabaseViewSchema, ViewConfig } from "@/drivers/base-driver";
import { loadViewConfig } from "@/lib/view-config-service";
import { useCallback, useEffect, useRef, useState } from "react";
import ViewDataDisplay from "./view-data-display";

interface ViewDataTabProps {
  schemaName: string;
  viewName: string;
}

export default function ViewDataTab({ schemaName, viewName }: ViewDataTabProps) {
  const { databaseDriver } = useStudioContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewSchema, setViewSchema] = useState<DatabaseViewSchema | null>(null);
  const [viewConfig, setViewConfig] = useState<ViewConfig>({ style: "table" });
  const [revision, setRevision] = useState(1);
  const { isActiveTab } = useCurrentTab();
  const wasActiveRef = useRef(false);

  const loadView = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load view definition and config in parallel
      const [schema, config] = await Promise.all([
        databaseDriver.view(schemaName, viewName),
        loadViewConfig(databaseDriver, schemaName, viewName),
      ]);

      setViewSchema(schema);
      setViewConfig(config || { style: "table" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [databaseDriver, schemaName, viewName]);

  // Load view on mount and when revision changes
  useEffect(() => {
    loadView();
  }, [loadView, revision]);

  // Auto-refresh when tab becomes active (after being inactive)
  useEffect(() => {
    if (isActiveTab && wasActiveRef.current === false) {
      // Tab just became active, refresh the data
      setRevision((prev) => prev + 1);
    }
    wasActiveRef.current = isActiveTab;
  }, [isActiveTab]);


  if (loading) {
    return <OpacityLoading />;
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <p className="text-red-500">Error loading view: {error}</p>
      </div>
    );
  }

  if (!viewSchema) {
    return null;
  }

  return (
    <ViewDataDisplay
      viewName={viewName}
      schemaName={schemaName}
      viewStatement={viewSchema.statement}
      viewConfig={viewConfig}
      refreshKey={revision}
    />
  );
}
