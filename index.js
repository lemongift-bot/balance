async function verifyInitData(initData, botToken) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  
  if (!hash) return { valid: false };

  // 1. Ma'lumotlarni alfavit tartibida saralash (hash'dan tashqari)
  const keys = Array.from(urlParams.keys()).filter(k => k !== "hash").sort();
  const checkString = keys.map(k => `${k}=${urlParams.get(k)}`).join("\n");

  const encoder = new TextEncoder();

  // 2. Secret Key yaratish ("WebAppData" constant + Bot Token)
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

  // 3. Secret Key orqali checkString'ni imzolash
  const hmacKey = await crypto.subtle.importKey(
    "raw", 
    secretKeyBuffer, 
    { name: "HMAC", hash: "SHA-256" }, 
    false, 
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC", 
    hmacKey, 
    encoder.encode(checkString)
  );

  const signatureHex = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  // 4. Taqqoslash
  if (signatureHex !== hash) return { valid: false };

  // Vaqtni tekshirish
  const authDate = Number(urlParams.get("auth_date"));
  if (Math.floor(Date.now() / 1000) - authDate > 7200) {
    return { valid: false, error: "Data expired" };
  }

  return { 
    valid: true, 
    user: JSON.parse(urlParams.get("user") || "{}") 
  };
}
