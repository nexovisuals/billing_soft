# Print & PDF Document Specifications

Based on the actual physical bill reference images:
* `DC bill reference.jpeg` (Delivery Challan)
* `invoice bill reference 1.jpeg` (Tax Invoice - Unimech Industries Limited)
* `invoice bill reference 2.jpeg` (Tax Invoice - Calmet Engineering India Pvt Ltd)

---

## 1. Delivery Challan (DC) Template Specification

### 1.1 Layout Structure (A4 or Custom Slip)
* **Header:**
  * Title: **DELIVERY CHALLAN**
  * Workshop Name: **SHRI VARSHINI TECHNOLOGIES**
  * Address & Contact details, GSTIN: `33AGSFS0004K1Z8`
  * State: Tamil Nadu (Code: `33`)
* **Metadata Box:**
  * **DC No:** e.g., `368` (Auto-generated continuous serial)
  * **Date:** DD/MM/YYYY
  * **Customer / To:** Customer Company Name, Billing Address, GSTIN
  * **Your Order No & Date:** Customer Purchase Order reference
* **Dispatch Declaration:**
  > *"Sir, Please receive the following goods and return the duplicate copy duly signed."*
* **Itemized Table:**
  | S.No | Description of Goods / Part No | Quantity | Unit | Remarks |
  | :--- | :--- | :---: | :---: | :--- |
  | 1 | Bracket - Part No: 428672 | 360 | nos | As per PO |
* **Footer & Signatures:**
  * Left: *"Received the goods in good condition"* with space for **Customer Signature with Seal**.
  * Right: **For SHRI VARSHINI TECHNOLOGIES** with space for **Authorized Signatory**.

---

## 2. Tax Invoice Template Specification

### 2.1 Layout Structure (Standard A4)
* **Header Section:**
  * Title: **TAX INVOICE**
  * Supplier: **SHRI VARSHINI TECHNOLOGIES**
  * Supplier Address, Saravanampatti, Coimbatore, Tamil Nadu
  * GSTIN/UIN: `33AGSFS0004K1Z8`, State: Tamil Nadu, Code: `33`
* **Two-Column Reference Grid:**
  * **Left Column:**
    * Buyer (Bill to): Company Name, Registered Address, GSTIN/UIN, State Name & Code
  * **Right Column:**
    * **Invoice No:** e.g., `069/2026-27`
    * **Dated:** e.g., `25-Sep-2026`
    * **Buyer's Order No & Date:** e.g., `1077/2026-27 Dt: 03-09-2026`
    * **Despatch Document No / SVT DC Ref:** e.g., `SVT DC: 340 / 25-09-2026`
    * **Terms of Payment:** Immediate / 30 Days
* **Billable Items Table:**
  | S.No | Description of Goods / Services | HSN/SAC | GST Rate | Quantity | Rate | Per | Amount (₹) |
  | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
  | 1 | Bracket - Part No: 428672 | 998898 | 18% | 360 nos | 75.00 | nos | 27,000.00 |
  | 2 | Bracket - Part No: 428672-011 | 998898 | 18% | 360 nos | 5.00 | nos | 1,800.00 |
  | | **Sub-Total / Taxable Value** | | | **720 nos** | | | **₹28,800.00** |
* **Tax Breakdown Table:**
  * Taxable Value: `₹28,800.00`
  * Central Tax (CGST 9%): `₹2,592.00`
  * State Tax (SGST 9%): `₹2,592.00`
  * Total Tax Amount: `₹5,184.00`
* **Total in Words:**
  * Invoice Total (in words): *Rupees Thirty Three Thousand Nine Hundred Eighty Four Only*
  * Tax Amount (in words): *Rupees Five Thousand One Hundred Eighty Four Only*
* **Company's Bank Details:**
  * Bank Name: (Bank Name)
  * Account Number: `376700060000060`
  * Branch & IFSC Code: Saravanampatti & IFSC...
* **Declarations & Signatures:**
  * Declaration: *"We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct."*
  * Footer: *"This is a Computer Generated Invoice"*
  * Right: **For SHRI VARSHINI TECHNOLOGIES** $\rightarrow$ **Authorised Signatory**

---

## 3. CSS Print Styling Rule (`@media print`)

```css
@media print {
  /* Hide all web chrome: sidebars, navbars, buttons, action pills */
  nav, aside, button, .no-print {
    display: none !important;
  }
  
  /* Reset background and padding for crisp paper printing */
  body, #print-sheet {
    background: #FFFFFF !important;
    color: #000000 !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
  }
  
  /* Strict page sizing */
  @page {
    size: A4 portrait;
    margin: 10mm 10mm 10mm 10mm;
  }
}
```

