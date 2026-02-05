// src/hooks/useZenTone.ts
import { useEffect, useRef, useCallback } from "react";

// 禅意五声音阶 (Pentatonic Minor) 频率表
const ZEN_SCALE = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25];

export function useZenTone(trigger: any) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isEnabled = useRef(false);

  // 核心发声逻辑 (Play a single note)
  const playTone = useCallback(() => {
    if (!audioCtxRef.current) return;

    const ctx = audioCtxRef.current;
    
    // 如果 Context 被挂起（浏览器策略），尝试恢复
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // 1. 选音
    const freq = ZEN_SCALE[Math.floor(Math.random() * ZEN_SCALE.length)];
    const finalFreq = Math.random() > 0.8 ? freq / 2 : freq;

    // 2. 振荡器 (Oscillator)
    const osc = ctx.createOscillator();
    osc.type = "sine"; 
    osc.frequency.setValueAtTime(finalFreq, now);

    // 3. 包络 (Envelope) - 调大一点音量
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.05); // Attack
    gain.gain.exponentialRampToValueAtTime(0.001, now + 4.0); // Long Release

    // 4. 回声 (Delay)
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.4; 
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.3; 

    // 连接
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(ctx.destination);

    // 播放
    osc.start(now);
    osc.stop(now + 5.0);
    
    console.log("🎵 Tone Played:", finalFreq, "Hz"); // Debug Log
  }, []);

  // 初始化音频上下文 (由用户点击触发)
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      // 创建 Context
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
      audioCtxRef.current = new Ctx();
      isEnabled.current = true;
      console.log("🔊 Audio System Initialized");
      
      // 【关键修复】点击的一瞬间，立刻播放一个“启动音”
      playTone(); 
    } else if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().then(() => {
        console.log("🔊 Audio Resumed");
        playTone(); // 恢复时也播放一声
      });
    }
  }, [playTone]);

  // 监听触发器 (新区块)
  useEffect(() => {
    // 只有当音频系统已启用(用户点过屏幕)，且 trigger 变化时才播放
    if (trigger && isEnabled.current) {
      playTone();
    }
  }, [trigger, playTone]);

  return { initAudio };
}