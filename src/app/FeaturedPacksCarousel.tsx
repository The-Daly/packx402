"use client";

import { useRouter } from "next/navigation";
import { PackCarousel, type PackCarouselItem } from "@/components/pack-art/PackCarousel";

/**
 * Thin client wrapper so the (server-rendered) landing page can still use the
 * interactive carousel: tapping/clicking the currently-showing pack navigates to its
 * detail page; dragging/flicking just spins to a different pack.
 */
export function FeaturedPacksCarousel({ items }: { items: PackCarouselItem[] }) {
  const router = useRouter();

  return (
    <PackCarousel items={items} onActivate={(item) => router.push(`/packs/${item.tierKey}`)} />
  );
}
