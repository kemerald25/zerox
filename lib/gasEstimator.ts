import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

// Initialize public client for gas estimation
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export async function estimateGasForBatch(
  contractAddress: `0x${string}`,
  calls: { to: string; data: string; value: string }[],
  from: `0x${string}`
) {
  try {
    // Estimate gas for batch transaction
    const gasEstimate = await publicClient.estimateGas({
      account: from,
      to: contractAddress,
      data: calls[0].data as `0x${string}`,
      value: BigInt(calls[0].value || '0'),
    });

    // Get current gas price
    const gasPrice = await publicClient.getGasPrice();

    // Calculate total cost in wei
    const totalCost = gasEstimate * gasPrice;

    // Get ETH price in USD
    const ethPrice = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
      .then(res => res.json())
      .then(data => data.ethereum.usd);

    return {
      gasEstimate,
      gasPrice,
      totalCost,
      totalCostUSD: Number(totalCost) * ethPrice / 1e18,
      savingsPercent: calls.length > 1 ? ((calls.length - 1) / calls.length) * 100 : 0,
    };
  } catch (error) {
    console.error('Gas estimation failed:', error);
    return null;
  }
}
