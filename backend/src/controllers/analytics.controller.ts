import { Response } from 'express';
import prisma from '../prisma.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { InvoiceStatus, ApprovalStatus } from '@prisma/client';

// GET /api/analytics/dashboard - Comprehensive Workshop Executive Analytics
export async function getDashboardAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [
      invoicesAgg,
      unpaidCount,
      paymentsAgg,
      purchasesAgg,
      operatingAgg,
      salaryAgg,
      productionDoneAgg,
      productionScrapAgg,
      pendingProductionCount,
      inwardAgg,
      recentInvoices,
      recentDcs,
      recentPayments,
      companies,
    ] = await Promise.all([
      // 1. Invoices Aggregation
      prisma.invoice.aggregate({
        _sum: { totalAmount: true, balanceDue: true, taxableValue: true },
        where: { status: { not: InvoiceStatus.CANCELLED } },
      }),
      prisma.invoice.count({
        where: { status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] } },
      }),
      // 2. Payments Aggregation
      prisma.payment.aggregate({
        _sum: { amount: true },
      }),
      // 3. Outflows
      prisma.purchase.aggregate({
        _sum: { totalAmount: true },
      }),
      prisma.otherExpense.aggregate({
        _sum: { amount: true },
      }),
      prisma.salaryRecord.aggregate({
        _sum: { netSalary: true },
      }),
      // 4. Production
      prisma.workerDailyWork.aggregate({
        _sum: { quantityDone: true },
        where: { status: ApprovalStatus.APPROVED },
      }),
      prisma.workerDailyWork.aggregate({
        _sum: { quantityScrap: true },
        where: { status: ApprovalStatus.APPROVED },
      }),
      prisma.workerDailyWork.count({
        where: { status: ApprovalStatus.PENDING },
      }),
      // 5. Raw Material Receipts
      prisma.rawMaterialReceipt.aggregate({
        _sum: { quantity: true },
        _count: { id: true },
      }),
      // 6. Recent Feeds
      prisma.invoice.findMany({
        take: 5,
        orderBy: { invoiceDate: 'desc' },
        include: { company: { select: { name: true } } },
      }),
      prisma.deliveryChallan.findMany({
        take: 5,
        orderBy: { dcDate: 'desc' },
        include: { company: { select: { name: true } }, items: true },
      }),
      prisma.payment.findMany({
        take: 5,
        orderBy: { paymentDate: 'desc' },
        include: { company: { select: { name: true } }, invoice: { select: { invoiceNumber: true } } },
      }),
      // 7. Companies stock balances
      prisma.company.findMany({
        select: {
          id: true,
          name: true,
          gstin: true,
          stockLedger: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { balance: true },
          },
        },
      }),
    ]);

    const totalInvoiced = Number(invoicesAgg._sum.totalAmount || 0);
    const outstandingDue = Number(invoicesAgg._sum.balanceDue || 0);
    const totalCollected = Number(paymentsAgg._sum.amount || 0);

    const totalPurchases = Number(purchasesAgg._sum.totalAmount || 0);
    const totalOperating = Number(operatingAgg._sum.amount || 0);
    const totalPayroll = Number(salaryAgg._sum.netSalary || 0);
    const totalOutflow = totalPurchases + totalOperating + totalPayroll;

    const netCashFlow = totalCollected - totalOutflow;

    const totalFinished = Number(productionDoneAgg._sum.quantityDone || 0);
    const totalScrap = Number(productionScrapAgg._sum.quantityScrap || 0);
    const totalProduced = totalFinished + totalScrap;
    const scrapRate = totalProduced > 0 ? Math.round((totalScrap / totalProduced) * 1000) / 10 : 0;

    const companyStockList = companies.map(c => ({
      id: c.id,
      name: c.name,
      gstin: c.gstin,
      currentBalance: c.stockLedger[0] ? Number(c.stockLedger[0].balance) : 0,
      uom: 'kg',
    }));

    res.status(200).json({
      financials: {
        totalInvoiced,
        totalCollected,
        outstandingDue,
        unpaidInvoicesCount: unpaidCount,
        totalPurchases,
        totalOperating,
        totalPayroll,
        totalOutflow,
        netCashFlow,
      },
      production: {
        totalFinishedPieces: totalFinished,
        totalScrapPieces: totalScrap,
        scrapRatePercent: scrapRate,
        pendingApprovalsCount: pendingProductionCount,
      },
      stock: {
        totalInwardWeightKg: Number(inwardAgg._sum.quantity || 0),
        totalInwardReceiptsCount: inwardAgg._count.id,
        companyBalances: companyStockList,
        negativeStockProtected: true,
      },
      recentActivity: {
        invoices: recentInvoices,
        challans: recentDcs,
        payments: recentPayments,
      },
    });
  } catch (error: any) {
    console.error('getDashboardAnalytics error:', error);
    res.status(500).json({ error: 'Failed to fetch executive dashboard analytics' });
  }
}

// GET /api/analytics/export/invoices-csv - CSV Export
export async function exportInvoicesCsv(req: AuthRequest, res: Response): Promise<void> {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { company: true },
      orderBy: { invoiceDate: 'desc' },
    });

    const headers = 'Invoice Number,Date,Customer Name,GSTIN,Taxable Value,CGST,SGST,IGST,Round Off,Total Amount,Paid Amount,Balance Due,Status,DC Reference\n';
    const rows = invoices.map(i => {
      const dateStr = new Date(i.invoiceDate).toISOString().split('T')[0];
      const safeComp = `"${i.company.name.replace(/"/g, '""')}"`;
      const safeRef = `"${(i.dispatchChallanRef || '').replace(/"/g, '""')}"`;
      return `${i.invoiceNumber},${dateStr},${safeComp},${i.company.gstin || ''},${i.taxableValue},${i.cgstAmount},${i.sgstAmount},${i.igstAmount},${i.roundOff},${i.totalAmount},${i.paidAmount},${i.balanceDue},${i.status},${safeRef}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="invoices_report.csv"');
    res.status(200).send(headers + rows);
  } catch (error: any) {
    console.error('exportInvoicesCsv error:', error);
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
}

// GET /api/analytics/export/stock-csv - CSV Export
export async function exportStockCsv(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companies = await prisma.company.findMany({
      include: {
        stockLedger: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const headers = 'Customer Company,GSTIN,Current Stock Balance,UOM,Negative Stock Protection\n';
    const rows = companies.map(c => {
      const bal = c.stockLedger[0] ? Number(c.stockLedger[0].balance) : 0;
      const uom = 'kg';
      return `"${c.name}",${c.gstin || 'N/A'},${bal},${uom},ACTIVE_ENFORCED`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="stock_ledger_report.csv"');
    res.status(200).send(headers + rows);
  } catch (error: any) {
    console.error('exportStockCsv error:', error);
    res.status(500).json({ error: 'Failed to generate stock CSV' });
  }
}
