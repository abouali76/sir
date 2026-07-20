import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { PrismaClient, User } from '@prisma/client';

export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      username: true,
      fullName: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      role: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createUser(
  data: { username: string; fullName: string; password: string; role: string },
  createdByUserId: number
) {
  const existing = await prisma.user.findUnique({ where: { username: data.username } });
  if (existing) throw ApiError.conflict('اسم المستخدم موجود مسبقًا');

  const role = await prisma.role.findUnique({ where: { name: data.role } });
  if (!role) throw ApiError.badRequest('الدور المحدد غير موجود');

  const passwordHash = await bcrypt.hash(data.password, env.bcrypt.saltRounds);

  const user = await prisma.user.create({
    data: {
      username: data.username,
      fullName: data.fullName,
      passwordHash,
      roleId: role.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: createdByUserId,
      action: "USER_CREATE",
      details: `تم إنشاء مستخدم جديد: ${data.username}`,
    },
  });

  return { id: user.id, username: user.username, fullName: user.fullName };
}

export async function updateUser(
  id: number,
  data: { fullName?: string; role?: string; isActive?: boolean },
  updatedByUserId: number
) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound('المستخدم غير موجود');

  let roleId: number | undefined;
  if (data.role) {
    const role = await prisma.role.findUnique({ where: { name: data.role } });
    if (!role) throw ApiError.badRequest('الدور المحدد غير موجود');
    roleId = role.id;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      fullName: data.fullName,
      isActive: data.isActive,
      ...(roleId ? { roleId } : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: updatedByUserId,
      action: "USER_UPDATE",
      details: `تم تعديل بيانات المستخدم: ${user.username}`,
    },
  });

  return updated;
}

export async function deleteUser(id: number, deletedByUserId: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound('المستخدم غير موجود');

  if (id === deletedByUserId) {
    throw ApiError.badRequest('لا يمكنك حذف حسابك الخاص');
  }

  // تعطيل بدل الحذف الفعلي للحفاظ على سلامة السجلات التاريخية (Transactions مرتبطة به)
  await prisma.user.update({ where: { id }, data: { isActive: false } });

  await prisma.auditLog.create({
    data: {
      userId: deletedByUserId,
      action: "USER_DELETE",
      details: `تم تعطيل المستخدم: ${user.username}`,
    },
  });
}
