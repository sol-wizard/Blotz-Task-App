export function darkenHex(hex:string, amount: number): string{
    const a = Math.min(1, Math.max(0,amount));

const cleaned = hex.trim().replace(/^#/, "");

if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return hex;
  }

  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const factor = 1 - a;

  const rr = Math.max(0, Math.min(255, Math.floor(r * factor)));
  const gg = Math.max(0, Math.min(255, Math.floor(g * factor)));
  const bb = Math.max(0, Math.min(255, Math.floor(b * factor)));
  const toHex2 = (n: number) => n.toString(16).padStart(2, "0");

  return `#${toHex2(rr)}${toHex2(gg)}${toHex2(bb)}`.toUpperCase();
}


