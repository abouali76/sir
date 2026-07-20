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

    // 2) جلب سجل الخزينة (نفترض سجل واحد فقط في هذا النظام)
    let treasury = await tx.treasury.findFirst();
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

    if (type === "BUY") {
      // شراء دولار: يزيد رصيد الدولار، ينقص رصيد الدينار
      const currentIqd = Number(treasury.iqdBalance);
      if (usdAmount > 0 && currentIqd < iqdAmount) {
        throw ApiError.badRequest(
          `رصيد الدينار في الخزينة (${currentIqd.toLocaleString()}) غير كافٍ لإتمام عملية الشراء بمبلغ ${iqdAmount.toLocaleString()} دينار`
        );
      }
      
      const currentUsd = Number(treasury.usdBalance);
      if (usdAmount < 0 && currentUsd < Math.abs(usdAmount)) {
        throw ApiError.badRequest(
          `رصيد الدولار في الخزينة (${currentUsd.toLocaleString()}$) غير كافٍ لسحب ${Math.abs(usdAmount).toLocaleString()}$ (شراء عكسي)`
        );
      }

      // Calculate new weighted average cost
      newAvgCost = calculateNewWeightedAverage(
        treasury.usdBalance,
        treasury.avgCostPrice,
        usdAmount,
        unitPrice
      );

      newUsdBalance = Number(treasury.usdBalance) + Number(usdAmount);
      newIqdBalance = Number(treasury.iqdBalance) - Number(iqdAmount);
    } else {
      // بيع دولار: ينقص رصيد الدولار، يزيد رصيد الدينار
      const currentUsd = Number(treasury.usdBalance);
      if (usdAmount > 0 && currentUsd < usdAmount) {
        throw ApiError.badRequest(
          `رصيد الدولار في الخزينة (${currentUsd.toLocaleString()}$) غير كافٍ لإتمام عملية البيع بمبلغ ${usdAmount.toLocaleString()}$`
        );
      }
      
      const currentIqd = Number(treasury.iqdBalance);
      if (usdAmount < 0 && currentIqd < Math.abs(iqdAmount)) {
        throw ApiError.badRequest(
          `رصيد الدينار في الخزينة (${currentIqd.toLocaleString()}) غير كافٍ لسحب ${Math.abs(iqdAmount).toLocaleString()} دينار (بيع عكسي)`
        );
      }

      costBasisAvg = Number(treasury.avgCostPrice);
      
      // Calculate profit using the weighted average cost
      profit = calculateSellProfit(unitPrice, costBasisAvg, usdAmount);

      newUsdBalance = Number(treasury.usdBalance) - Number(usdAmount);
      newIqdBalance = Number(treasury.iqdBalance) + Number(iqdAmount);
    }

    // 4) تحديث الخزينة
    await tx.treasury.update({
      where: { id: treasury.id },
      data: {
        usdBalance: newUsdBalance,
        iqdBalance: newIqdBalance,
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

    const treasury = await tx.treasury.findFirst();
    if (!treasury) throw ApiError.internal('لا يوجد سجل خزينة');

    // عكس التأثير على الخزينة
    let newUsdBalance: number;
    let newIqdBalance: number;

    if (transaction.type === "BUY") {
      newUsdBalance = Number(treasury.usdBalance) - Number(transaction.usdAmount);
      newIqdBalance = Number(treasury.iqdBalance) + Number(transaction.iqdAmount);
    } else {
      newUsdBalance = Number(treasury.usdBalance) + Number(transaction.usdAmount);
      newIqdBalance = Number(treasury.iqdBalance) - Number(transaction.iqdAmount);
    }

    if (newUsdBalance < 0 || newIqdBalance < 0) {
      throw ApiError.badRequest(
        'لا يمكن حذف هذه العملية لأن ذلك سيؤدي إلى رصيد سالب في الخزينة (توجد عمليات لاحقة تعتمد عليها)'
      );
    }

    await tx.treasury.update({
      where: { id: treasury.id },
      data: { usdBalance: newUsdBalance, iqdBalance: newIqdBalance },
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
