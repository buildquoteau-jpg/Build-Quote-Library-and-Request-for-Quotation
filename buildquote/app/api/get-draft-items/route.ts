import { NextResponse } from "next/server";
import { supabaseService as supabase } from "@/lib/supabase-service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const draft = searchParams.get("draft");

    if (!draft) {
      return NextResponse.json({ items: [] });
    }

    const { data, error } = await supabase
      .from("rfq_draft_items")
      .select("*")
      .eq("draft_id", draft);

    if (error) {
      console.error(error);
      return NextResponse.json({ items: [] });
    }

    return NextResponse.json({ items: data || [] });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ items: [] });
  }
}
