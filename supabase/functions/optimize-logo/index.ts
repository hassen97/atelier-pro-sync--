import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/images/generations";
const MODEL = "google/gemini-3.1-flash-image";

const PROMPT =
  "Edit this logo image for a clean cutout. Sharpen and clean up the logo, upscale it to crisp high resolution, " +
  "and place the logo subject perfectly centered on a PURE SOLID WHITE (#FFFFFF) background with generous margin. " +
  "Keep the original colors, shapes and proportions of the logo unchanged. Do NOT add any shadow, gradient, glow, " +
  "border, watermark or extra element. The background must be a single flat pure-white color so it can be removed.";

/**
 * Flood-fill from the image borders, turning connected near-white pixels
 * transparent. This removes the white background while preserving white
 * areas that are enclosed inside the logo.
 */
function removeWhiteBackground(img: Image): Image {
  const w = img.width;
  const h = img.height;
  const bmp = img.bitmap; // Uint8ClampedArray RGBA
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];

  const isWhite = (idx: number) => {
    const o = idx * 4;
    return bmp[o] > 238 && bmp[o + 1] > 238 && bmp[o + 2] > 238;
  };

  const pushIf = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (visited[idx]) return;
    visited[idx] = 1;
    if (isWhite(idx)) stack.push(idx);
  };

  // Seed from all border pixels
  for (let x = 0; x < w; x++) {
    pushIf(x, 0);
    pushIf(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    pushIf(0, y);
    pushIf(w - 1, y);
  }

  while (stack.length) {
    const idx = stack.pop()!;
    bmp[idx * 4 + 3] = 0; // set alpha to 0
    const x = idx % w;
    const y = (idx / w) | 0;
    pushIf(x + 1, y);
    pushIf(x - 1, y);
    pushIf(x, y + 1);
    pushIf(x, y - 1);
  }

  return img;
}

/** Base64-encode bytes in chunks to avoid call-stack overflow on large buffers. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth: require a valid signed-in shop owner (super_admin) ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await adminClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(
        JSON.stringify({ error: "Forbidden — shop owner required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => null);
    const imageDataUrl: string | undefined = body?.imageDataUrl;
    if (!imageDataUrl || typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
      return new Response(
        JSON.stringify({ error: "imageDataUrl (data:image/...;base64,...) is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiRes = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "");
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de demandes. Réessayez dans un instant." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés. Veuillez recharger votre espace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.error("AI gateway error", aiRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Échec de l'optimisation IA", detail: errText.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiRes.json();
    const b64: string | undefined = data?.data?.[0]?.b64_json;
    if (!b64) {
      console.error("No image returned", JSON.stringify(data).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Aucune image générée par l'IA" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Decode, remove the flat white background → true alpha transparency, re-encode.
    let outBase64 = b64;
    try {
      const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const decoded = await Image.decode(raw);
      const transparent = removeWhiteBackground(decoded);
      const png = await transparent.encode(); // PNG with alpha
      outBase64 = bytesToBase64(new Uint8Array(png));
    } catch (e) {
      console.error("background removal failed, returning raw AI image", e);
    }

    return new Response(
      JSON.stringify({ pngBase64: outBase64, dataUrl: `data:image/png;base64,${outBase64}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("optimize-logo error", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne", detail: String(err).slice(0, 300) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
