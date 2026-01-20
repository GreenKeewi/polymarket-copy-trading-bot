# Test Mode Architecture

See README.md for comprehensive test mode documentation.

## Quick Reference

### Enable Test Mode
```bash
TEST_MODE=true npm start
# or
npm start -- --test
```

### Run Test Bot
```bash
npm run test-bot
```

### Safety Layers

1. **ConfigManager**: Detects test mode from env/flags
2. **LiveExecutionGuard**: Prevents LiveExecutor import in test mode
3. **ExecutorFactory**: Dynamically loads correct executor
4. **IExecutor Interface**: Shared contract for Live/Mock executors
5. **MockWalletEngine**: Complete wallet simulation
6. **PriceSimulator**: Controlled market price generation
7. **TradeReplayRunner**: Historical trade testing
8. **Dashboard**: Clear visual separation of modes

### Key Files

- `src/config/ConfigManager.ts` - Mode detection
- `src/services/executor/LiveExecutionGuard.ts` - Safety guard
- `src/services/executor/ExecutorFactory.ts` - Executor selection
- `src/simulators/MockWalletEngine.ts` - Mock wallet
- `src/simulators/MockExecutor.ts` - Mock executor
- `src/simulators/PriceSimulator.ts` - Price simulation
- `src/scripts/testBot.ts` - Validation script

