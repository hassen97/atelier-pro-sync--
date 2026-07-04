import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listRepairsTool from "./tools/list-repairs";
import searchInventoryTool from "./tools/search-inventory";
import searchCustomersTool from "./tools/search-customers";
import getShopOverviewTool from "./tools/get-shop-overview";

// The OAuth issuer MUST be the direct Supabase host, built from the project
// ref (not SUPABASE_URL, which is the .lovable.cloud proxy in production).
// VITE_SUPABASE_PROJECT_ID is inlined by Vite as a literal at build time, so
// this stays import-safe (no runtime env read).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "atelier-pro-mcp",
  title: "Atelier Pro MCP",
  version: "0.1.0",
  instructions:
    "Tools for a phone repair shop management app. Use `get_shop_overview` for a summary, " +
    "`list_repairs` to browse repair tickets, `search_inventory` for products/stock, and " +
    "`search_customers` to look up customers. All tools act as the signed-in shop owner.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getShopOverviewTool,
    listRepairsTool,
    searchInventoryTool,
    searchCustomersTool,
  ],
});
