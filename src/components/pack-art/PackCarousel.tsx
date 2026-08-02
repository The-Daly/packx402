"use client";

import { useCallback, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
  type PanInfo,
  type MotionValue,
} from "motion/react";
import { PackArt } from "./PackArt";
import type { PackTierKey } from "@/server/config/pack-tiers";

export interface PackCarouselItem {
  tierKey: PackTierKey;
  tierName: string;
  price: number;
  locked?: boolean;
}

export interface PackCarouselProps {
  items: PackCarouselItem[];
  initialIndex?: number;
  /** Fires whenever the centered pack changes, however it changed (drag, spin, keyboard). */
  onSelect?: (item: PackCarouselItem, index: number) => void;
  /** Fires when the user taps/clicks the pack currently centered. */
  onActivate?: (item: PackCarouselItem, index: number) => void;
  className?: string;
}

const CARD_WIDTH = 180; // px spacing between adjacent pack centers in the strip
const VELOCITY_PER_INDEX = 500; // px/s of flick velocity per extra step of spin
const MAX_FLICK_STEPS = 14; // a hard flick can carry a full lap around the circle

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Infinite circular pack strip: every pack has a fixed slot on an endless ring, so
 * neighboring packs are always visible sliding in from both sides — there is no
 * clamped start or end. A slow drag nudges one step; a fast flick spins through several
 * packs at once (driven by release velocity) and always wraps around smoothly. Pure
 * catalog-browsing navigation — no outcome is ever randomized or selected here.
 */
export function PackCarousel({
  items,
  initialIndex = 0,
  onSelect,
  onActivate,
  className,
}: PackCarouselProps) {
  const n = items.length;
  const trackWidth = n * CARD_WIDTH;
  const x = useMotionValue(-mod(initialIndex, n) * CARD_WIDTH);
  const reducedMotion = useReducedMotion();
  const currentIndexRef = useRef(mod(initialIndex, n));

  const settle = useCallback(
    (targetX: number) => {
      const controls = animate(
        x,
        targetX,
        reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 },
      );
      controls.then(() => {
        const idx = mod(Math.round(-targetX / CARD_WIDTH), n);
        if (idx !== currentIndexRef.current) {
          currentIndexRef.current = idx;
          onSelect?.(items[idx], idx);
        }
      });
    },
    [x, reducedMotion, n, items, onSelect],
  );

  function step(delta: number) {
    const nearestSnap = Math.round(x.get() / CARD_WIDTH) * CARD_WIDTH;
    settle(nearestSnap - delta * CARD_WIDTH);
  }

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const velocitySteps = Math.round(-info.velocity.x / VELOCITY_PER_INDEX);
    const nearestSnap = Math.round(x.get() / CARD_WIDTH) * CARD_WIDTH;
    const extra = Math.max(-MAX_FLICK_STEPS, Math.min(MAX_FLICK_STEPS, velocitySteps));
    settle(nearestSnap - extra * CARD_WIDTH);
  }

  function handleItemClick(i: number) {
    if (i === currentIndexRef.current) {
      onActivate?.(items[i], i);
      return;
    }
    // Shortest circular distance so clicking a neighbor rotates the short way around.
    let delta = i - currentIndexRef.current;
    if (delta > n / 2) delta -= n;
    if (delta < -n / 2) delta += n;
    step(delta);
  }

  // Fixed height sized to the largest (fully-scaled, thumbnail-size) card plus breathing
  // room — children are absolutely positioned, so the container can't size itself from them.
  const containerHeight = CARD_WIDTH * 1.5 + 96;

  return (
    <div
      className={["relative w-full overflow-hidden", className ?? ""].join(" ")}
      style={{ height: containerHeight, perspective: 1400 }}
      role="listbox"
      aria-label="Browse pack tiers"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") step(1);
        else if (e.key === "ArrowLeft") step(-1);
      }}
    >
      <div className="carousel-ambient pointer-events-none absolute inset-0" aria-hidden="true" />

      <motion.div
        className="relative mx-auto h-full max-w-none cursor-grab touch-pan-y [transform-style:preserve-3d] active:cursor-grabbing"
        style={{ x }}
        drag="x"
        dragElastic={0.08}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
      >
        {items.map((item, i) => (
          <CarouselSlot
            key={item.tierKey}
            item={item}
            index={i}
            x={x}
            trackWidth={trackWidth}
            onClick={() => handleItemClick(i)}
          />
        ))}
      </motion.div>
    </div>
  );
}

function CarouselSlot({
  item,
  index,
  x,
  trackWidth,
  onClick,
}: {
  item: PackCarouselItem;
  index: number;
  x: MotionValue<number>;
  trackWidth: number;
  onClick: () => void;
}) {
  // Wraps this slot's screen position into (-trackWidth/2, trackWidth/2], so exactly one
  // instance of each pack is always near the visible center, regardless of how far `x`
  // has drifted from repeated drags — the core of the infinite-circular-strip effect.
  const wrapped = useTransform(x, (xv) => {
    const raw = index * CARD_WIDTH + xv;
    return mod(raw + trackWidth / 2, trackWidth) - trackWidth / 2;
  });
  const units = useTransform(wrapped, (w) => w / CARD_WIDTH);
  const scale = useTransform(units, (u) => Math.max(0.62, 1 - Math.abs(u) * 0.16));
  const opacity = useTransform(units, (u) => Math.max(0, 1 - Math.abs(u) * 0.32));
  const zIndex = useTransform(units, (u) => Math.round(10 - Math.abs(u)));
  // 3D-drum illusion: packs off-center rotate away and recede in depth, like they're
  // mounted on a rotating cylinder rather than a flat sliding strip.
  const rotateY = useTransform(units, (u) => Math.max(-42, Math.min(42, u * -16)));
  const z = useTransform(units, (u) => -Math.min(220, Math.abs(u) * 55));

  return (
    <motion.div
      role="option"
      aria-selected={undefined}
      aria-label={`${item.tierName} pack${item.locked ? " (locked)" : ""}`}
      className="absolute top-1/2 left-1/2 w-[150px] [transform-style:preserve-3d]"
      style={{
        x: wrapped,
        y: "-50%",
        z,
        rotateY,
        marginLeft: -75,
        scale,
        opacity,
        zIndex,
      }}
      onClick={onClick}
    >
      <PackArt
        tierKey={item.tierKey}
        tierName={item.tierName}
        price={item.price}
        locked={item.locked}
        size="thumbnail"
      />
    </motion.div>
  );
}
