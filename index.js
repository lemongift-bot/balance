import { getBalance } from "./user/balance";
import { updateBalance } from "./user/update-balance";

export default {
  async fetch(request, env) {
    // ===== GLOBAL CORS =====
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Preflight (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // ===== ROOT =====
    if (url.pathname === "/") {
      return new Response("LemonGift🍋☄️", { headers: corsHeaders });
    }

    // ===== USER ROUTES =====
    if (url.pathname === "/user/balance") {
      return getBalance(request, env);
    }

    if (url.pathname === "/user/update-balance") {
      return updateBalance(request, env);
    }

    // ===== DEFAULT =====
    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
};
