"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type PanInfo } from "motion/react";

export interface RipToOpenVideoProps {
  /** A real Higgsfield-generated video of this tier's pack tearing open, start-to-end —
   * not a CSS illusion over a static image. See docs/HIGGSFIELD_PROMPTS.md. */
  videoSrc: string;
  /** First-frame still, painted instantly before the video's metadata loads. */
  posterSrc?: string;
  onRipped: () => void;
  disabled?: boolean;
  className?: string;
}

const RIP_COMMIT_THRESHOLD = 0.42; // fraction of full drag distance needed to commit to a rip
const RIP_DRAG_DISTANCE = 140; // px of horizontal drag that maps to full rip progress (1.0)

/**
 * The user's drag gesture scrubs directly through a real tear-open video (mapping drag
 * progress 0..1 to `video.currentTime`), rather than animating a CSS clip-path illusion
 * over a static image (see RipToOpen.tsx, still used for tiers without a video yet).
 * Dragging partway previews the tear at that exact frame — release past
 * RIP_COMMIT_THRESHOLD and the video plays itself out to the end before firing
 * onRipped(); release short of it and the video scrubs back to frame 0.
 */
export function RipToOpenVideo({
  videoSrc,
  posterSrc,
  onRipped,
  disabled = false,
  className,
}: RipToOpenVideoProps) {
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [committed, setCommitted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoaded = () => setDuration(video.duration || 0);
    video.addEventListener("loadedmetadata", onLoaded);
    return () => video.removeEventListener("loadedmetadata", onLoaded);
  }, []);

  function seekTo(progress: number) {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = Math.min(duration, Math.max(0, progress * duration));
  }

  function commitRip() {
    if (committed) return;
    setCommitted(true);
    const video = videoRef.current;
    if (!video) {
      onRipped();
      return;
    }
    const handleEnded = () => {
      video.removeEventListener("ended", handleEnded);
      onRipped();
    };
    video.addEventListener("ended", handleEnded);
    video.play().catch(() => onRipped()); // autoplay blocked — treat as immediately ripped
  }

  function handleDrag(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (committed) return;
    const dragged = Math.abs(info.offset.x);
    seekTo(Math.min(1, dragged / RIP_DRAG_DISTANCE));
  }

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (committed) return;
    const dragged = Math.abs(info.offset.x);
    const progress = Math.min(1, dragged / RIP_DRAG_DISTANCE);
    if (progress >= RIP_COMMIT_THRESHOLD) {
      commitRip();
    } else {
      seekTo(0);
    }
  }

  if (reducedMotion) {
    return (
      <div className={className}>
        <video
          ref={videoRef}
          src={videoSrc}
          poster={posterSrc}
          muted
          playsInline
          className="aspect-[2/3] w-full rounded-xl object-cover"
        />
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
      <video
        ref={videoRef}
        src={videoSrc}
        poster={posterSrc}
        muted
        playsInline
        preload="auto"
        className="aspect-[2/3] w-full rounded-xl object-cover"
      />

      {!disabled && !committed && (
        <>
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            dragMomentum={false}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 z-10 cursor-grab touch-none active:cursor-grabbing"
            role="slider"
            aria-label="Drag to rip the pack open"
          />
          <div className="pointer-events-none absolute inset-x-4 top-2 z-20 flex h-8 items-center justify-center gap-1.5">
            <span className="border-accent/50 bg-background/60 h-[3px] w-10 rounded-full border-t border-dashed" />
            <span className="text-muted text-[10px] tracking-wide uppercase">Drag to rip</span>
            <span className="border-accent/50 bg-background/60 h-[3px] w-10 rounded-full border-t border-dashed" />
          </div>
          <p className="text-muted mt-3 text-center text-xs">Drag anywhere on the pack to rip it open</p>
        </>
      )}
    </div>
  );
}
