import { createClient } from "@libsql/client/web";

export async function getBalance(request, env) {
  // ===== CORS =====
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Only GET allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }

  // ===== Query =====
  const url = new URL(request.url);
  const user_id = url.searchParams.get("user_id");

  if (!user_id) {
    return new Response(
      JSON.stringify({ error: "user_id is required" }),
      { status: 400, headers: corsHeaders }
    );
  }

  // ===== Turso INLINE =====
  const db = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });

  try {
    const res = await db.execute(
      "SELECT balance FROM users WHERE user_id = ?",
      [user_id]
    );

    if (res.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        user_id,
        balance: res.rows[0].balance,
      }),
      { headers: corsHeaders }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Database error",
        details: err.message,
      }),
      { status: 500, headers: corsHeaders }
    );
  }
      }
