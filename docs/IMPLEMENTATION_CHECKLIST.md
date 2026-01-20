# Live Implementation Checklist

Use this checklist to track your progress implementing live Polymarket trading.

## Phase 1: Setup & Dependencies

- [ ] **Install Polymarket SDK**
  ```bash
  npm install @polymarket/clob-client
  ```

- [ ] **Install Ethereum libraries**
  ```bash
  npm install ethers@^5.7.0 @ethersproject/wallet
  ```

- [ ] **Install HTTP client**
  ```bash
  npm install axios
  ```

- [ ] **Verify installations**
  ```bash
  npm list @polymarket/clob-client ethers axios
  ```

## Phase 2: PolymarketClient Implementation

- [ ] Open `src/services/polymarket/PolymarketClient.ts`
- [ ] Uncomment the import statements
- [ ] Uncomment the constructor implementation
- [ ] Implement `initialize()` method
- [ ] Implement `createMarketOrder()` method
- [ ] Implement `getBalance()` method
- [ ] Implement `getPosition()` method
- [ ] Implement `getCurrentPrice()` method
- [ ] Add error handling for each method
- [ ] Add rate limiting (avoid API throttling)
- [ ] Test each method individually

## Phase 3: LiveExecutor Integration

- [ ] Open `src/services/executor/LiveExecutor.ts`
- [ ] Import PolymarketClient
- [ ] Add private field: `private polymarket: PolymarketClient | null = null`
- [ ] Update `initialize()` to create PolymarketClient
- [ ] Update `executeOrder()` to use PolymarketClient
- [ ] Update `getBalance()` to query real balance
- [ ] Update `getPosition()` to query real positions
- [ ] Update `getCurrentPrice()` to fetch real prices
- [ ] Update `getAvailableCapital()` to calculate from real data
- [ ] Add comprehensive error logging

## Phase 4: Token Mapping

- [ ] Create token mapping configuration file
  ```bash
  cp config/token-mappings.example.json config/token-mappings.json
  ```
- [ ] Find actual Polymarket token IDs for markets you want to trade
  - Use Polymarket API or blockchain explorer
  - Document where you found each ID
- [ ] Update `config/token-mappings.json` with real token IDs
- [ ] Load token mappings in initialization:
  ```typescript
  await tokenMapper.loadFromFile('config/token-mappings.json');
  ```
- [ ] Test token mapping lookups

## Phase 5: Trade Detection Implementation

Choose ONE approach:

### Option A: Blockchain Monitoring
- [ ] Install web3 event listener
- [ ] Find Polymarket contract addresses
- [ ] Find event signatures for order fills
- [ ] Implement event listener
- [ ] Parse event data into Trade objects
- [ ] Test with known transactions

### Option B: API Polling
- [ ] Find Polymarket API endpoint for user orders
- [ ] Implement polling function
- [ ] Filter for tracked trader addresses
- [ ] Filter for new orders since last check
- [ ] Convert API response to Trade objects
- [ ] Test with real trader data

## Phase 6: Configuration

- [ ] Create live `.env` file:
  ```bash
  cp .env .env.live.backup
  ```
  
- [ ] Update `.env` for live mode:
  ```bash
  TEST_MODE=false
  WALLET_PRIVATE_KEY=your_private_key_here
  POLYMARKET_RPC_URL=https://polygon-rpc.com
  ```

- [ ] Set conservative risk limits:
  ```bash
  MAX_POSITION_SIZE_USD=50
  MAX_TOTAL_EXPOSURE_USD=200
  MIN_TRADE_SIZE_USD=10
  ```

- [ ] Configure tracked traders with real addresses

- [ ] Set realistic trader capital amounts

## Phase 7: Safety Mechanisms

- [ ] Implement emergency stop file check
- [ ] Create monitoring/alerting system
- [ ] Set up logging to file (not just console)
- [ ] Implement daily PnL limits
- [ ] Add circuit breaker for consecutive losses
- [ ] Create manual approval mode (optional)
- [ ] Set up backup/restore for critical state

## Phase 8: Testing (Paper Trading)

- [ ] Keep `TEST_MODE=true` but use real price data
- [ ] Run bot for 24 hours with simulated trades
- [ ] Verify position calculations match reality
- [ ] Check slippage assumptions are realistic
- [ ] Validate risk limits trigger correctly
- [ ] Review all log files for errors
- [ ] Test emergency stop mechanism
- [ ] Test with various market conditions

## Phase 9: Initial Live Testing

- [ ] Fund Polygon wallet with SMALL amount ($50-100 USDC)
- [ ] Fund wallet with MATIC for gas fees
- [ ] Verify wallet has USDC on Polygon (not Ethereum mainnet!)
- [ ] Set `TEST_MODE=false`
- [ ] Set very conservative limits:
  ```bash
  MAX_POSITION_SIZE_USD=10
  MAX_TOTAL_EXPOSURE_USD=30
  ```
- [ ] Start bot with monitoring
- [ ] Execute 1-2 tiny test trades manually
- [ ] Verify orders appear on Polymarket
- [ ] Verify positions update correctly
- [ ] Verify balance tracking is accurate
- [ ] Let run for 24 hours with close monitoring

## Phase 10: Monitoring & Iteration

- [ ] Check logs every 2-4 hours initially
- [ ] Verify no unexpected errors
- [ ] Check actual vs expected PnL
- [ ] Measure execution quality (slippage)
- [ ] Verify trader detection is working
- [ ] Check position sync is accurate
- [ ] Review gas costs
- [ ] Optimize as needed

## Phase 11: Gradual Scale-Up

Only after 3-7 days of successful operation:

- [ ] Increase position limits by 50%
- [ ] Add more capital to wallet
- [ ] Monitor for 3-7 days
- [ ] Repeat until at desired scale

## Common Issues & Solutions

### Issue: Dependencies won't install
- Check Node.js version (need 16+)
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall

### Issue: "Chain ID mismatch"
- Verify using Polygon (137), not Ethereum (1)
- Check RPC URL is for Polygon

### Issue: "Insufficient funds" but wallet has balance
- Verify USDC is on Polygon network, not Ethereum
- Check allowances are set for Polymarket contracts

### Issue: Orders not executing
- Check liquidity in order book
- Verify price limits aren't too tight
- Check slippage tolerance settings

### Issue: Trader detection not working
- Verify trader addresses are correct
- Check API rate limits aren't hit
- Verify event subscriptions are active

## Emergency Procedures

### Stop the bot immediately:
```bash
touch /tmp/polymarket_bot_stop
# or
pkill -f "node.*polymarket"
```

### Review current state:
```bash
# Check logs
tail -f logs/polymarket-bot.log

# Check MongoDB
mongo polymarket_copy_bot
db.positions.find()
db.orders.find()
```

### Close all positions manually:
- Log into Polymarket directly
- Close positions from UI
- Document losses/gains

## Resources

- [Polymarket CLOB API](https://docs.polymarket.com)
- [Polygon RPC](https://polygon.technology/developers)
- [Get MATIC](https://wallet.polygon.technology/bridge)
- [Polymarket Markets](https://polymarket.com/markets)

## Notes

Use this space to document decisions, issues, and learnings:

```
Date: ___________
Issue: ___________
Solution: ___________
```

---

**Remember: Start small, monitor constantly, scale gradually.**
