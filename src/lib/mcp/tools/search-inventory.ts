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
  name: "search_inventory",
  title: "Search inventory",
  description:
    "Search the shop's product inventory by name, SKU or barcode. Returns matching products with stock quantity and prices.",
  inputSchema: {
    query: z
      .string()
      .trim()
      .optional()
      .describe("Text to match against product name or SKU. Omit to list recent products."),
    low_stock_only: z
      .boolean()
      .optional()
      .describe("When true, only return products at or below their minimum stock level."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Max number of products to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, low_stock_only, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    let q = supabaseForUser(ctx)
      .from("products")
      .select(
        "id, name, sku, quantity, min_quantity, cost_price, sell_price, category:categories(name)",
      )
      .order("name")
      .limit(limit ?? 25);

    if (query && query.length > 0) {
      q = q.or(`name.ilike.%${query}%,sku.ilike.%${query}%`);
    }

    const { data, error } = await q;
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };

    let rows = data ?? [];
    if (low_stock_only) {
      rows = rows.filter(
        (p: any) => Number(p.quantity) <= Number(p.min_quantity ?? 0),
      );
    }

    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { products: rows },
    };
  },
});
