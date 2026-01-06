import { Card, CardContent } from "@/components/ui/card";
import { DatabaseRow } from "@/drivers/base-driver";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface KanbanCardData {
  id: string;
  rowIndex: number;
  row: DatabaseRow;
}

interface KanbanCardProps {
  card: KanbanCardData;
  titleColumn?: string;
  onClick: () => void;
  isDragging?: boolean;
}

export default function KanbanCard({
  card,
  titleColumn,
  onClick,
  isDragging,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: "card",
      card,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Try to get title from specified column, fallback to 'name', then first text value
  const getCardTitle = (): string => {
    if (titleColumn && card.row[titleColumn] !== undefined) {
      return String(card.row[titleColumn] ?? "");
    }
    if (card.row["name"] !== undefined) {
      return String(card.row["name"] ?? "");
    }
    // Fallback to first non-null string value
    for (const value of Object.values(card.row)) {
      if (value !== null && value !== undefined) {
        return String(value);
      }
    }
    return `Row ${card.rowIndex + 1}`;
  };

  const title = getCardTitle();
  const isCurrentlyDragging = isDragging || isSortableDragging;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "cursor-pointer select-none transition-shadow hover:shadow-md",
        isCurrentlyDragging && "opacity-50 shadow-lg ring-2 ring-primary"
      )}
    >
      <CardContent className="p-3">
        <p className="line-clamp-2 text-sm font-medium">{title}</p>
      </CardContent>
    </Card>
  );
}
