// src/hooks/useLiveOracle.ts
import { useState, useEffect } from "react";
import { ethers } from "ethers";

const GENESIS_HASH = "0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3";

const RPC_URLS = [
  "https://eth.public-rpc.com", 
  "https://rpc.ankr.com/eth",
  "https://cloudflare-eth.com"
];

export function useLiveOracle() {
  const [hash, setHash] = useState<string>(GENESIS_HASH);
  const [blockNumber, setBlockNumber] = useState<number>(0);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let provider: ethers.JsonRpcProvider | null = null;
    let isMounted = true;
    let keepAliveInterval: any;

    const connect = async () => {
      const url = RPC_URLS[0]; 
      console.log(`🔮 Oracle connecting via: ${url}`);
      
      try {
        const newProvider = new ethers.JsonRpcProvider(url);
        provider = newProvider;
        
        const block = await newProvider.getBlock("latest");
        if (isMounted && block && block.hash) {
          setHash(block.hash);
          setBlockNumber(block.number);
          setIsLive(true);
        }

        // 监听新区块 (Heartbeat)
        newProvider.on("block", async (blockNum) => {
          if (!isMounted) return;
          try {
            const b = await newProvider.getBlock(blockNum);
            if (b && b.hash) {
              console.log(`⚡ New Block: #${blockNum}`);
              setHash(b.hash);
              setBlockNumber(b.number);
            }
          } catch (e) {
            console.warn("Block fetch skipped", e);
          }
        });

      } catch (err) {
        console.error("💀 Oracle Connection Failed. Switching to Simulation Mode.", err);
        if (isMounted) startSimulation();
      }
    };

    const startSimulation = () => {
      setIsLive(false);
      keepAliveInterval = setInterval(() => {
        const simHash = ethers.hexlify(ethers.randomBytes(32));
        setHash(simHash);
        setBlockNumber(prev => prev + 1);
      }, 12000); 
    };

    connect();

    return () => {
      isMounted = false;
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      if (provider) {
        provider.removeAllListeners("block"); 
      }
    };
  }, []);

  return { hash, blockNumber, isLive };
}