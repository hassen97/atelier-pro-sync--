import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// HMAC-SHA256 signing using Web Crypto API
async function createHMAC(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function verifyHMAC(payload: string, signature: string, secret: string): Promise<boolean> {
  const expected = await createHMAC(payload, secret);
  return expected === signature;
}

function generateChallenge(): { a: number; op: string; b: number; question: string; answer: number } {
  const ops = ["+", "-", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)];

  let a: number, b: number, answer: number;

  if (op === "×") {
    a = Math.floor(Math.random() * 8) + 2; // 2-9
    b = Math.floor(Math.random() * 8) + 2; // 2-9
    answer = a * b;
  } else if (op === "-") {
    a = Math.floor(Math.random() * 16) + 5; // 5-20
    b = Math.floor(Math.random() * (a - 1)) + 1; // 1 to a-1 (always positive)
    answer = a - b;
  } else {
    a = Math.floor(Math.random() * 18) + 1; // 1-18
    b = Math.floor(Math.random() * 18) + 1; // 1-18
    answer = a + b;
  }

  return { a, op, b, question: `${a} ${op} ${b} = ?`, answer };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const { action, challengeId, answer } = await req.json().catch(() => ({}));

    // Generate a new challenge
    if (action === "generate" || (!action && !challengeId)) {
      const challenge = generateChallenge();
      const payload = btoa(`${challenge.a}:${challenge.op}:${challenge.b}`);
      const signature = await createHMAC(payload, secret);
      const id = `${payload}:${signature}`;

      return new Response(
        JSON.stringify({ question: challenge.question, challengeId: id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify a challenge answer
    if (action === "verify" || challengeId) {
      if (!challengeId || answer === undefined || answer === null || answer === "") {
        return new Response(
          JSON.stringify({ valid: false, reason: "missing_fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const parts = challengeId.split(":");
      if (parts.length !== 2) {
        return new Response(
          JSON.stringify({ valid: false, reason: "invalid_challenge" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const [payload, signature] = parts;

      // Verify HMAC — prevents tampering
      const isValid = await verifyHMAC(payload, signature, secret);
      if (!isValid) {
        return new Response(
          JSON.stringify({ valid: false, reason: "tampered_challenge" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Decode and solve
      let decoded: string;
      try {
        decoded = atob(payload);
      } catch {
        return new Response(
          JSON.stringify({ valid: false, reason: "invalid_challenge" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const [aStr, op, bStr] = decoded.split(":");
      const a = parseInt(aStr, 10);
      const b = parseInt(bStr, 10);

      if (isNaN(a) || isNaN(b)) {
        return new Response(
          JSON.stringify({ valid: false, reason: "invalid_challenge" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let correctAnswer: number;
      if (op === "+") correctAnswer = a + b;
      else if (op === "-") correctAnswer = a - b;
      else if (op === "×") correctAnswer = a * b;
      else {
        return new Response(
          JSON.stringify({ valid: false, reason: "invalid_challenge" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userAnswer = parseInt(String(answer), 10);
      if (isNaN(userAnswer) || userAnswer !== correctAnswer) {
        return new Response(
          JSON.stringify({ valid: false, reason: "wrong_answer" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ valid: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "invalid_action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("math-challenge error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
