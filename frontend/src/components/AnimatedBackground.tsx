import { useTheme } from "./ThemeProvider";

const ORBS = [
  { color: "#8B5CF6", size: 380, x: "10%", y: "15%", delay: "0s", speed: "8s" },
  { color: "#3B82F6", size: 300, x: "70%", y: "10%", delay: "-2s", speed: "10s" },
  { color: "#06B6D4", size: 260, x: "80%", y: "60%", delay: "-4s", speed: "9s" },
  { color: "#F59E0B", size: 200, x: "20%", y: "70%", delay: "-1s", speed: "11s" },
  { color: "#8B5CF6", size: 220, x: "50%", y: "40%", delay: "-3s", speed: "7s" },
  { color: "#3B82F6", size: 180, x: "90%", y: "85%", delay: "-5s", speed: "12s" },
];

export function AnimatedBackground() {
  const { theme } = useTheme();
  const opacity = theme === "dark" ? 0.15 : 0.07;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }} aria-hidden="true">
      {ORBS.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            opacity,
            filter: `blur(${80 + i * 8}px)`,
            animationDuration: orb.speed,
            animationDelay: orb.delay,
          }}
        />
      ))}
    </div>
  );
}
