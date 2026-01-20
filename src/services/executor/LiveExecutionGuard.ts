import { config } from '../../config/ConfigManager';
import { logger } from '../../utils/logger';

/**
 * CRITICAL SAFETY GUARD
 * This module prevents accidental live execution in test mode
 */

export class LiveExecutionGuard {
  private static hasChecked = false;

  public static assertSafeToLoad(): void {
    if (this.hasChecked) {
      return;
    }

    this.hasChecked = true;

    if (config.isTestMode()) {
      const error = new Error(
        '\n' +
        '═══════════════════════════════════════════════════════════════\n' +
        '  ❌ FATAL ERROR: ATTEMPTED TO LOAD LIVE EXECUTOR IN TEST MODE\n' +
        '═══════════════════════════════════════════════════════════════\n' +
        '\n' +
        '  TEST_MODE is enabled, but code tried to import LiveExecutor.\n' +
        '  This is a critical safety violation.\n' +
        '\n' +
        '  Live execution is FORBIDDEN in test mode.\n' +
        '\n' +
        '  If you want to trade with real money:\n' +
        '    1. Set TEST_MODE=false\n' +
        '    2. Remove --test and --dry-run flags\n' +
        '    3. Restart the bot\n' +
        '\n' +
        '  Stack trace:\n'
      );
      
      logger.error('🚨 CRITICAL: Attempted to load LiveExecutor in TEST_MODE');
      logger.error('Stack trace:', { stack: error.stack });
      
      throw error;
    }

    logger.info('✅ LiveExecutionGuard: LIVE mode confirmed, execution allowed');
  }
}
