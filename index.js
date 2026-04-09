import crypto from "crypto"; // Cloudflare Workers-da Web Crypto API ishlaydi

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers: corsHeaders });
      }

      const { initData } = await request.json();
      if (!initData) {
        return json({ ok: false, error: "initData missing" }, 400, corsHeaders);
      }

      const botToken = env.BOT_TOKEN; // wrangler.toml’da qo‘shilgan

      // initData verification
      const result = await verifyInitData(initData, botToken);

      if (!result.valid) {
        return json({ ok: false, error: "Invalid initData" }, 401, corsHeaders);
      }

      return json({ ok: true, user: result.user }, 200, corsHeaders);

    } catch (err) {
      return json({ ok: false, error: err.message }, 500, corsHeaders);
    }
  }
};

// =========================
// 🔹 JSON helper
// =========================
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}

// =========================
// 🔹 initData verification
// =========================
async function verifyInitData(initData, botToken) {
  // Parse initData string: key1=value1&key2=value2...
  const params = Object.fromEntries(initData.split("&").map(pair => {
    const [key, value] = pair.split("=");
    return [key, decodeURIComponent(value)];
  }));

  const hash = params.hash;
  if (!hash) return { valid: false };

  // Telegram secret key
  const secretKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(botToken),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Build check string (sorted keys except hash)
  const checkString = Object.keys(params)
    .filter(k => k !== "hash")
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join("\n");

  // Compute HMAC SHA256
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    secretKey,
    new TextEncoder().encode(checkString)
  );

  const sigHex = Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  // Compare Telegram hash vs computed HMAC
  if (sigHex !== hash) return { valid: false };

  // Optional: auth_date check (2 soatdan oshmasligi)
  const authDate = Number(params.auth_date);
  if (Date.now() / 1000 - authDate > 7200) {
    return { valid: false };
  }

  // Agar valid
  return { valid: true, user: JSON.parse(params.user || "{}") };
}