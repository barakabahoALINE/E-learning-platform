import React, { useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";

type CelebrationBubbleAnimationProps = {
  duration?: number;
  onComplete?: () => void;
};

const confettiColors = [
  "#2563eb",
  "#f97316",
  "#22c55e",
  "#38bdf8",
  "#c084fc",
  "#f43f5e",
  "#facc15",
];

const CONFETTI_COUNT = 150;
const shapes = ["rect", "circle", "ribbon"] as const;
type PieceShape = (typeof shapes)[number];

type PieceSpec = {
  color: string;
  shape: PieceShape;
  width: number;
  height: number;
  angle: number;
  distance: number;
  delay: number;
  duration: number;
  rotate: number;
  gravity: number;
};

function seededRandom(seed: number) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}

function buildPieceSpecs(count: number): PieceSpec[] {
  return Array.from({ length: count }).map((_, i) => {
    const r = (n: number) => seededRandom(i * 19 + n);
    const shape = shapes[Math.floor(r(1) * shapes.length)];
    const angle = r(2) * Math.PI * 2;
    const distance = 90 + r(3) * 120;
    const gravity = 22 + r(4) * 20;
    const width = shape === "ribbon" ? 12 + r(5) * 10 : 6 + r(5) * 10;
    const height =
      shape === "circle"
        ? width
        : shape === "ribbon"
          ? 6 + r(6) * 6
          : width * 0.35;

    return {
      color: confettiColors[Math.floor(r(7) * confettiColors.length)],
      shape,
      width,
      height,
      angle,
      distance,
      delay: r(8) * 0.35,
      duration: 1.5 + r(9) * 1.1,
      rotate: 180 + r(10) * 720,
      gravity,
    };
  });
}

const styles = `
@keyframes confettiExplosion {
  0% {
    transform: translate(-50%, -50%) translate(0, 0) rotate(0deg);
    opacity: 1;
  }
  28% {
    transform: translate(-50%, -50%) translate(var(--launch-x), var(--launch-y)) rotate(calc(var(--rotate) * 0.28));
    opacity: 1;
  }
  64% {
    transform: translate(-50%, -50%) translate(calc(var(--launch-x) + var(--gravity-x)), calc(var(--launch-y) + var(--gravity-y))) rotate(calc(var(--rotate) * 0.62));
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) translate(calc(var(--launch-x) + 1.14 * var(--gravity-x)), calc(var(--launch-y) + var(--gravity-y) + 22px)) rotate(var(--rotate));
    opacity: 0;
  }
}

.confetti-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  overflow: hidden;
}

.confetti-piece {
  position: absolute;
  left: 50%;
  top: 50%;
  opacity: 0;
  animation-name: confettiExplosion;
  animation-timing-function: cubic-bezier(0.16, 0.75, 0.35, 1);
  animation-fill-mode: forwards;
  will-change: transform, opacity;
}

.confetti-piece--circle {
  border-radius: 9999px;
}

.confetti-piece--rect {
  border-radius: 2px;
}

.confetti-piece--ribbon {
  border-radius: 9999px;
}

@media (prefers-reduced-motion: reduce) {
  .confetti-piece {
    animation: none !important;
    display: none !important;
  }
}
`;

const ConfettiPiece: React.FC<{ spec: PieceSpec }> = ({ spec }) => {
  const {
    color,
    shape,
    width,
    height,
    angle,
    distance,
    delay,
    duration,
    rotate,
    gravity,
  } = spec;
  const launchX = Math.cos(angle) * distance;
  const launchY = Math.sin(angle) * distance;
  const gravityX = Math.cos(angle) * gravity * 0.2;
  const gravityY = Math.abs(Math.sin(angle)) * gravity;

  const style = {
    "--launch-x": `${launchX}px`,
    "--launch-y": `${launchY}px`,
    "--gravity-x": `${gravityX}px`,
    "--gravity-y": `${gravityY}px`,
    "--rotate": `${rotate}deg`,
    width: `${width}px`,
    height: `${height}px`,
    background: color,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
  } as React.CSSProperties;

  const className = `confetti-piece confetti-piece--${shape}`;

  if (shape === "ribbon") {
    return (
      <span className={className} style={style}>
        <svg viewBox="0 0 12 24" width={width} height={height}>
          <path
            d="M2 2 C 4 10, 6 12, 10 22"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }

  return <span className={className} style={style} />;
};

const CelebrationBubbleAnimation: React.FC<CelebrationBubbleAnimationProps> = ({
  duration,
  onComplete,
}) => {
  const specs = useMemo(() => buildPieceSpecs(CONFETTI_COUNT), []);

  const computedDuration = useMemo(() => {
    const longest = Math.max(
      ...specs.map((spec) => spec.delay + spec.duration),
    );
    return Math.round(longest * 1000) + 260;
  }, [specs]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onComplete?.();
    }, duration ?? computedDuration);
    return () => window.clearTimeout(timer);
  }, [duration, computedDuration, onComplete]);

  return (
    <div className="confetti-overlay">
      <style>{styles}</style>
      {specs.map((spec, index) => (
        <ConfettiPiece key={index} spec={spec} />
      ))}
    </div>
  );
};

export const triggerCelebrationBubbleAnimation = (
  onComplete?: () => void,
  duration?: number,
) => {
  if (typeof document === "undefined") {
    onComplete?.();
    return;
  }

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const cleanup = () => {
    root.unmount();
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }
  };

  root.render(
    <CelebrationBubbleAnimation
      duration={duration}
      onComplete={() => {
        cleanup();
        onComplete?.();
      }}
    />,
  );
};
