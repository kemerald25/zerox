import { useCallback, useEffect } from 'react';
import { useAccount, useContractRead, useContractWrite, useTransaction } from 'wagmi';

// You'll need to replace this with your deployed contract address
const CONTRACT_ADDRESS = '0x6303d8208FA29C20607BDD7DA3e5dD8f68E5146C';

const ABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "result",
        "type": "string"
      }
    ],
    "name": "recordGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "getScore",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "wins",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "losses",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "draws",
            "type": "uint256"
          }
        ],
        "internalType": "struct ZeroXScoreboard.Score",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export function useScoreboard() {
  const { address } = useAccount();

  const { data: score, refetch: refetchScore } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getScore',
    args: address ? [address] : undefined,
  });

  const { writeContract: recordGame, data: recordGameData } = useContractWrite();

  const { isLoading: isRecording } = useTransaction({
    hash: recordGameData,
  });

  useEffect(() => {
    if (!isRecording) {
      refetchScore();
    }
  }, [isRecording, refetchScore]);

  const recordResult = useCallback((result: 'win' | 'loss' | 'draw') => {
    recordGame({ 
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'recordGame',
      args: [result]
    });
  }, [recordGame]);

  return {
    score: score ? {
      wins: Number(score.wins),
      losses: Number(score.losses),
      draws: Number(score.draws),
    } : null,
    recordResult,
    isRecording,
  };
}