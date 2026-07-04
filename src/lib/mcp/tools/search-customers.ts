import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "search_customers",
  title: "Search customers",
  description:
    "Find customers of the signed-in shop by name, phone or email. Returns contact details, balance and loyalty points.",
  inputSchema: {
    query: z
      .string()
      .trim()
      .optional()
      .describe("Text to match against customer name, phone or email. Omit to list recent customers."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Max number of customers to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    let q = supabaseForUser(ctx)
      .from("customers")
      .select("id, name, phone, email, balance, loyalty_points, created_at")
      .order("name")
      .limit(limit ?? 25);

    if (query && query.length > 0) {
      q = q.or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`);
    }

    const { data, error } = await q;
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { customers: data ?? [] },
    };
  },
});
