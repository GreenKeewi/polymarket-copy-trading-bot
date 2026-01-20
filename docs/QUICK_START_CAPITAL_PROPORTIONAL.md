# Quick Start: Capital-Proportional Position Sizing

## TL;DR

Instead of copying the exact same number of shares, the bot now copies the **same percentage of capital** the trader uses.

## Setup (30 seconds)

Add to your `.env` file:

```bash
# Old way (multiplier-based)
TRACKED_TRADERS=0xTraderAddress
POSITION_MULTIPLIERS=1.0

# New way (capital-proportional) - just add this line:
TRADER_CAPITAL_AMOUNTS=10000
```

That's it! The bot will now use capital-proportional sizing.

## What This Means

**Before (Multiplier):**
- Trader buys 100 shares → You buy 100 shares
- Problem: Doesn't consider if you have $1,000 or $100,000

**After (Capital-Proportional):**
- Trader uses 10% of their capital → You use 10% of your capital
- Smart: Adjusts to your account size automatically

## Example

```
Trader:
  Capital: $10,000
  Buys $1,000 worth (10%)

You (capital $2,000):
  Old: Would buy $1,000 (50% - risky!)
  New: Buys $200 (10% - same risk as trader)
```

## Configuration

### Single Trader
```bash
TRACKED_TRADERS=0xABC123
TRADER_CAPITAL_AMOUNTS=10000
```

### Multiple Traders
```bash
TRACKED_TRADERS=0xTrader1,0xTrader2,0xTrader3
TRADER_CAPITAL_AMOUNTS=10000,25000,15000
```

### Mixed (Some Capital, Some Multiplier)
```bash
TRACKED_TRADERS=0xTrader1,0xTrader2
TRADER_CAPITAL_AMOUNTS=10000,
POSITION_MULTIPLIERS=1.0,0.5
```
Trader1 uses capital-proportional, Trader2 uses 0.5x multiplier.

## How to Estimate Trader Capital

1. **Conservative approach**: Start with a high estimate (safer)
2. **Analysis**: Look at their largest positions
3. **Adjust**: Update as you learn more

Example:
- See trader has $2,000 positions → Estimate ~$10,000-20,000 capital
- Better to overestimate (results in smaller positions for you)

## Testing

Always test first:

```bash
# .env
TEST_MODE=true
MOCK_WALLET_INITIAL_BALANCE=1000
TRADER_CAPITAL_AMOUNTS=10000
```

```bash
npm run test-bot
```

Look for this in the logs:
```
Capital-proportional sizing:
  traderCapital: 10000
  traderPercent: 10.00%
  botCapital: 1000
  botPositionValue: 100
```

## When to Use Which Method

**Use Capital-Proportional When:**
- ✅ You want safer, risk-appropriate sizing
- ✅ Trader has different account size than you
- ✅ You can estimate trader's capital reasonably

**Use Multiplier When:**
- ✅ You want simple, direct proportion
- ✅ You can't estimate trader's capital
- ✅ You're very conservative with multiplier (e.g., 0.1x)

## Pro Tip

Start conservative:
```bash
TRADER_CAPITAL_AMOUNTS=20000  # Overestimate = smaller positions
```

As you get more confident:
```bash
TRADER_CAPITAL_AMOUNTS=10000  # More accurate = appropriately sized
```

## Help

- Full documentation: `docs/CAPITAL_PROPORTIONAL_SIZING.md`
- See comparison: `node examples/sizing-comparison.js`
- Test mode guide: README.md

## Questions?

**Q: What if I set the trader capital wrong?**
A: If you overestimate, your positions will be smaller (safer). If you underestimate, they'll be larger (check risk limits).

**Q: Does this work in test mode?**
A: Yes! Test it thoroughly before going live.

**Q: Can I use both methods for different traders?**
A: Yes! Set capital for some, multipliers for others.

**Q: Do risk limits still apply?**
A: Yes! Capital-proportional calculates the size, then risk limits are enforced.
