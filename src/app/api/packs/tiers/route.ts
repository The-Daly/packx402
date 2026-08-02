import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { packTiers } from "@/server/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(packTiers).orderBy(asc(packTiers.sortOrder));
  return NextResponse.json({ tiers: rows });
}
