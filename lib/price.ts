let cachedPrice = 2000; // Initialize with conservative fallback value
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RETRY_DELAY = 30 * 1000; // 30 seconds
let retryTimeout: NodeJS.Timeout | null = null;

export async function getEthPrice(): Promise<number> {
  // Use cached price if not expired
  if (Date.now() - lastFetch < CACHE_DURATION) {
    return cachedPrice;
  }

  try {
    // Use AbortController to timeout the request after 5 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ZeroX Game/1.0'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data?.ethereum?.usd) {
      cachedPrice = data.ethereum.usd;
      lastFetch = Date.now();
      
      // Clear any existing retry timeout
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
    }
    return cachedPrice;
  } catch (error) {
    console.error('Failed to fetch ETH price:', error);
    
    // Schedule a retry if not already scheduled
    if (!retryTimeout) {
      retryTimeout = setTimeout(() => {
        lastFetch = 0; // Force a retry on next call
        retryTimeout = null;
      }, RETRY_DELAY);
    }
    
    return cachedPrice; // Return last known price
  }
}