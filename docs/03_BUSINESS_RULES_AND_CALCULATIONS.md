# Business Rules & Calculation Formulas

## 1. Indian GST & Invoice Calculations (Job Work / SAC 998898)

From the client reference documents (*Unimech Industries Limited*, *Calmet Engineering India Pvt Ltd*), the workshop provides CNC Machining / Job Work services on customer-supplied raw material.

### 1.1 Line Item Calculation
$$\text{Line Amount} = \text{Billable Quantity} \times \text{Applicable Unit Rate}$$

### 1.2 Taxable Value
$$\text{Taxable Value} = \sum (\text{Line Amounts}) - \text{Discounts} + \text{Other Taxable Charges}$$

### 1.3 GST Apportionment
* **Intra-State (Within Tamil Nadu - State Code `33`):**
  * GST Rate = **18%**
  * $\text{CGST (9\%)} = \text{Taxable Value} \times 0.09$
  * $\text{SGST (9\%)} = \text{Taxable Value} \times 0.09$
  * $\text{IGST} = 0.00$
* **Inter-State (Outside Tamil Nadu):**
  * $\text{IGST (18\%)} = \text{Taxable Value} \times 0.18$
  * $\text{CGST} = 0.00$, $\text{SGST} = 0.00$

### 1.4 Invoice Grand Total & Round-Off
$$\text{Pre-Round Total} = \text{Taxable Value} + \text{CGST} + \text{SGST} + \text{IGST}$$
$$\text{Grand Total} = \text{Round}(\text{Pre-Round Total}, 0)$$
$$\text{Round-Off Difference} = \text{Grand Total} - \text{Pre-Round Total}$$

* **Amount in Words Conversion:** The software automatically generates English words for figures (e.g., `₹33,984.00` $\rightarrow$ *"Rupees Thirty Three Thousand Nine Hundred Eighty Four Only"*).

---

## 2. Delivery Challan (DC) Sequential Rules

1. **Continuous Auto-Numbering:**
   * Starts from integer `1`.
   * Never resets across months or companies.
   * Modifying an existing DC never alters its assigned DC number.
   * Cancelled DC numbers are locked and never reused.
2. **Dispatch Date:**
   * Defaults to today's date ($DD/MM/YYYY$).
   * Admin can adjust date when back-logging dispatches, but all edits are logged to `AuditLog`.
3. **Single vs Multi-Item Support:**
   * A DC can be generated for 1 piece or dozens of parts in a single dispatch.
4. **Invoicing Status Lifecycle:**
   $$\text{Pending Invoicing} \xrightarrow{\text{Selected in Invoice}} \text{Invoiced}$$
   * Once a DC is marked `Invoiced`, it is locked and cannot be added to another invoice.

---

## 3. Multi-Month Consolidated Invoicing Workflow

The software accommodates clients who do not bill every month:

```
Month 1 (September): DCs #340, #341, #342 created (Status: Pending Invoicing)
Month 2 (October):   DCs #343, #344 created (Status: Pending Invoicing)
Month 3 (November):  Client generates ONE invoice consolidating DCs #340 to #344.
```

### 3.1 Line Item Consolidation Modes
* **Itemized Mode:** Each product in each DC appears as a distinct row referencing its original DC number and date.
* **Consolidated Part Mode:** If Part `428672` was dispatched across 3 different DCs (e.g., 100 pcs + 150 pcs + 110 pcs), the invoice can consolidate into a single row of `360 pcs @ ₹75.00 = ₹27,000.00`, with all 3 DC numbers preserved in the reference header.

---

## 4. Worker Attendance & 26-Day Salary Engine

CNC workshop salaries are calculated strictly using a **26 standard working days** basis:

### 4.1 Daily Rate Calculation
$$\text{Daily Salary Rate} = \frac{\text{Monthly Base Salary}}{26}$$

### 4.2 Absence Deduction
$$\text{Absence Deduction} = \text{Unpaid Absent Days} \times \text{Daily Salary Rate}$$
$$\text{Salary After Absence} = \text{Monthly Base Salary} - \text{Absence Deduction}$$

### 4.3 Optional Overtime (OT)
* Calculated from Start Time to End Time (accounting for shifts crossing midnight) or logged directly in hours.
$$\text{Overtime Amount} = \text{Approved OT Hours} \times \text{Configured Hourly OT Rate}$$
* **Gatekeeper Rule:** OT is completely optional. If unrecorded or unapproved, OT amount is ₹0.

### 4.4 Optional Extra Shift
$$\text{Extra Shift Amount} = \text{Approved Shifts} \times \text{Configured Amount Per Shift}$$

### 4.5 Net Final Salary
$$\text{Net Salary} = \text{Monthly Salary} - \text{Absence Deduction} + \text{Approved OT} + \text{Approved Extra Shift} \pm \text{Adjustments}$$

---

## 5. Company-Wise Stock Accounting (Job Work Principle)

Customer raw material does **not** belong to the workshop:
1. **Material Inward:** Stock increases when raw material arrives with customer Delivery Note.
2. **Machining Issue:** Material is issued to workshop machines.
3. **Dispatch Outward:** Finished parts sent out via DC reduce stock.
4. **Scrap & Leftover:** Residual raw steel and machining chips are accounted for in the company ledger.
5. **No Negative Stock Rule:** The system displays an error if an admin or worker attempts to dispatch more finished parts than the recorded material balance permits.

