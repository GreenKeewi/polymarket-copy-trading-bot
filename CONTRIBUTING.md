# Contributing to Polymarket Copy Trading Bot

## Development Setup

```bash
# Clone and install
git clone <repo-url>
cd polymarket-copy-trading-bot
npm install

# Copy environment
cp .env.example .env

# Build
npm run build
```

## Code Style

- TypeScript strict mode enabled
- ESLint with TypeScript rules
- Explicit return types required
- No `any` types allowed

## Testing Requirements

**ALL code changes must be tested in test mode first.**

```bash
# Run test bot
npm run test-bot

# Start in test mode
npm run start:test
```

## Architecture Principles

### 1. Never Assume = Never Trust

- Balance ≠ Position value
- Always validate before executing
- Check database state explicitly

### 2. Idempotency

- All operations must be safely retriable
- Use unique IDs for deduplication
- MongoDB as source of truth

### 3. Separation of Concerns

Each service has ONE responsibility:

- **MonitorService**: Trade detection only
- **ExecutorService**: Execution orchestration only  
- **PositionManager**: State & math only
- **RiskEngine**: Validation only
- **DatabaseManager**: Persistence only

**NO monolithic logic.**

### 4. Test Mode Isolation

- `LiveExecutor` must NEVER be imported in test mode
- `LiveExecutionGuard` enforces this
- All test code must use `MockExecutor`

### 5. Security First

- Private keys never logged (sanitized)
- Secrets never committed
- Test mode prevents accidents

## Adding Features

### 1. Define Types

```typescript
// src/types/index.ts
export interface NewFeature {
  id: string;
  // ...
}
```

### 2. Add Tests First

```typescript
// Create test fixture
// tests/fixtures/new-feature-test.json
{
  "scenarios": [...]
}
```

### 3. Implement

```typescript
// src/services/newfeature/NewFeatureService.ts
export class NewFeatureService {
  // Implementation
}
```

### 4. Wire Up

```typescript
// src/index.ts
import { newFeatureService } from './services/newfeature/NewFeatureService';

// Initialize in start()
await newFeatureService.start();
```

### 5. Validate

```bash
# Build
npm run build

# Lint
npm run lint

# Test
npm run test-bot
```

## Service Template

```typescript
import { logger } from '../../utils/logger';

export class NewService {
  private static instance: NewService;
  
  private constructor() {}
  
  public static getInstance(): NewService {
    if (!NewService.instance) {
      NewService.instance = new NewService();
    }
    return NewService.instance;
  }
  
  async initialize(): Promise<void> {
    logger.info('NewService initialized');
  }
  
  async shutdown(): Promise<void> {
    logger.info('NewService shutdown');
  }
}

export const newService = NewService.getInstance();
```

## Database Patterns

### Adding a Collection

```typescript
// src/database/DatabaseManager.ts

public getNewCollection(): Collection<NewType> {
  if (!this.db) throw new Error('Database not connected');
  return this.db.collection<NewType>('newCollection');
}

// In createIndexes()
await this.db.collection('newCollection').createIndex({ id: 1 }, { unique: true });
```

### Saving Documents

```typescript
async saveNew(item: NewType): Promise<void> {
  try {
    await this.getNewCollection().insertOne(item);
    logger.info(`New item saved: ${item.id}`);
  } catch (error) {
    if ((error as any).code === 11000) {
      logger.warn(`Duplicate item: ${item.id}`);
    } else {
      logger.error('Failed to save item', { error });
      throw error;
    }
  }
}
```

## Executor Patterns

### Both Live and Mock Must Implement

```typescript
// 1. Shared interface (IExecutor)
interface IExecutor {
  executeOrder(order: ExecutionOrder): Promise<ExecutionResult>;
  // ...
}

// 2. LiveExecutor implements it
export class LiveExecutor implements IExecutor {
  constructor() {
    LiveExecutionGuard.assertSafeToLoad(); // FIRST LINE
  }
  // ...
}

// 3. MockExecutor implements it
export class MockExecutor implements IExecutor {
  constructor() {
    config.assertTestMode(); // FIRST LINE
  }
  // ...
}
```

## Risk Engine Patterns

### Adding Validation

