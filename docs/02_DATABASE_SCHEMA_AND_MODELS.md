# Database Schema & Relational Models

## 1. Relational Entity Overview

```
┌──────────────┐       1:N       ┌────────────────────────┐
│  Companies   ├────────────────►│  RawMaterialReceipts   │
└──────┬───────┘                 └────────────────────────┘
       │
       │ 1:N                     ┌────────────────────────┐
       ├────────────────────────►│     CompanyStock       │
       │                         └────────────────────────┘
       │ 1:N
       ├────────────────────────►┌────────────────────────┐
       │                         │   DeliveryChallans     │
       │                         └───┬────────────────────┘
       │ 1:N                         │ 1:N
       │                             ▼
       │                         ┌────────────────────────┐
       │                         │       DCItems          │
       │                         └────────────────────────┘
       │
       │ 1:N                     ┌────────────────────────┐
       ├────────────────────────►│       Invoices         │
       │                         └───┬────────────────────┘
       │ 1:N                         │ 1:N
       │                             ▼
       │                         ┌────────────────────────┐
       │                         │     InvoiceItems       │
       │                         └────────────────────────┘
       │
       │ 1:N                     ┌────────────────────────┐
       └────────────────────────►│       Payments         │
                                 └────────────────────────┘
```

---

## 2. Core Prisma Data Models

### 2.1 Users & Authentication
```prisma
enum Role {
  ADMIN
  WORKER
}

model User {
  id            String         @id @default(uuid())
  username      String         @unique
  passwordHash  String
  fullName      String
  role          Role           @default(WORKER)
  isActive      Boolean        @default(true)
  workerProfile WorkerProfile?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}
```

### 2.2 Companies & Materials (Masters)
```prisma
model Company {
  id             String                @id @default(uuid())
  name           String
  address        String
  gstin          String?
  contactPerson  String?
  phoneNumber    String?
  emailAddress   String?
  isActive       Boolean               @default(true)
  createdAt      DateTime              @default(now())
  updatedAt      DateTime              @updatedAt

  receipts       RawMaterialReceipt[]
  challans       DeliveryChallan[]
  invoices       Invoice[]
  payments       Payment[]
  stockLedger    CompanyStockLedger[]
  dailyWork      WorkerDailyWork[]
}

model Material {
  id             String         @id @default(uuid())
  productName    String
  drawingNumber  String?
  partNumber     String?
  description    String?
  rate           Decimal        @default(0.00) @db.Decimal(12, 2)
  uom            String         @default("nos") // "nos", "kg", "pcs"
  hsnSacCode     String         @default("998898") // Job work SAC
  gstRate        Decimal        @default(18.0) @db.Decimal(5, 2)
  isActive       Boolean        @default(true)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  dcItems        DCItem[]
  invoiceItems   InvoiceItem[]
  dailyWork      WorkerDailyWork[]
  stockLedger    CompanyStockLedger[]
}
```

### 2.3 Raw Material Inward & Stock Tracking
```prisma
enum StockMovementType {
  INWARD_RECEIPT
  ISSUED_MACHINING
  RETURNED_FINISHED
  RETURNED_RAW
  SCRAP_WASTAGE
  ADJUSTMENT
}

model RawMaterialReceipt {
  id             String    @id @default(uuid())
  receiptDate    DateTime  @default(now())
  companyId      String
  company        Company   @relation(fields: [companyId], references: [id])
  materialName   String
  partNumber     String?
  quantity       Decimal   @db.Decimal(12, 3)
  uom            String    @default("kg")
  vehicleNumber  String?
  challanNumber  String?   // Customer delivery note number
  remarks        String?
  createdAt      DateTime  @default(now())
}

model CompanyStockLedger {
  id             String            @id @default(uuid())
  transactionDate DateTime         @default(now())
  companyId      String
  company        Company           @relation(fields: [companyId], references: [id])
  materialId     String?
  material       Material?         @relation(fields: [materialId], references: [id])
  movementType   StockMovementType
  quantityIn     Decimal           @default(0.00) @db.Decimal(12, 3)
  quantityOut    Decimal           @default(0.00) @db.Decimal(12, 3)
  balance        Decimal           @db.Decimal(12, 3)
  referenceDcId  String?
  remarks        String?
  createdAt      DateTime          @default(now())
}
```

