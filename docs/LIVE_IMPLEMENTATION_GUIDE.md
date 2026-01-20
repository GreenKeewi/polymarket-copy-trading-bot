# Live Implementation Guide

## Overview

This guide walks through implementing real Polymarket trading functionality in the LiveExecutor.

## Step 1: Understanding Polymarket Architecture

Polymarket operates on:
- **Polygon blockchain** (Layer 2)
- **USDC** as the trading currency
- **CTF (Conditional Token Framework)** for outcome tokens
- **Order book** based trading (not AMM)

## Step 2: Required Dependencies

Install the necessary packages:

```bash
npm install --save \
  @polymarket/clob-client \
  ethers@^5.7.0 \
  @ethersproject/wallet \
  axios
```

### Package Purposes

- `@polymarket/clob-client`: Official Polymarket CLOB (Central Limit Order Book) client
- `ethers`: Ethereum/Polygon blockchain interaction
- `axios`: HTTP requests for REST API

## Step 3: Polymarket API Structure

### CLOB Client
```typescript
import { ClobClient } from '@polymarket/clob-client';

const client = new ClobClient(
  'https://clob.polymarket.com', // Mainnet
  chainId: 137, // Polygon Mainnet
  privateKey: 'your_private_key'
);
```

### Key Methods You'll Use

1. **Create Order**
```typescript
await client.createOrder({
  tokenID: 'outcome_token_id',
  price: '0.65',
  size: '100',
  side: 'BUY', // or 'SELL'
  feeRateBps: '0'
});
```

2. **Get Balance**
```typescript
const balance = await client.getBalance();
```

3. **Get Positions**
```typescript
const positions = await client.getPositions();
```

4. **Get Order Book**
```typescript
const orderBook = await client.getOrderBook(tokenID);
```

## Step 4: Implementation Structure

### 4.1 Create Polymarket Client Wrapper

Create a new file: `src/services/polymarket/PolymarketClient.ts`

```typescript
import { ClobClient } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import { logger } from '../../utils/logger';

export class PolymarketClient {
  private client: ClobClient;
  private wallet: Wallet;

  constructor(privateKey: string) {
    this.wallet = new Wallet(privateKey);
    
    this.client = new ClobClient(
      'https://clob.polymarket.com',
      {
        chainId: 137, // Polygon Mainnet
        privateKey: privateKey
      }
    );

    logger.info('Polymarket client initialized', {
      address: this.wallet.address
    });
  }

  async createMarketOrder(
    tokenId: string,
    side: 'BUY' | 'SELL',
    size: number
  ) {
    // Get current best price from order book
    const orderBook = await this.client.getOrderBook(tokenId);
    const price = side === 'BUY' 
      ? orderBook.asks[0].price 
      : orderBook.bids[0].price;

    // Create order
    const order = await this.client.createOrder({
      tokenID: tokenId,
      price: price.toString(),
      size: size.toString(),
      side: side,
      orderType: 'GTC' // Good Till Cancelled
    });

    return order;
  }

  async getBalance(): Promise<number> {
    const balance = await this.client.getBalance();
    return parseFloat(balance);
  }

  async getPosition(tokenId: string) {
    const positions = await this.client.getPositions();
    return positions.find(p => p.tokenId === tokenId);
  }

  async getCurrentPrice(tokenId: string): Promise<number> {
    const orderBook = await this.client.getOrderBook(tokenId);
    // Mid price
    const bestBid = parseFloat(orderBook.bids[0]?.price || '0');
    const bestAsk = parseFloat(orderBook.asks[0]?.price || '1');
    return (bestBid + bestAsk) / 2;
  }
}
```

### 4.2 Update LiveExecutor

Update `src/services/executor/LiveExecutor.ts`:

