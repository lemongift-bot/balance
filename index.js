async function verifyInitData(initData, botToken) {
  // 1. Ma'lumotlarni qismlarga ajratamiz
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  
  if (!hash) return { valid: false };

  // 2. Hashdan tashqari barcha kalitlarni alfavit bo'yicha tartiblaymiz
  const keys = Array.from(urlParams.keys())
    .filter(k => k !== "hash")
    .sort();

  // 3. Check string hosil qilamiz (decode qilinmagan holda!)
  const checkString = keys
    .map(k => `${k}=${urlParams.get(k)}`)
    .join("\n");

  const encoder = new TextEncoder();

  // 4. Secret Key yaratish (Telegram standarti)
  const webAppDataKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const secretKeyBuffer = await crypto.subtle.sign(
    "HMAC",
    webAppDataKey,
    encoder.encode(botToken)
  );

  const hmacKey = await crypto.subtle.importKey(
    "raw",
    secretKeyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // 5. Yakuniy hashni hisoblash
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    hmacKey,
    encoder.encode(checkString)
  );

  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  // 6. Taqqoslash
  if (signatureHex !== hash) {
    console.log("Hisoblangan:", signatureHex);
    console.log("Kelgan hash:", hash);
    return { valid: false };
  }

  return { 
    valid: true, 
    user: JSON.parse(urlParams.get("user") || "{}") 
  };
}
