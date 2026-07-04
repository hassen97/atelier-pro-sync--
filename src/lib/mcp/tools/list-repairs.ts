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
  name: "list_repairs",
  title: "List repairs",
  description:
    "List repair tickets for the signed-in shop, optionally filtered by status. Returns ticket number, device, status, costs and customer.",
  inputSchema: {
    status: z
      .enum(["pending", "in_progress", "completed", "delivered", "rejected"])
      .optional()
      .describe("Optional repair status filter."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Max number of repairs to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    let query = supabaseForUser(ctx)
      .from("repairs")
      .select(
        "id, ticket_number, status, device_model, problem_description, total_cost, amount_paid, deposit_date, delivery_date, customer:customers(name, phone)",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { repairs: data ?? [] },
    };
  },
});
