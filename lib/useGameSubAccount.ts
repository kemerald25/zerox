import { createBaseAccountSDK } from '@base-org/account';
import { useCallback, useEffect, useState } from 'react';
import { base } from 'viem/chains';
import { encodeBatchResults } from './gameContract';
import { estimateGasForBatch } from './gasEstimator';

interface SubAccount {
  address: `0x${string}`;
  factory?: `0x${string}`;
  factoryData?: `0x${string}`;
}

interface GameResult {
  result: 'win' | 'loss' | 'draw';
  opponent: `0x${string}`;
  timestamp: number;
  roomCode: string;
}

export function useGameSubAccount() {
  const [provider, setProvider] = useState<ReturnType<ReturnType<typeof createBaseAccountSDK>['getProvider']> | null>(null);
  const [subAccount, setSubAccount] = useState<SubAccount | null>(null);
  const [universalAddress, setUniversalAddress] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultQueue, setResultQueue] = useState<GameResult[]>([]);
  const [gasEstimate, setGasEstimate] = useState<{
    gasEstimate: bigint;
    gasPrice: bigint;
    totalCost: bigint;
    totalCostUSD: number;
    savingsPercent: number;
  } | null>(null);

  // Initialize SDK
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        const sdk = createBaseAccountSDK({
          appName: 'ZeroX TicTacToe',
          appLogoUrl: `${process.env.NEXT_PUBLIC_URL}/logo.png`,
          appChainIds: [base.id]
        });

        const providerInstance = sdk.getProvider();
        setProvider(providerInstance);
        setIsInitialized(true);
      } catch (error) {
        console.error('SDK initialization failed:', error);
        setError('Failed to initialize SDK');
      }
    };

    initializeSDK();
  }, []);

  // Connect and get/create Sub Account
  const initializeSubAccount = useCallback(async () => {
    if (!provider) {
      setError('Provider not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Connect to wallet
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
        params: [],
      }) as string[];

      const universalAddr = accounts[0];
      setUniversalAddress(universalAddr);

      // Check for existing sub account
      const { subAccounts } = await provider.request({
        method: 'wallet_getSubAccounts',
        params: [{
          account: universalAddr,
          domain: window.location.origin,
        }]
      }) as { subAccounts: SubAccount[] };

      let gameSubAccount = subAccounts[0];

      // Create new Sub Account if none exists
      if (!gameSubAccount) {
        gameSubAccount = await provider.request({
          method: 'wallet_addSubAccount',
          params: [{
            account: {
              type: 'create',
            },
          }]
        }) as SubAccount;
      }

      setSubAccount(gameSubAccount);
      return gameSubAccount;
    } catch (error) {
      console.error('Sub Account initialization failed:', error);
      setError('Failed to initialize Sub Account');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [provider]);

  // Process batch of results
  const processBatch = useCallback(async () => {
    if (!provider || !subAccount || resultQueue.length === 0) return;

    setIsLoading(true);
    try {
      // Prepare batch transaction with encoded data
      const batchData = encodeBatchResults(
        resultQueue.map(result => ({
          player: subAccount.address,
          opponent: result.opponent,
          result: result.result,
          roomCode: result.roomCode,
          timestamp: result.timestamp,
        }))
      );

      const calls = [{
        to: process.env.NEXT_PUBLIC_GAME_CONTRACT as string,
        data: batchData,
        value: '0x0',
      }];

      // Estimate gas costs
      const estimate = await estimateGasForBatch(
        process.env.NEXT_PUBLIC_GAME_CONTRACT as `0x${string}`,
        calls,
        subAccount.address
      );
      setGasEstimate(estimate);

      // Send batch through Sub Account
      const callsId = await provider.request({
        method: 'wallet_sendCalls',
        params: [{
          version: '2.0',
          atomicRequired: true,
          chainId: `0x${base.id.toString(16)}`,
          from: subAccount.address,
          calls,
          capabilities: {
            // Add paymaster URL if using one
          },
        }]
      });

      // Clear processed results
      setResultQueue([]);
      
      return callsId;
    } catch (error) {
      console.error('Batch processing failed:', error);
      setError('Failed to process batch');
    } finally {
      setIsLoading(false);
    }
  }, [provider, subAccount, resultQueue]);

  // Queue a game result
  const queueResult = useCallback(async (result: GameResult) => {
    if (!subAccount) {
      setError('Sub Account not initialized');
      return;
    }

    setResultQueue(prev => [...prev, result]);

    // Process batch if threshold reached (e.g., 5 results)
    if (resultQueue.length >= 5) {
      await processBatch();
    }
  }, [subAccount, resultQueue, processBatch]);

  return {
    isInitialized,
    isLoading,
    error,
    subAccount,
    universalAddress,
    resultQueue,
    gasEstimate,
    initializeSubAccount,
    queueResult,
    processBatch,
  };
}
