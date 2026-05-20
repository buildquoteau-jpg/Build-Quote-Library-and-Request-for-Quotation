import { supabase } from "@/lib/supabase";

// Draft ID comes only from the URL. No localStorage fallback — a new page
// visit without a ?draft= param always means a clean session.
export function getDraftIdFromBrowser(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("draft");
}

export async function getOrCreateDraft(builderId?: string): Promise<string> {
  const existing = getDraftIdFromBrowser();
  if (existing) return existing;

  const insertData: Record<string, string> = {}
  if (builderId) insertData.builder_id = builderId

  const { data, error } = await supabase
    .from("rfq_drafts")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("Draft creation failed", error);
    throw new Error("Draft creation failed");
  }

  const draftId = data.id;

  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    url.searchParams.set("draft", draftId);
    window.history.replaceState({}, "", url.toString());
  }

  return draftId;
}
