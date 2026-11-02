import { Printer, X } from 'lucide-react';

export interface InvoiceItemData {
  id?: string;
  description: string;
  hsnSacCode: string;
  partNumber?: string | null;
  quantity: string | number;
  rate: string | number;
  uom: string;
  gstRate: string | number;
  amount: string | number;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  billingMonth?: string | null;
  buyersOrderNo?: string | null;
  buyersOrderDate?: string | null;
  dispatchChallanRef?: string | null;
  taxableValue: string | number;
  cgstRate: string | number;
  cgstAmount: string | number;
  sgstRate: string | number;
  sgstAmount: string | number;
  igstRate: string | number;
  igstAmount: string | number;
  roundOff: string | number;
  totalAmount: string | number;
  paidAmount: string | number;
  balanceDue: string | number;
  status: string;
  remarks?: string | null;
  company: {
    name: string;
    address: string;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    gstin?: string | null;
    phone?: string | null;
  };
  items: InvoiceItemData[];
  amountInWords?: string;
  taxInWords?: string;
}

interface InvoicePrintViewProps {
  invoice: InvoiceData;
  amountInWords?: string;
  taxInWords?: string;
  onClose: () => void;
}

export default function InvoicePrintView({
  invoice,
  amountInWords,
  taxInWords,
  onClose,
}: InvoicePrintViewProps) {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formattedOrderDate = invoice.buyersOrderDate
    ? new Date(invoice.buyersOrderDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const totalQuantity = invoice.items.reduce(
    (sum, item) => sum + parseFloat(item.quantity.toString() || '0'),
    0
  );

  const isIntraState = parseFloat(invoice.igstAmount?.toString() || '0') === 0;
  const totalTax =
    parseFloat(invoice.cgstAmount?.toString() || '0') +
    parseFloat(invoice.sgstAmount?.toString() || '0') +
    parseFloat(invoice.igstAmount?.toString() || '0');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Floating Toolbar - Non-printing */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 no-print">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 transition-all shadow-md whitespace-nowrap"
        >
          <Printer className="w-4 h-4 text-slate-800" />
          <span>Print Tax Invoice (A4)</span>
        </button>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-50 shadow-md whitespace-nowrap"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Printable Sheet Container */}
      <div
        id="print-sheet"
        className="bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] p-[10mm] border border-slate-300 shadow-2xl my-6 mx-auto text-xs font-sans leading-relaxed flex flex-col justify-between"
      >
        <div>
          {/* Top Title Banner */}
          <div className="border border-slate-900 text-center py-1.5 font-semibold text-sm tracking-wider uppercase bg-slate-50 border-b-0">
            TAX INVOICE
          </div>

          {/* Supplier Header Box */}
          <div className="border border-slate-900 p-4 border-b-0">
            <div className="text-center space-y-1">
              <h1 className="text-xl font-semibold tracking-wide text-slate-950 uppercase">
                SHRI VARSHINI TECHNOLOGIES
              </h1>
              <p className="text-[11px] text-slate-700">
                SF No. 597/2, Kalapatti Main Road, Saravanampatti, Coimbatore - 641 035, Tamil Nadu, India
              </p>
              <div className="flex items-center justify-center gap-4 text-[11px] font-medium pt-1 text-slate-900">
                <span>GSTIN / UIN: <strong className="font-semibold">33AGSFS0004K1Z8</strong></span>
                <span>•</span>
                <span>State Name: <strong className="font-semibold">Tamil Nadu</strong>, Code: <strong className="font-semibold">33</strong></span>
                <span>•</span>
                <span>Email: <strong className="font-medium">svtcnc2020@gmail.com</strong></span>
              </div>
            </div>
          </div>

          {/* Two-Column Buyer & Metadata Grid */}
          <div className="grid grid-cols-2 border border-slate-900">
            {/* Left Column: Buyer (Bill to) */}
            <div className="p-3 border-r border-slate-900 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-600 tracking-wider block mb-1">
                  Buyer (Bill to)
                </span>
                <p className="font-semibold text-sm text-slate-950 mb-1">
                  {invoice.company.name}
                </p>
                <p className="text-slate-700 text-[11px] whitespace-pre-line leading-snug">
                  {invoice.company.address}
                  {invoice.company.city ? `, ${invoice.company.city}` : ''}
                  {invoice.company.pincode ? ` - ${invoice.company.pincode}` : ''}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] space-y-0.5">
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium">GSTIN / UIN:</span>
                  <span className="font-semibold text-slate-900">{invoice.company.gstin || 'N/A'}</span>
                </div>
                <div className="flex">
                  <span className="w-24 text-slate-500 font-medium">State Name:</span>
                  <span className="text-slate-900">{invoice.company.state || 'Tamil Nadu'}, Code: {invoice.company.gstin ? invoice.company.gstin.substring(0, 2) : '33'}</span>
                </div>
                {invoice.company.phone && (
                  <div className="flex">
                    <span className="w-24 text-slate-500 font-medium">Contact No:</span>
                    <span className="text-slate-900">{invoice.company.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Invoice & Dispatch Reference */}
            <div className="divide-y divide-slate-900 text-[11px]">
              <div className="grid grid-cols-2 p-2">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-medium block">Invoice No.</span>
                  <span className="font-semibold text-slate-950 text-xs">{invoice.invoiceNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-medium block">Dated</span>
                  <span className="font-medium text-slate-950 text-xs">{formattedDate}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 p-2">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-medium block">Buyer's Order No.</span>
                  <span className="font-medium text-slate-900">{invoice.buyersOrderNo || 'As per PO'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-medium block">Order Date</span>
                  <span className="font-medium text-slate-900">{formattedOrderDate || '—'}</span>
                </div>
              </div>

              <div className="p-2">
                <span className="text-[10px] uppercase text-slate-500 font-medium block">Despatch Document / SVT DC Ref.</span>
                <span className="font-semibold text-slate-900 text-[11px]">
                  {invoice.dispatchChallanRef || 'Direct Workshop Invoicing'}
                </span>
              </div>

              <div className="grid grid-cols-2 p-2">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-medium block">Billing Month</span>
                  <span className="font-medium text-slate-900">{invoice.billingMonth || 'Current Cycle'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-medium block">Terms of Payment</span>
                  <span className="font-medium text-slate-900">30 Days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Billable Line Items Table */}
          <div className="border border-slate-900 border-t-0">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-900 text-left font-semibold text-slate-900">
                  <th className="py-2 px-2 border-r border-slate-900 w-10 text-center whitespace-nowrap">Sl.</th>
                  <th className="py-2 px-3 border-r border-slate-900 whitespace-nowrap">Description of Goods / Services</th>
                  <th className="py-2 px-2 border-r border-slate-900 w-20 text-center whitespace-nowrap">HSN/SAC</th>
                  <th className="py-2 px-2 border-r border-slate-900 w-16 text-center whitespace-nowrap">GST %</th>
                  <th className="py-2 px-2 border-r border-slate-900 w-24 text-right whitespace-nowrap">Quantity</th>
                  <th className="py-2 px-2 border-r border-slate-900 w-20 text-right whitespace-nowrap">Rate (₹)</th>
                  <th className="py-2 px-2 border-r border-slate-900 w-12 text-center whitespace-nowrap">Per</th>
                  <th className="py-2 px-3 text-right w-28 whitespace-nowrap">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-2 border-r border-slate-900 text-center text-slate-600 align-top whitespace-nowrap">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-900 align-top whitespace-nowrap">
                      <div className="font-semibold text-slate-950">{item.description}</div>
                      {item.partNumber && (
                        <div className="text-[10px] text-slate-600 font-medium mt-0.5">
                          Part No: {item.partNumber}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500 italic mt-0.5">
                        (CNC Job Work Machining Charges on customer raw material)
                      </div>
                    </td>
                    <td className="py-2.5 px-2 border-r border-slate-900 text-center text-slate-800 align-top font-medium whitespace-nowrap">
                      {item.hsnSacCode || '998898'}
                    </td>
                    <td className="py-2.5 px-2 border-r border-slate-900 text-center text-slate-800 align-top font-medium whitespace-nowrap">
                      {item.gstRate}%
                    </td>
                    <td className="py-2.5 px-2 border-r border-slate-900 text-right font-semibold text-slate-900 align-top whitespace-nowrap">
                      {parseFloat(item.quantity.toString()).toLocaleString('en-IN')} {item.uom}
                    </td>
                    <td className="py-2.5 px-2 border-r border-slate-900 text-right text-slate-900 align-top font-medium whitespace-nowrap">
                      {parseFloat(item.rate.toString()).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 border-r border-slate-900 text-center text-slate-600 align-top whitespace-nowrap">
                      {item.uom}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-950 align-top whitespace-nowrap">
                      {parseFloat(item.amount.toString()).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}

                {/* Minimum spacing spacer row */}
                {invoice.items.length < 5 && (
                  <tr className="h-20">
                    <td className="border-r border-slate-900 whitespace-nowrap"></td>
                    <td className="border-r border-slate-900 whitespace-nowrap"></td>
                    <td className="border-r border-slate-900 whitespace-nowrap"></td>
                    <td className="border-r border-slate-900 whitespace-nowrap"></td>
                    <td className="border-r border-slate-900 whitespace-nowrap"></td>
                    <td className="border-r border-slate-900 whitespace-nowrap"></td>
                    <td className="border-r border-slate-900 whitespace-nowrap"></td>
                    <td className="whitespace-nowrap"></td>
                  </tr>
                )}
              </tbody>

              {/* Subtotal / Taxable Value Row */}
              <tfoot>
                <tr className="border-t-2 border-slate-900 bg-slate-50 font-semibold text-slate-950">
                  <td colSpan={4} className="py-2 px-3 border-r border-slate-900 text-right uppercase tracking-wider whitespace-nowrap">
                    Total Taxable Value
                  </td>
                  <td className="py-2 px-2 border-r border-slate-900 text-right font-semibold whitespace-nowrap">
                    {totalQuantity.toLocaleString('en-IN')} nos
                  </td>
                  <td colSpan={2} className="py-2 px-2 border-r border-slate-900 whitespace-nowrap"></td>
                  <td className="py-2 px-3 text-right font-semibold text-xs whitespace-nowrap">
                    ₹{parseFloat(invoice.taxableValue.toString()).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Tax Breakdown & Rupee Totals Grid */}
          <div className="grid grid-cols-2 border border-slate-900 border-t-0">
            {/* Left: Rupee in Words & Bank Details */}
            <div className="p-3 border-r border-slate-900 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block mb-1">
                  Amount Chargeable (in words)
                </span>
                <p className="font-semibold text-slate-950 italic text-[11px] leading-relaxed">
                  {amountInWords || invoice.amountInWords || 'Amount in words'}
                </p>
                {taxInWords && (
                  <div className="mt-2 text-[10px] text-slate-600">
                    <span className="font-medium text-slate-500">Tax Amount in words: </span>
                    <span className="italic">{taxInWords}</span>
                  </div>
                )}
              </div>

              {/* Bank Details */}
              <div className="mt-4 pt-3 border-t border-slate-200">
                <span className="text-[10px] uppercase font-semibold text-slate-600 tracking-wider block mb-1">
                  Company's Bank Details
                </span>
                <div className="text-[11px] space-y-0.5 text-slate-800">
                  <div>Bank Name: <strong className="font-semibold">Axis Bank</strong></div>
                  <div>A/c No: <strong className="font-semibold">376700060000060</strong></div>
                  <div>Branch & IFSC: <strong className="font-semibold">Saravanampatti & UTIB0003767</strong></div>
                </div>
              </div>
            </div>

            {/* Right: Tax Calculation Ledger */}
            <div className="divide-y divide-slate-200 text-[11px]">
              <div className="flex justify-between py-1.5 px-3">
                <span className="text-slate-600">Taxable Amount:</span>
                <span className="font-medium text-slate-900">
                  ₹{parseFloat(invoice.taxableValue.toString()).toFixed(2)}
                </span>
              </div>

              {isIntraState ? (
                <>
                  <div className="flex justify-between py-1.5 px-3">
                    <span className="text-slate-600">Central Tax (CGST 9.0%):</span>
                    <span className="font-medium text-slate-900">
                      ₹{parseFloat(invoice.cgstAmount.toString()).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 px-3">
                    <span className="text-slate-600">State Tax (SGST 9.0%):</span>
                    <span className="font-medium text-slate-900">
                      ₹{parseFloat(invoice.sgstAmount.toString()).toFixed(2)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between py-1.5 px-3">
                  <span className="text-slate-600">Integrated Tax (IGST 18.0%):</span>
                  <span className="font-medium text-slate-900">
                    ₹{parseFloat(invoice.igstAmount.toString()).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1.5 px-3 bg-slate-50 font-medium">
                <span className="text-slate-700">Total Tax:</span>
                <span className="text-slate-900">₹{totalTax.toFixed(2)}</span>
              </div>

              {parseFloat(invoice.roundOff.toString()) !== 0 && (
                <div className="flex justify-between py-1 px-3 text-slate-600 text-[10px]">
                  <span>Round Off:</span>
                  <span>
                    {parseFloat(invoice.roundOff.toString()) > 0 ? '+' : ''}
                    {parseFloat(invoice.roundOff.toString()).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-2.5 px-3 bg-slate-950 text-white font-semibold text-xs">
                <span>Grand Total (INR):</span>
                <span>
                  ₹{parseFloat(invoice.totalAmount.toString()).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Legal Declaration & Signatures */}
          <div className="grid grid-cols-2 border border-slate-900 border-t-0">
            {/* Left Declaration */}
            <div className="p-3 border-r border-slate-900 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block mb-1">
                  Declaration
                </span>
                <p className="text-[10px] text-slate-600 leading-snug">
                  We declare that this invoice shows the actual price of the goods / services described and that all particulars are true and correct.
                </p>
              </div>
              <div className="pt-6 text-[10px] text-slate-400">
                This is a Computer Generated Invoice.
              </div>
            </div>

            {/* Right Signatory Box */}
            <div className="p-3 flex flex-col justify-between text-right h-32">
              <span className="font-semibold text-slate-950 text-[11px] uppercase">
                For SHRI VARSHINI TECHNOLOGIES
              </span>
              <div className="pt-8">
                <span className="text-[11px] font-semibold text-slate-900 block">
                  Authorised Signatory
                </span>
                <span className="text-[10px] text-slate-500">
                  (Signature & Company Stamp)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

