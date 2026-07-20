import { prisma } from '../../config/database';

export async function getTreasuryBalance() {
  const treasury = await prisma.treasury.findFirst();
  return (
    treasury ?? { usdBalance: 0, iqdBalance: 0, avgCostPrice: 0, updatedAt: new Date() }
  );
}

export async function addFunds(usdAmount: number, iqdAmount: number, addedById: number, ipAddress?: string) {
  let treasury = await prisma.treasury.findFirst();
  
  if (!treasury) {
    treasury = await prisma.treasury.create({
      data: {
        usdBalance: usdAmount,
        iqdBalance: iqdAmount,
        avgCostPrice: 0
      }
    });
  } else {
    treasury = await prisma.treasury.update({
      where: { id: treasury.id },
      data: {
        usdBalance: Number(treasury.usdBalance) + Number(usdAmount),
        iqdBalance: Number(treasury.iqdBalance) + Number(iqdAmount)
      }
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: addedById,
      action: "SETTINGS_UPDATE",
      details: `إضافة أموال للخزينة: ${usdAmount} USD, ${iqdAmount} IQD`,
      ipAddress
    }
  });

  return treasury;
}
export async function removeFunds(usdAmount: number, iqdAmount: number, removedById: number, ipAddress?: string) {
  let treasury = await prisma.treasury.findFirst();
  
  if (!treasury) {
    throw new Error("لا يوجد رصيد في الخزينة للسحب منه");
  }

  // Prevent negative balance if needed, or allow it depending on business logic. 
  // We'll allow it or just subtract.
  treasury = await prisma.treasury.update({
    where: { id: treasury.id },
    data: {
      usdBalance: Number(treasury.usdBalance) - Number(usdAmount),
      iqdBalance: Number(treasury.iqdBalance) - Number(iqdAmount)
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: removedById,
      action: "SETTINGS_UPDATE",
      details: `سحب أموال من الخزينة: ${usdAmount} USD, ${iqdAmount} IQD`,
      ipAddress
    }
  });

  return treasury;
}

export async function getDashboardSummary() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [currentRate, treasury, todayProfitAgg, monthProfitAgg, todayTxCount, lastTransactions] =
    await Promise.all([
      prisma.exchangeRate.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }),
      prisma.treasury.findFirst(),
      prisma.transaction.aggregate({
        where: { transactionDate: { gte: today }, isDeleted: false, type: 'SELL' },
        _sum: { profit: true },
      }),
      prisma.transaction.aggregate({
        where: { transactionDate: { gte: monthStart }, isDeleted: false, type: 'SELL' },
        _sum: { profit: true },
      }),
      prisma.transaction.groupBy({
        by: ['type'],
        where: { transactionDate: { gte: today }, isDeleted: false },
        _count: { _all: true },
      }),
      prisma.transaction.findMany({
        where: { isDeleted: false },
        orderBy: { transactionDate: 'desc' },
        take: 10,
        include: { employee: { select: { fullName: true } } },
      }),
    ]);

  const buyCount = todayTxCount.find((t) => t.type === 'BUY')?._count._all ?? 0;
  const sellCount = todayTxCount.find((t) => t.type === 'SELL')?._count._all ?? 0;

  const todayNetProfit = todayProfitAgg?._sum.profit ?? 0;
  const monthNetProfit = monthProfitAgg?._sum.profit ?? 0;

  return {
    currentBuyPrice: currentRate?.buyPrice ?? null,
    currentSellPrice: currentRate?.sellPrice ?? null,
    todayProfit: todayNetProfit,
    monthProfit: monthNetProfit,
    buyCountToday: buyCount,
    sellCountToday: sellCount,
    usdBalance: treasury?.usdBalance ?? 0,
    iqdBalance: treasury?.iqdBalance ?? 0,
    avgCostPrice: treasury?.avgCostPrice ?? 0,
    lastTransactions,
  };
}
