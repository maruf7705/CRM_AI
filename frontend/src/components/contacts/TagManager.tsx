"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContactTag } from "@/types";

interface TagOption {
  id: string;
  name: string;
  color: string;
}

interface TagManagerProps {
  value: ContactTag[];
  availableTags: TagOption[];
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  disabled?: boolean;
}

export const TagManager = ({
  value,
  availableTags,
  onAddTag,
  onRemoveTag,
  disabled = false,
}: TagManagerProps) => {
  const [selectedTagId, setSelectedTagId] = useState<string>("");

  const selectableTags = useMemo(() => {
    const existingIds = new Set(value.map((tag) => tag.id));
    return availableTags.filter((tag) => !existingIds.has(tag.id));
  }, [availableTags, value]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs"
            style={{ borderColor: tag.color, color: tag.color }}
          >
            {tag.name}
            <button type="button" onClick={() => onRemoveTag(tag.id)} disabled={disabled}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <select
          value={selectedTagId}
          onChange={(event) => setSelectedTagId(event.target.value)}
          className="h-10 flex-1 rounded-md border bg-background px-3 text-sm"
          disabled={disabled}
        >
          <option value="">Select a tag</option>
          {selectableTags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          disabled={disabled || !selectedTagId}
          onClick={() => {
            onAddTag(selectedTagId);
            setSelectedTagId("");
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
};
