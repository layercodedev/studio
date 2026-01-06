import { Button } from "@/components/orbit/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DatabaseHeader, DatabaseRow } from "@/drivers/base-driver";
import { useState, useEffect, useCallback } from "react";

interface RowDetailPanelProps {
  row: DatabaseRow | null;
  headers: DatabaseHeader[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (changes: Record<string, unknown>) => Promise<void>;
  readOnly?: boolean;
}

export default function RowDetailPanel({
  row,
  headers,
  isOpen,
  onClose,
  onSave,
  readOnly = false,
}: RowDetailPanelProps) {
  const [editedValues, setEditedValues] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Reset edited values when row changes
  useEffect(() => {
    if (row) {
      setEditedValues({ ...row });
    }
  }, [row]);

  const handleValueChange = useCallback((columnName: string, value: string) => {
    setEditedValues((prev) => ({
      ...prev,
      [columnName]: value,
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!row) return;

    // Find changed fields
    const changes: Record<string, unknown> = {};
    for (const header of headers) {
      const originalValue = row[header.name];
      const newValue = editedValues[header.name];
      if (originalValue !== newValue) {
        changes[header.name] = newValue;
      }
    }

    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(changes);
      onClose();
    } catch (error) {
      console.error("Failed to save changes:", error);
    } finally {
      setIsSaving(false);
    }
  }, [row, headers, editedValues, onSave, onClose]);

  const formatValue = (value: unknown): string => {
    if (value === null) return "";
    if (value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  if (!row) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:max-w-[450px]">
        <SheetHeader>
          <SheetTitle>Row Details</SheetTitle>
          <SheetDescription>
            {readOnly
              ? "View the values for this row"
              : "Edit the values for this row"}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="mt-4 h-[calc(100vh-200px)] pr-4">
          <div className="flex flex-col gap-4">
            {headers.map((header) => (
              <div key={header.name} className="grid gap-2">
                <Label htmlFor={header.name} className="text-sm font-medium">
                  {header.name}
                </Label>
                <Input
                  id={header.name}
                  value={formatValue(editedValues[header.name])}
                  onChange={(e) =>
                    handleValueChange(header.name, e.target.value)
                  }
                  disabled={readOnly}
                  className="font-mono text-sm"
                  placeholder="(null)"
                />
              </div>
            ))}
          </div>
        </ScrollArea>
        <SheetFooter className="mt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {!readOnly && (
            <Button
              variant="primary"
              onClick={handleSave}
              loading={isSaving}
              disabled={isSaving}
            >
              Save Changes
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
