let cachedPrice = 3500; // Initialize with fallback value
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getEthPrice(): Promise<number> {
  // Use cached price if not expired
  if (Date.now() - lastFetch < CACHE_DURATION) {
    return cachedPrice;
  }

  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const data = await response.json();
    cachedPrice = data.ethereum.usd;
    lastFetch = Date.now();
    return cachedPrice;
  } catch (error) {
    console.error('Failed to fetch ETH price:', error);
    return cachedPrice; // Return last known price
  }
}