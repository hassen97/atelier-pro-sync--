import { useCallback } from "react";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { toast } from "sonner";

/**
 * Returns a guard function that blocks write operations when in read-only impersonation mode.
 * Call `guardMutation(callback)` instead of executing mutations directly.
 */
export function useReadOnlyGuard() {
  const { isReadOnly } = useImpersonation();

  const guardMutation = useCallback(
    <T extends (...args: any[]) => any>(fn: T) => {
      return ((...args: Parameters<T>) => {
        if (isReadOnly) {
          toast.error("Mode lecture seule — Aucune modification autorisée");
          return;
        }
        return fn(...args);
      }) as T;
    },
    [isReadOnly]
  );

  return { isReadOnly, guardMutation };
}
