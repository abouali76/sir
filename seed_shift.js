const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existingSetting = await prisma.setting.findUnique({
    where: { key: 'CURRENT_SHIFT_START' }
  });

  if (!existingSetting) {
    // Set to start of today (UTC midnight) as default
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);

    await prisma.setting.create({
      data: {
        key: 'CURRENT_SHIFT_START',
        value: start.toISOString()
      }
    });
    console.log('CURRENT_SHIFT_START setting initialized.');
  } else {
    console.log('CURRENT_SHIFT_START setting already exists:', existingSetting.value);
  }
}

main().finally(() => prisma.$disconnect());
