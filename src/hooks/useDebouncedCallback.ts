import { useCallback, useEffect, useRef } from "react";

/** Stable debounced wrapper; always calls latest fn. */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(fn: T, delayMs: number): T {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return useCallback(
    ((...args: Parameters<T>) => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => fnRef.current(...args), delayMs);
    }) as T,
    [delayMs],
  );
}
