# UI/UX Design System Specification

## 1. Aesthetic Direction (From Reference Dashboards V14 & V18)

The user experience follows the minimalist, ultra-clean aesthetic shown in the reference images:
* **Canvas Background:** Pure White (`#FFFFFF`).
* **Card & Surface Backgrounds:** Elevated soft surfaces (`#F8FAFC` to `#FFFFFF`) with crisp `1px border border-slate-200`.
* **Color Palette:** Professional, industry-standard **Black & Slate Grey**. No loud or rainbow colors.
* **Navigation Style:** 
  * **Desktop:** Floating vertical capsule dock / pill sidebar with smooth rounded active state capsules.
  * **Mobile:** Sleek slide-out hamburger navigation drawer with bottom touch-action bar.
* **Shadows:** Ultra-soft, diffused drop shadows (`shadow-sm`, `box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05)`).
* **Card Radius:** Generous, modern rounded corners (`rounded-2xl` / `16px` to `24px`).

---

## 2. Color Palette Tokens

```css
:root {
  /* Canvas & Backgrounds */
  --bg-canvas: #FFFFFF;           /* Pure White */
  --bg-card: #FFFFFF;             /* Pure White with 1px border */
  --bg-subtle: #F8FAFC;           /* Soft Slate Tint for hover / header */
  --bg-dock: #0F172A;             /* Deep Slate Black for Desktop Floating Dock */
  
  /* Primary & Text */
  --text-primary: #0F172A;        /* Deep Charcoal / Slate Black */
  --text-secondary: #475569;      /* Medium Slate Grey */
  --text-muted: #94A3B8;          /* Light Slate for placeholders & icons */
  
  /* Borders */
  --border-subtle: #E2E8F0;       /* 1px clean divider */
  --border-strong: #CBD5E1;       /* Active input / focused border */
  
  /* Action & Active Pills */
  --pill-active-bg: #0F172A;      /* Solid dark pill */
  --pill-active-text: #FFFFFF;    /* White text on dark pill */
  --pill-inactive-bg: #F1F5F9;    /* Soft grey pill */
  --pill-inactive-text: #334155;  /* Slate text */
  
  /* Semantic Status Indicators (Used sparingly on small badges only) */
  --badge-paid-bg: #F0FDF4;       /* Soft Mint */
  --badge-paid-text: #166534;     /* Forest Green */
  --badge-pending-bg: #FFFBEB;    /* Soft Amber */
  --badge-pending-text: #92400E;  /* Warm Ochre */
  --badge-alert-bg: #FEF2F2;      /* Soft Rose */
  --badge-alert-text: #991B1B;    /* Crimson Red */
}
```

---

## 3. Typography Rules

* **Font Families:** `Poppins`, `Inter`, or `Montserrat` (Clean Sans-Serif).
* **Font Weight Enforcement:**
  * **Regular (`400`):** Body paragraphs, table descriptions, remarks.
  * **Medium (`500`):** Table values, form labels, secondary buttons.
  * **SemiBold (`600`):** Card headers, major metrics (e.g. `₹33,984.00`), active navigation titles.
  * ❌ **Bold (`700`) & ExtraBold (`800`) are strictly disallowed** to maintain the neat, minimal, uncluttered feel.

---

## 4. Layout & Responsive Breakpoints

### 4.1 Desktop (Width $\ge$ 1024px)
* **Left:** Floating vertical dark dock rail (icon + tooltip) or expanding pill bar.
* **Top:** Clean greeting header (`"Good morning, Shri Varshini Tech"`, Search bar, Quick Add DC button, Profile avatar).
* **Center Canvas:** Grid of rounded white cards (`gap-6`, `p-6`, `rounded-2xl`, `border border-slate-200`).

### 4.2 Mobile & Tablet (Width $<$ 1024px)
* **Top Header:** Left hamburger button (3 lines), center logo mark, right profile pill.
* **Side Drawer:** Slides smoothly from left with full touch gesture support and backdrop blur overlay (`bg-slate-900/20 backdrop-blur-sm`).
* **Tables:** Transform into responsive card stacks on narrow screens so workshop operators don't have to scroll horizontally on small phones.

---

## 5. Animation Contract

* **Library:** `framer-motion`
* **Philosophy:** Fast, subtle, and battery-friendly micro-animations.
* **Standard Transition:** `duration: 0.18s, ease: [0.16, 1, 0.3, 1]` (Apple-style spring curve).
* **Page Transitions:** Soft opacity fade (`initial={{ opacity: 0 }} animate={{ opacity: 1 }}`).
* **Modals & Drawers:** Spring slide with mild scale (`initial={{ opacity: 0, scale: 0.98 }}`).
* ❌ **No heavy parallax, spinning objects, or CPU-hogging effects.**

---

## 6. Progressive Web App (PWA) Configuration

* **`manifest.json` Attributes:**
  * `display: "standalone"` (Runs without browser URL bar, looks like a native desktop/mobile app).
  * `theme_color: "#FFFFFF"`.
  * `background_color: "#FFFFFF"`.
  * `orientation: "any"`.
* **Service Worker:** Caches application shell, stylesheets, icons, and fonts for immediate load times (<200ms) on workshop 4G/WiFi connections.

