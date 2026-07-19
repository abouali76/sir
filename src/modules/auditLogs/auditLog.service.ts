import { prisma } from '../../config/database';
import { PrismaClient } from '@prisma/client';

interface AuditLogFilters {
  page: number;
  limit: number;
  action?: string;
  userId?: number;
}

export async function getAuditLogs(filters: AuditLogFilters) {
  const { page, limit, action, userId } = filters;

  const where = {
    ...(action ? { action } : {}),
    ...(userId ? { userId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { fullName: true, username: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total };
}

export async function clearAuditLogs() {
  await prisma.auditLog.deleteMany({});
}
