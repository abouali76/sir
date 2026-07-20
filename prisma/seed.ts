import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // إنشاء الأدوار
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN", description: 'مدير النظام - صلاحيات كاملة' },
  });

  await prisma.role.upsert({
    where: { name: "EMPLOYEE" },
    update: {},
    create: { name: "EMPLOYEE", description: 'موظف - تنفيذ عمليات البيع والشراء' },
  });

  // إنشاء مستخدم مدير افتراضي
  const passwordHash = await bcrypt.hash('Admin@12345', 12);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      fullName: 'مدير النظام',
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  // إنشاء سجل خزينة أولي (رصيد صفر)
  const existingTreasury = await prisma.treasury.findFirst();
  if (!existingTreasury) {
    await prisma.treasury.create({
      data: { usdBalance: 0, iqdBalance: 0, avgCostPrice: 0 },
    });
  }

  console.log('✅ تم زرع البيانات الأولية بنجاح');
  console.log('👤 اسم المستخدم: admin | كلمة المرور: Admin@12345');
  console.log('⚠️  يجب تغيير كلمة المرور فورًا بعد أول تسجيل دخول');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
