import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  /** Final value to animate toward. */
  end: number;
  /** Decimal places to keep while counting (e.g. 1 → "4.2"). */
  decimals?: number;
  /** Animation length in ms. */
  duration?: number;
  className?: string;
}

/**
 * Rolls a number from 0 → end the first time it scrolls into view.
 * Dependency-free (IntersectionObserver + rAF). Under prefers-reduced-motion
 * or without IO support it renders the final value immediately.
 */
export function CountUp({ end, decimals = 0, duration = 1400, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setVal(end);
      return;
    }

    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || done.current) return;
        done.current = true;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(end * eased);
          if (p < 1) raf = requestAnimationFrame(tick);
          else setVal(end);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [end, duration]);

  const formatted =
    decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString("en-US");

  return (
    <span ref={ref} className={className}>
      {formatted}
    </span>
  );
}
