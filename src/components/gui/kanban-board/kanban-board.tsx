import {
  BaseDriver,
  BoardConfig,
  DatabaseHeader,
  DatabaseRow,
  DatabaseTableSchema,
} from "@/drivers/base-driver";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import KanbanCard, { KanbanCardData } from "./kanban-card";
import KanbanColumn from "./kanban-column";
import RowDetailPanel from "./row-detail-panel";

interface KanbanBoardProps {
  rows: DatabaseRow[];
  headers: DatabaseHeader[];
  config: BoardConfig;
  tableSchema?: DatabaseTableSchema;
  schemaName: string;
  tableName: string;
  driver: BaseDriver;
  onDataChange?: () => void;
}

export default function KanbanBoard({
  rows,
  headers,
  config,
  tableSchema,
  schemaName,
  tableName,
  driver,
  onDataChange,
}: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<KanbanCardData | null>(null);
  const [selectedCard, setSelectedCard] = useState<KanbanCardData | null>(null);
  const [localRows, setLocalRows] = useState<DatabaseRow[]>(rows);

  // Sync local rows when props change
  useMemo(() => {
    setLocalRows(rows);
  }, [rows]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group rows by the groupByColumn
  const { columns, cards } = useMemo(() => {
    const groupByColumn = config.groupByColumn;
    const columnMap = new Map<string, KanbanCardData[]>();

    localRows.forEach((row, index) => {
      const groupValue = String(row[groupByColumn] ?? "(empty)");
      const card: KanbanCardData = {
        id: `card-${index}`,
        rowIndex: index,
        row,
      };

      if (!columnMap.has(groupValue)) {
        columnMap.set(groupValue, []);
      }
      columnMap.get(groupValue)!.push(card);
    });

    // Sort columns alphabetically, but keep "(empty)" at the end
    const sortedKeys = Array.from(columnMap.keys()).sort((a, b) => {
      if (a === "(empty)") return 1;
      if (b === "(empty)") return -1;
      return a.localeCompare(b);
    });

    const columns = sortedKeys.map((key) => ({
      id: `column-${key}`,
      title: key,
      cards: columnMap.get(key)!,
    }));

    const allCards = columns.flatMap((col) => col.cards);

    return { columns, cards: allCards };
  }, [localRows, config.groupByColumn]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const card = cards.find((c) => c.id === active.id);
    if (card) {
      setActiveCard(card);
    }
  }, [cards]);

  const handleDragOver = useCallback(() => {
    // Handle drag over if needed for visual feedback
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveCard(null);

      if (!over) return;

      const activeCard = cards.find((c) => c.id === active.id);
      if (!activeCard) return;

      // Determine the target column
      let targetColumnId: string | null = null;

      if (over.data.current?.type === "column") {
        targetColumnId = over.data.current.columnId;
      } else if (over.data.current?.type === "card") {
        // Find which column contains this card
        const overCard = cards.find((c) => c.id === over.id);
        if (overCard) {
          const targetColumn = columns.find((col) =>
            col.cards.some((c) => c.id === over.id)
          );
          if (targetColumn) {
            targetColumnId = targetColumn.id;
          }
        }
      }

      if (!targetColumnId) return;

      // Extract the column title (group value) from the column ID
      const newGroupValue = targetColumnId.replace("column-", "");
      const currentGroupValue = String(
        activeCard.row[config.groupByColumn] ?? "(empty)"
      );

      if (newGroupValue === currentGroupValue) return;

      // Get the actual value to set (null for empty)
      const valueToSet = newGroupValue === "(empty)" ? null : newGroupValue;

      // Optimistic update
      setLocalRows((prevRows) => {
        const newRows = [...prevRows];
        newRows[activeCard.rowIndex] = {
          ...newRows[activeCard.rowIndex],
          [config.groupByColumn]: valueToSet,
        };
        return newRows;
      });

      // Find primary key for the update
      const pk = tableSchema?.pk || [];
      if (pk.length === 0) {
        toast.error("Cannot update: table has no primary key");
        // Revert
        setLocalRows(rows);
        return;
      }

      // Build WHERE clause
      const where: Record<string, unknown> = {};
      for (const pkCol of pk) {
        where[pkCol] = activeCard.row[pkCol];
      }

      try {
        // Execute the update
        await driver.updateTableData(
          schemaName,
          tableName,
          [
            {
              operation: "UPDATE",
              where,
              values: { [config.groupByColumn]: valueToSet },
            },
          ],
          tableSchema
        );

        toast.success("Card moved successfully");
        onDataChange?.();
      } catch (error) {
        console.error("Failed to update row:", error);
        toast.error("Failed to move card");
        // Revert on error
        setLocalRows(rows);
      }
    },
    [
      cards,
      columns,
      config.groupByColumn,
      driver,
      onDataChange,
      rows,
      schemaName,
      tableName,
      tableSchema,
    ]
  );

  const handleCardClick = useCallback((card: KanbanCardData) => {
    setSelectedCard(card);
  }, []);

  const handleSaveRow = useCallback(
    async (changes: Record<string, unknown>) => {
      if (!selectedCard || !tableSchema) return;

      const pk = tableSchema.pk || [];
      if (pk.length === 0) {
        throw new Error("Cannot update: table has no primary key");
      }

      const where: Record<string, unknown> = {};
      for (const pkCol of pk) {
        where[pkCol] = selectedCard.row[pkCol];
      }

      await driver.updateTableData(
        schemaName,
        tableName,
        [
          {
            operation: "UPDATE",
            where,
            values: changes,
          },
        ],
        tableSchema
      );

      // Optimistic update for local state
      setLocalRows((prevRows) => {
        const newRows = [...prevRows];
        newRows[selectedCard.rowIndex] = {
          ...newRows[selectedCard.rowIndex],
          ...changes,
        };
        return newRows;
      });

      toast.success("Row updated successfully");
      onDataChange?.();
    },
    [selectedCard, tableSchema, driver, schemaName, tableName, onDataChange]
  );

  // Check if we can edit (need primary key)
  const canEdit = tableSchema?.pk && tableSchema.pk.length > 0;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto p-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              columnId={column.id}
              title={column.title}
              cards={column.cards}
              titleColumn={config.titleColumn}
              onCardClick={handleCardClick}
            />
          ))}
          {columns.length === 0 && (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              No data to display. Make sure your view returns results and the
              group by column is set.
            </div>
          )}
        </div>
        <DragOverlay>
          {activeCard && (
            <KanbanCard
              card={activeCard}
              titleColumn={config.titleColumn}
              onClick={() => {}}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>

      <RowDetailPanel
        row={selectedCard?.row ?? null}
        headers={headers}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onSave={handleSaveRow}
        readOnly={!canEdit}
      />
    </div>
  );
}
