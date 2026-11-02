export type UserRole = 'ADMIN' | 'STAFF' | 'WORKER';

export interface UserSession {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  workerProfile?: {
    employeeId: string;
    phoneNumber?: string;
    monthlySalary: string;
  } | null;
  token?: string;
}

export interface Company {
  id: string;
  name: string;
  address: string;
  gstin?: string;
  contactPerson?: string;
  phoneNumber?: string;
}

export interface Material {
  id: string;
  productName: string;
  drawingNumber?: string;
  partNumber?: string;
  rate: string;
  uom: string;
  hsnSacCode: string;
  gstRate: string;
}

export interface DailyWorkEntry {
  id: string;
  workDate: string;
  description: string;
  quantityDone: string | number;
  quantityScrap: string | number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks?: string;
  company: {
    name: string;
  };
  material?: {
    productName: string;
    partNumber?: string;
  };
  worker?: {
    employeeId: string;
    user: {
      fullName: string;
    };
  };
}

