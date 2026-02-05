// src/App.tsx
import { CyberIChing } from "./components/CyberIChing";
import { useLiveOracle } from "./hooks/useLiveOracle";

function App() {
  // 获取实时链上数据
  const { hash, blockNumber, isLive } = useLiveOracle();

  return (
    <>
      {/* 将实时哈希传给 3D 场景，驱动卦象变化 */}
      <CyberIChing hash={hash} />

      {/* 右上角：网络状态指示器 (HUD) */}
      <div style={{
        position: 'absolute', top: 24, right: 24, textAlign: 'right',
        fontFamily: "'Courier New', monospace", 
        color: isLive ? '#00ff99' : '#ffcc00', 
        textShadow: isLive ? '0 0 10px #00ff99' : 'none', 
        pointerEvents: 'none', 
        zIndex: 20
      }}>
        <div style={{fontSize: '10px', letterSpacing: '2px', marginBottom: '4px', opacity: 0.8}}>
          {isLive ? '● ETHEREUM MAINNET' : '○ SIMULATION MODE'}
        </div>
        <div style={{fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px'}}>
          BLOCK #{blockNumber}
        </div>
      </div>
    </>
  );
}

export default App;