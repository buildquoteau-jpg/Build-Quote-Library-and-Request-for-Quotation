import { NextResponse } from "next/server";
import { supabaseService as supabase } from "@/lib/supabase-service";

function normaliseQty(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const cleaned = raw.replace(/,/g, '');
  const num = Number(cleaned);

  return Number.isFinite(num) ? num : null;
}

export async function POST(req: Request) {
  try {
    const { draftId, items } = await req.json();

    if (!draftId || !Array.isArray(items)) {
      return NextResponse.json({ error: "Missing draftId or items" }, { status: 400 });
    }

    if (items.length === 0) {
      await supabase.from("rfq_draft_items").delete().eq("draft_id", draftId);
      return NextResponse.json({ success: true });
    }

    const rows = items.map((item: any) => ({
      draft_id: draftId,
      name: item.name || '',
      sku: item.sku || '',
      description: item.desc || '',
      uom: item.uom || '',
      qty: normaliseQty(item.qty),
      length_mm: item.length_mm ?? null,
      width_mm: item.width_mm ?? null,
      height_mm: item.height_mm ?? null,
      thickness_mm: item.thickness_mm ?? null,
      depth_mm: item.depth_mm ?? null,
      gauge_mm: item.gauge_mm ?? null,
      diameter_mm: item.diameter_mm ?? null,
      roll_m: item.roll_m ?? null,
      weight_kg: item.weight_kg ?? null,
      pieces: item.pieces ?? null,
      procurement_route: item.procurement_route ?? null,
    }));

    const { error } = await supabase
      .from("rfq_draft_items")
      .insert(rows);

    if (error) {
      console.error("Save draft items error:", error);
      return NextResponse.json(
        {
          error: "We couldn’t save those parsed items. Please review the list and try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Save draft items error:", err);
    return NextResponse.json(
      {
        error: "We couldn’t save those parsed items. Please try a cleaner file or enter items manually.",
      },
      { status: 500 }
    );
  }
}
