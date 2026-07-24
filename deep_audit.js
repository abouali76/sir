const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const treasury = await prisma.treasury.findFirst();
  console.log('=== Current Treasury ===');
  console.log(treasury);

  const txs = await prisma.transaction.findMany({ orderBy: { createdAt: 'asc' } });
  
  let txBuyUsd = 0;
  let txBuyIqd = 0;
  
  let txSellUsd = 0;
  let txSellIqdCapital = 0;
  let txSellProfit = 0;

  for (const tx of txs) {
    if (tx.isDeleted) continue; // skip deleted

    if (tx.type === 'BUY') {
      txBuyUsd += tx.usdAmount;
      txBuyIqd += tx.iqdAmount; // paid out
    } else if (tx.type === 'SELL') {
      txSellUsd += tx.usdAmount;
      txSellIqdCapital += (tx.iqdAmount - tx.profit); // received capital
      txSellProfit += tx.profit;
    }
  }

  console.log('\n=== Transactions (Active) ===');
  console.log(`BUY: +$${txBuyUsd} USD, -${txBuyIqd} IQD`);
  console.log(`SELL: -$${txSellUsd} USD, +${txSellIqdCapital} IQD (Capital), Profit: ${txSellProfit} IQD`);

  // Try to find manual additions/removals from audit logs
  const logs = await prisma.auditLog.findMany({
    where: { action: 'SETTINGS_UPDATE' },
    orderBy: { createdAt: 'asc' }
  });

  let manualUsd = 0;
  let manualIqd = 0;
  let oldVaultUsd = 0;
  let oldVaultIqd = 0;

  for (const log of logs) {
    const details = log.details || '';
    // e.g. إضافة أموال للخزينة: 100 USD, 500 IQD
    // سحب أموال من الخزينة: 100 USD, 500 IQD
    const match = details.match(/([0-9.]+) USD, ([0-9.]+) IQD/);
    if (match) {
      const u = parseFloat(match[1]);
      const i = parseFloat(match[2]);
      
      if (details.includes('إضافة أموال للخزينة')) {
        manualUsd += u; manualIqd += i;
      } else if (details.includes('سحب أموال من الخزينة')) {
        manualUsd -= u; manualIqd -= i;
      } else if (details.includes('إضافة أموال للخزنة الرئيسية')) {
        oldVaultUsd += u; oldVaultIqd += i;
      } else if (details.includes('سحب أموال من الخزنة الرئيسية')) {
        oldVaultUsd -= u; oldVaultIqd -= i;
      }
    }
  }

  console.log('\n=== Manual Adjustments (from AuditLogs) ===');
  console.log(`Manual Safe: +$${manualUsd} USD, +${manualIqd} IQD`);
  console.log(`Old Vault: +$${oldVaultUsd} USD, +${oldVaultIqd} IQD`);

  const expectedUsd = txBuyUsd - txSellUsd + manualUsd;
  const expectedIqd = txSellIqdCapital - txBuyIqd + manualIqd;

  console.log('\n=== Expected Safe Balance ===');
  console.log(`Expected USD: ${expectedUsd}  | Actual USD: ${treasury.usdBalance} | Diff: ${expectedUsd - treasury.usdBalance}`);
  console.log(`Expected IQD: ${expectedIqd}  | Actual IQD: ${treasury.iqdBalance} | Diff: ${expectedIqd - treasury.iqdBalance}`);

  // Let's also check if average cost price is somehow corrupted
  // calculate simulated avg cost
  let simUsd = 0;
  let simAvgCost = 0;
  for (const tx of txs) {
    if (tx.isDeleted) continue;
    if (tx.type === 'BUY') {
      const balance = simUsd;
      const avgCost = simAvgCost;
      const newAmount = tx.usdAmount;
      const buyPrice = tx.unitPrice;

      const totalOldValue = balance * avgCost;
      const totalNewValue = newAmount * buyPrice;
      const totalUsd = balance + newAmount;

      simAvgCost = totalUsd <= 0 ? buyPrice : (totalOldValue + totalNewValue) / totalUsd;
      simUsd += tx.usdAmount;
    } else {
      simUsd -= tx.usdAmount;
    }
  }

  console.log('\n=== Average Cost Price Check ===');
  console.log(`Simulated Avg Cost (ignoring manual): ${simAvgCost}`);
  console.log(`Actual Avg Cost: ${treasury.avgCostPrice}`);

}

main().finally(() => prisma.$disconnect());