```typescript
import { PolymarketClient } from '../polymarket/PolymarketClient';

export class LiveExecutor implements IExecutor {
  private polymarket: PolymarketClient | null = null;

  async initialize(): Promise<void> {
    LiveExecutionGuard.assertSafeToLoad();
    config.assertLiveMode();

    const privateKey = config.getConfig().wallet.privateKey;
    if (!privateKey) {
      throw new Error('FATAL: No private key available');
    }

    // Initialize Polymarket client
    this.polymarket = new PolymarketClient(privateKey);
    
    // Verify connection
    const balance = await this.polymarket.getBalance();
    logger.info('✅ Polymarket connected', { balance });

    this.initialized = true;
  }

  async executeOrder(order: ExecutionOrder): Promise<ExecutionResult> {
    LiveExecutionGuard.assertSafeToLoad();
    
    if (!this.polymarket) {
      throw new Error('Polymarket client not initialized');
    }

    try {
      // Create order on Polymarket
      const result = await this.polymarket.createMarketOrder(
        order.outcomeId, // This should be the token ID
        order.side,
        order.requestedSize
      );

      return {
        success: true,
        orderId: order.id,
        executedSize: order.requestedSize,
        executedPrice: parseFloat(result.price),
        transactionHash: result.orderHash
      };
    } catch (error) {
      logger.error('Order execution failed', { error, order });
      return {
        success: false,
        orderId: order.id,
        executedSize: 0,
        executedPrice: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getBalance(): Promise<{ available: number; total: number }> {
    if (!this.polymarket) {
      throw new Error('Polymarket client not initialized');
    }

    const balance = await this.polymarket.getBalance();
    
    // For Polymarket, available balance is the USDC balance
    return {
      available: balance,
      total: balance // Could calculate total with position values
    };
  }

  async getPosition(marketId: string, outcomeId: string) {
    if (!this.polymarket) {
      throw new Error('Polymarket client not initialized');
    }

    const position = await this.polymarket.getPosition(outcomeId);
    
    if (!position) {
      return null;
    }

    return {
      quantity: parseFloat(position.size),
      averagePrice: parseFloat(position.averagePrice)
    };
  }

  async getCurrentPrice(marketId: string, outcomeId: string): Promise<number> {
    if (!this.polymarket) {
      throw new Error('Polymarket client not initialized');
    }

    return await this.polymarket.getCurrentPrice(outcomeId);
  }

  async getAvailableCapital(): Promise<number> {
    const balance = await this.getBalance();
    return balance.total;
  }
}
```

## Step 5: Token ID Mapping

Polymarket uses token IDs for outcomes. You need to map your internal market/outcome IDs to Polymarket token IDs.

Create `src/services/polymarket/TokenMapper.ts`:

```typescript
export class TokenMapper {
  private tokenMap: Map<string, string> = new Map();

  /**
   * Map internal outcome ID to Polymarket token ID
   */
  mapOutcomeToToken(outcomeId: string, tokenId: string) {
    this.tokenMap.set(outcomeId, tokenId);
  }

  /**
   * Get Polymarket token ID from internal outcome ID
   */
  getTokenId(outcomeId: string): string {
    const tokenId = this.tokenMap.get(outcomeId);
    if (!tokenId) {
      throw new Error(`No token mapping found for outcome: ${outcomeId}`);
    }
    return tokenId;
  }

  /**
   * Load mappings from configuration or API
   */
  async loadMappings() {
    // TODO: Load from file, database, or Polymarket API
    // Example:
    // this.mapOutcomeToToken('outcome_yes_btc_100k', '0x123...');
  }
}
```

## Step 6: Trade Detection (Monitor Service)

You need to detect when tracked traders make trades. Options:

### Option A: Blockchain Monitoring

Monitor Polygon blockchain for transactions from tracked addresses:

```typescript
import { ethers } from 'ethers';

const provider = new ethers.providers.JsonRpcProvider(
  'https://polygon-rpc.com'
);

// Watch for transactions
provider.on({
  address: POLYMARKET_CONTRACT_ADDRESS,
  topics: [
    ethers.utils.id('OrderFilled(...)') // Event signature
  ]
}, (log) => {
  // Parse and process trade
});
```

### Option B: Polymarket API Polling

Poll Polymarket's API for recent trades by tracked traders:

