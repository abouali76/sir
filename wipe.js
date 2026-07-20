const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('Starting data wipe...');
  await prisma.transaction.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.profitHistory.deleteMany();
  await prisma.exchangeRate.deleteMany();
  await prisma.customer.deleteMany();
  
  const adminRole = await prisma.role.findUnique({where: {name: 'ADMIN'}});
  if (adminRole) {
    await prisma.user.deleteMany({
      where: {
        roleId: { not: adminRole.id }
      }
    });
  }

  await prisma.treasury.updateMany({
    data: { usdBalance: 0, iqdBalance: 0, avgCostPrice: 0 }
  });
  
  console.log('Database wiped successfully');
}
main().catch(console.error).finally(() => prisma.$disconnect());
