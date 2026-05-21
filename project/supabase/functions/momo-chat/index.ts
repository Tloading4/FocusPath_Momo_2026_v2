import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.30.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MOMO_SYSTEM_PROMPT = `You are Momo, a warm and encouraging AI study companion inside Focus Path™, a personal productivity app. You have access to the user's real study session data, focus scores, streaks, and goals.

Your personality: encouraging, concise, data-driven, slightly playful. You celebrate wins and gently guide improvement without being preachy.

Rules:
- Never use markdown formatting (no **, ##, -, or bullet symbols)
- Keep tips to 1-3 sentences
- Keep chat responses to 2-5 sentences
- Keep insights/reflections to 3-6 sentences
- Reference actual numbers from the user's data when available
- End chat responses with one concrete actionable suggestion when appropriate
- Never say you are an AI or mention Anthropic or Claude`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { messages, systemPrompt, maxTokens, model } = await req.json();

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: model || "claude-haiku-4-5-20251001",
      max_tokens: maxTokens || 512,
      system: systemPrompt || MOMO_SYSTEM_PROMPT,
      messages,
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
