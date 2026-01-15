import { createClient } from "@libsql/client/web";

export async function updateBalance(request, env) {
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

  // ===== Query params =====
  const url = new URL(request.url);

  const user_id = url.searchParams.get("user_id"); // majburiy
  const amountRaw = url.searchParams.get("amount"); // majburiy (+ yoki -)

  if (!user_id) {
    return new Response(
      JSON.stringify({ error: "user_id is required" }),
      { status: 400, headers: corsHeaders }
    );
  }

  if (!amountRaw) {
    return new Response(
      JSON.stringify({ error: "amount is required" }),
      { status: 400, headers: corsHeaders }
    );
  }

  const amount = Number(amountRaw);

  if (Number.isNaN(amount) || amount === 0) {
    return new Response(
      JSON.stringify({ error: "amount must be a non-zero number" }),
      { status: 400, headers: corsHeaders }
    );
  }

  // ===== Turso INLINE =====
  const db = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });

  try {
    // User borligini tekshiramiz
    const userRes = await db.execute(
      "SELECT balance FROM users WHERE user_id = ?",
      [user_id]
    );

    if (userRes.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // ===== Atomar update (+ / -) =====
    await db.execute(
      "UPDATE users SET balance = balance + ? WHERE user_id = ?",
      [amount, user_id]
    );

    // Yangi balansni qaytaramiz
    const updated = await db.execute(
      "SELECT balance FROM users WHERE user_id = ?",
      [user_id]
    );

    return new Response(
      JSON.stringify({
        status: "ok",
        user_id,
        change: amount,
        balance: updated.rows[0].balance,
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
