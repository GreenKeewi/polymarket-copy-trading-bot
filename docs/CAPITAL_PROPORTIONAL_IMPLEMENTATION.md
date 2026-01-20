# Position Sizing Implementation Summary

## What Changed

Implemented capital-proportional position sizing as an alternative to multiplier-based sizing.

## Key Changes

### 1. Type Definitions ([src/types/index.ts](../src/types/index.ts))
- Added `capitalAmount?: number` to `TrackedTrader` interface
- Maintains backward compatibility with `multiplier` field

### 2. Risk Engine ([src/services/risk/RiskEngine.ts](../src/services/risk/RiskEngine.ts))
- Added `calculateCapitalProportionalSize()` method
- Calculates position size based on percentage of capital
- Marked `calculateSafePositionSize()` as deprecated but kept for backward compatibility

### 3. Executor Service ([src/services/executor/ExecutorService.ts](../src/services/executor/ExecutorService.ts))
- Updated `processTrade()` to choose sizing method based on configuration
- Uses capital-proportional if `capitalAmount` is set
- Falls back to multiplier-based if not

### 4. Executor Interface ([src/services/executor/IExecutor.ts](../src/services/executor/IExecutor.ts))
- Added `getAvailableCapital()` method to interface
- Implemented in both `MockExecutor` and `LiveExecutor`

### 5. Configuration ([src/config/ConfigManager.ts](../src/config/ConfigManager.ts))
- Added parsing for `TRADER_CAPITAL_AMOUNTS` environment variable
- Supports comma-separated values for multiple traders

### 6. Documentation
- Updated [README.md](../README.md) with configuration examples
- Created [CAPITAL_PROPORTIONAL_SIZING.md](CAPITAL_PROPORTIONAL_SIZING.md) with detailed explanation
- Added example configuration file

## How to Use

### Option 1: Capital-Proportional (Recommended)

```bash
TRACKED_TRADERS=0xTraderAddress
TRADER_CAPITAL_AMOUNTS=10000
```

The bot will:
1. Calculate what % of capital the trader used
2. Apply the same % to your capital
3. Execute that sized position

### Option 2: Multiplier-Based (Legacy)

```bash
TRACKED_TRADERS=0xTraderAddress
POSITION_MULTIPLIERS=0.5
```

The bot will:
1. Multiply the trader's position size by 0.5
2. Execute that exact number of shares

### Priority

If both are set, `TRADER_CAPITAL_AMOUNTS` takes precedence.

## Benefits

1. **Safer**: Prevents over-leveraging when copying traders with larger accounts
2. **Scales Naturally**: Works across different account sizes
3. **Risk-Appropriate**: Maintains same risk level as the trader
4. **Conviction-Based**: Larger trader positions = larger your positions (proportionally)

## Example

**Trader:**
- Capital: $10,000
- Buys $1,000 worth (10% of capital)

**Your Bot:**
- Capital: $2,000
- With capital-proportional: Buys $200 worth (10% of capital) ✅
- With 1.0x multiplier: Would try to buy $1,000 worth (50% of capital) ⚠️

## Testing

Test mode fully supports capital-proportional sizing:

```bash
TEST_MODE=true
MOCK_WALLET_INITIAL_BALANCE=1000
TRADER_CAPITAL_AMOUNTS=10000
```

Run: `npm run test-bot`

Check logs for sizing calculations showing the percentage-based approach.

## Backward Compatibility

All existing configurations using `POSITION_MULTIPLIERS` continue to work unchanged. This is a fully backward-compatible addition.

## Files Modified

- `src/types/index.ts`
- `src/services/risk/RiskEngine.ts`
- `src/services/executor/ExecutorService.ts`
- `src/services/executor/IExecutor.ts`
- `src/services/executor/LiveExecutor.ts`
- `src/simulators/MockExecutor.ts`
- `src/config/ConfigManager.ts`
- `src/services/monitor/MonitorService.ts`
- `README.md`

## Files Created

- `docs/CAPITAL_PROPORTIONAL_SIZING.md`
- `.env.capital-proportional.example`
