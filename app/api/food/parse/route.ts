import { createClient } from "@/lib/supabase/server";
import { parseMealText } from "@/lib/food/parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT_LEN = 1000;

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const text =
    body && typeof body === "object" && "text" in body
      ? (body as { text: unknown }).text
      : null;
  if (typeof text !== "string" || text.trim() === "") {
    return new Response("text is required", { status: 400 });
  }
  if (text.length > MAX_TEXT_LEN) {
    return new Response(`text must be <= ${MAX_TEXT_LEN} chars`, {
      status: 400,
    });
  }

  try {
    const items = await parseMealText(text);
    return Response.json({ items });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(msg, { status: 500 });
  }
}
