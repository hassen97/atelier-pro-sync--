import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

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
  name: "get_shop_overview",
  title: "Get shop overview",
  description:
    "Get a quick overview of the signed-in shop: number of customers, products, and repairs pending vs in progress.",
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    const sb = supabaseForUser(ctx);

    const [customers, products, pending, inProgress] = await Promise.all([
      sb.from("customers").select("id", { count: "exact", head: true }),
      sb.from("products").select("id", { count: "exact", head: true }),
      sb.from("repairs").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("repairs").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
    ]);

    const firstError =
      customers.error || products.error || pending.error || inProgress.error;
    if (firstError)
      return { content: [{ type: "text", text: firstError.message }], isError: true };

    const overview = {
      customers: customers.count ?? 0,
      products: products.count ?? 0,
      repairs_pending: pending.count ?? 0,
      repairs_in_progress: inProgress.count ?? 0,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(overview, null, 2) }],
      structuredContent: { overview },
    };
  },
});
