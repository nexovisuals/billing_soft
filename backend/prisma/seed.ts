import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial CNC workshop data...');

  // 1. Create Default Admin User
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      fullName: 'SVT Workshop Admin',
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log('Created Admin:', admin.username);

  // 2. Create Default Worker User & Profile
  const workerPasswordHash = await bcrypt.hash('worker123', 10);
  const workerUser = await prisma.user.upsert({
    where: { username: 'worker1' },
    update: {},
    create: {
      username: 'worker1',
      passwordHash: workerPasswordHash,
      fullName: 'Ramesh Kumar (CNC Operator)',
      role: Role.WORKER,
      isActive: true,
    },
  });

  await prisma.workerProfile.upsert({
    where: { userId: workerUser.id },
    update: {},
    create: {
      userId: workerUser.id,
      employeeId: 'SVT-EMP-001',
      phoneNumber: '9876543210',
      monthlySalary: 26000.00, // ₹26,000 for standard 26 days (₹1,000/day)
      overtimeRate: 150.00,    // ₹150 per hour
      extraShiftRate: 1000.00, // ₹1,000 per extra shift
      isActive: true,
    },
  });
  console.log('Created Worker Profile:', workerUser.fullName);

  // 3. Create Real-world Client Companies (From actual reference bills)
  const calmet = await prisma.company.upsert({
    where: { id: 'company-calmet' },
    update: {},
    create: {
      id: 'company-calmet',
      name: 'Calmet Engineering India Pvt Ltd',
      address: '3/176, SF No 419/5D, Maniyakara Thottam, Arasur, Coimbatore, Tamil Nadu',
      gstin: '33AADCC7953Q1Z3',
      contactPerson: 'Purchasing Manager',
      phoneNumber: '0422-2621616',
      isActive: true,
    },
  });

  const unimech = await prisma.company.upsert({
    where: { id: 'company-unimech' },
    update: {},
    create: {
      id: 'company-unimech',
      name: 'Unimech Industries Limited',
      address: '1/179, Post, Coimbatore, Tamil Nadu',
      gstin: '33AAACU2430K1ZM',
      contactPerson: 'Stores Incharge',
      phoneNumber: '0422-2456789',
      isActive: true,
    },
  });
  console.log('Created Companies:', calmet.name, 'and', unimech.name);

  // 4. Create Master Materials / Parts (From actual reference bills)
  const part1 = await prisma.material.upsert({
    where: { id: 'part-bracket-428672' },
    update: {},
    create: {
      id: 'part-bracket-428672',
      productName: 'Bracket',
      drawingNumber: '428672',
      partNumber: '428672',
      description: 'CNC Machined Bracket Component',
      rate: 75.00,
      uom: 'nos',
      hsnSacCode: '998898',
      gstRate: 18.0,
      isActive: true,
    },
  });

  const part2 = await prisma.material.upsert({
    where: { id: 'part-bracket-assembly' },
    update: {},
    create: {
      id: 'part-bracket-assembly',
      productName: 'Bracket Assembly & Packing',
      drawingNumber: '428672-011',
      partNumber: '428672-011',
      description: 'Assembly & Packing (in 112 frame)',
      rate: 5.00,
      uom: 'nos',
      hsnSacCode: '998898',
      gstRate: 18.0,
      isActive: true,
    },
  });

  const part3 = await prisma.material.upsert({
    where: { id: 'part-pin-housing' },
    update: {},
    create: {
      id: 'part-pin-housing',
      productName: 'Pin Housing',
      drawingNumber: 'PH-2026',
      partNumber: 'PH-102',
      description: 'Precision Turned Pin Housing',
      rate: 110.00,
      uom: 'nos',
      hsnSacCode: '998898',
      gstRate: 18.0,
      isActive: true,
    },
  });
  console.log('Created Materials:', part1.productName, part2.productName, part3.productName);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

