// src/utils/hexagrams.ts
type Bit = 0 | 1;

export const HEXAGRAM_DATA: Record<number, { name: string; en: string; meaning: string }> = {
  63: { name: "乾", en: "THE CREATIVE", meaning: "Originating Power" },
  0:  { name: "坤", en: "THE RECEPTIVE", meaning: "Earth / Submission" },
  42: { name: "既济", en: "AFTER COMPLETION", meaning: "Perfect Equilibrium" },
  21: { name: "未济", en: "BEFORE COMPLETION", meaning: "Infinite Potential" },
  // 这里只是示例，如果不匹配会显示默认值
};

export function getHexagramInfo(bits: Bit[]) {
  const val = bits.reduce((acc, bit, i) => acc + (bit << i), 0);
  return HEXAGRAM_DATA[val] || { name: "未知", en: "DECODING...", meaning: "Calculating Flux..." };
}