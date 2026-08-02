/**
 * Loading placeholder matching PackArt's locked 2:3 footprint, for use while tier data is
 * still being fetched (e.g. a marketplace grid's initial server round-trip boundary).
 */
export function PackArtSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={["pack-art-skeleton aspect-[2/3] w-full rounded-xl", className ?? ""].join(" ")}
      role="status"
      aria-label="Loading pack artwork"
    />
  );
}
