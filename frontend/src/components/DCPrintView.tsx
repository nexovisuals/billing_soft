import { Printer, X } from 'lucide-react';

export interface DCItem {
  id?: string;
  description: string;
  drawingNumber?: string | null;
  partNumber?: string | null;
  quantity: string | number;
  uom: string;
  remarks?: string | null;
}

export interface DeliveryChallanData {
  id: string;
  dcNumber: number;
  dcDate: string;
  yourOrderNo?: string | null;
  yourOrderDate?: string | null;
  ewayBillNumber?: string | null;
  remarks?: string | null;
  company: {
    name: string;
    address: string;
    gstin?: string | null;
    phoneNumber?: string | null;
  };
  items: DCItem[];
}

interface DCPrintViewProps {
  dc: DeliveryChallanData;
  onClose: () => void;
}

export default function DCPrintView({ dc, onClose }: DCPrintViewProps) {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(dc.dcDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Non-printing floating toolbar */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 no-print">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 transition-all shadow-md whitespace-nowrap"
        >
          <Printer className="w-4 h-4 text-slate-800" />
          <span>Print Delivery Challan</span>
        </button>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-50 shadow-md whitespace-nowrap"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Printable Sheet (Standard A4 Portrait) */}
      <div
        id="dc-print-sheet"
        className="bg-white w-full max-w-3xl rounded-2xl sm:rounded-3xl p-8 sm:p-12 shadow-dock border border-slate-200 text-slate-900 font-sans my-auto"
      >
        {/* Header (Matching Shri Varshini Technologies reference sample) */}
        <div className="border-b-2 border-slate-900 pb-5 text-center">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 tracking-wider uppercase mb-1">
            <span>GSTIN: 33AGSFS0004K1Z8</span>
            <span>State: Tamil Nadu (Code 33)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight uppercase">
            SHRI VARSHINI TECHNOLOGIES
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Precision CNC Machining, Job Works & Component Manufacturing
          </p>
          <p className="text-[11px] text-slate-500">
            Saravanampatti, Coimbatore, Tamil Nadu - 641035 • Contact: 0422-2621616
          </p>

          <div className="inline-block mt-3 px-6 py-1 rounded-full bg-slate-900 text-white font-semibold text-xs tracking-widest uppercase">
            DELIVERY CHALLAN
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 py-5 border-b border-slate-300 text-xs">
          {/* Customer / Consignee Box */}
          <div className="pr-4 border-r border-slate-200">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              To / Consignee:
            </span>
            <div className="font-semibold text-sm text-slate-900">{dc.company.name}</div>
            <div className="text-slate-600 mt-1 whitespace-pre-line leading-relaxed">
              {dc.company.address}
            </div>
            {dc.company.gstin && (
              <div className="mt-2 font-mono text-[11px] font-medium text-slate-800">
                GSTIN / UIN: {dc.company.gstin}
              </div>
            )}
          </div>

          {/* Challan & Order Details Box */}
          <div className="pl-4 space-y-2">
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Challan No:</span>
              <span className="font-semibold text-sm text-slate-900 font-mono">
                DC - {dc.dcNumber}
              </span>
            </div>

            <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Date:</span>
              <span className="font-medium text-slate-900">{formattedDate}</span>
            </div>

            <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Your Order No:</span>
              <span className="font-medium text-slate-900">{dc.yourOrderNo || 'N/A'}</span>
            </div>

            {dc.ewayBillNumber && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">E-Way Bill No:</span>
                <span className="font-mono text-slate-900">{dc.ewayBillNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dispatch Instruction Note */}
        <div className="py-2.5 text-xs text-slate-600 italic">
          Sir, Please receive the following goods and return the duplicate copy duly signed.
        </div>

        {/* Itemized Goods Table */}
        <div className="mt-2 border border-slate-900 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-900 text-slate-900 font-semibold">
                <th className="py-2.5 px-4 w-12 text-center whitespace-nowrap">S.No</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Description of Goods / Part Number</th>
                <th className="py-2.5 px-4 w-28 text-right whitespace-nowrap">Quantity</th>
                <th className="py-2.5 px-4 w-20 text-center whitespace-nowrap">Unit</th>
                <th className="py-2.5 px-4 w-36 whitespace-nowrap">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {dc.items.map((item, index) => (
                <tr key={item.id || index} className="min-h-[48px]">
                  <td className="py-3 px-4 text-center font-medium text-slate-500 whitespace-nowrap">{index + 1}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-900">{item.description}</div>
                    {item.drawingNumber && (
                      <div className="text-[11px] text-slate-500 font-mono">
                        Drawing: {item.drawingNumber} {item.partNumber ? `• Part: ${item.partNumber}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                    {Number(item.quantity).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-center font-medium text-slate-700 uppercase whitespace-nowrap">
                    {item.uom}
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-[11px] whitespace-nowrap">
                    {item.remarks || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-900 bg-slate-50 font-semibold text-xs">
                <td colSpan={2} className="py-2.5 px-4 text-right text-slate-700 uppercase whitespace-nowrap">
                  Total Dispatched Quantity:
                </td>
                <td className="py-2.5 px-4 text-right text-slate-900 text-sm whitespace-nowrap">
                  {dc.items.reduce((acc, curr) => acc + Number(curr.quantity), 0).toLocaleString('en-IN')}
                </td>
                <td className="py-2.5 px-4 text-center text-slate-700 uppercase whitespace-nowrap">
                  {dc.items[0]?.uom || 'nos'}
                </td>
                <td className="py-2.5 px-4 text-[11px] text-slate-500 whitespace-nowrap">Subject to QC</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Remarks / General Notes */}
        {dc.remarks && (
          <div className="mt-4 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Remarks: </span>
            {dc.remarks}
          </div>
        )}

        {/* Signatures & Declarations Section (Matching reference DC format) */}
        <div className="mt-14 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
          {/* Customer Signature Box */}
          <div className="flex flex-col justify-between h-24">
            <p className="text-slate-600 italic">"Received the goods in good condition"</p>
            <div>
              <div className="w-48 border-b border-dashed border-slate-400 mb-1" />
              <p className="font-semibold text-slate-800">Customer Signature with Seal</p>
            </div>
          </div>

          {/* Workshop Authorized Signatory Box */}
          <div className="flex flex-col justify-between items-end h-24 text-right">
            <p className="font-semibold text-slate-900 uppercase">For SHRI VARSHINI TECHNOLOGIES</p>
            <div>
              <div className="w-48 border-b border-dashed border-slate-400 mb-1 ml-auto" />
              <p className="font-semibold text-slate-800">Authorised Signatory</p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-3 border-t border-slate-100 text-center text-[10px] text-slate-400">
          This is an official Delivery Challan issued by Shri Varshini Technologies. Retain for consolidated monthly tax billing.
        </div>
      </div>
    </div>
  );
}
