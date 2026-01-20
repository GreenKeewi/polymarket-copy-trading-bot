import { logger } from '../../utils/logger';

/**
 * TokenMapper - Maps internal market/outcome IDs to Polymarket token IDs
 * 
 * Polymarket uses token IDs (contract addresses) for each outcome.
 * You need to map your internal IDs to these token IDs.
 */

export interface TokenMapping {
  marketId: string;
  outcomeId: string;
  tokenId: string;
  description?: string;
}

export class TokenMapper {
  private tokenMap: Map<string, string> = new Map();
  private reverseMap: Map<string, string> = new Map();

  /**
   * Add a mapping from outcome ID to Polymarket token ID
   */
  addMapping(outcomeId: string, tokenId: string) {
    this.tokenMap.set(outcomeId, tokenId);
    this.reverseMap.set(tokenId, outcomeId);
    
    logger.debug('Token mapping added', { outcomeId, tokenId });
  }

  /**
   * Get Polymarket token ID from internal outcome ID
   */
  getTokenId(outcomeId: string): string {
    const tokenId = this.tokenMap.get(outcomeId);
    
    if (!tokenId) {
      throw new Error(`No token mapping found for outcome: ${outcomeId}`);
    }
    
    return tokenId;
  }

  /**
   * Get internal outcome ID from Polymarket token ID
   */
  getOutcomeId(tokenId: string): string {
    const outcomeId = this.reverseMap.get(tokenId);
    
    if (!outcomeId) {
      throw new Error(`No outcome mapping found for token: ${tokenId}`);
    }
    
    return outcomeId;
  }

  /**
   * Check if mapping exists
   */
  hasMapping(outcomeId: string): boolean {
    return this.tokenMap.has(outcomeId);
  }

  /**
   * Load mappings from configuration file
   */
  async loadFromFile(filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(filePath, 'utf-8');
      const mappings: TokenMapping[] = JSON.parse(data);

      for (const mapping of mappings) {
        this.addMapping(mapping.outcomeId, mapping.tokenId);
      }

      logger.info(`Loaded ${mappings.length} token mappings from ${filePath}`);
    } catch (error) {
      logger.error('Failed to load token mappings', { error, filePath });
      throw error;
    }
  }

  /**
   * Load mappings from Polymarket API
   * You'll need to implement API calls to fetch market data
   */
  async loadFromAPI(_marketIds: string[]): Promise<void> {
    // TODO: Implement API fetching
    /*
    for (const marketId of marketIds) {
      // Fetch market data from Polymarket API
      const response = await fetch(`https://api.polymarket.com/markets/${marketId}`);
      const market = await response.json();
      
      // Map outcomes to token IDs
      for (const outcome of market.outcomes) {
        this.addMapping(
          `${marketId}:${outcome.name}`,
          outcome.tokenId
        );
      }
    }
    */

    throw new Error('loadFromAPI not implemented');
  }

  /**
   * Get all mappings
   */
  getAllMappings(): Array<{ outcomeId: string; tokenId: string }> {
    const mappings: Array<{ outcomeId: string; tokenId: string }> = [];
    
    for (const [outcomeId, tokenId] of this.tokenMap.entries()) {
      mappings.push({ outcomeId, tokenId });
    }
    
    return mappings;
  }

  /**
   * Clear all mappings
   */
  clear(): void {
    this.tokenMap.clear();
    this.reverseMap.clear();
    logger.info('Token mappings cleared');
  }
}

// Singleton instance
export const tokenMapper = new TokenMapper();
