import type { DragEvent } from 'react';
import { useState } from 'react';

/** Drag-and-drop row reordering shared by IngredientsEditor and StepsEditor. */
export function useDragReorder<T>(items: T[], onChange: (next: T[]) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function move(from: number, to: number) {
    if (from === to) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function dragHandlers(i: number) {
    return {
      draggable: true,
      onDragStart: () => setDragIndex(i),
      onDragOver: (e: DragEvent) => e.preventDefault(),
      onDrop: () => {
        if (dragIndex !== null) move(dragIndex, i);
        setDragIndex(null);
      },
      onDragEnd: () => setDragIndex(null),
    };
  }

  return { dragIndex, dragHandlers };
}
