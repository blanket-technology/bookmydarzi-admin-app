import { useEffect, useState } from 'react';

/** Returns `value` after it has stopped changing for `delayMs` - used so a search box
 * sends one request when the user pauses typing, not one per keystroke. */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
