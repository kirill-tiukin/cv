import { useRef, useState } from "react";

export function useSortableList<T>(
  items: T[],
  onChange: (items: T[]) => void
) {
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const onDragStart = (i: number) => { dragIndex.current = i; };
  const onDragEnter = (i: number) => setDragOver(i);
  const onDragEnd   = () => {
    if (
      dragIndex.current !== null &&
      dragOver !== null &&
      dragIndex.current !== dragOver
    ) {
      const next = [...items];
      const [moved] = next.splice(dragIndex.current, 1);
      next.splice(dragOver, 0, moved);
      onChange(next);
    }
    dragIndex.current = null;
    setDragOver(null);
  };

  return { dragOver, onDragStart, onDragEnter, onDragEnd };
}
