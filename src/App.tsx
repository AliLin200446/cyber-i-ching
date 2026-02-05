import { CyberIChing } from "./components/CyberIChing";
import { useLiveOracle } from "./hooks/useLiveOracle";

function App() {
  const { hash, blockNumber, isLive } = useLiveOracle();

  return (
    <>
      <CyberIChing hash={hash} />
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