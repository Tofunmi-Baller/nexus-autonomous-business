interface Props {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  /** Fixed stroke colour. When omitted, the ring shifts violet → amber → rose as it fills (a "budget used" ring). */
  color?: string;
}

export function ProgressRing({ value, max, size = 64, stroke = 5, color }: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.max(0, Math.min(value / max, 1)) : 0;
  const offset = circumference * (1 - pct);
  const ringColor = color ?? (pct > 0.8 ? "#F43F5E" : pct > 0.5 ? "#F59E0B" : "#8B5CF6");

  return (
    <svg width={size} height={size} className="transform -rotate-90 flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-color)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={ringColor} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        className="transition-all duration-700"
      />
    </svg>
  );
}
