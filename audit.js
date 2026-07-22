const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const treasury = await prisma.treasury.findFirst();
  console.log('--- Current Treasury State ---');
  console.log(treasury);
  
  const txs = await prisma.transaction.findMany();
  let totalBuyUsd = 0;
  let totalSellUsd = 0;
  let totalBuyIqd = 0;
  let totalSellIqd = 0;
  
  txs.forEach(t => {
    if (t.type === 'BUY') {
      totalBuyUsd += t.usdAmount;
      totalBuyIqd += t.iqdAmount; // the system PAID iqdAmount
    } else if (t.type === 'SELL') {
      totalSellUsd += t.usdAmount;
      totalSellIqd += (t.iqdAmount - t.profit); // the system RECEIVED capital iqdAmount
    }
  });
  
  console.log('\n--- Transactions Summary ---');
  console.log(`Total BUY USD: $${totalBuyUsd}`);
  console.log(`Total BUY IQD Paid: ${totalBuyIqd}`);
  console.log(`Total SELL USD: $${totalSellUsd}`);
  console.log(`Total SELL IQD Received (Capital): ${totalSellIqd}`);
  
  // Net physical flow:
  // USD flow: We BUY (gain) USD, we SELL (give) USD.
  const netUsd = totalBuyUsd - totalSellUsd;
  // IQD flow: We SELL (receive) IQD, we BUY (give) IQD.
  const netIqd = totalSellIqd - totalBuyIqd;
  
  console.log('\n--- Net Flow (Without initial balance) ---');
  console.log(`Net USD: $${netUsd}`);
  console.log(`Net IQD: ${netIqd}`);
}

main().finally(() => prisma.$disconnect());
