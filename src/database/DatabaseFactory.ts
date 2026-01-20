import { config } from '../config/ConfigManager';
import { database as mongoDatabase } from './DatabaseManager';
import { inMemoryDatabase } from './InMemoryDatabaseManager';
import { IDatabaseAdapter } from './IDatabaseAdapter';

// Re-export the interface for convenience
export { IDatabaseAdapter } from './IDatabaseAdapter';

/**
 * DatabaseFactory - Returns the appropriate database adapter based on configuration
 * 
 * In TEST_MODE: Returns InMemoryDatabaseManager (no MongoDB required)
 * In LIVE_MODE: Returns DatabaseManager (MongoDB required)
 */
export class DatabaseFactory {
  private static currentAdapter: IDatabaseAdapter | null = null;

  /**
   * Get the appropriate database adapter for the current mode
   */
  public static getDatabase(): IDatabaseAdapter {
    if (config.isTestMode()) {
      // Use in-memory database for test mode - no external dependencies required
      return inMemoryDatabase;
    } else {
      // Use MongoDB for live mode
      return mongoDatabase as unknown as IDatabaseAdapter;
    }
  }

  /**
   * Get and cache the database adapter
   */
  public static async getConnectedDatabase(): Promise<IDatabaseAdapter> {
    if (!this.currentAdapter) {
      this.currentAdapter = this.getDatabase();
      await this.currentAdapter.connect();
    }
    return this.currentAdapter;
  }

  /**
   * Disconnect the current adapter
   */
  public static async disconnect(): Promise<void> {
    if (this.currentAdapter) {
      await this.currentAdapter.disconnect();
      this.currentAdapter = null;
    }
  }

  /**
   * Check if using in-memory database
   */
  public static isUsingInMemoryDatabase(): boolean {
    return config.isTestMode();
  }
}

// Default export for convenience
export const db = DatabaseFactory;
