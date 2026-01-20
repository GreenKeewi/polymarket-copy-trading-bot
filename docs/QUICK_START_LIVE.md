# Quick Start: Live Implementation

## TL;DR - Get Started in 5 Minutes

### 1. Run Setup Script
```bash
./scripts/setup-live-implementation.sh
```

### 2. Implement PolymarketClient
Open `src/services/polymarket/PolymarketClient.ts` and:
- Uncomment all the commented code
- Remove the `throw new Error(...)` lines
- Save

### 3. Find Token IDs
Visit the markets on Polymarket you want to trade:
- Example: https://polymarket.com/event/bitcoin-above-100k
- Get token IDs from the URL or API responses
- Update `config/token-mappings.json`

### 4. Test Build
```bash
npm run build
npm run test-bot
```

### 5. Follow the Checklist
See `docs/IMPLEMENTATION_CHECKLIST.md` for detailed steps.

---

## Files You Need to Edit

### 1. PolymarketClient.ts (REQUIRED)
Location: `src/services/polymarket/PolymarketClient.ts`

**What to do:**
- Line 11-12: Uncomment imports
- Line 31-46: Uncomment constructor
- Line 49-52: Uncomment initialize()
- Line 64-88: Uncomment createMarketOrder()
- Line 98-101: Uncomment getBalance()
- Line 112-116: Uncomment getPosition()
- Line 127-131: Uncomment getAllPositions()
- Line 143-154: Uncomment getCurrentPrice()
- Line 166-169: Uncomment cancelOrder()
- Line 180-183: Uncomment getOrderStatus()

**Remove these lines:**
- Line 48: `throw new Error('PolymarketClient not implemented...')`
- All other `throw new Error(...)` at the end of each method

### 2. token-mappings.json (REQUIRED)
Location: `config/token-mappings.json`

**Example:**
```json
[
  {
    "marketId": "btc-100k-2024",
    "outcomeId": "outcome_yes",
    "tokenId": "0x...(actual token ID from Polymarket)...",
    "description": "BTC > $100K - YES"
  }
]
```

**How to find token IDs:**
1. Go to https://polymarket.com
2. Open a market
3. Open browser DevTools → Network tab
4. Look for API calls with token IDs
5. Or use Polymarket API: https://docs.polymarket.com

### 3. .env (WHEN READY FOR LIVE)
**DO NOT DO THIS YET!**

Only change after everything is implemented and tested:
```bash
TEST_MODE=false
WALLET_PRIVATE_KEY=0x...your_private_key...
```

---

## Architecture Overview

```
Your Bot
    ↓
LiveExecutor (you edit this)
    ↓
PolymarketClient (you implement this)
    ↓
Polymarket CLOB API
    ↓
Polygon Blockchain
```

---

## Essential APIs You'll Use

### Get Market Data
```typescript
const response = await axios.get(
  'https://clob.polymarket.com/markets'
);
```

### Get Order Book
```typescript
const book = await client.getOrderBook(tokenId);
// book.bids[0].price = best bid
// book.asks[0].price = best ask
```

### Create Order
```typescript
const order = await client.createOrder({
  tokenID: '0x...',
  price: '0.65',
  size: '100',
  side: 'BUY'
});
```

---

## Testing Phases

### Phase 1: Unit Tests
```bash
npm run build
npm run test-bot
```
Should pass with TEST_MODE=true

### Phase 2: API Tests
Test each PolymarketClient method individually:
- Create a test script
- Call each method with real data
- Verify responses

### Phase 3: Paper Trading
- TEST_MODE=true
- Use real prices from Polymarket
- Simulate everything else
- Run for 24-48 hours

### Phase 4: Tiny Live Trades
- TEST_MODE=false
- Fund with $50
- MAX_POSITION_SIZE_USD=10
- Monitor every hour

### Phase 5: Scale Up
- Gradually increase limits
- Monitor for 3-7 days between increases

---

## Common Mistakes to Avoid

❌ **Setting TEST_MODE=false too early**
✅ Keep it true until everything is fully implemented

❌ **Using Ethereum mainnet instead of Polygon**
✅ Chain ID = 137 (Polygon)

❌ **Not checking liquidity before orders**
✅ Always check order book first

❌ **Using wrong token IDs**
✅ Verify token IDs match actual Polymarket markets

❌ **No error handling**
✅ Wrap everything in try-catch with logging

❌ **Starting with large amounts**
✅ Start with $10-50 positions max

---

## Emergency Contacts & Resources

**Polymarket:**
- Docs: https://docs.polymarket.com
- Discord: https://discord.gg/polymarket
- API Status: https://status.polymarket.com

**Polygon:**
- RPC: https://polygon-rpc.com
- Explorer: https://polygonscan.com
- Bridge: https://wallet.polygon.technology/bridge

**This Codebase:**
- Issues: Create GitHub issue
- Logs: Check `logs/` directory
- Backup: `.env.live.backup`

---

## When Things Go Wrong

### Bot Won't Start
1. Check logs: `tail -f logs/*.log`
2. Verify TEST_MODE=true
3. Check dependencies: `npm list`

### Orders Not Executing
1. Check Polymarket API status
2. Verify wallet has USDC on Polygon
3. Check order book liquidity
4. Review error logs

### Emergency Stop
```bash
# Create stop file
touch /tmp/polymarket_bot_stop

# Or kill process
pkill -f "node.*polymarket"

# Or stop MongoDB to halt everything
sudo systemctl stop mongodb
```

### Close Positions Manually
1. Go to polymarket.com
2. Log in with your wallet
3. Close positions from UI
4. Document PnL

---

## Quick Commands

```bash
# Setup
./scripts/setup-live-implementation.sh

# Build
npm run build

# Test
npm run test-bot

# Check logs
tail -f logs/*.log

# Emergency stop
touch /tmp/polymarket_bot_stop

# Check positions in DB
mongo polymarket_copy_bot --eval "db.positions.find().pretty()"
```

---

## Your Implementation Checklist

- [ ] Run setup script
- [ ] Edit PolymarketClient.ts
- [ ] Find and add token IDs
- [ ] Build successfully
- [ ] Test in TEST_MODE
- [ ] Review all 11 phases in IMPLEMENTATION_CHECKLIST.md
- [ ] Paper trade for 24+ hours
- [ ] Fund test wallet with $50
- [ ] Do 1-2 tiny live trades
- [ ] Monitor for 24 hours
- [ ] Gradually scale up

---

**Remember: This is real money. Start tiny. Monitor constantly.**

Need help? Read the detailed guide: `docs/LIVE_IMPLEMENTATION_GUIDE.md`
