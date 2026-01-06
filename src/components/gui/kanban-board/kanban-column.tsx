import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import KanbanCard, { KanbanCardData } from "./kanban-card";

interface KanbanColumnProps {
  columnId: string;
  title: string;
  cards: KanbanCardData[];
  titleColumn?: string;
  onCardClick: (card: KanbanCardData) => void;
}

export default function KanbanColumn({
  columnId,
  title,
  cards,
  titleColumn,
  onCardClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
    data: {
      type: "column",
      columnId,
    },
  });

  return (
    <div
      className={cn(
        "flex h-full w-72 shrink-0 flex-col rounded-lg border bg-neutral-50 dark:bg-neutral-900",
        isOver && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="font-semibold text-sm">{title || "(empty)"}</h3>
        <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium dark:bg-neutral-700">
          {cards.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="flex flex-1 flex-col gap-2 overflow-y-auto p-2"
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              titleColumn={titleColumn}
              onClick={() => onCardClick(card)}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
            Drop cards here
          </div>
        )}
      </div>
    </div>
  );
}
