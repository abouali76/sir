import { prisma } from '../../config/database';
import { ApiError } from '../../utils/ApiError';
import { PrismaClient, Prisma } from '@prisma/client';
import { calculateNewWeightedAverage, calculateSellProfit } from '../../utils/weightedAverage';

interface CreateTransactionInput {
  type: string;
  customerName?: string;
  customerPhone?: string;
  usdAmount: number;
  customRate?: number;
  notes?: string;
}

/**
 * إنشاء عملية بيع أو شراء دولار.
 * تُنفَّذ كل الخطوات ضمن Prisma Transaction واحدة لضمان الاتساق:
 * (تحديث الخزينة + إنشاء العملية + تحديث سجل الأرباح اليومي) تنجح معًا أو تفشل معًا.
 */
export async function createTransaction(input: CreateTransactionInput, employeeId: number) {
  const { type, usdAmount, customerName, customerPhone, notes, customRate } = input;

  return prisma.$transaction(async (tx) => {
    // 1) جلب السعر الحالي النشط
    const currentRate = await tx.exchangeRate.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!currentRate && !customRate) {
      throw ApiError.badRequest('لا يوجد سعر صرف نشط حالياً، يرجى إدخال سعر الصرف لكل 100$ للعملية');
    }

    if (customRate && customRate < 500) {
      throw ApiError.badRequest('سعر الصرف المدخل غير منطقي! يرجى التأكد من كتابة الأصفار كاملة (مثلاً 150000 وليس 1500).');
    }

    // 2) جلب سجل الخزينة (نفترض سجل واحد فقط في هذا النظام)
    const treasuries = await tx.$queryRaw<any[]>`SELECT * FROM "treasury" LIMIT 1 FOR UPDATE`;
    let treasury = treasuries && treasuries.length > 0 ? treasuries[0] : null;
    if (!treasury) {
      treasury = await tx.treasury.create({ data: { usdBalance: 0, iqdBalance: 0, avgCostPrice: 0 } });
    }

    // 3) إنشاء/ربط الزبون إذا تم إدخال بياناته
    let customerId: number | undefined;
    if (customerName || customerPhone) {
      const customer = await tx.customer.create({
        data: { fullName: customerName, phone: customerPhone },
      });
      customerId = customer.id;
    }

    let profit = 0;
    let costBasisAvg: number | null = null;
    let newUsdBalance: number;
    let newIqdBalance: number;
    let newAvgCost = Number(treasury.avgCostPrice);
    
    const defaultPrice = currentRate ? (type === 'BUY' ? Number(currentRate.buyPrice) : Number(currentRate.sellPrice)) : 0;
    const unitPrice = customRate ? Number(customRate) : defaultPrice;
    
    const iqdAmount = Math.round(unitPrice * usdAmount * 100) / 100;

    let vaultUsdBalance = Number(treasury.vaultUsdBalance);
    let vaultIqdBalance = Number(treasury.vaultIqdBalance);
    let usdDebt = Number(treasury.usdDebt || 0);
    let iqdDebt = Number(treasury.iqdDebt || 0);

    if (type === "BUY") {
      // شراء دولار: نعطي دينار، نستلم دولار
      
      // 1. معالجة سحب الدينار (Outgoing)
      const currentIqd = Number(treasury.iqdBalance);
      if (currentIqd >= iqdAmount) {
        newIqdBalance = currentIqd - iqdAmount;
      } else {
        newIqdBalance = 0;
        const shortfall = iqdAmount - currentIqd;
        vaultIqdBalance -= shortfall;
        iqdDebt += shortfall;
      }

      // 2. معالجة استلام الدولار (Incoming)
      if (usdDebt > 0) {
        const payback = Math.min(usdAmount, usdDebt);
        vaultUsdBalance += payback;
        usdDebt -= payback;
        newUsdBalance = Number(treasury.usdBalance) + (usdAmount - payback);
      } else {
        newUsdBalance = Number(treasury.usdBalance) + usdAmount;
      }

      // Calculate new weighted average cost
      newAvgCost = calculateNewWeightedAverage(
        treasury.usdBalance,
        treasury.avgCostPrice,
        usdAmount,
        unitPrice
      );
    } else {
      // بيع دولار: نعطي دولار، نستلم دينار
      
      // 1. معالجة سحب الدولار (Outgoing)
      const currentUsd = Number(treasury.usdBalance);
      if (currentUsd >= usdAmount) {
        newUsdBalance = currentUsd - usdAmount;
      } else {
        newUsdBalance = 0;
        const shortfall = usdAmount - currentUsd;
        vaultUsdBalance -= shortfall;
        usdDebt += shortfall;
      }

      // 2. معالجة استلام الدينار (Incoming)
      if (iqdDebt > 0) {
        const payback = Math.min(iqdAmount, iqdDebt);
        vaultIqdBalance += payback;
        iqdDebt -= payback;
        newIqdBalance = Number(treasury.iqdBalance) + (iqdAmount - payback);
      } else {
        newIqdBalance = Number(treasury.iqdBalance) + iqdAmount;
      }

      costBasisAvg = Number(treasury.avgCostPrice);
      
      // Calculate profit using the weighted average cost
      profit = calculateSellProfit(unitPrice, costBasisAvg, usdAmount);
    }

    // 4) تحديث الخزينة
    await tx.treasury.update({
      where: { id: treasury.id },
      data: {
        usdBalance: newUsdBalance,
        iqdBalance: newIqdBalance,
        vaultUsdBalance: vaultUsdBalance,
        vaultIqdBalance: vaultIqdBalance,
        usdDebt: usdDebt,
        iqdDebt: iqdDebt,
        avgCostPrice: newAvgCost,
      },
    });

    // 5) إنشاء سجل العملية
    const transaction = await tx.transaction.create({
      data: {
        type,
        customerId,
        customerName,
        usdAmount,
        unitPrice,
        iqdAmount,
        profit,
        costBasisAvg,
        exchangeRateId: currentRate ? currentRate.id : undefined,
        notes,
        employeeId,
      },
    });

    // 6) تحديث سجل الأرباح اليومي (ProfitHistory) - Upsert لليوم الحالي
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await tx.profitHistory.upsert({
      where: { date: today },
      create: {
        date: today,
        totalProfit: profit,
        totalBuyUsd: type === 'BUY' ? usdAmount : 0,
        totalSellUsd: type === 'SELL' ? usdAmount : 0,
        buyCount: type === 'BUY' ? 1 : 0,
        sellCount: type === 'SELL' ? 1 : 0,
      },
      update: {
        totalProfit: { increment: profit },
        totalBuyUsd: { increment: type === 'BUY' ? usdAmount : 0 },
        totalSellUsd: { increment: type === 'SELL' ? usdAmount : 0 },
        buyCount: { increment: type === 'BUY' ? 1 : 0 },
        sellCount: { increment: type === 'SELL' ? 1 : 0 },
      },
    });

    return transaction;
  });
}

