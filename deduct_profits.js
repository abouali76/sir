const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Calculate total profit from all SELL transactions
  const txs = await prisma.transaction.findMany({ where: { type: 'SELL' } });
  let totalProfit = 0;
  txs.forEach(t => totalProfit += t.profit);
  console.log('Total SELL Profit to deduct:', totalProfit);

  if (totalProfit === 0) {
    console.log('No profit to deduct.');
    return;
  }

  // 2. Deduct this amount from the active treasury's IQD balance
  const treasuries = await prisma.treasury.findMany();
  if (treasuries.length === 0) {
    console.log('No treasury found.');
    return;
  }
  
  const treasury = treasuries[0];
  console.log(`Current IQD Balance: ${treasury.iqdBalance}`);
  
  const newBalance = treasury.iqdBalance - totalProfit;
  
  await prisma.treasury.update({
    where: { id: treasury.id },
    data: { iqdBalance: newBalance }
  });
  
  console.log(`Successfully deducted ${totalProfit} IQD. New IQD Balance: ${newBalance}`);
}

main().finally(() => prisma.$disconnect());
