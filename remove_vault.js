const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const treasury = await prisma.treasury.findFirst();
  if (!treasury) {
    console.log('No treasury found.');
    return;
  }
  
  const newUsdBalance = treasury.usdBalance - treasury.usdDebt;
  const newIqdBalance = treasury.iqdBalance - treasury.iqdDebt;
  
  await prisma.treasury.update({
    where: { id: treasury.id },
    data: { 
      usdBalance: newUsdBalance,
      iqdBalance: newIqdBalance,
      usdDebt: 0,
      iqdDebt: 0,
      vaultUsdBalance: 0,
      vaultIqdBalance: 0
    }
  });
  
  console.log(`Treasury updated successfully.`);
  console.log(`New USD Balance: ${newUsdBalance}`);
  console.log(`New IQD Balance: ${newIqdBalance}`);
}

main().finally(() => prisma.$disconnect());
