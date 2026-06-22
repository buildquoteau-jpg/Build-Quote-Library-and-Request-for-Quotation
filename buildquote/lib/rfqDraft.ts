export function getDraftIdFromBrowser(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("draft");
}

export async function getOrCreateDraft(builderId?: string): Promise<string> {
  const existing = getDraftIdFromBrowser();
  if (existing) return existing;

  const res = await fetch('/api/create-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ builderId: builderId ?? null }),
  })

  if (!res.ok) throw new Error('Draft creation failed')

  const { draftId } = await res.json()
  if (!draftId) throw new Error('Draft creation failed')

  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    url.searchParams.set("draft", draftId);
    window.history.replaceState({}, "", url.toString());
  }

  return draftId;
}
