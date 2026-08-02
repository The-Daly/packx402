"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
  type PanInfo,
} from "motion/react";

export interface Pack3DTiltProps {
  children: React.ReactNode;
  className?: string;
}

const DRAG_TO_DEGREES = 0.35; // px of drag -> degrees of rotation
const MAX_TILT_DEGREES = 55;

/**
 * Wraps a single PackArt so it behaves like a floating 3D object: dragging/touching it
 * spins it around the Y axis (and nudges X tilt from vertical drag), and it springs back
 * toward a gentle idle float when released. Distinct from PackCarousel, which spins
 * between different packs — this spins one pack in place for a tactile "hold it" feel.
 */
export function Pack3DTilt({ children, className }: Pack3DTiltProps) {
  const reducedMotion = useReducedMotion();
  const rotateY = useMotionValue(0);
  const rotateX = useMotionValue(0);
  const springY = useSpring(rotateY, { stiffness: 120, damping: 14 });
  const springX = useSpring(rotateX, { stiffness: 120, damping: 14 });
  const dragStartY = useRef(0);
  const dragStartX = useRef(0);

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  function handleDrag(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const nextY = dragStartY.current + info.offset.x * DRAG_TO_DEGREES;
    const nextX = dragStartX.current - info.offset.y * DRAG_TO_DEGREES;
    rotateY.set(Math.max(-MAX_TILT_DEGREES, Math.min(MAX_TILT_DEGREES, nextY)));
    rotateX.set(Math.max(-MAX_TILT_DEGREES, Math.min(MAX_TILT_DEGREES, nextX)));
  }

  function handleDragStart() {
    dragStartY.current = rotateY.get();
    dragStartX.current = rotateX.get();
  }

  function handleDragEnd() {
    // Spring back to a neutral, front-facing rest pose.
    rotateY.set(0);
    rotateX.set(0);
  }

  return (
    <div
      className={["pack-3d-idle-float touch-pan-y", className ?? ""].join(" ")}
      style={{ perspective: 1200 }}
    >
      <motion.div
        drag
        dragElastic={0.15}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.97 }}
        className="cursor-grab touch-none [transform-style:preserve-3d] active:cursor-grabbing"
        style={{ rotateY: springY, rotateX: springX }}
      >
        {children}
      </motion.div>
    </div>
  );
}
