export async function verifyHmac(
  secret: string,
  signatureHex: string,
  body: string,
): Promise<boolean> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));

  const expectedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (!/^[a-f0-9]{64}$/i.test(signatureHex)) return false;

  if (signatureHex.length !== expectedHex.length) return false;

  let mismatch = 0;

  for (let i = 0; i < signatureHex.length; i++) {
    mismatch |= signatureHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }

  return mismatch === 0;
}
