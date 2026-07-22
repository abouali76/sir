const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const txs = await prisma.transaction.findMany({ where: { type: 'SELL' } });
  let totalProfit = 0;
  txs.forEach(t => totalProfit += t.profit);
  console.log('Total SELL Profit in DB:', totalProfit);

  const treasury = await prisma.treasury.findFirst();
  console.log('Current Treasury:', treasury);
}

main().finally(() => prisma.$disconnect());
