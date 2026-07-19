import { prisma } from '../../config/database';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

function getDateRange(period: 'today' | 'week' | 'month' | 'year' | 'all') {
  const now = new Date();
  const start = new Date(now);

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      break;
    case 'all':
      return null;
  }
  return start;
}

export async function getProfitReport(period: 'today' | 'week' | 'month' | 'year' | 'all') {
  const start = getDateRange(period);

  const where = start ? { transactionDate: { gte: start }, isDeleted: false } : { isDeleted: false };

  const [aggregate, buyAggregate, sellAggregate] = await Promise.all([
    prisma.transaction.aggregate({ where, _sum: { profit: true } }),
    prisma.transaction.aggregate({
      where: { ...where, type: 'BUY' },
      _sum: { usdAmount: true, iqdAmount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { ...where, type: 'SELL' },
      _sum: { usdAmount: true, iqdAmount: true },
      _count: true,
    }),
  ]);

  return {
    period,
    totalProfit: aggregate._sum.profit ?? 0,
    totalBuyUsd: buyAggregate._sum.usdAmount ?? 0,
    totalBuyIqd: buyAggregate._sum.iqdAmount ?? 0,
    buyCount: buyAggregate._count,
    totalSellUsd: sellAggregate._sum.usdAmount ?? 0,
    totalSellIqd: sellAggregate._sum.iqdAmount ?? 0,
    sellCount: sellAggregate._count,
  };
}

async function getTransactionsForExport(from?: string, to?: string) {
  return prisma.transaction.findMany({
    where: {
      isDeleted: false,
      ...(from || to
        ? {
            transactionDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { transactionDate: 'desc' },
    include: { employee: { select: { fullName: true } } },
  });
}

export async function exportToExcel(from?: string, to?: string): Promise<ExcelJS.Buffer> {
  const transactions = await getTransactionsForExport(from, to);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('سجل العمليات');
  sheet.views = [{ rightToLeft: true }];

  sheet.columns = [
    { header: 'رقم العملية', key: 'id', width: 12 },
    { header: 'النوع', key: 'type', width: 10 },
    { header: 'التاريخ', key: 'date', width: 18 },
    { header: 'الزبون', key: 'customer', width: 20 },
    { header: 'عدد الدولارات', key: 'usdAmount', width: 15 },
    { header: 'السعر', key: 'unitPrice', width: 12 },
    { header: 'المبلغ (دينار)', key: 'iqdAmount', width: 18 },
    { header: 'الربح', key: 'profit', width: 12 },
    { header: 'الموظف', key: 'employee', width: 18 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } };

  transactions.forEach((t) => {
    sheet.addRow({
      id: t.id,
      type: t.type === 'BUY' ? 'شراء' : 'بيع',
      date: t.transactionDate.toLocaleString('ar-IQ'),
      customer: t.customerName ?? '-',
      usdAmount: Number(t.usdAmount),
      unitPrice: Number(t.unitPrice),
      iqdAmount: Number(t.iqdAmount),
      profit: Number(t.profit),
      employee: t.employee.fullName,
    });
  });

  return workbook.xlsx.writeBuffer();
}

export async function exportToPDF(from?: string, to?: string): Promise<Buffer> {
  const transactions = await getTransactionsForExport(from, to);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).text('Sarrafa System - Transactions Report', { align: 'center' });
    doc.moveDown();

    const tableTop = 100;
    const rowHeight = 20;
    let y = tableTop;

    doc.fontSize(9);
    const headers = ['ID', 'Type', 'Date', 'Customer', 'USD', 'Price', 'IQD', 'Profit', 'Employee'];
    const colWidths = [40, 50, 90, 100, 60, 60, 80, 60, 100];

    let x = 30;
    headers.forEach((h, i) => {
      doc.text(h, x, y, { width: colWidths[i] });
      x += colWidths[i];
    });
    y += rowHeight;

    transactions.forEach((t) => {
      if (y > 500) {
        doc.addPage({ layout: 'landscape' });
        y = tableTop;
      }
      x = 30;
      const row = [
        String(t.id),
        t.type,
        t.transactionDate.toLocaleDateString('en-GB'),
        t.customerName ?? '-',
        String(t.usdAmount),
        String(t.unitPrice),
        String(t.iqdAmount),
        String(t.profit),
        t.employee.fullName,
      ];
      row.forEach((cell, i) => {
        doc.text(cell, x, y, { width: colWidths[i] });
        x += colWidths[i];
      });
      y += rowHeight;
    });

    doc.end();
  });
}
