import CryptoJS from "crypto-js";

const DEFAULT_KEY = process.env.AUTH_SECRET || "default-key-change-in-production";

export function encrypt(text: string, key = DEFAULT_KEY): string {
  return CryptoJS.AES.encrypt(text, key).toString();
}

export function decrypt(ciphertext: string, key = DEFAULT_KEY): string {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return "";
  }
}
