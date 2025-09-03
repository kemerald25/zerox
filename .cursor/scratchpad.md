# TicTacToe Sub Account Implementation

## Background and Motivation
Implementing Sub Accounts to handle game result recording and loss charges without disrupting current auth system.

## Key Challenges and Analysis

### 1. Current Auth System Integration
- Keep existing auth flow intact
- Add Sub Account layer on top
- Maintain compatibility with current wallet connections
- Preserve user session management

### 2. Sub Account Implementation
Core Features:
- Sub Account creation/management
- Transaction batching
- Balance handling
- Spend permissions

Technical Requirements:
1. RPC Methods to Implement:
   ```typescript
   // Core methods
   wallet_getSubAccounts
   wallet_addSubAccount
   wallet_sendCalls  // For batched transactions
   
   // Transaction methods
   eth_sendTransaction
   personal_sign
   eth_signTypedData_v4
   ```

2. Storage Structure:
   ```typescript
   interface SubAccountData {
     address: string;
     parentAccount: string;
     balance: BigNumber;
     pendingTransactions: Transaction[];
     spendLimit: BigNumber;
     nonce: number;
   }
   ```

3. Transaction Queue:
   ```typescript
   interface QueuedTransaction {
     type: 'result' | 'charge';
     data: any;
     timestamp: number;
     priority: number;
   }
   ```

### 3. Implementation Phases

1. Base Integration:
   - Sub Account contract deployment
   - RPC method handlers
   - Basic storage structure

2. Transaction Management:
   - Queue system
   - Batch processing
   - Gas optimization

3. Balance Handling:
   - Deposit management
   - Spend limits
   - Auto-replenishment

4. UI Integration:
   - Balance display
   - Transaction status
   - Settings interface

## High-level Task Breakdown

1. Core Sub Account Setup
   ```typescript
   // Example implementation
   class SubAccountManager {
     async getOrCreateSubAccount(parentAddress: string): Promise<string> {
       const existing = await this.getSubAccount(parentAddress);
       if (existing) return existing;
       
       return this.createSubAccount(parentAddress);
     }

     async batchTransactions(transactions: QueuedTransaction[]) {
       // Group by type and priority
       // Submit in optimal batches
     }
   }
   ```

2. Transaction Queue System
   ```typescript
   class TransactionQueue {
     async queueTransaction(tx: QueuedTransaction) {
       // Add to queue
       // Trigger batch processing if conditions met
     }

     async processBatch() {
       // Get optimal batch size
       // Submit through Sub Account
     }
   }
   ```

3. Balance Management
   ```typescript
   class BalanceManager {
     async checkAndReplenish(subAccountAddress: string) {
       const balance = await this.getBalance(subAccountAddress);
       if (balance.lt(minimumBalance)) {
         await this.replenish(subAccountAddress);
       }
     }
   }
   ```

## Project Status Board
- [ ] Deploy Sub Account contracts
- [ ] Implement core RPC methods
- [ ] Create transaction queue system
- [ ] Add balance management
- [ ] Integrate with existing auth
- [ ] Add UI components

## Implementation Notes
1. Keep auth flow unchanged:
   ```typescript
   // Current auth remains the same
   const connectWallet = async () => {
     // Existing connection logic
     // Then setup Sub Account
     await subAccountManager.getOrCreateSubAccount(address);
   };
   ```

2. Add Sub Account layer:
   ```typescript
   // After successful auth
   const setupSubAccount = async () => {
     const subAccount = await subAccountManager.getOrCreateSubAccount(userAddress);
     await balanceManager.checkAndReplenish(subAccount);
   };
   ```

3. Handle transactions:
   ```typescript
   const recordGameResult = async (result: GameResult) => {
     await transactionQueue.queueTransaction({
       type: 'result',
       data: result,
       timestamp: Date.now(),
       priority: 1
     });
   };
   ```

## Lessons
- Keep auth system independent
- Batch similar transactions
- Maintain clear balance tracking
- Handle failures gracefully
- Optimize for gas efficiency