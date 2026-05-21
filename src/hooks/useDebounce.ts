import { useState, useEffect } from "react";

/**
 * Custom hook for debouncing values
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns Debounced value
 *
 * Example:
 * const [searchInput, setSearchInput] = useState('');
 * const debouncedInput = useDebounce(searchInput, 300);
 *
 * useEffect(() => {
 *   // This effect runs only when debouncedInput changes (after 300ms of inactivity)
 *   performSearch(debouncedInput);
 * }, [debouncedInput]);
 */
export const useDebounce = <T>(value: T, delay: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up timeout to update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: clear timeout if value changes before delay expires
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};