interface ListFilters {
  page: number;
  limit: number;
  type?: string;
  search?: string;
  from?: string;
  to?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export async function listTransactions(filters: ListFilters) {
  const { page, limit, type, search, from, to, sortBy, sortOrder } = filters;

  const where: Prisma.TransactionWhereInput = {
    isDeleted: false,
    ...(type ? { type } : {}),
    ...(search
      ? {
          OR: [
            { customerName: { contains: search } },
            { notes: { contains: search } },
          ],
        }
      : {}),
    ...(from || to
      ? {
          transactionDate: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        employee: { select: { fullName: true, username: true } },
        customer: true,
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return { items, total };
}

export async function getTransactionById(id: number) {
  const transaction = await prisma.transaction.findFirst({
    where: { id, isDeleted: false },
    include: { employee: { select: { fullName: true } }, customer: true },
  });
  if (!transaction) throw ApiError.notFound('العملية غير موجودة');
  return transaction;
}

export async function updateTransaction(
  id: number,
  data: { customerName?: string; notes?: string }
) {
  const transaction = await prisma.transaction.findFirst({ where: { id, isDeleted: false } });
  if (!transaction) throw ApiError.notFound('العملية غير موجودة');

  // لا يُسمح بتعديل المبالغ أو الأسعار حفاظًا على سلامة الحسابات المالية - فقط الملاحظات واسم الزبون
  return prisma.transaction.update({
    where: { id },
    data: { customerName: data.customerName, notes: data.notes },
  });
}

/**
 * حذف عملية (للمدير فقط) - يعكس تأثيرها على الخزينة وسجل الأرباح تلقائيًا.
 */
export async function deleteTransaction(id: number, deletedById: number, ipAddress?: string) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findFirst({ where: { id, isDeleted: false } });
    if (!transaction) throw ApiError.notFound('العملية غير موجودة أو محذوفة مسبقًا');

    const treasuries = await tx.$queryRaw<any[]>`SELECT * FROM "treasury" LIMIT 1 FOR UPDATE`;
    const treasury = treasuries && treasuries.length > 0 ? treasuries[0] : null;
    if (!treasury) throw ApiError.internal('لا يوجد سجل خزينة');

    // عكس التأثير على الخزينة
    let newUsdBalance = Number(treasury.usdBalance);
    let newIqdBalance = Number(treasury.iqdBalance);
    let vaultUsdBalance = Number(treasury.vaultUsdBalance);
    let vaultIqdBalance = Number(treasury.vaultIqdBalance);
    let usdDebt = Number(treasury.usdDebt);
    let iqdDebt = Number(treasury.iqdDebt);
    let newAvgCost = Number(treasury.avgCostPrice);

    const txUsdAmount = Number(transaction.usdAmount);
    const txIqdAmount = Number(transaction.iqdAmount);

    if (transaction.type === "BUY") {
      // Reversing a BUY: We lose USD, we gain IQD
      
      // 1. Lose USD
      if (newUsdBalance >= txUsdAmount) {
        newUsdBalance -= txUsdAmount;
      } else {
        const shortfall = txUsdAmount - newUsdBalance;
        newUsdBalance = 0;
        vaultUsdBalance -= shortfall;
        usdDebt += shortfall;
      }

      // 2. Gain IQD
      if (iqdDebt > 0) {
        const payback = Math.min(txIqdAmount, iqdDebt);
        vaultIqdBalance += payback;
        iqdDebt -= payback;
        newIqdBalance += (txIqdAmount - payback);
      } else {
        newIqdBalance += txIqdAmount;
      }

    } else {
      // Reversing a SELL: We gain USD, we lose IQD
      
      // 1. Gain USD
      if (usdDebt > 0) {
        const payback = Math.min(txUsdAmount, usdDebt);
        vaultUsdBalance += payback;
        usdDebt -= payback;
        newUsdBalance += (txUsdAmount - payback);
      } else {
        newUsdBalance += txUsdAmount;
      }

      // 2. Lose IQD
      if (newIqdBalance >= txIqdAmount) {
        newIqdBalance -= txIqdAmount;
      } else {
        const shortfall = txIqdAmount - newIqdBalance;
        newIqdBalance = 0;
        vaultIqdBalance -= shortfall;
        iqdDebt += shortfall;
      }
    }

    await tx.treasury.update({
      where: { id: treasury.id },
      data: { 
        usdBalance: newUsdBalance, 
        iqdBalance: newIqdBalance,
        vaultUsdBalance: vaultUsdBalance,
        vaultIqdBalance: vaultIqdBalance,
        usdDebt: usdDebt,
        iqdDebt: iqdDebt
      },
    });

    // عكس التأثير على سجل الأرباح اليومي
    const dayStart = new Date(transaction.transactionDate);
    dayStart.setHours(0, 0, 0, 0);

    await tx.profitHistory.updateMany({
      where: { date: dayStart },
      data: {
        totalProfit: { decrement: transaction.profit },
        totalBuyUsd: { decrement: transaction.type === 'BUY' ? transaction.usdAmount : 0 },
        totalSellUsd: { decrement: transaction.type === 'SELL' ? transaction.usdAmount : 0 },
        buyCount: { decrement: transaction.type === 'BUY' ? 1 : 0 },
        sellCount: { decrement: transaction.type === 'SELL' ? 1 : 0 },
      },
    });

    await tx.transaction.update({
      where: { id },
      data: { isDeleted: true, deletedById, deletedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        userId: deletedById,
        action: "TRANSACTION_DELETE",
        details: `تم حذف العملية رقم ${id} (${transaction.type}, ${transaction.usdAmount}$)`,
        ipAddress,
      },
    });

    return { success: true };
  });
}

/**
 * مسح جميع العمليات (تصفير السجل، الصندوق، الأرباح) للمدير فقط
 */
export async function wipeAllTransactions(deletedById: number, ipAddress?: string) {
  return prisma.$transaction(async (tx) => {
    // 1) Delete all transactions (hard delete to actually clear the DB)
    await tx.transaction.deleteMany({});

    // 2) Delete all profit history
    await tx.profitHistory.deleteMany({});

    // 3) Reset the Active Treasury (usdBalance, iqdBalance, avgCostPrice)
    // IMPORTANT: DO NOT RESET vaultUsdBalance and vaultIqdBalance!
    await tx.treasury.updateMany({
      data: {
        usdBalance: 0,
        iqdBalance: 0,
        usdDebt: 0,
        iqdDebt: 0,
        avgCostPrice: 0,
      }
    });

    // 4) Log the action
    await tx.auditLog.create({
      data: {
        userId: deletedById,
        action: "SETTINGS_UPDATE",
        details: "تصفير شامل لسجل العمليات والصندوق (الخزينة النشطة) والأرباح",
        ipAddress,
      },
    });

    return { success: true };
  });
}
