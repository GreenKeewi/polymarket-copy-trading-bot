# Installation & Setup Guide

## Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud)
- npm or yarn

## Quick Start

```bash
# 1. Clone repository
git clone <repo-url>
cd polymarket-copy-trading-bot

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
nano .env

# 4. Build project
npm run build

# 5. Run test bot (MANDATORY FIRST STEP)
npm run test-bot
```

## Environment Configuration

Edit `.env`:

```bash
# CRITICAL: Always start in test mode
TEST_MODE=true

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=polymarket_copy_bot

# Wallet (ONLY set for live mode)
WALLET_PRIVATE_KEY=

# Tracked Traders
TRACKED_TRADERS=0x1234567890123456789012345678901234567890
POSITION_MULTIPLIERS=1.0

# Risk Limits
MAX_POSITION_SIZE_USD=1000
MAX_TOTAL_EXPOSURE_USD=5000
DEFAULT_SLIPPAGE_TOLERANCE=0.02
MIN_TRADE_SIZE_USD=10

# Test Mode Settings
MOCK_WALLET_INITIAL_BALANCE=1000
PRICE_SIMULATOR_VOLATILITY=0.02
ENABLE_DETERMINISTIC_SEED=true
DETERMINISTIC_SEED=42
```

## Verify Installation

```bash
# Should build without errors
npm run build

# Should pass linting
npm run lint

# Should execute test successfully
npm run test-bot
```

Expected output:
```
═══════════════════════════════════════════════════
  Polymarket Copy Trading Bot - Test Mode
═══════════════════════════════════════════════════

✅ TEST_MODE confirmed
✅ Mock executor initialized with $1000.00
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
Final Balance: $XXX.XX

═══════════════════════════════════════════════════
  ✅ ALL TESTS PASSED
═══════════════════════════════════════════════════
```

## Running in Test Mode

```bash
# Option 1: Via npm script
npm run start:test

# Option 2: Via environment variable
TEST_MODE=true npm start

# Option 3: Via command line flag
npm start -- --test
```

## Common Issues

### MongoDB Connection Failed

**Solution**: Ensure MongoDB is running
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod
```

### Build Errors

**Solution**: Clear and rebuild
```bash
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

### Test Bot Fails

**Solution**: Check TEST_MODE is enabled
```bash
# Verify in .env
cat .env | grep TEST_MODE

# Should show: TEST_MODE=true
```

## Project Structure After Installation

```
polymarket-copy-trading-bot/
├── dist/              # Compiled JavaScript (after build)
├── node_modules/      # Dependencies (after npm install)
├── src/               # TypeScript source
├── tests/             # Test fixtures
├── .env               # Your configuration (after cp .env.example .env)
├── package.json
└── README.md
```

## Next Steps

1. ✅ Installation complete
2. ✅ Test bot passes
3. → Read README.md for usage
4. → Read CONTRIBUTING.md if developing
5. → Run extensive tests before considering live mode

## Support

- Check README.md first
- Review logs in `logs/` directory
- Ensure TEST_MODE=true for testing

---

**CRITICAL**: Never skip testing. Always run `npm run test-bot` successfully before any live trading.
