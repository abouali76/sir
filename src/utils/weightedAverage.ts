import { Decimal } from '@prisma/client/runtime/library';

/**
 * حساب متوسط التكلفة المرجّح الجديد بعد عملية شراء جديدة.
 *
 * المعادلة:
 * المتوسط الجديد = ((الرصيد الحالي × متوسط التكلفة الحالي) + (الكمية الجديدة × سعر الشراء الجديد))
 *                   ÷ (الرصيد الحالي + الكمية الجديدة)
 *
 * مثال:
 * - الرصيد الحالي: 1000$ بمتوسط تكلفة 1390
 * - عملية شراء جديدة: 500$ بسعر 1395
 * - المتوسط الجديد = ((1000×1390) + (500×1395)) / 1500 = 1391.67
 */
export function calculateNewWeightedAverage(
  currentUsdBalance: Decimal | number,
  currentAvgCost: Decimal | number,
  newUsdAmount: Decimal | number,
  newBuyPrice: Decimal | number
): number {
  const balance = Number(currentUsdBalance);
  const avgCost = Number(currentAvgCost);
  const newAmount = Number(newUsdAmount);
  const buyPrice = Number(newBuyPrice);

  const totalOldValue = balance * avgCost;
  const totalNewValue = newAmount * buyPrice;
  const totalUsd = balance + newAmount;

  if (totalUsd <= 0) return buyPrice; // حماية من القسمة على صفر
  return (totalOldValue + totalNewValue) / totalUsd;
}

/**
 * حساب الربح الناتج عن عملية بيع بالاعتماد على متوسط تكلفة الشراء الحالي.
 * الربح = (سعر البيع - متوسط تكلفة الشراء) × عدد الدولارات المباعة
 */
export function calculateSellProfit(
  sellPrice: Decimal | number,
  avgCostPrice: Decimal | number,
  usdAmount: Decimal | number
): number {
  const profit = (Number(sellPrice) - Number(avgCostPrice)) * Number(usdAmount);
  return Math.round(profit * 100) / 100; // تقريب لأقرب فلسين
}
