/**
 * Demonstration of Capital-Proportional Position Sizing
 * 
 * This script shows the difference between multiplier-based and capital-proportional sizing
 */

// Example scenario
const scenarios = [
  {
    name: "Small Trader Activity",
    traderCapital: 10000,
    tradeSize: 100,
    tradePrice: 5.0,
  },
  {
    name: "Large Trader Activity",
    traderCapital: 100000,
    tradeSize: 2000,
    tradePrice: 5.0,
  },
  {
    name: "High Conviction Trade",
    traderCapital: 10000,
    tradeSize: 500,
    tradePrice: 4.0,
  },
];

const botCapital = 2000;
const multiplier = 1.0;

console.log('═'.repeat(80));
console.log('  Capital-Proportional vs Multiplier-Based Position Sizing Comparison');
console.log('═'.repeat(80));
console.log(`\nYour Bot Capital: $${botCapital.toFixed(2)}\n`);

scenarios.forEach((scenario, index) => {
  console.log(`\n${index + 1}. ${scenario.name}`);
  console.log('─'.repeat(80));
  
  // Trader activity
  const tradeValue = scenario.tradeSize * scenario.tradePrice;
  const traderPercent = (tradeValue / scenario.traderCapital) * 100;
  
  console.log(`\n📊 Trader Activity:`);
  console.log(`   Capital: $${scenario.traderCapital.toLocaleString()}`);
  console.log(`   Trade: ${scenario.tradeSize} shares @ $${scenario.tradePrice.toFixed(2)} = $${tradeValue.toFixed(2)}`);
  console.log(`   Using: ${traderPercent.toFixed(2)}% of their capital`);
  
  // Multiplier-based sizing
  const multiplierSize = scenario.tradeSize * multiplier;
  const multiplierValue = multiplierSize * scenario.tradePrice;
  const multiplierPercent = (multiplierValue / botCapital) * 100;
  
  console.log(`\n🔢 Multiplier-Based (${multiplier}x):`);
  console.log(`   Your Position: ${multiplierSize} shares @ $${scenario.tradePrice.toFixed(2)} = $${multiplierValue.toFixed(2)}`);
  console.log(`   Using: ${multiplierPercent.toFixed(2)}% of your capital`);
  
  if (multiplierPercent > 100) {
    console.log(`   ⚠️  WARNING: Exceeds available capital!`);
  } else if (multiplierPercent > 50) {
    console.log(`   ⚠️  WARNING: High concentration risk!`);
  } else if (multiplierPercent < 1) {
    console.log(`   ℹ️  Very small position`);
  } else {
    console.log(`   ✅ Reasonable position`);
  }
  
  // Capital-proportional sizing
  const capitalProportionalValue = botCapital * (traderPercent / 100);
  const capitalProportionalSize = capitalProportionalValue / scenario.tradePrice;
  const capitalProportionalPercent = traderPercent; // Same as trader!
  
  console.log(`\n💰 Capital-Proportional:`);
  console.log(`   Your Position: ${capitalProportionalSize.toFixed(2)} shares @ $${scenario.tradePrice.toFixed(2)} = $${capitalProportionalValue.toFixed(2)}`);
  console.log(`   Using: ${capitalProportionalPercent.toFixed(2)}% of your capital`);
  console.log(`   ✅ Same risk level as trader`);
  
  // Comparison
  const sizeDiff = Math.abs(multiplierSize - capitalProportionalSize);
  const valueDiff = Math.abs(multiplierValue - capitalProportionalValue);
  const percentDiff = Math.abs(multiplierPercent - capitalProportionalPercent);
  
  console.log(`\n📈 Difference:`);
  console.log(`   Size: ${sizeDiff.toFixed(2)} shares`);
  console.log(`   Value: $${valueDiff.toFixed(2)}`);
  console.log(`   Risk: ${percentDiff.toFixed(2)}% capital difference`);
});

console.log('\n' + '═'.repeat(80));
console.log('  Summary');
console.log('═'.repeat(80));

console.log(`
Multiplier-Based Sizing:
  ✅ Simple to understand
  ✅ Direct proportion of trader's shares
  ❌ Doesn't account for account size differences
  ❌ Can lead to over/under-leveraging
  ❌ Same absolute size regardless of trader conviction

Capital-Proportional Sizing:
  ✅ Accounts for account size differences
  ✅ Maintains same risk level as trader
  ✅ Scales naturally across different capital amounts
  ✅ Reflects trader's conviction (% of capital)
  ✅ Prevents over-leveraging with large traders
  ❌ Requires knowing trader's capital (estimation)

Recommendation: Use Capital-Proportional sizing for more sophisticated
and risk-appropriate position sizing.
`);

console.log('═'.repeat(80));
