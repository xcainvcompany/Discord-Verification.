import crypto from "crypto";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeCode(len=6){
  let out=""; for(let i=0;i<len;i++){ const idx=crypto.randomInt(0, ALPHABET.length); out+=ALPHABET[idx]; }
  return out;
}
