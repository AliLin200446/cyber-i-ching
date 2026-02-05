// src/hooks/useLiveOracle.ts
import { useState, useEffect } from "react";
import { ethers } from "ethers";

// 这是一个只有 64 位哈希的初始状态 (Genesis State)
const GENESIS_HASH = "0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3";

// 公共节点列表 (Public RPCs) - 这里的节点比较稳定
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
      // 尝试连接第一个可用的节点
      const url = RPC_URLS[0]; 
      console.log(`🔮 Oracle connecting via: ${url}`);
      
      try {
        provider = new ethers.JsonRpcProvider(url);
        
        // 1. 获取当前最新区块
        const block = await provider.getBlock("latest");
        if (isMounted && block && block.hash) {
          setHash(block.hash);
          setBlockNumber(block.number);
          setIsLive(true);
        }

        // 2. 监听新区块 (Heartbeat)
        provider.on("block", async (blockNum) => {
          if (!isMounted) return;
          try {
            const b = await provider.getBlock(blockNum);
            if (b && b.hash) {
              console.log(`⚡ New Block: #${blockNum}`);
              setHash(b.hash); // 更新哈希，这将触发你的解密动画
              setBlockNumber(b.number);
            }
          } catch (e) {
            console.warn("Block fetch skipped", e);
          }
        });

      } catch (err) {
        console.error("💀 Oracle Connection Failed. Switching to Simulation Mode.", err);
        // 如果真连不上，启用备用发电机 (Simulation Mode)
        if (isMounted) startSimulation();
      }
    };

    const startSimulation = () => {
      setIsLive(false); // 标记为非实时
      keepAliveInterval = setInterval(() => {
        const simHash = ethers.hexlify(ethers.randomBytes(32));
        setHash(simHash);
        setBlockNumber(prev => prev + 1);
      }, 12000); // 每12秒模拟一次 (以太坊的出块速度)
    };

    connect();

    return () => {
      isMounted = false;
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      if (provider) provider.removeAllListeners("block"); // 断开连接，防止内存泄漏
    };
  }, []);

  return { hash, blockNumber, isLive };
}