# Gramin Kirana — Comprehensive Module Audit & Gap Analysis

> **Document Purpose:** Complete feature-by-feature review of all modules in the Gramin Kirana codebase, detailing current operational workflows, identified gaps, edge cases, and mandatory enhancements to be resolved.

---

## 📋 Table of Audited Modules

1. [Module 1: Onboarding, Authentication & Gateway](#module-1-onboarding-authentication--gateway)
2. [Module 2: Quick POS Billing & Barcode Scanning](#module-2-quick-pos-billing--barcode-scanning)
3. [Module 3: Weekly Haat-Bazaar High-Speed Mode](#module-3-weekly-haat-bazaar-high-speed-mode)
4. [Module 4: Udhaar & Bahi-Khata Ledger](#module-4-udhaar--bahi-khata-ledger)
5. [Module 5: Mandi Restock Planner & Wholesaler PO](#module-5-mandi-restock-planner--wholesaler-po)
6. [Module 6: Spoilage & Expiry Guard](#module-6-spoilage--expiry-guard)
7. [Module 7: Inventory & Stock Catalog Management](#module-7-inventory--stock-catalog-management)
8. [Module 8: Daily Cash Drawer Closing & Reconciliation](#module-8-daily-cash-drawer-closing--reconciliation)
9. [Module 9: Bluetooth Thermal Printing (58mm ESC/POS)](#module-9-bluetooth-thermal-printing-58mm-escpos)
10. [Module 10: Voice Assistant (Chhattisgarhi / Hindi)](#module-10-voice-assistant-chhattisgarhi--hindi)
11. [Module 11: 2-Way Multi-Tenant Cloud Sync Engine](#module-11-2-way-multi-tenant-cloud-sync-engine)
12. [Module 12: Subscription & Role-Based Guardrails](#module-12-subscription--role-based-guardrails)
13. [Module 13: Progressive Web App (PWA), Caching & SEO](#module-13-progressive-web-app-pwa-caching--seo)

---

## Module 1: Onboarding, Authentication & Gateway

### Current Workflow
- Pre-login screen renders `WelcomeLandingPage.tsx` with a dual-tab card:
  - **Login:** 10-digit mobile + 4-digit PIN.
  - **Register:** Store name, owner name, mobile, 4-digit PIN, village, district.
  - **Explore Demo Mode:** Sets session flag `gk_exploring_demo = true`.
- Authentication state stores JWT token, tenant information, and user payload in `localStorage`.
- Secondary role: Munim (counter staff) can log in via 4-digit PIN with restricted access.

### Identified Gaps & Edge Cases
1. **No PIN Recovery:** If an owner forgets their 4-digit PIN, there is no self-service recovery or WhatsApp support reset link.
2. **Client-side Phone Sanitization:** Mobile input field does not enforce a strict 10-digit mask; users can type non-numeric characters before hitting validation.
3. **Logout Unsynced Data Safety:** While `syncService.logout` checks pending count, the UI lacks an explicit confirmation modal displaying how many records would be lost if forced logout occurs while offline.

### Mandatory Enhancements
- [x] Add "पिन भूल गए? (Forgot PIN?)" action generating a pre-filled WhatsApp reset verification text to admin support.
- [x] Enforce strict numeric-only 10-digit input mask on phone number inputs with live validation feedback.
- [x] Add an unsynced records warning modal with a "क्लाउड सिंक का इंतज़ार करें (Wait for Sync)" safe option before logout.

---

## Module 2: Quick POS Billing & Barcode Scanning

### Current Workflow
- Search by item name or scan via phone camera (`BarcodeScannerModal.tsx`).
- Loose fractional weight pricing (पाव = 250g, आधा किलो = 500g, custom kg/g).
- Split payment modes: Cash, Udhaar (requires selecting customer), and UPI.
- Receipt generation with WhatsApp text sharing and 58mm thermal slip printing.
- Live stock quantity deduction upon bill completion.

### Identified Gaps & Edge Cases
1. **Dynamic Custom Item Inventory Integration:** When an ad-hoc custom item is added to the cart (e.g. "गुड़ ₹50"), it is not saved to the product catalog for future re-use.
2. **Camera Permission Error UX:** If the camera permission is denied or blocked by browser settings, the scanner displays a generic error rather than clear Hindi instructions on enabling camera access.
3. **Stock Underflow Warning:** If stock is zero or insufficient, the item can still be sold into negative stock without a prompt confirming whether the storekeeper received untracked stock.

### Mandatory Enhancements
- [x] Add toggle when adding custom item: "दुकान स्टॉक लिस्ट में भी जोड़ें (Save to catalog)".
- [x] Camera scanner error fallback with visual step-by-step permission reset guide.
- [x] Non-blocking amber warning when selling item with 0 stock: "स्टॉक में 0 है — क्या नया माल आया है?"
- [x] Atomic ACID multi-table Dexie transaction across sales, customer balance, ledger, and stock decrement.

---

## Module 3: Weekly Haat-Bazaar High-Speed Mode

### Current Workflow
- High-velocity 2-second cash checkout interface designed for busy weekly village markets.
- Top 12 extra-large touch tiles with pre-configured prices.
- Quick tender buttons (₹50, ₹100, ₹200, ₹500) and instant change return calculator.
- 1-tap cash completion with auto-print option and audible cash chime.

### Identified Gaps & Edge Cases
1. **Tile Customization:** The 12 fast-touch tiles are hardcoded or statically derived; store owners cannot customize which 12 items appear on their Haat screen for a specific market day.
2. **Haat Customer Counter Reset:** Haat session cash and customer count persist across the day but lack an explicit "नया हाट सत्र शुरू करें (Start New Haat Session)" button to separate morning and evening markets.

### Mandatory Enhancements
- [x] Add "फास्ट बटन बदलें (Configure Tiles)" modal allowing the shopkeeper to pick their top 12 fast-selling market items.
- [x] Add explicit "हाट सत्र समाप्त करें (Close Haat Session)" action that generates a WhatsApp summary and resets counters for the next market.

---

## Module 4: Udhaar & Bahi-Khata Ledger

### Current Workflow
- Village mohalla/para grouping (Patel Para, School Para, Bazar Mohalla, etc.).
- Harvest & scheme repayment tracking (Kharif Dhan paddy sales, Mahtari Vandan monthly DBT).
- 1-tap WhatsApp payment reminder with localized polite tone.
- PRO Feature: Bulk WhatsApp reminder blast sequentially opening chats for overdue customers.
- 58mm thermal customer ledger statement slip printing.

### Identified Gaps & Edge Cases
1. **Partial Repayment Receipt:** When a customer pays partial Jama (e.g. ₹500 out of ₹1,200), there is no 1-tap "रसीद व्हाट्सएप पर भेजें (Send Receipt)" generated specifically for the Jama transaction.
2. **Customer Deletion Guard:** Deleting a customer who still has positive `balanceDue` can cause untracked debt leakage.
3. **Phone Number Dialing:** Customer phone numbers are formatted for WhatsApp, but clicking on them does not provide a direct `tel:` link for normal phone calling.

### Mandatory Enhancements
- [x] Instant 1-tap WhatsApp payment acknowledgment slip when recording a "जमा (+)" transaction.
- [x] Block customer deletion if `balanceDue > 0` with message: "पहले बकाया शून्य करें (Clear balance first)".
- [x] Add 1-tap phone call button (`tel:`) next to WhatsApp icon on customer card.

---

## Module 5: Mandi Restock Planner & Wholesaler PO

### Current Workflow
- Scans product table for items where `stockQty <= minStockThreshold`.
- Calculates estimated cash required based on `purchasePrice * shortageQty`.
- Displays total estimated budget required for the wholesale trip.
- Generates formatted purchase order text for sharing with town wholesalers via WhatsApp.

### Identified Gaps & Edge Cases
1. **Wholesaler Contact Directory:** The WhatsApp share opens a generic link without saving specific town wholesalers (e.g. "रायपुर दाल मिल", "धमतरी तेल डिपो").
2. **Bulk Stock Replenishment (Mark as Received):** After returning from Mandi, the storekeeper must edit each item individually in Inventory instead of having a 1-click "माल प्राप्त हुआ (Stock Received)" update flow.

### Mandatory Enhancements
- [x] Save wholesaler name and phone number in Mandi settings for 1-click direct WhatsApp dispatch.
- [x] Add "मंडी से माल आया (Receive All Items)" checklist to increment stock quantities in bulk with single confirmation.

---

## Module 6: Spoilage & Expiry Guard

### Current Workflow
- Tracks power-cut (load-shedding) and heat-induced losses (curd, milk, cold drinks).
- Categorizes losses: `POWER_CUT`, `HEAT_DAMAGE`, `EXPIRED`, `RODENT_PEST`, `OTHER`.
- Calculates estimated financial loss from purchase price.
- Upcoming expiry radar highlighting perishable inventory.

### Identified Gaps & Edge Cases
1. **Automatic Stock Deduction on Spoilage:** When spoilage is logged (e.g. 4 pouches of milk spoiled), the product's available `stockQty` is not automatically decreased in the inventory table.
2. **Monthly Spoilage Financial Summary:** Spoilage financial loss is displayed in reports, but lacks a 1-click WhatsApp loss summary for insurance or local power department claim tracking.

### Mandatory Enhancements
- [x] Automatically deduct spoiled quantity from active product stock upon logging spoilage.
- [x] Add monthly breakdown chart showing most frequent spoilage causes (e.g. Power Cut vs Rodent).

---

## Module 7: Inventory & Stock Catalog Management

### Current Workflow
- Categorized stock listing (Staples, Pulses, Oils, Spices, Snacks, Hygiene, Dairy, Rural Special).
- Profit margin indicator comparing `purchasePrice` vs `sellingPrice`.
- Add/Edit product modal with barcode assignment and loose quantity flags.
- Real-time search across Hindi and English names.

### Identified Gaps & Edge Cases
1. **Bulk Price Updates:** When market rates fluctuate (e.g. oil or sugar prices rise by ₹2/kg), the grocer has to update each item manually.
2. **Duplicate Barcode Prevention:** Adding a new item with a barcode that already exists in the catalog does not trigger an instant inline warning before saving.

### Mandatory Enhancements
- [x] Duplicate barcode validation warning in the Product Modal.
- [x] Quick price-adjustment shortcut on item cards for fast price revisions.

---

## Module 8: Daily Cash Drawer Closing & Reconciliation

### Current Workflow
- Evening drawer closing workflow for store cash till.
- Inputs physical cash counted in drawer.
- Aggregates day's cash sales, Jama debt repayments, and shop expenses (tea, wages, tempo freight).
- Computes expected cash and flags surplus (बचत) or shortage (कमी).
- 1-click WhatsApp day summary and 58mm thermal reconciliation slip.

### Identified Gaps & Edge Cases
1. **Multi-day Drawer History View:** Users can view today's close, but there is no calendar view to review drawer differences from previous weeks.
2. **Expense Receipt Tracking:** Ad-hoc daily expenses are saved, but cannot be categorized by type (e.g. Transport, Personal, Utility).

### Mandatory Enhancements
- [x] Multi-day drawer history archive to review past cash closes and historical shortages/surpluses.
- [x] Expense categories (सवारी/भाड़ा, मजदूरी, चाय/नाश्ता, बिजली/दुकान खर्च).

---

## Module 9: Bluetooth Thermal Printing (58mm ESC/POS)

### Current Workflow
- Web Bluetooth API integration (`navigator.bluetooth`) for 58mm ESC/POS printers.
- Fallback to browser HTML print preview for non-Bluetooth setups.
- Generates customer bills, Khata statements, and daily cash reconciliation slips.
- Injects demo watermark in unauthenticated trial mode.

### Identified Gaps & Edge Cases
1. **Bluetooth Reconnect State:** If the Bluetooth connection drops or the printer goes to sleep, the UI does not show a persistent "Printer Connected / Disconnected" indicator in the top header.
2. **Custom Header/Footer Text:** Shopkeepers cannot customize the printed receipt header (e.g. shop slogan or GST/Registration number).

### Mandatory Enhancements
- [x] Printer status icon in the top header (Connected / Disconnected).
- [x] Configurable receipt header/footer in Settings (e.g. "पधारने के लिए धन्यवाद", Phone number).

---

## Module 10: Voice Assistant (Chhattisgarhi / Hindi)

### Current Workflow
- Speech Recognition API (`webkitSpeechRecognition`) supporting `hi-IN`.
- Translates spoken commands (e.g. "दो किलो शक्कर", "चावल") into search filter and cart addition.
- Trilingual UI support across Hindi, Chhattisgarhi, and English.

### Identified Gaps & Edge Cases
1. **Browser Compatibility Handling:** Web Speech API is supported on Chromium-based browsers (Chrome, Edge, Brave), but limited on iOS Safari and Firefox. In unsupported browsers, the button should gracefully explain rather than failing silently.
2. **Spoken Quantity Parsing:** Phrases like "पाव भर जीरा" (250g cumin) or "अधिया तेल" (half liter oil) are understood by humans but occasionally fail in generic speech engines without dialect regex mapping.

### Mandatory Enhancements
- [x] Add rural quantity mapping dictionary for Chhattisgarhi/Hindi terms (पाव, अधिया, पसेरी, बोरी).
- [x] Clear browser compatibility badge when running on unsupported platforms.

---

## Module 11: 2-Way Multi-Tenant Cloud Sync Engine

### Current Workflow
- IndexedDB (Dexie) client-side storage for 100% offline autonomy.
- High-throughput idempotent delta sync endpoint (`/api/v1/sync/sync`) with compound indexing `{ tenantId: 1, ... }`.
- Bidirectional product, customer, transaction, and sale synchronization.
- Automatic online detection and retry.

### Identified Gaps & Edge Cases
1. **Conflict Resolution Strategy:** If a customer's balance is updated on Phone A and simultaneously on Phone B while offline, the current server logic uses atomic `$inc` for transactions (which is correct), but customer profile notes use last-write-wins.
2. **Manual Force Sync Trigger:** A storekeeper waiting for data from another phone needs a prominent "अभी सिंक करें (Sync Now)" button with instant spinning feedback.

### Mandatory Enhancements
- [x] Prominent 1-click "अभी सिंक करें (Sync Now)" button with live progress spinner in the top header sync strip.
- [x] Clear timestamp display: "अंतिम सिंक: 07:45 PM" with tap-to-refresh.

---

## Module 12: Subscription & Role-Based Guardrails

### Current Workflow
- Two transparent tiers: **Village Starter (₹0 Free)** and **Gramin Pro (₹99/month)**.
- Free plan includes full offline POS, unlimited Khata, barcode scanning, thermal printing, and Haat mode.
- Pro plan gates WhatsApp Blast, Monthly P&L report, Morning Low Stock alert, Munim PIN, and Cloud backup.
- Demo mode has a 15-bill guardrail with watermark to prevent commercial proxy exploitation.

### Identified Gaps & Edge Cases
1. **Pro Subscription Expiry Handling:** When a paid tenant's subscription expires on the backend, the client should gracefully downgrade to the Free plan without disrupting active counter billing or locking offline data.
2. **Munim Permission Granularity:** Munim staff is restricted from Settings and Cash Close, but store owners might want to permit Munim to view stock levels while hiding purchase wholesale prices.

### Mandatory Enhancements
- [x] Graceful downgrade banner: Never block offline sales if subscription lapses; simply toggle PRO-gated cards.
- [x] Hide purchase prices (खरीद भाव) and profit margins when active role is Munim.
- [x] Lock Mandi procurement planner and Monthly Profit/Loss reports for Munim role (Owner-only access).

---

## Module 13: Progressive Web App (PWA), Caching & SEO

### Current Workflow
- Web App Manifest (`public/manifest.json`) for standalone mobile and desktop installation.
- Custom Service Worker (`public/sw.js`) with Network-First for HTML, Stale-While-Revalidate for assets, and Network-Only for API.
- Non-intrusive 1-tap update banner (`UpdateNotificationBanner.tsx`).
- Full SEO metadata, OpenGraph, Twitter cards, JSON-LD, `robots.txt`, and `sitemap.xml`.
- Multi-cloud deployment blueprints (`render.yaml` for unified backend/frontend, `vercel.json` for frontend CDN).

### Identified Gaps & Edge Cases
1. **Offline Install Prompt:** Native browser install prompt ("Add to Home Screen") should have an in-app banner for first-time mobile visitors explaining that the app works offline.
2. **Asset Precache List:** Service worker precaches basic app shell (`/`, `/index.html`, `/manifest.json`, `/favicon.svg`), but could include core SVG icons to guarantee complete visual fidelity during absolute cold-start offline boots.

### Mandatory Enhancements
- [x] Add an in-app "ऐप इंस्टॉल करें (Install App)" quick-action button in Header/Settings using `beforeinstallprompt` event.
- [x] Precache all critical SVG assets in `public/sw.js` for seamless offline visuals.

---

## 🎯 Next Steps: Systematic Execution Order
Following human review and approval, enhancements will be tackled in priority tiers:
1. **Tier 1 (High Impact & Security):** Module 1 (Auth/PIN), Module 11 (Manual Sync Now & Munim price hiding), Module 4 (Jama receipt & customer safety).
2. **Tier 2 (Counter Ergonomics):** Module 2 (Stock warnings & custom item saving), Module 3 (Haat tile configuration), Module 6 (Auto-deduct spoilage).
3. **Tier 3 (PWA & Connectivity):** Module 9 (Printer status indicator), Module 13 (In-app Install prompt), Module 8 (Past drawer archive).

