# Polymarket Copy Trading Bot

A production-grade automated trading bot that copies trades from successful Polymarket traders. Built with TypeScript, featuring comprehensive test mode, intelligent position sizing, and robust risk management.

## 🌟 Features

- **Smart Copy Trading**: Automatically mirror trades from multiple Polymarket traders
- **Capital-Proportional Sizing**: Matches trader's risk percentage, not absolute position size
- **Risk Management**: Position limits, exposure caps, slippage protection
- **Test Mode**: Full simulation with mock wallet before risking real money
- **Real-time Monitoring**: CLI dashboard showing positions, PnL, and activity
- **MongoDB Persistence**: Reliable state management and trade history

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- MongoDB (optional, uses in-memory DB in test mode)
- Polygon wallet with USDC (for live trading)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/polymarket-copy-trading-bot
cd polymarket-copy-trading-bot

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit configuration
nano .env
```

### Configuration

Edit `.env` file:

```bash
# CRITICAL: Always start with test mode
TEST_MODE=true

# Tracked traders (Polygon addresses)
TRACKED_TRADERS=0x1234567890123456789012345678901234567890

# Position sizing - choose ONE method:
# Method 1: Capital-proportional (recommended) - matches trader's % of capital
TRADER_CAPITAL_AMOUNTS=10000

# Method 2: Multiplier-based - simple multiplier of trader's position
POSITION_MULTIPLIERS=1.0

# Risk limits
MAX_POSITION_SIZE_USD=1000
MAX_TOTAL_EXPOSURE_USD=5000
MIN_TRADE_SIZE_USD=10
DEFAULT_SLIPPAGE_TOLERANCE=0.02

# Test mode settings
MOCK_WALLET_INITIAL_BALANCE=1000
```

### Test the Bot

```bash
# Build and test
npm run test-bot
```

Expected output shows successful test execution with mock trades and validated balances.

## 📊 Position Sizing Methods

### Capital-Proportional (Recommended)

Matches the **percentage of capital** the trader uses:

```bash
TRADER_CAPITAL_AMOUNTS=10000
```

**Example:**
- Trader has $10,000 capital, buys $1,000 worth (10% of capital)
- You have $2,000 capital, bot buys $200 worth (10% of capital)
- **Same risk level, different absolute amounts**

### Multiplier-Based

Simple multiplier of trader's position size:

```bash
POSITION_MULTIPLIERS=0.5
```

**Example:**
- Trader buys 100 shares
- You buy 50 shares (100 × 0.5)

## 🔧 Live Trading Setup

⚠️ **Only proceed after thorough testing!**

### Step 1: Install Polymarket Dependencies

```bash
npm install @polymarket/clob-client ethers@^5.7.0 axios
```

### Step 2: Implement PolymarketClient

Edit `src/services/polymarket/PolymarketClient.ts`:
- Uncomment the import statements
- Uncomment implementation code
- Remove `throw new Error(...)` placeholders

### Step 3: Configure Token Mappings

Create `config/token-mappings.json`:

```json
[
  {
    "marketId": "your-market-id",
    "outcomeId": "outcome_yes",
    "tokenId": "0x...actual-polymarket-token-id",
    "description": "Market description"
  }
]
```

Find token IDs at https://polymarket.com or via their API.

### Step 4: Fund Wallet

- Send USDC to your Polygon wallet (not Ethereum mainnet!)
- Send MATIC for gas fees
- Start with small amounts ($50-100)

### Step 5: Go Live

Update `.env`:

```bash
TEST_MODE=false
WALLET_PRIVATE_KEY=0x...your-private-key...

# Start with conservative limits
MAX_POSITION_SIZE_USD=50
MAX_TOTAL_EXPOSURE_USD=200
```

### Step 6: Run Bot

```bash
npm start
```

Monitor closely for the first 24-48 hours.

## 📖 Documentation

- **[Implementation Guide](docs/LIVE_IMPLEMENTATION_GUIDE.md)** - Detailed setup for live trading
- **[Implementation Checklist](docs/IMPLEMENTATION_CHECKLIST.md)** - Step-by-step checklist
- **[Test Mode Architecture](docs/TEST_MODE_ARCHITECTURE.md)** - How test mode works

## 🛡️ Safety Features

### Test Mode Protection

When `TEST_MODE=true`:
- ❌ No real blockchain transactions
- ❌ Private keys ignored
- ✅ All operations simulated
- ✅ MockExecutor enforces isolation

### Risk Management

- Position size limits
- Total exposure caps
- Slippage protection
- Minimum trade size enforcement
- Emergency stop mechanism

### Emergency Stop

Create stop file to halt bot immediately:

```bash
touch /tmp/polymarket_bot_stop
```

Or kill the process:

```bash
pkill -f "node.*polymarket"
```

## 📁 Project Structure

```
polymarket-copy-trading-bot/
├── src/
│   ├── config/              # Configuration management
│   ├── services/
│   │   ├── executor/        # Trade execution (Live + Mock)
│   │   ├── monitor/         # Trade detection
│   │   ├── position/        # Position tracking
│   │   ├── risk/            # Risk management
│   │   └── polymarket/      # Polymarket API integration
│   ├── database/            # MongoDB/In-memory adapters
│   ├── simulators/          # Mock wallet & price simulator
│   ├── cli/                 # Dashboard UI
│   └── types/               # TypeScript types
├── tests/fixtures/          # Sample trades for testing
├── config/                  # Token mappings
├── docs/                    # Documentation
└── scripts/                 # Setup scripts
```

## 🔐 Security

- **Private keys never logged** - Secure handling throughout
- **Test mode isolation** - Prevents accidental live execution
- **Environment separation** - Clear distinction between test/live
- **MongoDB security** - Connection string in environment variables

## ⚙️ Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm run test-bot

# Lint
npm run lint

# Development mode
npm run dev
```

## 🐛 Troubleshooting

### "Chain ID mismatch"
- Verify using Polygon (Chain ID: 137), not Ethereum (Chain ID: 1)

### "Insufficient funds" with balance
- Ensure USDC is on Polygon network
- Check contract allowances for Polymarket

### Orders not executing
- Verify market liquidity in order book
- Check slippage tolerance settings
- Review error logs in `logs/` directory

### Trader detection not working
- Verify trader addresses are correct (Polygon addresses)
- Check API rate limits
- Review MonitorService logs

## 📊 Monitoring

The CLI dashboard shows:
- Current mode (TEST/LIVE)
- Balance and PnL
- Open positions
- Recent trades
- Execution statistics

In test mode, all displays are clearly marked as `[SIMULATED]`.

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Test thoroughly in TEST_MODE
4. Submit a pull request

## ⚠️ Disclaimer

**This software is for educational purposes. Trading involves risk of loss. Users are responsible for:**
- Understanding the code before using it
- Testing thoroughly before live trading
- Managing their own risk
- Securing their private keys
- Complying with all applicable laws

**No warranty provided. Use at your own risk.**

## 📝 License

MIT License - See LICENSE file for details

## 🔗 Resources

- [Polymarket](https://polymarket.com)
- [Polymarket API Docs](https://docs.polymarket.com)
- [Polygon Network](https://polygon.technology)

---

**Start with test mode. Monitor constantly. Scale gradually.**
