import { useEffect } from "react";

/**
 * React 19 + Radix/vaul safeguard.
 *
 * Some overlay primitives (Dialog, DropdownMenu, Select, Popover, Drawer) set
 * `pointer-events: none` on <body> while open and are supposed to remove it on
 * close. Under React 19 this cleanup can occasionally race and the style stays
 * stuck — making the entire page unclickable until a manual refresh.
 *
 * This watchdog observes <body> inline styles and clears a stray
 * `pointer-events: none` once no Radix/vaul overlay is actually open, restoring
 * interactivity globally without affecting any open modal.
 */
export function PointerEventsWatchdog() {
  useEffect(() => {
    const body = document.body;

    const hasOpenOverlay = () =>
      document.querySelector(
        '[data-state="open"][role="dialog"], [data-radix-popper-content-wrapper], [vaul-drawer][data-state="open"], [data-state="open"][role="menu"], [data-state="open"][role="listbox"]'
      ) !== null;

    const clearIfStuck = () => {
      if (body.style.pointerEvents === "none" && !hasOpenOverlay()) {
        body.style.pointerEvents = "";
      }
    };

    const observer = new MutationObserver(() => {
      // Defer so Radix/vaul finishes its own DOM updates first.
      window.setTimeout(clearIfStuck, 0);
    });

    observer.observe(body, {
      attributes: true,
      attributeFilter: ["style"],
    });

    // Safety net: also re-check on pointer interactions.
    const onPointerDown = () => window.setTimeout(clearIfStuck, 50);
    window.addEventListener("pointerdown", onPointerDown, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, []);

  return null;
}
