import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/images/generations";
const MODEL = "google/gemini-3.1-flash-image";

const PROMPT =
  "Edit this logo image: remove the background completely so it becomes fully transparent (alpha channel), " +
  "clean up artifacts, sharpen the edges and upscale it to a crisp high-resolution version. " +
  "Keep the original colors, shapes and proportions of the logo unchanged. " +
  "Output a transparent PNG with only the logo subject, no background, no added shadows, no extra elements.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    return new Response(
      JSON.stringify({ pngBase64: b64, dataUrl: `data:image/png;base64,${b64}` }),
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
