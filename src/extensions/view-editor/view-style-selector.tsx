import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ViewStyleType } from "@/drivers/base-driver";
import { LucideKanban, LucideTable2 } from "lucide-react";

interface ViewStyleSelectorProps {
  value: ViewStyleType;
  onChange: (style: ViewStyleType) => void;
}

export default function ViewStyleSelector({
  value,
  onChange,
}: ViewStyleSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ViewStyleType)}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Select view style" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="table">
          <div className="flex items-center gap-2">
            <LucideTable2 className="h-4 w-4" />
            <span>Table View</span>
          </div>
        </SelectItem>
        <SelectItem value="board">
          <div className="flex items-center gap-2">
            <LucideKanban className="h-4 w-4" />
            <span>Board View</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
