import { prisma } from '../../config/database';

export async function getTreasuryBalance() {
  const treasury = await prisma.treasury.findFirst();
  return (
    treasury ?? { usdBalance: 0, iqdBalance: 0, avgCostPrice: 0, updatedAt: new Date() }
  );
}

export async function addFunds(usdAmount: number, iqdAmount: number, addedById: number, ipAddress?: string) {
  return prisma.$transaction(async (tx) => {
    const activeRate = await tx.exchangeRate.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    const defaultBuyPrice = activeRate ? activeRate.buyPrice : 0;

    const treasuries = await tx.$queryRaw<any[]>`SELECT * FROM "treasury" LIMIT 1 FOR UPDATE`;
    let treasury = treasuries && treasuries.length > 0 ? treasuries[0] : null;

    if (!treasury) {
      treasury = await tx.treasury.create({
        data: {
          usdBalance: usdAmount,
          iqdBalance: iqdAmount,
          avgCostPrice: defaultBuyPrice
        }
      });
    } else {
      let newAvgCost = Number(treasury.avgCostPrice);
      if (newAvgCost === 0 && usdAmount > 0) {
        newAvgCost = defaultBuyPrice;
      }

      treasury = await tx.treasury.update({
        where: { id: treasury.id },
        data: {
          usdBalance: Number(treasury.usdBalance) + Number(usdAmount),
          iqdBalance: Number(treasury.iqdBalance) + Number(iqdAmount),
          avgCostPrice: newAvgCost
        }
      });
    }

    await tx.auditLog.create({
      data: {
        userId: addedById,
        action: "SETTINGS_UPDATE",
        details: `إضافة أموال للخزينة: ${usdAmount} USD, ${iqdAmount} IQD`,
        ipAddress
      }
    });

    return treasury;
  });
}
export async function removeFunds(usdAmount: number, iqdAmount: number, removedById: number, ipAddress?: string) {
  return prisma.$transaction(async (tx) => {
    const treasuries = await tx.$queryRaw<any[]>`SELECT * FROM "treasury" LIMIT 1 FOR UPDATE`;
    let treasury = treasuries && treasuries.length > 0 ? treasuries[0] : null;
    
    if (!treasury) {
      throw new Error("لا يوجد رصيد في الخزينة للسحب منه");
    }

    treasury = await tx.treasury.update({
      where: { id: treasury.id },
      data: {
        usdBalance: Number(treasury.usdBalance) - Number(usdAmount),
        iqdBalance: Number(treasury.iqdBalance) - Number(iqdAmount)
      }
    });

    await tx.auditLog.create({
      data: {
        userId: removedById,
        action: "SETTINGS_UPDATE",
        details: `سحب أموال من الخزينة: ${usdAmount} USD, ${iqdAmount} IQD`,
        ipAddress
      }
    });

    return treasury;
  });
}


export async function getDashboardSummary() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [currentRate, treasury, todayProfitAgg, monthProfitAgg, todayTxCount, todayBuyAgg, todaySellAgg, lastBuys, lastSells] =
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
      prisma.transaction.aggregate({
        where: { transactionDate: { gte: today }, isDeleted: false, type: 'BUY' },
        _sum: { usdAmount: true },
      }),
      prisma.transaction.aggregate({
        where: { transactionDate: { gte: today }, isDeleted: false, type: 'SELL' },
        _sum: { usdAmount: true },
      }),
      prisma.transaction.findMany({
        where: { isDeleted: false, type: 'BUY' },
        orderBy: { transactionDate: 'desc' },
        take: 5,
        include: { employee: { select: { fullName: true } } },
      }),
      prisma.transaction.findMany({
        where: { isDeleted: false, type: 'SELL' },
        orderBy: { transactionDate: 'desc' },
        take: 5,
        include: { employee: { select: { fullName: true } } },
      }),
    ]);

  const lastTransactions = [...lastBuys, ...lastSells].sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());

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
    todayBuyUsd: todayBuyAgg?._sum.usdAmount ?? 0,
    todaySellUsd: todaySellAgg?._sum.usdAmount ?? 0,
    usdBalance: treasury?.usdBalance ?? 0,
    iqdBalance: treasury?.iqdBalance ?? 0,
    vaultUsdBalance: 0,
    vaultIqdBalance: 0,
    usdDebt: 0,
    iqdDebt: 0,
    avgCostPrice: treasury?.avgCostPrice ?? 0,
    lastTransactions,
  };
}