### 2.4 Delivery Challans (DC)
```prisma
enum DCStatus {
  PENDING_INVOICING
  INVOICED
  CANCELLED
}

model DeliveryChallan {
  id             String      @id @default(uuid())
  dcNumber       Int         @unique // Continuous integer starting from 1
  dcDate         DateTime    @default(now())
  companyId      String
  company        Company     @relation(fields: [companyId], references: [id])
  yourOrderNo    String?     // Customer PO / Order Ref
  yourOrderDate  DateTime?
  ewayBillNumber String?
  materialValue  Decimal?    @db.Decimal(12, 2)
  remarks        String?
  status         DCStatus    @default(PENDING_INVOICING)
  invoiceId      String?
  invoice        Invoice?    @relation(fields: [invoiceId], references: [id])
  createdBy      String
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  items          DCItem[]
}

model DCItem {
  id             String          @id @default(uuid())
  dcId           String
  dc             DeliveryChallan @relation(fields: [dcId], references: [id], onDelete: Cascade)
  materialId     String?
  material       Material?       @relation(fields: [materialId], references: [id])
  description    String
  drawingNumber  String?
  partNumber     String?
  quantity       Decimal         @db.Decimal(12, 3)
  uom            String          @default("nos")
  remarks        String?
}
```

### 2.5 Tax Invoices & Line Items
```prisma
enum InvoiceStatus {
  UNPAID
  PARTIALLY_PAID
  PAID
  CANCELLED
}

model Invoice {
  id             String          @id @default(uuid())
  invoiceNumber  String          @unique // e.g., "073/2026-27"
  invoiceDate    DateTime        @default(now())
  billingMonth   String?         // e.g. "Sep-2026" or "Multi-Month"
  companyId      String
  company        Company         @relation(fields: [companyId], references: [id])
  buyersOrderNo  String?
  buyersOrderDate DateTime?
  dispatchChallanRef String?     // e.g. "SVT DC: 340 / 25-09-2026"
  
  taxableValue   Decimal         @db.Decimal(12, 2)
  cgstRate       Decimal         @default(9.0) @db.Decimal(5, 2)
  cgstAmount     Decimal         @default(0.0) @db.Decimal(12, 2)
  sgstRate       Decimal         @default(9.0) @db.Decimal(5, 2)
  sgstAmount     Decimal         @default(0.0) @db.Decimal(12, 2)
  igstRate       Decimal         @default(0.0) @db.Decimal(5, 2)
  igstAmount     Decimal         @default(0.0) @db.Decimal(12, 2)
  roundOff       Decimal         @default(0.0) @db.Decimal(6, 2)
  totalAmount    Decimal         @db.Decimal(12, 2)
  paidAmount     Decimal         @default(0.0) @db.Decimal(12, 2)
  balanceDue     Decimal         @db.Decimal(12, 2)
  status         InvoiceStatus   @default(UNPAID)
  
  remarks        String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  items          InvoiceItem[]
  challans       DeliveryChallan[]
  payments       Payment[]
}

model InvoiceItem {
  id             String          @id @default(uuid())
  invoiceId      String
  invoice        Invoice         @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  materialId     String?
  material       Material?       @relation(fields: [materialId], references: [id])
  description    String
  hsnSacCode     String          @default("998898")
  partNumber     String?
  quantity       Decimal         @db.Decimal(12, 3)
  rate           Decimal         @db.Decimal(12, 2)
  uom            String          @default("nos")
  gstRate        Decimal         @default(18.0) @db.Decimal(5, 2)
  amount         Decimal         @db.Decimal(12, 2)
}
```

### 2.6 Payments & Financial Ledger
```prisma
model Payment {
  id             String    @id @default(uuid())
  paymentDate    DateTime  @default(now())
  companyId      String
  company        Company   @relation(fields: [companyId], references: [id])
  invoiceId      String?
  invoice        Invoice?  @relation(fields: [invoiceId], references: [id])
  amount         Decimal   @db.Decimal(12, 2)
  paymentMode    String    @default("NEFT/RTGS") // Cash, Cheque, UPI, NEFT
  referenceNo    String?
  remarks        String?
  createdAt      DateTime  @default(now())
}

model Purchase {
  id             String    @id @default(uuid())
  purchaseDate   DateTime  @default(now())
  supplierName   String?
  itemName       String
  category       String    // Tooling, Coolant, Oil, Spares, Consumables
  quantity       Decimal   @db.Decimal(10, 2)
  uom            String    @default("pcs")
  unitPrice      Decimal   @db.Decimal(10, 2)
  totalAmount    Decimal   @db.Decimal(12, 2)
  supplierBillNo String?
  paymentStatus  String    @default("PAID")
  remarks        String?
  createdAt      DateTime  @default(now())
}

model OtherExpense {
  id             String    @id @default(uuid())
  expenseDate    DateTime  @default(now())
  category       String    // Electricity, Rent, Maintenance, Transport, Admin
  description    String
  amount         Decimal   @db.Decimal(12, 2)
  paymentMode    String?
  referenceNo    String?
  remarks        String?
  createdAt      DateTime  @default(now())
}
```

