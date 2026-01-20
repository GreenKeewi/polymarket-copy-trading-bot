# Polymarket Copy Trading Bot

A production-grade copy-trading bot for Polymarket with **mandatory testing mode** to validate the entire pipeline without risking real money.

## 🔒 Safety First

This bot includes a **comprehensive testing mode** that:
- ✅ Simulates all trading operations
- ✅ Uses mock wallet with fake balance
- ✅ Prevents accidental live execution
- ✅ Validates position math and risk rules
- ✅ Tests edge cases before going live

**CRITICAL**: Never run in live mode without thoroughly testing first.

## Features

- 🎯 **Copy trades** from multiple Polymarket traders simultaneously
- 📊 **Smart position sizing** with configurable multipliers
- 🛡️ **Risk management**: Slippage protection, exposure limits, position caps
- 🧪 **Comprehensive test mode** with mock wallet and price simulator
- 📼 **Trade replay system** for testing historical scenarios
- 📈 **CLI dashboard** with real-time monitoring
- 💾 **MongoDB persistence** as source of truth
- 🔐 **Security**: Private keys never logged, test mode isolation

## Architecture

```
/src
  /config          # Configuration management
  /services        
    /monitor       # Trade detection
    /executor      # Execution engine (Live + Mock)
    /position      # Position manager
    /risk          # Risk engine
  /database        # MongoDB layer
  /simulators      # MockWalletEngine, PriceSimulator
  /cli             # CLI dashboard
  /replay          # Trade replay system
  /types           # TypeScript interfaces
```

### Key Components

- **MockWalletEngine**: Simulates trading with fake balance
- **PriceSimulator**: Generates market prices with controlled randomness
- **LiveExecutionGuard**: Prevents live execution in test mode (CRITICAL SAFETY)
- **ExecutorFactory**: Safely instantiates Live or Mock executor
- **TradeReplayRunner**: Replays historical trades for testing

## Installation

```bash
# Install dependencies
npm install

# Copy environment example
cp .env.example .env

# Edit .env and configure
nano .env
```

## Configuration

Edit `.env`:

```bash
# CRITICAL: Enable test mode first
TEST_MODE=true

# MongoDB (or use in-memory for testing)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=polymarket_copy_bot

# Wallet (ONLY set for live mode)
WALLET_PRIVATE_KEY=

# Tracked traders (comma-separated addresses)
TRACKED_TRADERS=0x1234567890123456789012345678901234567890

# Position sizing (comma-separated multipliers)
POSITION_MULTIPLIERS=1.0

# Risk limits
MAX_POSITION_SIZE_USD=1000
MAX_TOTAL_EXPOSURE_USD=5000
DEFAULT_SLIPPAGE_TOLERANCE=0.02
MIN_TRADE_SIZE_USD=10

# Test mode settings
MOCK_WALLET_INITIAL_BALANCE=1000
PRICE_SIMULATOR_VOLATILITY=0.02
ENABLE_DETERMINISTIC_SEED=true
DETERMINISTIC_SEED=42
```

## Test Mode (MANDATORY FIRST STEP)

### Quick Test

```bash
# Build and run end-to-end test
npm run test-bot
```

This will:
1. ✅ Verify TEST_MODE is enabled
2. ✅ Initialize mock wallet with fake balance
3. ✅ Load sample trades from fixtures
4. ✅ Execute through full pipeline
5. ✅ Validate position math, balances, and risk rules
6. ✅ Display results

**Expected output:**

```
═══════════════════════════════════════════════════
  Polymarket Copy Trading Bot - Test Mode
═══════════════════════════════════════════════════

✅ TEST_MODE confirmed
✅ Mock executor initialized with $1000
✅ Loaded 5 trades
▶️  Replaying trades through pipeline...
✅ Replay completed

🔍 VALIDATION RESULTS

✅ Confirmed: No real trades executed
✅ Trades processed successfully
✅ Position math correct
✅ Balance consistent

📊 FINAL STATE

Initial Balance: $1000.00
Final Balance: $1023.45
Total PnL: +$23.45
Total Trades: 10
Open Positions: 3

═══════════════════════════════════════════════════
  ✅ ALL TESTS PASSED
═══════════════════════════════════════════════════
```

### Manual Test Mode

```bash
# Build
npm run build

# Run in test mode
npm run start:test

# Or with flags
TEST_MODE=true npm start
# Or
npm start -- --test
```

The bot will:
- Display clear **"TEST MODE"** banner
- Use simulated wallet (no real money)
- Show simulated balances and PnL
- Execute mock trades only

### Trade Replay

Test with historical trades:

```bash
# Replay trades from JSON file
npm run replay -- tests/fixtures/sample-trades.json

# With speed control (5x speed)
npm run replay -- tests/fixtures/sample-trades.json 5x

# Instant replay
npm run replay -- tests/fixtures/sample-trades.json 0
```

### Creating Test Fixtures

Create a JSON file with trades:

```json
{
  "trades": [
    {
      "id": "trade_001",
      "traderAddress": "0x...",
      "marketId": "market_btc_100k",
      "outcomeId": "outcome_yes",
      "side": "BUY",
      "size": 100,
      "price": 0.65,
      "timestamp": "2024-01-20T10:00:00.000Z"
    }
  ]
}
```

See `tests/fixtures/` for examples.

## Going Live (Use with EXTREME Caution)

⚠️ **WARNING**: Only proceed after comprehensive testing!

### Pre-Live Checklist

- [ ] Run `npm run test-bot` successfully
- [ ] Test with sample trades
- [ ] Test with edge cases
- [ ] Validate position sizing
- [ ] Verify risk limits are appropriate
- [ ] Start with small multipliers (0.1x)
- [ ] Have an emergency stop plan

