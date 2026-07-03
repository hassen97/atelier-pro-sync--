import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GripVertical, Pencil } from "lucide-react";
import { getCategoryColor } from "@/lib/categoryColors";
import type { CategoryKind, TextSize } from "@/hooks/useCategoryPreferences";

export interface MergedCategory {
  id: string;
  name: string;
  kind: CategoryKind;
  bg_color: string | null;
  text_size: TextSize | null;
}

interface SortableCategoryButtonProps {
  category: MergedCategory;
  selected: boolean;
  editMode: boolean;
  small?: boolean;
  onSelect: () => void;
  onCustomize: () => void;
}

export function SortableCategoryButton({
  category,
  selected,
  editMode,
  small,
  onSelect,
  onCustomize,
}: SortableCategoryButtonProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    disabled: !editMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };

  const color = getCategoryColor(category.bg_color);
  const large = category.text_size === "large";

  // When a custom color exists, drive variant via explicit classes; otherwise
  // fall back to the standard outline/default button styling.
  const colorClasses = color ? (selected ? color.active : color.idle) : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("inline-flex items-center", isDragging && "shadow-elevated rounded-md")}
    >
      <Button
        variant={color ? "outline" : selected ? "default" : "outline"}
        size="sm"
        onClick={() => (editMode ? onCustomize() : onSelect())}
        className={cn(
          "transition-all",
          colorClasses,
          large && (small ? "text-sm h-8" : "text-base h-11 font-semibold"),
          editMode && "pr-2 ring-1 ring-primary/30",
        )}
      >
        {editMode && (
          <span
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab active:cursor-grabbing touch-none -ml-1 mr-0.5 opacity-70 hover:opacity-100"
            aria-label="Déplacer"
          >
            <GripVertical className={cn(small ? "h-3.5 w-3.5" : "h-4 w-4")} />
          </span>
        )}
        <span>{category.name}</span>
        {editMode && <Pencil className={cn("ml-1 opacity-70", small ? "h-3 w-3" : "h-3.5 w-3.5")} />}
      </Button>
    </div>
  );
}
