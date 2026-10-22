import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Skala pas (fit) agar gambar berukuran `natW x natH` muat di dalam elemen
 * `ref`. Dipakai MapScreen dan GridPreview agar grid sejajar dengan gambar.
 */
export function useFitScale(
  ref: RefObject<HTMLElement | null>,
  natW: number,
  natH: number,
): number {
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || natW <= 0 || natH <= 0) return;

    const update = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) setScale(Math.min(width / natW, height / natH));
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, natW, natH]);

  return scale;
}
