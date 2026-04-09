export default {
  async fetch(request, env) {
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

      const body = await request.json();
      const initData = body.initData;

      if (!initData) {
        return new Response(JSON.stringify({ ok: false, error: "initData missing" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const result = await verifyInitData(initData, env.BOT_TOKEN);

      return new Response(JSON.stringify(result), {
        status: result.valid ? 200 : 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });

    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
};

async function verifyInitData(initData, botToken) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  if (!hash) return { valid: false };

  const keys = Array.from(urlParams.keys()).filter(k => k !== "hash").sort();
  const checkString = keys.map(k => `${k}=${urlParams.get(k)}`).join("\n");

  const encoder = new TextEncoder();
  const webAppDataKey = await crypto.subtle.importKey(
    "raw", encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  
  const secretKeyBuffer = await crypto.subtle.sign("HMAC", webAppDataKey, encoder.encode(botToken));
  const hmacKey = await crypto.subtle.importKey(
    "raw", secretKeyBuffer,
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", hmacKey, encoder.encode(checkString));
  const signatureHex = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

  if (signatureHex !== hash) return { valid: false, error: "Hash mismatch" };

  const authDate = Number(urlParams.get("auth_date"));
  if (Math.floor(Date.now() / 1000) - authDate > 86400) return { valid: false, error: "Data expired" };

  return { valid: true, user: JSON.parse(urlParams.get("user") || "{}") };
}
