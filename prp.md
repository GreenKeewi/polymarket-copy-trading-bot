You are a senior blockchain engineer, backend architect, and systems designer building a production-grade Polymarket copy-trading bot.

This system must include a mandatory testing mode that allows the entire pipeline to be validated without using real money.

🔒 Mandatory Testing & Simulation Mode
Objective

Implement a fully isolated test mode that simulates:

Trade detection

Position sizing

Aggregation

Execution

Position tracking

Slippage checks

Database writes

No real transactions may be sent while test mode is enabled.

1. Test Mode Toggle

The bot must support:

--test

--dry-run

or environment variable TEST_MODE=true

When enabled:

Wallet private key is never used

No on-chain or Polymarket orders are submitted

Executor uses a simulated execution engine

2. Simulated Wallet

Implement a Mock Wallet Engine that:

Starts with configurable fake balance (e.g. $1,000)

Supports:

Buy

Sell

Partial fills

Tracks:

Cash balance

Positions per market/outcome

PnL

Enforces the same risk rules as live trading

This engine must share the same interface as the real execution engine.

3. Simulated Market Prices

Create a Price Simulator that:

Pulls live Polymarket prices OR

Uses recorded historical snapshots OR

Generates controlled random walks (configurable volatility)

Used for:

Slippage checks

Fill logic

Price movement testing

4. Trade Replay System

Add a Trade Replay Script:

Accepts:

JSON file of historical trades OR

Recorded Polymarket trader activity OR

Manually defined fake trades

Feeds them into the Monitor pipeline as if detected live

Supports:

Speed control (1x, 5x, instant)

Batch replay

Edge case testing

5. End-to-End Validation Script

Provide a runnable script:

npm run test-bot
# or
python test_bot.py


This script must:

Spin up MongoDB (or connect to local)

Enable test mode

Load mock traders

Replay sample trades

Execute through full pipeline

Output final balances, positions, and logs

Validate:

No real trades sent

All detected trades processed once

Position math is correct

6. Test CLI Dashboard

When in test mode:

CLI must clearly show:

TEST MODE banner

Simulated balance

Fake PnL

Color or label separation from live mode

Impossible to confuse with real trading

7. Failure & Edge Case Tests

Testing system must include scenarios for:

Rapid trade bursts

Partial sells

Market price jumps

Slippage rejection

Insufficient balance

Duplicate trade detection

Bot restart mid-run

MongoDB reconnect

8. Test Data & Fixtures

Provide:

Sample traders

Sample markets

Sample trade JSON

Expected outputs

Organize under:

/tests
  /fixtures
  /replay
  /simulators

9. Safety Guarantees

Enforce hard safety rails:

If TEST_MODE=true:

Live executor cannot be imported

Any attempt to send real trades throws a fatal error

Require explicit confirmation to switch to live mode

10. Output Expectations (Testing)

Deliver:

Test architecture explanation

Mock executor implementation

Trade replay runner

Sample test session output

Clear instructions to graduate from test → live

Quality Bar

If this test mode cannot:

Catch logic errors

Validate sizing math

Simulate real execution

Prevent accidental live trades

Then it is considered failed.

This system must let a user gain absolute confidence before risking capital.

Optional Enhancements (Implement if clean)

Snapshot-based regression tests

Deterministic seed for reproducible runs

Export test run summary as JSON

Build this like you’re protecting a trader from losing money due to a bug.
