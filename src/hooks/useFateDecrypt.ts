// src/hooks/useFateDecrypt.ts
import { useState, useEffect, useRef } from 'react';
import { parseHashToFate } from '../utils/fateLogic';
import type { LineData, HexagramMeta } from '../utils/fateLogic';

export function useFateDecrypt(realHash: string) {
  const [displayLines, setDisplayLines] = useState<LineData[]>([]);
  const [displayMeta, setDisplayMeta] = useState<HexagramMeta | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    setIsDecrypting(true);
    let step = 0;
    const maxSteps = 15;
    
    const interval = setInterval(() => {
      if (!isMounted.current) return;
      step++;
      
      const randomHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      const noisyFate = parseHashToFate(randomHash);
      
      if (step < maxSteps) {
        setDisplayLines(noisyFate.lines);
        setDisplayMeta({
          ...noisyFate.meta,
          name: "⚡ SYNCING ⚡",
          pinyin: "DECRYPTING ON-CHAIN FATE",
          judgment: `BLOCK CONFIRMATION: ${Math.floor(Math.random() * 100)}%`
        });
      } else {
        const realFate = parseHashToFate(realHash);
        setDisplayLines(realFate.lines);
        setDisplayMeta(realFate.meta);
        setIsDecrypting(false);
        clearInterval(interval);
      }
    }, 60);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [realHash]);

  return { displayLines, displayMeta, isDecrypting };
}