import { NextResponse } from "next/server";
import { supabaseService as supabase } from "@/lib/supabase-service";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function normaliseQty(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const cleaned = raw.replace(/,/g, '');
  const num = Number(cleaned);

  return Number.isFinite(num) ? num : null;
}

/**
 * Verify the caller is allowed to write to this draft.
 * - Guest drafts (builder_id null) are open (the public shopping-list → convert
 *   flow creates the draft just before the user is sent to login).
 * - Owned drafts (builder_id set) require a matching logged-in session.
 * Returns an error response if denied, or null if allowed.
 */
async function assertDraftAccess(draftId: string): Promise<NextResponse | null> {
  const { data: draft, error } = await supabase
    .from("rfq_drafts")
    .select("builder_id")
    .eq("id", draftId)
    .maybeSingle();

  if (error) {
    console.error("Draft lookup error:", error);
    return NextResponse.json({ error: "Could not verify draft." }, { status: 500 });
  }
  if (!draft) {
    return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  }
  // Open guest draft — no owner to enforce.
  if (!draft.builder_id) return null;

  const authClient = await createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user || user.id !== draft.builder_id) {
    return NextResponse.json({ error: "Not authorised for this draft." }, { status: 403 });
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const { draftId, items, mode } = await req.json();

    if (!draftId || !Array.isArray(items)) {
      return NextResponse.json({ error: "Missing draftId or items" }, { status: 400 });
    }

    // 'append' adds rows to an existing draft (library "add these N items").
    // 'replace' (default) makes the draft exactly match the submitted list —
    // delete-then-insert so repeated full-state saves can't duplicate rows.
    const writeMode = mode === "append" ? "append" : "replace";

    const denied = await assertDraftAccess(draftId);
    if (denied) return denied;

    // Replace with an empty list = clear the draft.
    if (writeMode === "replace" && items.length === 0) {
      await supabase.from("rfq_draft_items").delete().eq("draft_id", draftId);
      return NextResponse.json({ success: true });
    }
    // Appending nothing is a no-op.
    if (items.length === 0) {
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

    // Replace = clear existing rows first so the draft mirrors the submitted list.
    if (writeMode === "replace") {
      const { error: delError } = await supabase
        .from("rfq_draft_items")
        .delete()
        .eq("draft_id", draftId);
      if (delError) {
        console.error("Clear draft items error:", delError);
        return NextResponse.json(
          { error: "We couldn’t save those items. Please try again." },
          { status: 500 }
        );
      }
    }

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