```typescript
// src/services/risk/RiskEngine.ts

private async checkNewRule(order: ExecutionOrder): Promise<{ valid: boolean; reason?: string }> {
  // Validation logic
  
  if (violatesRule) {
    return {
      valid: false,
      reason: 'Explanation of why rejected'
    };
  }
  
  return { valid: true };
}

// Add to validateOrder()
const newRuleCheck = await this.checkNewRule(order);
if (!newRuleCheck.valid) {
  return newRuleCheck;
}
```

## CLI Dashboard Patterns

### Adding Display Section

```typescript
private async renderNewSection(): Promise<void> {
  try {
    const data = await fetchData();
    
    const table = new Table({
      head: ['Column1', 'Column2'],
      colWidths: [20, 20],
    });
    
    for (const item of data) {
      table.push([item.col1, item.col2]);
    }
    
    console.log(chalk.bold('📊 New Section'));
    console.log(table.toString());
    console.log();
    
  } catch (error) {
    console.log(chalk.red('Error fetching data'));
    console.log();
  }
}

// Add to render()
await this.renderNewSection();
```

## Testing Patterns

### Creating Test Fixtures

```json
{
  "description": "Test scenario X",
  "trades": [
    {
      "id": "test_001",
      "traderAddress": "0x...",
      "marketId": "market_test",
      "outcomeId": "outcome_yes",
      "side": "BUY",
      "size": 100,
      "price": 0.5,
      "timestamp": "2024-01-20T10:00:00.000Z"
    }
  ],
  "expectedOutcome": {
    "positionsCount": 1,
    "finalBalance": 950.0,
    "totalPnL": -50.0
  }
}
```

### Running Tests

```typescript
// In testBot.ts

async function testNewFeature(): Promise<void> {
  console.log(chalk.blue('Testing new feature...'));
  
  // Setup
  // Execute
  // Validate
  
  console.log(chalk.green('✅ Feature test passed\n'));
}

// Add to runTestBot()
await testNewFeature();
```

## Pull Request Checklist

Before submitting:

- [ ] Code builds without errors (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] Test bot passes (`npm run test-bot`)
- [ ] Changes work in test mode
- [ ] Documentation updated (README, code comments)
- [ ] No private keys or secrets in code
- [ ] No console.log (use logger)
- [ ] TypeScript strict mode compliance

## Code Review Focus

Reviewers will check:

1. **Safety**: Can this lose money?
2. **Test Mode**: Works in test mode?
3. **Idempotency**: Can operations be retried?
4. **Error Handling**: What happens on failure?
5. **Logging**: Sufficient for debugging?
6. **Types**: Explicit and correct?
7. **Architecture**: Follows patterns?

## Common Pitfalls

### ❌ DON'T

```typescript
// Mixing concerns
class MonitorAndExecutor {
  async detectAndExecute() {
    // BAD: Should be separate services
  }
}

// Assuming state
async execute(trade: Trade) {
  // BAD: Assuming balance exists
  const balance = await getBalance();
  await buy(balance);
}

// Missing validation
async execute(order: Order) {
  // BAD: No risk checks
  await executor.execute(order);
}

// Logging secrets
logger.info('Key:', privateKey); // BAD: Never log keys
```

### ✅ DO

```typescript
// Separation
class MonitorService {
  async detect() { /* only detection */ }
}
class ExecutorService {
  async execute() { /* only execution */ }
}

// Explicit checks
async execute(trade: Trade) {
  const balance = await getBalance();
  if (balance < cost) {
    throw new Error('Insufficient balance');
  }
  await buy(calculatedAmount);
}

// Validation pipeline
async execute(order: Order) {
  const validation = await riskEngine.validate(order);
  if (!validation.valid) {
    return reject(validation.reason);
  }
  await executor.execute(order);
}

// Safe logging
logger.info('Executing order', { 
  orderId: order.id,
  // privateKey: NEVER
});
```

## Questions?

Check:
1. This guide
2. README.md
3. Code comments
4. Existing patterns

Still stuck? Open an issue with:
- What you're trying to do
- What you've tried
- Error messages (sanitized!)
- Relevant code snippets

---

Happy coding! And remember: **TEST FIRST, TRADE LATER** 🧪
