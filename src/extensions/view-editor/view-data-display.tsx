import { KanbanBoard } from "@/components/gui/kanban-board";
import OpacityLoading from "@/components/gui/loading-opacity";
import ResultTable from "@/components/gui/query-result-table";
import { Toolbar } from "@/components/gui/toolbar";
import { Button } from "@/components/orbit/button";
import { useStudioContext } from "@/context/driver-provider";
import { useSchema } from "@/context/schema-provider";
import {
  DatabaseResultSet,
  DatabaseTableSchema,
  ViewConfig,
} from "@/drivers/base-driver";
import { LucideEdit, LucideRefreshCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createTableStateFromResult } from "../../components/gui/table-result/helper";
import { TableHeaderMetadata } from "../../components/gui/table-result/type";
import OptimizeTableState from "../../components/gui/table-optimized/optimize-table-state";
import { viewEditorExtensionTab } from ".";

interface ViewDataDisplayProps {
  viewName: string;
  schemaName: string;
  viewStatement: string;
  viewConfig: ViewConfig;
  onRefresh?: () => void;
  refreshKey?: number;
}

export default function ViewDataDisplay({
  viewName,
  schemaName,
  viewStatement,
  viewConfig,
  onRefresh,
  refreshKey,
}: ViewDataDisplayProps) {
  const { databaseDriver } = useStudioContext();
  const { schema } = useSchema();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DatabaseResultSet | null>(null);
  const [tableSchema, setTableSchema] = useState<DatabaseTableSchema | null>(
    null
  );
  const [tableState, setTableState] =
    useState<OptimizeTableState<TableHeaderMetadata> | null>(null);
  const [revision, setRevision] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Execute the view's statement to get data
      const queryResult = await databaseDriver.query(viewStatement);
      setResult(queryResult);

      // Try to get schema from the underlying view/table
      try {
        const viewSchema = await databaseDriver.tableSchema(
          schemaName,
          viewName
        );
        setTableSchema(viewSchema);
      } catch {
        // Views may not have a schema, create a minimal one from headers
        setTableSchema({
          columns: queryResult.headers.map((h) => ({
            name: h.name,
            type: "TEXT",
          })),
          pk: [],
          autoIncrement: false,
          schemaName,
          tableName: viewName,
          type: "view",
        });
      }

      // Create table state for the table view
      const state = createTableStateFromResult({
        driver: databaseDriver,
        result: queryResult,
        tableSchema: {
          columns: queryResult.headers.map((h) => ({
            name: h.name,
            type: "TEXT",
          })),
          pk: [],
          autoIncrement: false,
          schemaName,
          tableName: viewName,
          type: "view",
        },
        schemas: schema,
      });
      setTableState(state);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [databaseDriver, viewStatement, schemaName, viewName, schema]);

  useEffect(() => {
    loadData();
  }, [loadData, revision, refreshKey]);

  const handleRefresh = useCallback(() => {
    setRevision((r) => r + 1);
  }, []);

  const handleEditView = useCallback(() => {
    viewEditorExtensionTab.open({
      schemaName,
      name: viewName,
    });
  }, [schemaName, viewName]);

  if (loading) {
    return <OpacityLoading />;
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center p-8">
        <p className="text-red-500">Error loading view data:</p>
        <pre className="mt-2 text-sm text-muted-foreground">{error}</pre>
        <Button variant="secondary" onClick={handleRefresh} className="mt-4">
          <LucideRefreshCcw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-neutral-200 py-2 dark:border-neutral-800">
        <Toolbar>
          <div className="ml-2 flex flex-1 items-center gap-2">
            <Button variant="secondary" onClick={handleRefresh}>
              <LucideRefreshCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              onClick={handleEditView}
              className="flex items-center gap-1"
            >
              <LucideEdit className="h-4 w-4" />
              <span className="text-sm">Edit View</span>
            </Button>
          </div>
        </Toolbar>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewConfig.style === "board" && viewConfig.boardConfig ? (
          <KanbanBoard
            rows={result.rows}
            headers={result.headers}
            config={viewConfig.boardConfig}
            tableSchema={tableSchema ?? undefined}
            schemaName={schemaName}
            tableName={viewName}
            driver={databaseDriver}
            onDataChange={handleRefresh}
          />
        ) : tableState ? (
          <ResultTable data={tableState} tableName={viewName} />
        ) : null}
      </div>
    </div>
  );
}
