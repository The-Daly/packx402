"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate, useReducedMotion, type PanInfo } from "motion/react";

export interface RipToOpenProps {
  children: React.ReactNode;
  onRipped: () => void;
  disabled?: boolean;
  className?: string;
}

const RIP_COMMIT_THRESHOLD = 0.42; // fraction of full drag distance needed to commit to a rip
const RIP_DRAG_DISTANCE = 140; // px of horizontal drag that maps to full rip progress (1.0)
// Where the tear seam sits, as a percent from the top — real foil packs tear off a small
// strip near the top, not down the middle. Only this strip animates away; the rest of the
// pack stays in place underneath it.
const TOP_SEAM_PERCENT = 16;

/** Synthesizes a short tearing-foil noise burst — no audio asset file needed. Best-effort:
 * silently no-ops if the Web Audio API is unavailable or the user hasn't interacted with
 * the page yet (autoplay-policy safe, since this only ever runs from a drag gesture). */
function playTearSound() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const duration = 0.45;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // decaying white noise
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(1800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(4200, ctx.currentTime + duration * 0.6);
    filter.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + duration);
    noise.onended = () => {
      noise.onended = null;
      if (ctx.state !== "closed") {
        ctx.close().catch(() => {}); // closing an already-closing context rejects; harmless
      }
    };
  } catch {
    // Best-effort flourish only — never blocks the actual rip/reveal flow.
  }
}

const SPARKLE_POSITIONS = [12, 28, 45, 62, 78, 90]; // percent across the top tear seam

function TearSparkles({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-10" aria-hidden="true">
      {SPARKLE_POSITIONS.map((left, i) => (
        <motion.span
          key={left}
          className="tear-sparkle absolute top-1 text-lg"
          style={{ left: `${left}%` }}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: [0, 1, 0], scale: [0.3, 1.1, 0.3], y: [0, -14, -22] }}
          transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
        >
          ✦
        </motion.span>
      ))}
    </div>
  );
}

/**
 * Wraps a PackArt so the user tears it open by dragging horizontally across a handle at
 * the top of the pack (mimicking pulling open a foil seam), rather than a tap triggering
 * the reveal instantly. Dragging partway previews the tear (scrubbable); releasing past
 * RIP_COMMIT_THRESHOLD commits to a full rip — playing a synthesized tear sound and a
 * sparkle burst along the seam — and fires onRipped(). Releasing short of it springs the
 * pack back closed. Reduced-motion users get a plain tap-to-open button instead.
 */
export function RipToOpen({ children, onRipped, disabled = false, className }: RipToOpenProps) {
  const reducedMotion = useReducedMotion();
  const [committed, setCommitted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const ripProgress = useMotionValue(0); // 0 = closed, 1 = fully torn open
  const soundPlayedRef = useRef(false);

  const topY = useTransform(ripProgress, [0, 1], [0, -230]);
  const topRotate = useTransform(ripProgress, [0, 1], [0, -22]);
  const topOpacity = useTransform(ripProgress, [0, 1], [1, 0]);
  const bottomY = useTransform(ripProgress, [0, 1], [0, 55]);
  const bottomOpacity = useTransform(ripProgress, [0, 1], [1, 0.35]);

  function commitRip() {
    if (committed) return;
    setCommitted(true);
    if (!soundPlayedRef.current) {
      soundPlayedRef.current = true;
      playTearSound();
    }
    animate(ripProgress, 1, { duration: 0.45, ease: "easeIn" }).then(() => onRipped());
  }

  function handleDrag(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (committed) return;
    const dragged = Math.abs(info.offset.x);
    ripProgress.set(Math.min(1, dragged / RIP_DRAG_DISTANCE));
  }

  function handleDragEnd() {
    setDragging(false);
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
      <TearSparkles active={dragging || committed} />

      {/* Top seam strip — clipped and animated up/away as the pack tears open. Only a
          small strip near the top, not the whole top half. */}
      <motion.div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          clipPath: `inset(0 0 ${100 - TOP_SEAM_PERCENT}% 0)`,
          y: topY,
          rotate: topRotate,
          opacity: topOpacity,
        }}
        aria-hidden="true"
      >
        {children}
      </motion.div>
      {/* The rest of the pack — stays in place, fades slightly as the reveal takes over. */}
      <div className="overflow-hidden" style={{ clipPath: `inset(${TOP_SEAM_PERCENT}% 0 0 0)` }}>
        <motion.div style={{ y: bottomY, opacity: bottomOpacity }}>{children}</motion.div>
      </div>

      {!disabled && !committed && (
        <>
          {/* Drag-across handle pinned to the top tear seam. */}
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            dragMomentum={false}
            onDragStart={() => setDragging(true)}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className="absolute inset-x-4 top-2 z-10 flex h-8 cursor-grab items-center justify-center gap-1.5 touch-none active:cursor-grabbing"
            role="slider"
            aria-label="Drag across to rip the pack open"
            aria-valuenow={Math.round(ripProgress.get() * 100)}
          >
            <span className="border-accent/50 bg-background/60 h-[3px] w-10 rounded-full border-t border-dashed" />
            <span className="text-muted text-[10px] tracking-wide uppercase">Drag to rip</span>
            <span className="border-accent/50 bg-background/60 h-[3px] w-10 rounded-full border-t border-dashed" />
          </motion.div>
          <p className="text-muted mt-3 text-center text-xs">Drag across the top to rip it open</p>
        </>
      )}
    </div>
  );
}
