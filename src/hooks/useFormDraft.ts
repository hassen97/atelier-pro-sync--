import { useEffect, useCallback, useRef } from "react";

const DRAFT_PREFIX = "repairpro_draft_";

export function useFormDraft<T extends Record<string, any>>(
  key: string,
  {
    watch,
    reset,
    isOpen,
    defaultValues,
  }: {
    watch: () => T;
    reset: (values: T) => void;
    isOpen: boolean;
    defaultValues: T;
  }
) {
  const storageKey = DRAFT_PREFIX + key;
  const hasRestoredRef = useRef(false);

  // Restore draft when form opens (only for new entries, not edits)
  useEffect(() => {
    if (!isOpen) {
      hasRestoredRef.current = false;
      return;
    }
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const draft = JSON.parse(saved) as T;
        reset({ ...defaultValues, ...draft });
      }
    } catch {
      // Ignore corrupt data
    }
  }, [isOpen, storageKey, reset, defaultValues]);

  // Auto-save draft as user types (debounced)
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      try {
        const values = watch();
        // Only save if there's meaningful data
        const hasData = Object.values(values).some(
          (v) => v !== "" && v !== 0 && v !== undefined && v !== null && v !== false
        );
        if (hasData) {
          localStorage.setItem(storageKey, JSON.stringify(values));
        }
      } catch {
        // Ignore
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, watch, storageKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { clearDraft };
}
