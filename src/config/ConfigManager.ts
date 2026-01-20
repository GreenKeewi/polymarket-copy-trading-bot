import * as dotenv from 'dotenv';
import { BotConfig, TrackedTrader, ExecutionMode } from '../types';

dotenv.config();

export class ConfigManager {
  private static instance: ConfigManager;
  private config: BotConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): BotConfig {
    const testMode = this.checkTestMode();

    // CRITICAL: Prevent loading private key in test mode
    // Note: Using console.warn here because logger depends on ConfigManager (circular dependency)
    // This message intentionally does not include any sensitive data
    if (testMode && process.env.WALLET_PRIVATE_KEY) {
      // eslint-disable-next-line no-console
      console.warn('⚠️  WARNING: WALLET_PRIVATE_KEY is set but TEST_MODE is enabled. Private key will be IGNORED.');
    }

    const trackedTraders = this.parseTrackedTraders();

    return {
      testMode: {
        enabled: testMode,
        initialBalance: parseFloat(process.env.MOCK_WALLET_INITIAL_BALANCE || '1000'),
        volatility: parseFloat(process.env.PRICE_SIMULATOR_VOLATILITY || '0.02'),
        deterministicSeed: process.env.ENABLE_DETERMINISTIC_SEED === 'true' 
          ? parseInt(process.env.DETERMINISTIC_SEED || '42')
          : undefined,
      },
      mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
        database: process.env.MONGODB_DATABASE || 'polymarket_copy_bot',
      },
      wallet: {
        privateKey: testMode ? undefined : process.env.WALLET_PRIVATE_KEY,
      },
      risk: {
        maxPositionSizeUSD: parseFloat(process.env.MAX_POSITION_SIZE_USD || '1000'),
        maxTotalExposureUSD: parseFloat(process.env.MAX_TOTAL_EXPOSURE_USD || '5000'),
        maxSlippageTolerance: parseFloat(process.env.DEFAULT_SLIPPAGE_TOLERANCE || '0.02'),
        minTradeSizeUSD: parseFloat(process.env.MIN_TRADE_SIZE_USD || '10'),
      },
      trackedTraders,
      aggregationWindowMs: parseInt(process.env.AGGREGATION_WINDOW_MS || '5000'),
      enableSlippageProtection: process.env.ENABLE_SLIPPAGE_PROTECTION !== 'false',
      enableExposureLimits: process.env.ENABLE_EXPOSURE_LIMITS !== 'false',
    };
  }

  private checkTestMode(): boolean {
    // Check environment variable
    if (process.env.TEST_MODE === 'true') {
      return true;
    }

    // Check command line arguments
    const args = process.argv.slice(2);
    if (args.includes('--test') || args.includes('--dry-run')) {
      return true;
    }

    return false;
  }

  private parseTrackedTraders(): TrackedTrader[] {
    const traders = process.env.TRACKED_TRADERS?.split(',').map(t => t.trim()).filter(Boolean) || [];
    const multipliers = process.env.POSITION_MULTIPLIERS?.split(',').map(m => parseFloat(m.trim())) || [];

    return traders.map((address, index) => ({
      address,
      multiplier: multipliers[index] || 1.0,
      active: true,
    }));
  }

  private validateConfig(): void {
    if (!this.config.testMode.enabled) {
      if (!this.config.wallet.privateKey) {
        throw new Error(
          '❌ FATAL: WALLET_PRIVATE_KEY is required for LIVE mode. ' +
          'Use TEST_MODE=true or --test flag for testing.'
        );
      }
    }

    if (this.config.trackedTraders.length === 0) {
      throw new Error('❌ FATAL: No tracked traders configured. Set TRACKED_TRADERS environment variable.');
    }

    if (this.config.risk.maxPositionSizeUSD <= 0) {
      throw new Error('❌ FATAL: MAX_POSITION_SIZE_USD must be greater than 0');
    }

    if (this.config.risk.maxTotalExposureUSD <= 0) {
      throw new Error('❌ FATAL: MAX_TOTAL_EXPOSURE_USD must be greater than 0');
    }
  }

  public getConfig(): BotConfig {
    return { ...this.config };
  }

  public isTestMode(): boolean {
    return this.config.testMode.enabled;
  }

  public getExecutionMode(): ExecutionMode {
    return this.config.testMode.enabled ? ExecutionMode.TEST : ExecutionMode.LIVE;
  }

  public assertTestMode(): void {
    if (!this.config.testMode.enabled) {
      throw new Error('❌ FATAL: This operation requires TEST_MODE to be enabled');
    }
  }

  public assertLiveMode(): void {
    if (this.config.testMode.enabled) {
      throw new Error('❌ FATAL: This operation cannot be performed in TEST_MODE');
    }
  }
}

export const config = ConfigManager.getInstance();
