// src/components/CyberIChing.tsx
import * as THREE from "three";
import React, { useCallback, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sparkles } from "@react-three/drei";
import { EffectComposer, Bloom, Scanline, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useFateDecrypt } from "../hooks/useFateDecrypt";
import { useZenTone } from "../hooks/useZenTone";
import type { LineData } from "../utils/fateLogic"; // 确保使用 type 导入

// ------------------------------------------------------------------
// Shader Helpers
// ------------------------------------------------------------------
function inject(src: string, needle: string, insert: string) {
  return src.includes(needle) ? src.replace(needle, insert) : src;
}

// ------------------------------------------------------------------
// Component: Yin Ring (The Broken Line - 阴爻)
// ------------------------------------------------------------------
function YinRing({ radius, tube, index, intensity, isChanging }: { radius: number; tube: number; index: number, intensity: number, isChanging: boolean }) {
  const shaderRef = useRef<THREE.Shader | null>(null);
  const phase = useMemo(() => index * 0.85, [index]);

  const onBeforeCompile = useCallback(
    (shader: THREE.Shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uGapBase = { value: 0.23 };
      shader.uniforms.uGapAmp = { value: 0.06 };
      shader.uniforms.uPhase = { value: phase };
      shader.uniforms.uIntensity = { value: intensity };
      shader.uniforms.uIsChanging = { value: isChanging ? 1.0 : 0.0 };

      // Inject Uniforms & Varyings
      shader.vertexShader = inject(shader.vertexShader, "#include <common>", `
        #include <common>
        varying float vAngle;
      `);
      shader.vertexShader = inject(shader.vertexShader, "#include <begin_vertex>", `
        #include <begin_vertex>
        vAngle = atan(transformed.y, transformed.x);
      `);

      shader.fragmentShader = inject(shader.fragmentShader, "#include <common>", `
        #include <common>
        uniform float uTime; 
        uniform float uGapBase; 
        uniform float uGapAmp; 
        uniform float uPhase; 
        uniform float uIntensity;
        uniform float uIsChanging;
        varying float vAngle; 
        const float PI = 3.141592653589793; 
        const float TWO_PI = 6.283185307179586;
      `);

      // Gap Logic with Glitch for Changing Lines
      const gapCode = `
        float breath = (sin(uTime * 0.9 + uPhase) * 0.5 + 0.5);
        
        // 如果是变爻，间隙会不稳定地震颤 (Glitch effect)
        float glitch = uIsChanging * (sin(uTime * 30.0) * 0.1); 
        float gap = uGapBase + (uGapAmp * breath) + glitch;
        
        float diff = abs(mod(vAngle - 0.0 + PI, TWO_PI) - PI);
        if (diff < gap) discard;
      `;

      if (shader.fragmentShader.includes("#include <clipping_planes_fragment>")) {
        shader.fragmentShader = shader.fragmentShader.replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>\n${gapCode}`);
      } else {
        shader.fragmentShader = shader.fragmentShader.replace("void main() {", `void main() {\n${gapCode}`);
      }
      shaderRef.current = shader;
    },
    [phase, intensity, isChanging]
  );

  useFrame(({ clock }) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = clock.elapsedTime;
      // 平滑过渡 intensity
      shaderRef.current.uniforms.uIntensity.value = THREE.MathUtils.lerp(shaderRef.current.uniforms.uIntensity.value, intensity, 0.1);
    }
  });

  return (
    <mesh>
      <torusGeometry args={[radius, tube, 36, 320]} />
      <meshStandardMaterial 
        color={isChanging ? "#222" : "#050608"} 
        roughness={0.2} 
        metalness={0.8} 
        onBeforeCompile={onBeforeCompile} 
      />
    </mesh>
  );
}

// ------------------------------------------------------------------
// Component: Yang Ring (The Solid Line - 阳爻)
// ------------------------------------------------------------------
function YangRing({ radius, tube, intensity, isChanging }: { radius: number; tube: number, intensity: number, isChanging: boolean }) {
  const shaderRef = useRef<THREE.Shader | null>(null);

  const onBeforeCompile = useCallback((shader: THREE.Shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uPulseSpeed = { value: 1.1 };
    shader.uniforms.uNeon = { value: new THREE.Color("#00ffff") }; // Cyan
    shader.uniforms.uIntensity = { value: intensity };
    shader.uniforms.uIsChanging = { value: isChanging ? 1.0 : 0.0 };

    shader.vertexShader = inject(shader.vertexShader, "#include <common>", `
      #include <common>
      varying float vAngle;
    `);
    shader.vertexShader = inject(shader.vertexShader, "#include <begin_vertex>", `
      #include <begin_vertex>
      vAngle = atan(transformed.y, transformed.x);
    `);

    shader.fragmentShader = inject(shader.fragmentShader, "#include <common>", `
      #include <common>
      uniform float uTime; 
      uniform float uPulseSpeed; 
      uniform vec3 uNeon; 
      uniform float uIntensity;
      uniform float uIsChanging;
      varying float vAngle;
    `);

    // Pulse Logic
    shader.fragmentShader = shader.fragmentShader.replace("#include <output_fragment>", `
      float fresnel = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0);
      
      // 变爻逻辑: 老阳 (Old Yang) 会产生剧烈的过曝脉冲
      float changeFactor = 1.0 + (uIsChanging * 2.0 * (sin(uTime * 15.0)*0.5+0.5)); 
      
      float pulse = 0.5 + 0.5 * sin(uTime * uPulseSpeed + vAngle * 6.0);
      vec3 finalColor = uNeon * (fresnel * 0.85 + pulse * 0.35) * uIntensity * changeFactor;
      
      // 变爻时加入白色核心 (White Core)
      if (uIsChanging > 0.5) {
         finalColor = mix(finalColor, vec3(1.0), 0.3 * sin(uTime * 20.0));
      }

      outgoingLight += finalColor;
      #include <output_fragment>
    `);
    shaderRef.current = shader;
  }, [intensity, isChanging]);

  useFrame(({ clock }) => {
    if (shaderRef.current) {
        shaderRef.current.uniforms.uTime.value = clock.elapsedTime;
        shaderRef.current.uniforms.uIntensity.value = THREE.MathUtils.lerp(shaderRef.current.uniforms.uIntensity.value, intensity, 0.1);
    }
  });

  return (
    <mesh>
      <torusGeometry args={[radius, tube, 36, 320]} />
      <meshPhysicalMaterial 
        color="#00eaff" 
        emissive="#00ffff" 
        emissiveIntensity={isChanging ? 4.0 : 2.6} 
        transmission={0.9} 
        thickness={0.35} 
        roughness={0.08} 
        ior={1.55} 
        clearcoat={1} 
        metalness={0.05} 
        transparent 
        toneMapped={false} 
        side={THREE.DoubleSide} 
        onBeforeCompile={onBeforeCompile} 
      />
    </mesh>
  );
}

// ------------------------------------------------------------------
// Wrapper: Ring Controller
// ------------------------------------------------------------------
function RingWrapper({ lineData, index }: { lineData: LineData; index: number }) {
  const g = useRef<THREE.Group>(null!);
  const { bit, isChanging, energyLevel } = lineData;
  const baseRadius = 0.65; 
  const step = 0.19; 
  const tube = 0.052;

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const dir = index % 2 === 0 ? 1 : -1;
    
    // 变爻时旋转更不稳定
    const speedMult = isChanging ? 2.5 : 1.0; 
    
    g.current.rotation.z += dir * delta * 0.22 * speedMult;
    g.current.rotation.x = Math.sin(t * 0.22 + index * 0.7) * 0.12;
    g.current.rotation.y = Math.cos(t * 0.18 + index * 0.6) * 0.10;
  });

  return (
    <group ref={g}>
        {bit === 1 ? (
            <YangRing radius={baseRadius + index * step} tube={tube} intensity={energyLevel} isChanging={isChanging} />
        ) : (
            <YinRing radius={baseRadius + index * step} tube={tube} index={index} intensity={energyLevel} isChanging={isChanging} />
        )}
    </group>
  );
}

// ------------------------------------------------------------------
// Main View
// ------------------------------------------------------------------
export function CyberIChing({ hash = "0x8f2a5594907f1f4d1c2d3b14b0d90d1f7b1e9f0a6b7c8d9e0f11223344556677" }: { hash?: string }) {
  
  // 1. 获取解密后的视觉数据
  const { displayLines, displayMeta, isDecrypting } = useFateDecrypt(hash);
  
  // 2. 挂载声音合成器 (监听 hash 变化)
  const { initAudio } = useZenTone(hash);

  return (
    <div 
      // 3. 点击任意位置初始化音频上下文
      onClick={initAudio}
      style={{ 
        width: "100%", height: "100vh", background: "#030308", 
        position: 'relative', overflow: 'hidden', cursor: 'pointer' 
      }}
    >
      
      {/* 3D Scene */}
      <Canvas 
        camera={{ position: [0, 0, 4.25], fov: 48 }} 
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }} 
        dpr={[1, 2]}
      >
        <color attach="background" args={["#030308"]} />
        <fog attach="fog" args={["#030308", 2.8, 9]} />
        
        <ambientLight intensity={0.18} />
        <pointLight position={[3.2, 1.4, 3.4]} intensity={1.25} />
        <pointLight position={[-3.0, -1.8, -2.5]} intensity={0.6} color={"#2c4dff"} />
        
        {/* Rings Group */}
        <group rotation={[0.25, 0, 0]}>
          {displayLines.map((line, i) => (
             <RingWrapper key={i} lineData={line} index={i} />
          ))}
        </group>
        
        {/* Digital Particles */}
        <Sparkles 
            count={isDecrypting ? 150 : 90} 
            scale={[7, 7, 7]} 
            size={2} 
            speed={isDecrypting ? 0.5 : 0.12} 
            opacity={0.22} 
            color={isDecrypting ? "#ffffff" : "#ffffff"}
        />
        
        <EffectComposer multisampling={0}>
          <Bloom intensity={isDecrypting ? 2.5 : 1.35} luminanceThreshold={0.1} luminanceSmoothing={0.2} mipmapBlur />
          <Scanline density={1.25} blendFunction={BlendFunction.OVERLAY} opacity={0.5} />
          <Noise opacity={isDecrypting ? 0.15 : 0.02} /> 
        </EffectComposer>
        
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.25} />
      </Canvas>

      {/* ---------------- UI / HUD Layer ---------------- */}

      {/* 1. Left Bottom: The Cyber Altar (Oracle Interpretation) */}
      <div style={{
          position: 'absolute', bottom: 80, left: 60, zIndex: 10,
          // 使用赛博字体，如果加载失败则回退到 Courier
          fontFamily: "'Share Tech Mono', 'Courier New', monospace",
          color: isDecrypting ? '#ffffff' : '#00eaff',
          textShadow: isDecrypting ? '0 0 15px #ffffff' : '0 0 20px rgba(0,234,255,0.5)', // 白光晕
          transition: 'all 0.3s ease',
          pointerEvents: 'none'
      }}>
        {displayMeta && (
            <>
                <div style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '0.5rem', letterSpacing: '4px' }}>
                     ORACLE OUTPUT
                </div>
                <h1 style={{ 
                    fontSize: '3.5rem', margin: 0, fontWeight: 300,
                    textShadow: isDecrypting ? '2px 0 10px #ffe57eff' : '0 0 20px #00eaff80',
                    filter: isDecrypting ? 'blur(1px)' : 'none'
                }}>
                    {displayMeta.name}
                </h1>
                <div style={{ fontSize: '1rem', opacity: 0.8, marginBottom: '1.5rem', letterSpacing: '1px', fontStyle: 'italic' }}>
                    {displayMeta.pinyin}
                </div>
                <div style={{ 
                    borderLeft: `2px solid ${isDecrypting ? '#ff0055' : '#00eaff'}`, 
                    paddingLeft: '1.5rem', maxWidth: '380px', lineHeight: '1.6', fontSize: '0.9rem',
                    background: 'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)'
                }}>
                    {displayMeta.judgment}
                </div>
                
                <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: '#c8f5c2ff' }}>
                    RITUAL HINT: {displayMeta.ritualHint}
                </div>
            </>
        )}
      </div>

      {/* 2. Right: Hash Deconstructor (Logic of Fate) */}
      
      <div style={{
          position: 'absolute', bottom: 60, right: 70, zIndex: 10, // 改为 bottom-right 对齐
          textAlign: 'right', 
          fontFamily: "'Share Tech Mono', monospace", 
          // 字体调大，跟左边的正文(0.9rem)保持视觉平衡
          fontSize: '14px', 
          color: '#444',
          display: 'flex', flexDirection: 'column', gap: '12px' // 增加行间距
      }}>
         <div style={{
             marginBottom: '10px', 
             color: isDecrypting ? '#00eaff80' : '#ffffffff', // 标题也随状态变色
             fontSize: '12px', letterSpacing: '2px', opacity: 0.8 
         }}>
             DATA STREAM DECOMPOSITION
         </div>
         
         {/* 列表渲染 */}
         {[...displayLines].reverse().map((line, i) => {
             const realIndex = 5 - i; 
             return (
                 <div key={realIndex} style={{ 
                     display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px',
                     // 整体字体变大
                     fontSize: '16px', 
                     color: line.isChanging ? (isDecrypting ? '#00eaff80' : '#00eaff80') : '#ffffffff',
                     textShadow: line.isChanging ? '0 0 8px currentColor' : 'none',
                     transition: 'color 0.3s ease'
                 }}>
                     {/* 原始哈希值 */}
                     <span style={{opacity: 0.5, fontSize: '12px', fontFamily: 'monospace'}}>
                        {line.rawSegment}
                     </span>
                     
                     {/* 阴阳爻符号 (加大加粗) */}
                     <span style={{fontWeight: 'bold', fontSize: '18px', letterSpacing: '-2px'}}>
                        {line.bit === 1 ? '—————' : '—— ——'}
                     </span>
                     
                     {/* 变爻指示点 */}
                     <span style={{width: '10px', textAlign: 'center', fontSize: '10px', color: '#ffcc00'}}>
                         {line.isChanging ? '●' : ''}
                     </span>
                 </div>
             )
         })}
      </div>

      {/* 3. Audio Hint */}
      <div style={{
        position: 'absolute', top: 50, left: 50, 
        color: 'rgba(68, 227, 255, 0.7)', fontSize: '10px', 
        fontFamily: "'Share Tech Mono', monospace",
        pointerEvents: 'none', zIndex: 50, letterSpacing: '1px'
      }}>
        [ CLICK ANYWHERE TO ENABLE SOUND ]
      </div>
 
    </div>
  );
}