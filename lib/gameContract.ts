import { encodeFunctionData, parseAbi } from 'viem';

// ABI for the game contract
const gameAbi = parseAbi([
  // Record a single game result
  'function recordGameResult(address player, address opponent, uint8 result, string roomCode, uint256 timestamp) external',
  // Record multiple game results in a batch
  'function recordBatchResults(address[] players, address[] opponents, uint8[] results, string[] roomCodes, uint256[] timestamps) external',
]);

// Result type mapping: 0 = draw, 1 = win, 2 = loss
const resultToNumber = {
  'draw': 0,
  'win': 1,
  'loss': 2,
} as const;

export function encodeBatchResults(results: Array<{
  player: `0x${string}`;
  opponent: `0x${string}`;
  result: 'win' | 'loss' | 'draw';
  roomCode: string;
  timestamp: number;
}>) {
  // Transform arrays for batch processing
  const players = results.map(r => r.player);
  const opponents = results.map(r => r.opponent);
  const resultNumbers = results.map(r => resultToNumber[r.result]);
  const roomCodes = results.map(r => r.roomCode);
  const timestamps = results.map(r => BigInt(r.timestamp));

  // Encode the batch call
  return encodeFunctionData({
    abi: gameAbi,
    functionName: 'recordBatchResults',
    args: [players, opponents, resultNumbers, roomCodes, timestamps],
  });
}

export function encodeSingleResult(
  player: `0x${string}`,
  opponent: `0x${string}`,
  result: 'win' | 'loss' | 'draw',
  roomCode: string,
  timestamp: number,
) {
  return encodeFunctionData({
    abi: gameAbi,
    functionName: 'recordGameResult',
    args: [player, opponent, resultToNumber[result], roomCode, BigInt(timestamp)],
  });
}