```typescript
async pollTraderActivity(traderAddress: string) {
  const response = await axios.get(
    `https://clob.polymarket.com/orders?maker=${traderAddress}&limit=100`
  );
  
  const recentOrders = response.data.filter(order => 
    order.status === 'FILLED' &&
    new Date(order.timestamp) > this.lastCheckTime
  );
  
  return recentOrders;
}
```

## Step 7: Testing Strategy

### Phase 1: Paper Trading Mode
Keep TEST_MODE but use real price data:

```typescript
// In MockExecutor, fetch real prices
async getCurrentPrice(marketId: string, outcomeId: string): Promise<number> {
  if (config.getConfig().testMode.useRealPrices) {
    // Fetch real price from Polymarket API
    const response = await axios.get(`https://clob.polymarket.com/book?token_id=${outcomeId}`);
    const { bids, asks } = response.data;
    return (parseFloat(bids[0].price) + parseFloat(asks[0].price)) / 2;
  }
  return this.priceSimulator.getPrice(marketId, outcomeId);
}
```

### Phase 2: Small Live Trades
- Start with tiny positions ($10-20)
- Monitor closely for 24-48 hours
- Verify all calculations are correct

### Phase 3: Gradual Scale-Up
- Increase position sizes gradually
- Monitor PnL and execution quality
- Adjust risk limits as needed

## Step 8: Configuration Updates

Update your `.env` for live trading:

```bash
# CRITICAL: Set to false for live trading
TEST_MODE=false

# Your Polygon wallet private key (KEEP SECRET!)
WALLET_PRIVATE_KEY=0x...

# Polymarket-specific settings
POLYMARKET_RPC_URL=https://polygon-rpc.com
POLYMARKET_CLOB_URL=https://clob.polymarket.com

# Tracked traders (Polygon addresses)
TRACKED_TRADERS=0xTraderAddress1,0xTraderAddress2

# Use capital-proportional sizing
TRADER_CAPITAL_AMOUNTS=10000,25000

# Conservative risk limits for first run
MAX_POSITION_SIZE_USD=100
MAX_TOTAL_EXPOSURE_USD=500
MIN_TRADE_SIZE_USD=10
```

## Step 9: Safety Checklist

Before going live:

- [ ] Polymarket client connects successfully
- [ ] Can query real balances
- [ ] Can fetch real prices
- [ ] Order creation works (test with $1)
- [ ] Position tracking accurate
- [ ] Error handling implemented
- [ ] Emergency stop mechanism ready
- [ ] Logs are comprehensive
- [ ] Monitoring/alerts set up
- [ ] Risk limits are conservative
- [ ] Private key is secure
- [ ] Test wallet funded with small amount
- [ ] Tested all edge cases in paper trading

## Step 10: Emergency Stop

Implement a kill switch:

```typescript
// Add to LiveExecutor
private emergencyStopFile = '/tmp/polymarket_bot_stop';

async executeOrder(order: ExecutionOrder): Promise<ExecutionResult> {
  // Check for emergency stop
  if (fs.existsSync(this.emergencyStopFile)) {
    logger.error('🚨 EMERGENCY STOP ACTIVATED');
    throw new Error('Emergency stop - bot halted');
  }
  
  // ... rest of execution
}
```

To stop the bot:
```bash
touch /tmp/polymarket_bot_stop
```

## Common Issues & Solutions

### Issue: "Insufficient funds"
- Check USDC balance on Polygon
- Ensure gas fees are covered (MATIC)

### Issue: "Order rejected"
- Price moved (slippage)
- Insufficient liquidity
- Market closed/paused

### Issue: "Rate limited"
- Add request throttling
- Implement exponential backoff

### Issue: "Signature invalid"
- Private key format incorrect
- Check chain ID matches

## Next Steps

1. Install dependencies
2. Create PolymarketClient.ts
3. Update LiveExecutor.ts
4. Implement trade detection
5. Test with paper trading mode
6. Test with small live amounts
7. Monitor and iterate

## Resources

- [Polymarket CLOB API Docs](https://docs.polymarket.com)
- [Polygon RPC](https://polygon.technology/developers)
- [Ethers.js Docs](https://docs.ethers.io/)
- [Conditional Tokens Framework](https://docs.gnosis.io/conditionaltokens/)

## Warning

**This is real money. Start small. Monitor constantly. Have an exit plan.**
