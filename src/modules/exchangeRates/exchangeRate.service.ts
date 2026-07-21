import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';

export async function getCurrentRate() {
  const rate = await prisma.exchangeRate.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  return rate;
}

export async function setNewRate(
  buyPrice: number,
  sellPrice: number,
  setById: number,
  ipAddress?: string
) {
  return prisma.$transaction(async (tx) => {
    await tx.exchangeRate.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    const newRate = await tx.exchangeRate.create({
      data: { buyPrice, sellPrice, setById, isActive: true },
    });

    await tx.auditLog.create({
      data: {
        userId: setById,
        action: "PRICE_UPDATE",
        details: `تحديث السعر: شراء=${buyPrice}, بيع=${sellPrice}`,
        ipAddress,
      },
    });

    return newRate;
  });
}

export async function getRateHistory(limit = 50) {
  return prisma.exchangeRate.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { setBy: { select: { fullName: true, username: true } } },
  });
}

export async function deleteRate(id: number, deletedById: number, ipAddress?: string) {
  const rate = await prisma.exchangeRate.findUnique({ 
    where: { id },
    include: { _count: { select: { transactions: true } } }
  });
  
  if (!rate) throw ApiError.notFound('السعر غير موجود');

  // Prevent deletion if there are transactions attached to preserve financial history
  if (rate._count.transactions > 0) {
    throw ApiError.badRequest('لا يمكن حذف هذا السعر لأنه مرتبط بعمليات سابقة. يمكنك إلغاء تنشيطه بدلاً من ذلك.');
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.exchangeRate.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: deletedById,
          action: "PRICE_UPDATE",
          details: `حذف السعر: شراء=${rate.buyPrice}, بيع=${rate.sellPrice}`,
          ipAddress,
        },
      });
    });
  } catch (err: any) {
    throw err;
  }
}

export async function toggleActive(id: number, userId: number, ipAddress?: string) {
  const rate = await prisma.exchangeRate.findUnique({ where: { id } });
  if (!rate) throw ApiError.notFound('السعر غير موجود');

  return prisma.$transaction(async (tx) => {
    if (!rate.isActive) {
      await tx.exchangeRate.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const updatedRate = await tx.exchangeRate.update({
      where: { id },
      data: { isActive: !rate.isActive },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: "PRICE_UPDATE",
        details: rate.isActive ? `تم تغيير حالة السعر إلى قديم (غير نشط): شراء=${rate.buyPrice}` : `تم تفعيل سعر قديم: شراء=${rate.buyPrice}`,
        ipAddress,
      },
    });

    return updatedRate;
  });
}
