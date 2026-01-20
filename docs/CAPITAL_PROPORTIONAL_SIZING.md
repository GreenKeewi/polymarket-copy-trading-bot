# Capital-Proportional Position Sizing

## Overview

This document explains how capital-proportional position sizing works and how to configure it.

## The Problem with Multiplier-Based Sizing

Traditional multiplier-based sizing has limitations:

**Example:**
- Trader (capital: $100,000) buys 1,000 shares @ $10 = $10,000 (10% of their capital)
- You (capital: $5,000) with 1.0x multiplier also buy 1,000 shares @ $10 = $10,000 (200% of your capital!)

This doesn't scale well across different account sizes.

## Capital-Proportional Solution

Capital-proportional sizing maintains the **same percentage of capital** as the trader:

**Same Example:**
- Trader (capital: $100,000) buys 1,000 shares @ $10 = $10,000 (10% of their capital)
- You (capital: $5,000) buy 50 shares @ $10 = $500 (10% of your capital)

Both are risking 10% of capital, which is more appropriate.

## Configuration

### Step 1: Estimate Trader Capital

You need to estimate the total capital the trader is working with. Ways to do this:

1. **Public Information**: Check if they've disclosed their account size
2. **Analysis**: Look at their historical trades and positions
3. **Conservative Estimate**: Use a reasonable estimate and adjust over time

### Step 2: Configure Environment Variables

```bash
# Set the trader addresses
TRACKED_TRADERS=0xTraderAddress1,0xTraderAddress2

# Set their estimated capital amounts (in USD)
TRADER_CAPITAL_AMOUNTS=10000,25000
```

### Step 3: Set Your Initial Balance

In test mode:
```bash
MOCK_WALLET_INITIAL_BALANCE=2000
```

In live mode, this will be automatically detected from your wallet.

## How Calculations Work

### Formula

```
trader_position_percent = (trade_size × trade_price) / trader_capital
bot_position_value = bot_capital × trader_position_percent
bot_position_size = bot_position_value / current_price
```

### Real Example

**Trader Activity:**
- Trader capital: $10,000
- Trader buys 200 shares @ $5.00
- Trade value: $1,000
- Position as % of capital: $1,000 / $10,000 = 10%

**Your Bot:**
- Your capital: $2,000
- Position to take: $2,000 × 10% = $200
- Shares to buy: $200 / $5.00 = 40 shares

**Result:**
- Trader uses 10% of capital → You use 10% of capital
- Same risk level, different absolute amounts

## Comparison Table

| Scenario | Trader | Multiplier (1.0x) | Capital-Proportional |
|----------|--------|-------------------|----------------------|
| **Capital** | $100,000 | $5,000 | $5,000 |
| **Trader Action** | Buys $10,000 | - | - |
| **Your Position** | - | $10,000 (200%!) | $500 (10%) |
| **Risk Level** | 10% | 200% ❌ | 10% ✅ |

## Benefits

1. **Scales Naturally**: Works across different account sizes
2. **Matches Risk**: You take the same risk level as the trader
3. **Safer**: Prevents over-leveraging with large traders
4. **Conviction-Based**: Larger trades by trader = larger positions for you (proportionally)

## Configuration Examples

### Single Trader (Capital-Proportional)

```bash
TRACKED_TRADERS=0x1234567890123456789012345678901234567890
TRADER_CAPITAL_AMOUNTS=15000
```

### Multiple Traders (Mixed Methods)

```bash
TRACKED_TRADERS=0xTrader1,0xTrader2,0xTrader3
TRADER_CAPITAL_AMOUNTS=10000,,5000
POSITION_MULTIPLIERS=1.0,0.5,1.0
```

- Trader1: Capital-proportional ($10k capital)
- Trader2: Multiplier-based (0.5x)
- Trader3: Capital-proportional ($5k capital)

### Multiple Traders (All Capital-Proportional)

```bash
TRACKED_TRADERS=0xTrader1,0xTrader2,0xTrader3
TRADER_CAPITAL_AMOUNTS=10000,25000,15000
```

## Important Notes

### Capital Estimation

- **Be Conservative**: It's better to overestimate trader capital than underestimate
- **Update Periodically**: Trader capital may grow/shrink over time
- **Consider Market Conditions**: Traders may not deploy full capital in all conditions

### Risk Limits Still Apply

Capital-proportional sizing is applied FIRST, then risk limits are checked:

1. Calculate proportional position
2. Ensure doesn't exceed `MAX_POSITION_SIZE_USD`
3. Ensure doesn't exceed `MAX_TOTAL_EXPOSURE_USD`
4. Ensure meets `MIN_TRADE_SIZE_USD`

If any check fails, the trade is rejected or adjusted.

### Dynamic Capital

The bot calculates your available capital dynamically:
- **Cash balance** + **Current position values** = Total capital
- This means your capital changes as positions are profitable/unprofitable

## Testing

Always test with `TEST_MODE=true` first:

```bash
# .env
TEST_MODE=true
MOCK_WALLET_INITIAL_BALANCE=1000
TRACKED_TRADERS=0x1234567890123456789012345678901234567890
TRADER_CAPITAL_AMOUNTS=10000

# This simulates having $1,000 capital while tracking a trader with $10,000
# If they buy $1,000 (10%), you'll buy $100 (10%)
```

Run test:
```bash
npm run test-bot
```

Check the logs for sizing calculations:
```
Capital-proportional sizing:
  traderCapital: 10000
  tradeValue: 1000
  traderPercent: 10.00%
  botCapital: 1000
  botPositionValue: 100
  calculatedSize: 20.00
```

## Fallback to Multiplier

If `TRADER_CAPITAL_AMOUNTS` is not set or is 0, the bot falls back to multiplier-based sizing:

```bash
# No capital amounts set
TRACKED_TRADERS=0x1234567890123456789012345678901234567890
POSITION_MULTIPLIERS=0.5
# Uses multiplier: 0.5x
```

This ensures backward compatibility.

## Recommendations

1. **Start with Capital-Proportional**: It's safer and more sophisticated
2. **Verify in Test Mode**: Always test with realistic scenarios first
3. **Monitor Sizing**: Check logs to ensure calculations are reasonable
4. **Adjust Capital Estimates**: Update as you learn more about the trader
5. **Use Conservative Risk Limits**: Set MAX_POSITION_SIZE_USD appropriately

## Example Logs

When capital-proportional sizing is active, you'll see:

```
info: Processing trade: trade_123 {
  side: 'BUY',
  size: 100,
  price: 10,
  multiplier: 1
}
info: Using capital-proportional sizing (trader capital: $10000)
info: Capital-proportional sizing: {
  traderCapital: 10000,
  tradeValue: 1000,
  traderPercent: '10.00%',
  botCapital: 2000,
  botPositionValue: 200,
  calculatedSize: '20.00'
}
info: ✅ Order executed successfully
```

When multiplier-based is used:

```
info: Using multiplier-based sizing (multiplier: 0.5)
```

This makes it clear which method is being used for each trade.
