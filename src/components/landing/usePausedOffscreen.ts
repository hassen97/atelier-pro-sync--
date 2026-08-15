import { useEffect, useRef, useState } from "react";

/**
 * Pauses CSS animations while the observed element is off-screen.
 * Returns a ref to attach to the animated container and a `paused` flag to
 * toggle the `.rp-paused` class (see industrial.css). Starts paused so
 * invisible elements never burn CPU before the observer reports visibility.
 */
export function usePausedOffscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setPaused(false); // ancient browsers: just run the animation
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setPaused(!entry.isIntersecting),
      { rootMargin: "160px 0px" } // keep running slightly off-screen
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, paused };
}
