"use client";

import { useState } from "react";
import { motion, useMotionValue, useTransform, animate, useReducedMotion, type PanInfo } from "motion/react";

export interface RipToOpenProps {
  children: React.ReactNode;
  onRipped: () => void;
  disabled?: boolean;
  className?: string;
}

const RIP_COMMIT_THRESHOLD = 0.42; // fraction of full drag distance needed to commit to a rip
const RIP_DRAG_DISTANCE = 160; // px of upward drag that maps to full rip progress (1.0)

/**
 * Wraps a PackArt so the user tears it open by dragging/swiping upward, rather than a tap
 * triggering the whole reveal instantly. Dragging partway visually previews the tear
 * (scrubbable); releasing past RIP_COMMIT_THRESHOLD commits to a full rip and fires
 * onRipped(), releasing short of it springs the pack back closed. Reduced-motion users get
 * a plain tap-to-open button instead of a drag gesture.
 */
export function RipToOpen({ children, onRipped, disabled = false, className }: RipToOpenProps) {
  const reducedMotion = useReducedMotion();
  const [committed, setCommitted] = useState(false);
  const ripProgress = useMotionValue(0); // 0 = closed, 1 = fully torn open

  const topY = useTransform(ripProgress, [0, 1], [0, -230]);
  const topRotate = useTransform(ripProgress, [0, 1], [0, -22]);
  const topOpacity = useTransform(ripProgress, [0, 1], [1, 0]);
  const bottomY = useTransform(ripProgress, [0, 1], [0, 55]);
  const bottomOpacity = useTransform(ripProgress, [0, 1], [1, 0.35]);

  function commitRip() {
    if (committed) return;
    setCommitted(true);
    animate(ripProgress, 1, { duration: 0.45, ease: "easeIn" }).then(() => onRipped());
  }

  function handleDrag(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (committed) return;
    const upward = Math.max(0, -info.offset.y);
    ripProgress.set(Math.min(1, upward / RIP_DRAG_DISTANCE));
  }

  function handleDragEnd() {
    if (committed) return;
    if (ripProgress.get() >= RIP_COMMIT_THRESHOLD) {
      commitRip();
    } else {
      animate(ripProgress, 0, { type: "spring", stiffness: 300, damping: 28 });
    }
  }

  if (reducedMotion) {
    return (
      <div className={className}>
        {children}
        {!disabled && (
          <button
            type="button"
            onClick={commitRip}
            className="bg-accent text-accent-foreground hover:bg-accent-strong mt-4 w-full rounded-md px-6 py-3 text-sm font-semibold"
          >
            Open Pack
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={["relative", className ?? ""].join(" ")}>
      <motion.div
        drag={disabled || committed ? false : "y"}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.3}
        dragMomentum={false}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className={disabled ? "" : "cursor-grab touch-none active:cursor-grabbing"}
      >
        {/* Top half — clipped and animated up/away as the pack tears open. */}
        <motion.div
          className="pointer-events-none absolute inset-0 overflow-hidden [clip-path:inset(0_0_50%_0)]"
          style={{ y: topY, rotate: topRotate, opacity: topOpacity }}
          aria-hidden="true"
        >
          {children}
        </motion.div>
        {/* Bottom half — stays mostly put, fades slightly as the reveal takes over. */}
        <motion.div
          className="overflow-hidden [clip-path:inset(50%_0_0_0)]"
          style={{ y: bottomY, opacity: bottomOpacity }}
        >
          {children}
        </motion.div>
      </motion.div>

      {!disabled && !committed && (
        <p className="text-muted mt-3 text-center text-xs">Drag up to rip it open</p>
      )}
    </div>
  );
}