### 2.7 Workers, Attendance, 26-Day Salary & Daily Production
```prisma
enum ApprovalStatus {
  DRAFT
  PENDING
  APPROVED
  REJECTED
}

model WorkerProfile {
  id             String            @id @default(uuid())
  userId         String            @unique
  user           User              @relation(fields: [userId], references: [id])
  employeeId     String            @unique
  phoneNumber    String?
  joiningDate    DateTime          @default(now())
  monthlySalary  Decimal           @db.Decimal(10, 2)
  overtimeRate   Decimal           @default(0.0) @db.Decimal(8, 2) // Per hour
  extraShiftRate Decimal           @default(0.0) @db.Decimal(8, 2) // Per shift
  isActive       Boolean           @default(true)
  createdAt      DateTime          @default(now())

  attendance     Attendance[]
  overtime       OvertimeEntry[]
  extraShifts    ExtraShiftEntry[]
  dailyWork      WorkerDailyWork[]
  salaryRecords  SalaryRecord[]
}

model Attendance {
  id             String            @id @default(uuid())
  workerId       String
  worker         WorkerProfile     @relation(fields: [workerId], references: [id])
  monthYear      String            // e.g. "10-2026"
  standardDays   Int               @default(26)
  presentDays    Decimal           @db.Decimal(4, 1)
  absentDays     Decimal           @db.Decimal(4, 1)
  paidLeaves     Decimal           @default(0.0) @db.Decimal(4, 1)
  unpaidLeaves   Decimal           @default(0.0) @db.Decimal(4, 1)
  status         ApprovalStatus    @default(PENDING)
  approvedBy     String?
  createdAt      DateTime          @default(now())
}

model OvertimeEntry {
  id             String            @id @default(uuid())
  workerId       String
  worker         WorkerProfile     @relation(fields: [workerId], references: [id])
  otDate         DateTime
  startTime      DateTime?
  endTime        DateTime?
  hours          Decimal           @db.Decimal(5, 2)
  calculatedAmt  Decimal           @db.Decimal(10, 2)
  status         ApprovalStatus    @default(PENDING)
  remarks        String?
  createdAt      DateTime          @default(now())
}

model ExtraShiftEntry {
  id             String            @id @default(uuid())
  workerId       String
  worker         WorkerProfile     @relation(fields: [workerId], references: [id])
  shiftDate      DateTime
  shiftType      String?           // Day, Night
  calculatedAmt  Decimal           @db.Decimal(10, 2)
  status         ApprovalStatus    @default(PENDING)
  remarks        String?
  createdAt      DateTime          @default(now())
}

model SalaryRecord {
  id             String            @id @default(uuid())
  workerId       String
  worker         WorkerProfile     @relation(fields: [workerId], references: [id])
  monthYear      String            // e.g. "10-2026"
  baseSalary     Decimal           @db.Decimal(10, 2)
  absenceDeduct  Decimal           @db.Decimal(10, 2)
  approvedOtAmt  Decimal           @db.Decimal(10, 2)
  approvedShiftAmt Decimal         @db.Decimal(10, 2)
  netSalary      Decimal           @db.Decimal(10, 2)
  isPaid         Boolean           @default(false)
  createdAt      DateTime          @default(now())
}

model WorkerDailyWork {
  id             String            @id @default(uuid())
  workDate       DateTime          @default(now())
  workerId       String
  worker         WorkerProfile     @relation(fields: [workerId], references: [id])
  companyId      String
  company        Company           @relation(fields: [companyId], references: [id])
  materialId     String?
  material       Material?         @relation(fields: [materialId], references: [id])
  description    String
  drawingNumber  String?
  partNumber     String?
  quantityDone   Decimal           @db.Decimal(10, 2)
  quantityScrap  Decimal           @default(0.0) @db.Decimal(10, 2)
  workingHours   Decimal?          @db.Decimal(4, 2)
  status         ApprovalStatus    @default(PENDING)
  remarks        String?
  createdAt      DateTime          @default(now())
}
```

### 2.8 Immutable Audit Trail
```prisma
model AuditLog {
  id          String    @id @default(uuid())
  entityType  String    // "INVOICE", "DC", "SALARY", "STOCK"
  entityId    String
  action      String    // "CREATE", "UPDATE", "CANCEL", "APPROVE"
  changedBy   String
  oldValues   Json?
  newValues   Json?
  reason      String?
  timestamp   DateTime  @default(now())
}
```

