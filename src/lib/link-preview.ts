import type { GiftElfSupabaseClient } from "@/lib/supabase"

export type LinkPreview = { title: string | null; image: string | null }

function webUrl(value: unknown) {
  if (typeof value !== "string") return null
  try {
    const url = new URL(value.trim())
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null
  } catch {
    return null
  }
}

// Meta tags are read server-side by the `link-preview` edge function because
// browsers can't fetch other sites' HTML. Failures are non-fatal: the gift is
// still saved with whatever the user typed.
export async function fetchLinkPreview(
  client: GiftElfSupabaseClient,
  url: string
): Promise<LinkPreview> {
  try {
    const { data, error } = await client.functions.invoke("link-preview", {
      body: { url },
    })
    if (error || !data) return { title: null, image: null }
    const preview = data as { title?: unknown; image?: unknown }
    const title =
      typeof preview.title === "string"
        ? preview.title.trim().slice(0, 120)
        : ""
    return { title: title || null, image: webUrl(preview.image) }
  } catch {
    return { title: null, image: null }
  }
}