### Steps to Go Live

1. **Set environment variables:**

```bash
TEST_MODE=false
WALLET_PRIVATE_KEY=your_actual_private_key
```

2. **Remove test flags from scripts**

3. **Start with monitoring only** (implement dry-run-like behavior first)

4. **Start small:**
   - Use low multipliers (0.1x)
   - Set conservative risk limits
   - Monitor constantly

5. **Run:**

```bash
npm start
```

The bot will show:
```
═══════════════════════════════════════════════════
   🔴 LIVE MODE - USING REAL MONEY
═══════════════════════════════════════════════════
```

## Dashboard

The CLI dashboard shows:
- Current mode (TEST/LIVE) - prominently displayed
- Balance (Available, Total, PnL)
- Open positions
- Execution statistics
- Real-time updates

In test mode:
```
🧪 TEST MODE - NO REAL TRADES EXECUTED

💰 Balance
  [SIMULATED] Available Balance: $987.50
  [SIMULATED] Total Balance: $1023.45
  [SIMULATED] Total PnL: +$23.45
```

## Safety Guarantees

### Test Mode Protection

If `TEST_MODE=true`:
- ❌ LiveExecutor **CANNOT** be imported (fatal error)
- ❌ Private key is **IGNORED**
- ❌ No real blockchain transactions
- ✅ All operations use MockExecutor
- ✅ LiveExecutionGuard enforces isolation

### Code Structure

```typescript
// CRITICAL SAFETY: This throws error in test mode
import { LiveExecutor } from './services/executor/LiveExecutor'; // FATAL if TEST_MODE=true

// SAFE: Factory selects executor based on mode
const executor = await ExecutorFactory.getExecutor(); // Returns Mock or Live
```

### Idempotency

- Trades are deduplicated by ID
- Position updates are atomic
- Failed executions can be retried safely

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm run test-bot

# Lint
npm run lint

# Fix linting issues
npm run lint:fix

# Development mode (with hot reload)
npm run dev:test
```

## Project Structure

```
polymarket-copy-trading-bot/
├── src/
│   ├── config/           # Configuration management
│   ├── services/
│   │   ├── monitor/      # Trade detection
│   │   ├── executor/     # Execution (Live + Mock)
│   │   ├── position/     # Position tracking
│   │   └── risk/         # Risk management
│   ├── database/         # MongoDB adapter
│   ├── simulators/       # MockWallet, PriceSimulator
│   ├── cli/              # Dashboard
│   ├── replay/           # Trade replay
│   ├── types/            # TypeScript types
│   ├── utils/            # Logger, helpers
│   └── index.ts          # Main entry
├── tests/
│   ├── fixtures/         # Sample trades
│   ├── replay/           # Replay scenarios
│   └── edge-cases/       # Edge case tests
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Risk Management

The bot enforces:

1. **Position Size Limits**: Max USD per position
2. **Total Exposure Limits**: Max total USD across all positions
3. **Slippage Protection**: Reject trades with excessive slippage
4. **Minimum Trade Size**: Ignore tiny trades
5. **Balance Checks**: Prevent overdraft
6. **Position Validation**: Prevent short selling without position

Configure in `.env`:
```bash
MAX_POSITION_SIZE_USD=1000
MAX_TOTAL_EXPOSURE_USD=5000
DEFAULT_SLIPPAGE_TOLERANCE=0.02  # 2%
MIN_TRADE_SIZE_USD=10
```

## Edge Cases Tested

The test system includes scenarios for:

- ✅ Rapid trade bursts (multiple trades in milliseconds)
- ✅ Partial position sells
- ✅ Market price jumps
- ✅ Slippage rejection
- ✅ Insufficient balance
- ✅ Insufficient position
- ✅ Duplicate trade detection
- ✅ MongoDB reconnection
- ✅ Bot restart mid-execution

## Logging

Logs are written to:
- Console (colored, formatted)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)

**CRITICAL**: Private keys are **NEVER** logged (sanitized by logger)

## MongoDB Schema

### Collections

- **trades**: Detected trades from tracked traders
- **executionOrders**: Our execution orders
- **positions**: Current positions per market/outcome
- **trackedTraders**: Configuration for tracked traders

## Troubleshooting

### "LiveExecutor cannot be loaded in TEST_MODE"

✅ This is **correct behavior**. It means the safety guard is working.

### Trades not being detected

1. Check `TRACKED_TRADERS` in `.env`
2. Verify monitor service is running
3. Check logs for errors

### Test bot fails

1. Ensure MongoDB is running (or use in-memory)
2. Check TEST_MODE=true
3. Review logs for specific error

### Position math doesn't match

1. Check for duplicate trade processing
2. Verify price simulator is initialized
3. Review position update logic

## Future Enhancements

- [ ] Real Polymarket API integration
- [ ] GraphQL subscription for real-time trades
- [ ] Advanced aggregation strategies
- [ ] Portfolio optimization
- [ ] Backtesting framework
- [ ] Web dashboard
- [ ] Telegram notifications
- [ ] Multi-chain support

## License

MIT

## Disclaimer

**⚠️ USE AT YOUR OWN RISK**

This software is provided for educational purposes. Trading involves substantial risk of loss. The authors are not responsible for any financial losses incurred through use of this software.

**ALWAYS** test thoroughly in test mode before risking real capital.

## Support

For issues or questions:
1. Check logs first
2. Review this README
3. Test in test mode
4. Open an issue with full logs and configuration (redact private keys!)

---

Built with ❤️ and an obsession with safety.
