const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  console.log('=== Recent Audit Logs ===');
  for (const log of logs) {
    console.log(`${log.createdAt.toISOString()} | Action: ${log.action} | Details: ${log.details}`);
  }
}

main().finally(() => prisma.$disconnect());
