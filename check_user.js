const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const u = await prisma.user.findFirst({
    where: {fullName: 'بشير'}, 
    include: {transactions: true, exchangeRates: true, auditLogs: true, deletedTransactions: true}
  }); 
  console.log(JSON.stringify(u, null, 2)); 
} 
main().catch(console.error).finally(()=>prisma.$disconnect());
