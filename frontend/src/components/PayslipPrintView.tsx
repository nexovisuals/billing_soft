import { Printer, X } from 'lucide-react';

export interface PayslipData {
  record: {
    id: string;
    monthYear: string;
    baseSalary: string | number;
    absenceDeduct: string | number;
    approvedOtAmt: string | number;
    approvedShiftAmt: string | number;
    netSalary: string | number;
    isPaid: boolean;
    worker: {
      employeeId: string;
      phoneNumber?: string | null;
      user: {
        fullName: string;
      };
    };
  };
  attendance: {
    standardDays: number;
    presentDays: string | number;
    absentDays: string | number;
  };
  amountInWords?: string;
}

interface PayslipPrintViewProps {
  data: PayslipData;
  onClose: () => void;
}

export default function PayslipPrintView({ data, onClose }: PayslipPrintViewProps) {
  const { record, attendance, amountInWords } = data;

  const handlePrint = () => {
    window.print();
  };

  // Format monthYear e.g. "10-2026" -> "OCTOBER 2026"
  const [mStr, yStr] = record.monthYear.split('-');
  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];
  const formattedMonth = `${monthNames[parseInt(mStr, 10) - 1]} ${yStr}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Floating Toolbar */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 no-print">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 transition-all shadow-md whitespace-nowrap"
        >
          <Printer className="w-4 h-4 text-slate-800" />
          <span>Print Salary Slip</span>
        </button>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-50 shadow-md whitespace-nowrap"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Printable Sheet */}
      <div
        id="print-sheet"
        className="bg-white text-slate-900 w-full max-w-[210mm] min-h-[148mm] p-8 border border-slate-300 shadow-2xl my-6 mx-auto text-xs font-sans leading-relaxed flex flex-col justify-between"
      >
        <div>
          {/* Header Section */}
          <div className="border border-slate-900 p-4 text-center space-y-1">
            <h1 className="text-xl font-semibold tracking-wide text-slate-950 uppercase">
              SHRI VARSHINI TECHNOLOGIES
            </h1>
            <p className="text-[11px] text-slate-700">
              SF No. 597/2, Kalapatti Main Road, Saravanampatti, Coimbatore - 641 035, Tamil Nadu
            </p>
            <div className="font-semibold text-xs tracking-wider uppercase pt-1 text-slate-900 border-t border-slate-300 mt-2">
              SALARY PAYSLIP — {formattedMonth} (26-DAY BASIS)
            </div>
          </div>

          {/* Employee Metadata Grid */}
          <div className="grid grid-cols-2 border border-slate-900 border-t-0 text-[11px]">
            <div className="p-3 border-r border-slate-900 space-y-1">
              <div>
                <span className="text-slate-500 font-medium">Employee Name: </span>
                <strong className="font-semibold text-slate-950 text-xs">{record.worker.user.fullName}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Employee ID: </span>
                <span className="font-mono font-medium text-slate-900">{record.worker.employeeId}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Designation: </span>
                <span className="text-slate-900">CNC Machine Operator</span>
              </div>
            </div>

            <div className="p-3 space-y-1">
              <div>
                <span className="text-slate-500 font-medium">Standard Working Days: </span>
                <span className="font-semibold text-slate-900">26 Days</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Present Days: </span>
                <span className="font-semibold text-emerald-700">{parseFloat(attendance.presentDays.toString())} Days</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Unpaid Absent Days: </span>
                <span className="font-semibold text-rose-700">{parseFloat(attendance.absentDays.toString())} Days</span>
              </div>
            </div>
          </div>

          {/* Earnings & Deductions Table */}
          <div className="border border-slate-900 border-t-0">
            <div className="grid grid-cols-2 border-b border-slate-900 bg-slate-100 font-semibold text-slate-900 py-1.5 px-3">
              <div className="border-r border-slate-900">EARNINGS PARTICULARS</div>
              <div className="pl-3">AMOUNT (₹)</div>
            </div>

            <div className="divide-y divide-slate-200 text-[11px]">
              <div className="grid grid-cols-2 py-2 px-3">
                <div className="border-r border-slate-900 pr-3">
                  <span className="font-medium text-slate-900">Monthly Base Salary (26-Day Standard)</span>
                </div>
                <div className="pl-3 text-right font-medium text-slate-900">
                  ₹{parseFloat(record.baseSalary.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              {parseFloat(record.approvedOtAmt.toString()) > 0 && (
                <div className="grid grid-cols-2 py-2 px-3">
                  <div className="border-r border-slate-900 pr-3">
                    <span className="font-medium text-emerald-700">Approved Overtime (OT) Pay</span>
                  </div>
                  <div className="pl-3 text-right font-medium text-emerald-700">
                    +₹{parseFloat(record.approvedOtAmt.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}

              {parseFloat(record.approvedShiftAmt.toString()) > 0 && (
                <div className="grid grid-cols-2 py-2 px-3">
                  <div className="border-r border-slate-900 pr-3">
                    <span className="font-medium text-emerald-700">Approved Extra Shift Allowance</span>
                  </div>
                  <div className="pl-3 text-right font-medium text-emerald-700">
                    +₹{parseFloat(record.approvedShiftAmt.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}

              {parseFloat(record.absenceDeduct.toString()) > 0 && (
                <div className="grid grid-cols-2 py-2 px-3">
                  <div className="border-r border-slate-900 pr-3">
                    <span className="font-medium text-rose-700">
                      Less: Absence Deduction ({parseFloat(attendance.absentDays.toString())} days @ ₹{(parseFloat(record.baseSalary.toString()) / 26).toFixed(2)}/day)
                    </span>
                  </div>
                  <div className="pl-3 text-right font-medium text-rose-700">
                    -₹{parseFloat(record.absenceDeduct.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              )}

              {/* Net Payable Row */}
              <div className="grid grid-cols-2 py-2.5 px-3 bg-slate-950 text-white font-semibold text-xs border-t-2 border-slate-900">
                <div className="border-r border-slate-700 pr-3 uppercase tracking-wider">
                  NET SALARY PAYABLE
                </div>
                <div className="pl-3 text-right">
                  ₹{parseFloat(record.netSalary.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="border border-slate-900 border-t-0 p-3 text-[11px]">
            <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block mb-0.5">
              Net Amount (in words)
            </span>
            <span className="font-semibold text-slate-950 italic">
              {amountInWords || 'Amount in words'}
            </span>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 border border-slate-900 border-t-0 text-[11px] h-24">
            <div className="p-3 border-r border-slate-900 flex flex-col justify-between">
              <span className="text-slate-500 font-medium">Employee Signature</span>
              <div className="border-t border-slate-400 w-36 pt-1 text-[10px] text-slate-600">
                {record.worker.user.fullName}
              </div>
            </div>

            <div className="p-3 flex flex-col justify-between text-right">
              <span className="font-semibold text-slate-950 uppercase text-[10px]">
                For SHRI VARSHINI TECHNOLOGIES
              </span>
              <div className="border-t border-slate-400 w-36 ml-auto pt-1 text-[10px] text-slate-600 text-center">
                Authorised Signatory
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

