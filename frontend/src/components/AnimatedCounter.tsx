import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 2,
  duration = 800,
  className = "",
}: Props) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    const start = prev.current;
    const diff = value - start;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + diff * eased);
      if (progress < 1) {
        raf.current = requestAnimationFrame(step);
      } else {
        prev.current = value;
      }
    };

    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {prefix}{display.toFixed(decimals)}{suffix}
    </span>
  );
}
