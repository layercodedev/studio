import { Button } from "@/components/orbit/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BoardConfig } from "@/drivers/base-driver";
import { LucideRefreshCw } from "lucide-react";

interface BoardConfigPanelProps {
  columns: string[];
  config: BoardConfig;
  onChange: (config: BoardConfig) => void;
  onRefreshColumns: () => void;
  isLoadingColumns?: boolean;
}

export default function BoardConfigPanel({
  columns,
  config,
  onChange,
  onRefreshColumns,
  isLoadingColumns,
}: BoardConfigPanelProps) {
  return (
    <div className="flex items-center gap-4 rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2">
        <Label htmlFor="groupByColumn" className="whitespace-nowrap text-sm">
          Group By
        </Label>
        <Select
          value={config.groupByColumn}
          onValueChange={(value) =>
            onChange({ ...config, groupByColumn: value })
          }
        >
          <SelectTrigger id="groupByColumn" className="w-[180px]">
            <SelectValue placeholder="Select column" />
          </SelectTrigger>
          <SelectContent>
            {columns.length === 0 ? (
              <SelectItem value="_none" disabled>
                No columns available
              </SelectItem>
            ) : (
              columns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefreshColumns}
          disabled={isLoadingColumns}
          title="Refresh columns from SQL query"
        >
          <LucideRefreshCw
            className={`h-4 w-4 ${isLoadingColumns ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="titleColumn" className="whitespace-nowrap text-sm">
          Card Title
        </Label>
        <Select
          value={config.titleColumn || "_auto"}
          onValueChange={(value) =>
            onChange({
              ...config,
              titleColumn: value === "_auto" ? undefined : value,
            })
          }
        >
          <SelectTrigger id="titleColumn" className="w-[180px]">
            <SelectValue placeholder="Auto (name field)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_auto">Auto (name field)</SelectItem>
            {columns.map((col) => (
              <SelectItem key={col} value={col}>
                {col}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
