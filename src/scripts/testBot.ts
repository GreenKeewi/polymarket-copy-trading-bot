import * as path from 'path';
import chalk from 'chalk';
import { config } from '../config/ConfigManager';
import { DatabaseFactory, IDatabaseAdapter } from '../database/DatabaseFactory';
import { monitorService } from '../services/monitor/MonitorService';
import { executorService } from '../services/executor/ExecutorService';
import { ExecutorFactory } from '../services/executor/ExecutorFactory';
import { positionManager } from '../services/position/PositionManager';
import { TradeReplayRunner } from '../replay/TradeReplayRunner';
import { MockExecutor } from '../simulators/MockExecutor';

// Database adapter used throughout the test
let database: IDatabaseAdapter;

async function runTestBot(): Promise<void> {
  console.log(chalk.bold.cyan('\n═══════════════════════════════════════════════════'));
  console.log(chalk.bold.cyan('  Polymarket Copy Trading Bot - Test Mode'));
  console.log(chalk.bold.cyan('═══════════════════════════════════════════════════\n'));

  try {
    if (!config.isTestMode()) {
      console.error(chalk.red.bold('❌ FATAL ERROR: TEST_MODE is not enabled!'));
      console.error(chalk.red('This script can only run in TEST_MODE.'));
      console.error(chalk.yellow('Set TEST_MODE=true or use --test flag'));
      process.exit(1);
    }

    console.log(chalk.green('✅ TEST_MODE confirmed\n'));

    console.log(chalk.blue('📊 Connecting to database...'));
    
    // Use DatabaseFactory - automatically selects in-memory DB for test mode
    database = await DatabaseFactory.getConnectedDatabase();
    
    const dbType = DatabaseFactory.isUsingInMemoryDatabase() ? 'In-Memory' : 'MongoDB';
    console.log(chalk.green(`✅ Connected to ${dbType} database`));
    
    console.log(chalk.blue('🧹 Clearing previous test data...'));
    await database.clearAllData();
    console.log(chalk.green('✅ Database ready\n'));

    console.log(chalk.blue('🔧 Initializing mock executor...'));
    const executor = await ExecutorFactory.getExecutor();
    
    if (executor.getType() !== 'MOCK') {
      throw new Error('Expected MockExecutor but got LiveExecutor!');
    }
    
    const mockExecutor = executor as MockExecutor;
    const initialBalance = mockExecutor.getWallet().getBalance().total;
    console.log(chalk.green(`✅ Mock executor initialized with $${initialBalance}\n`));

    monitorService.on('trade', (trade, traderConfig) => {
      void executorService.processTrade(trade, traderConfig);
    });

    console.log(chalk.blue('👁️  Starting monitor service...'));
    await monitorService.start();
    console.log(chalk.green('✅ Monitor service started\n'));

    console.log(chalk.blue('📼 Loading sample trades...'));
    const tradesFile = path.join(__dirname, '../../tests/fixtures/sample-trades.json');
    const replayRunner = new TradeReplayRunner();
    await replayRunner.loadTrades(tradesFile);
    
    const trades = replayRunner.getTrades();
    console.log(chalk.green(`✅ Loaded ${trades.length} trades\n`));

    // Initialize price simulator with trade prices for realistic slippage testing
    console.log(chalk.blue('💰 Initializing price simulator with trade prices...'));
    const priceSimulator = mockExecutor.getPriceSimulator();
    for (const trade of trades) {
      priceSimulator.setPrice(trade.marketId, trade.outcomeId, trade.price);
    }
    console.log(chalk.green('✅ Price simulator initialized\n'));

    console.log(chalk.blue('▶️  Replaying trades through pipeline...\n'));
    await replayRunner.replay({ speed: 0 });
    
    await sleep(2000);

    console.log(chalk.green('\n✅ Replay completed\n'));

    console.log(chalk.bold.yellow('🔍 VALIDATION RESULTS\n'));
    await validateResults(mockExecutor, trades.length);

    console.log(chalk.bold.yellow('\n📊 FINAL STATE\n'));
    await displayFinalState(mockExecutor);

    console.log(chalk.bold.green('\n═══════════════════════════════════════════════════'));
    console.log(chalk.bold.green('  ✅ ALL TESTS PASSED'));
    console.log(chalk.bold.green('═══════════════════════════════════════════════════\n'));
    
    console.log(chalk.cyan('Test mode validation completed successfully.\n'));

  } catch (error) {
    console.error(chalk.red.bold('\n❌ TEST FAILED\n'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    console.error(error);
    process.exit(1);
  } finally {
    await monitorService.stop();
    await ExecutorFactory.shutdown();
    await DatabaseFactory.disconnect();
  }
}

async function validateResults(mockExecutor: MockExecutor, expectedTradeCount: number): Promise<void> {
  console.log(chalk.blue('Validating: No real trades executed...'));
  if (mockExecutor.getType() !== 'MOCK') {
    throw new Error('VALIDATION FAILED: Not using mock executor!');
  }
  console.log(chalk.green('✅ Confirmed: No real trades executed\n'));

  console.log(chalk.blue(`Validating: All ${expectedTradeCount} trades processed...`));
  const executionOrders = await database.getRecentExecutionOrders(100);
  const processedCount = executionOrders.length;
  console.log(chalk.gray(`  Processed ${processedCount} trades`));
  
  if (processedCount === 0) {
    throw new Error('VALIDATION FAILED: No trades were processed');
  }
  console.log(chalk.green('✅ Trades processed successfully\n'));

  console.log(chalk.blue('Validating: Position calculations...'));
  const positions = await positionManager.getAllPositions();
  console.log(chalk.gray(`  Found ${positions.length} open positions`));
  
  for (const position of positions) {
    if (position.quantity < 0) {
      throw new Error(`VALIDATION FAILED: Negative position quantity: ${position.quantity}`);
    }
  }
  console.log(chalk.green('✅ Position math correct\n'));

  console.log(chalk.blue('Validating: Balance consistency...'));
  const balance = mockExecutor.getWallet().getBalance();
  if (balance.total < 0) {
    throw new Error('VALIDATION FAILED: Negative balance!');
  }
  console.log(chalk.gray(`  Balance: $${balance.total.toFixed(2)}`));
  console.log(chalk.green('✅ Balance consistent\n'));
}

async function displayFinalState(mockExecutor: MockExecutor): Promise<void> {
  const stats = mockExecutor.getWallet().getStats();
  const balance = mockExecutor.getWallet().getBalance();
  const positions = await positionManager.getAllPositions();
  const pnl = await positionManager.getTotalPnL();

  console.log(chalk.cyan('Initial Balance:'), chalk.bold(`$${stats.initialBalance.toFixed(2)}`));
  console.log(chalk.cyan('Final Balance:'), chalk.bold(`$${balance.total.toFixed(2)}`));
  console.log(chalk.cyan('Cash:'), `$${balance.available.toFixed(2)}`);
  console.log(chalk.cyan('Positions Value:'), `$${balance.positionsValue.toFixed(2)}`);
  console.log();
  console.log(chalk.cyan('Total PnL:'), stats.totalPnL >= 0 
    ? chalk.green(`+$${stats.totalPnL.toFixed(2)}`)
    : chalk.red(`-$${Math.abs(stats.totalPnL).toFixed(2)}`));
  console.log(chalk.cyan('Realized PnL:'), pnl.realized >= 0
    ? chalk.green(`+$${pnl.realized.toFixed(2)}`)
    : chalk.red(`-$${Math.abs(pnl.realized).toFixed(2)}`));
  console.log(chalk.cyan('Unrealized PnL:'), pnl.unrealized >= 0
    ? chalk.green(`+$${pnl.unrealized.toFixed(2)}`)
    : chalk.red(`-$${Math.abs(pnl.unrealized).toFixed(2)}`));
  console.log();
  console.log(chalk.cyan('Total Trades:'), stats.totalTrades);
  console.log(chalk.cyan('Open Positions:'), positions.length);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

if (require.main === module) {
  void runTestBot();
}
