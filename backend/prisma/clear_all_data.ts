import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function clearData() {
  console.log('--- Wiping all mock and test data ---');

  // 1. Delete Salary and Payroll logs
  await prisma.salaryRecord.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.overtimeEntry.deleteMany();
  await prisma.extraShiftEntry.deleteMany();
  await prisma.workerDailyWork.deleteMany();

  // 2. Delete Worker profiles & non-admin users
  await prisma.workerProfile.deleteMany();
  await prisma.user.deleteMany({
    where: {
      username: { not: 'admin' },
    },
  });

  // 3. Delete Workshop expenses and purchases
  await prisma.otherExpense.deleteMany();
  await prisma.purchase.deleteMany();

  // 4. Delete Payments
  await prisma.payment.deleteMany();

  // 5. Delete DC and Invoices
  await prisma.dCItem.deleteMany();
  await prisma.deliveryChallan.updateMany({
    data: { invoiceId: null },
  });
  await prisma.invoiceItem.deleteMany();
  await prisma.deliveryChallan.deleteMany();
  await prisma.invoice.deleteMany();

  // 6. Delete Stock and Receipts
  await prisma.companyStockLedger.deleteMany();
  await prisma.rawMaterialReceipt.deleteMany();

  // 7. Delete Materials and Companies
  await prisma.material.deleteMany();
  await prisma.company.deleteMany();

  // 8. Delete Audit logs
  await prisma.auditLog.deleteMany();

  // 9. Guarantee Admin User exists
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: adminPasswordHash,
      fullName: 'SVT Workshop Admin',
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      fullName: 'SVT Workshop Admin',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  // 10. Audit check
  const [
    users,
    workers,
    companies,
    materials,
    stockLedgers,
    receipts,
    dcs,
    invoices,
    payments,
    purchases,
    expenses,
    dailyWorks,
    attendances,
    salaries
  ] = await Promise.all([
    prisma.user.count(),
    prisma.workerProfile.count(),
    prisma.company.count(),
    prisma.material.count(),
    prisma.companyStockLedger.count(),
    prisma.rawMaterialReceipt.count(),
    prisma.deliveryChallan.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.purchase.count(),
    prisma.otherExpense.count(),
    prisma.workerDailyWork.count(),
    prisma.attendance.count(),
    prisma.salaryRecord.count(),
  ]);

  console.log('\n=== CURRENT DATABASE COUNTS ===');
  console.log(`Users:              ${users} (Admin preserved)`);
  console.log(`Workers:            ${workers}`);
  console.log(`Companies:          ${companies}`);
  console.log(`Materials/Parts:    ${materials}`);
  console.log(`Stock Ledgers:      ${stockLedgers}`);
  console.log(`Raw Receipts:       ${receipts}`);
  console.log(`Delivery Challans:  ${dcs}`);
  console.log(`Invoices:           ${invoices}`);
  console.log(`Payments:           ${payments}`);
  console.log(`Purchases:          ${purchases}`);
  console.log(`Other Expenses:     ${expenses}`);
  console.log(`Daily Work Logs:    ${dailyWorks}`);
  console.log(`Attendance Records: ${attendances}`);
  console.log(`Salary Records:     ${salaries}`);
  console.log('===============================\n');
  console.log('All test/mock data completely wiped! Ready for real user testing.');
}

clearData()
  .catch((err) => {
    console.error('Error wiping data:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

