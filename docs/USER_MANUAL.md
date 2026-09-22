# Gramin Kirana (ग्रामीण किराना) — User Manual & Operational Guide

Welcome to **Gramin Kirana**, an easy-to-use digital billing, Udhaar (Khata) management, and Mandi procurement system designed for village grocery stores.

---

## 📖 Table of Contents

1. [Overview & Quick Start](#1-overview--quick-start)
2. [Quick Billing & POS (तुरंत बिलिंग)](#2-quick-billing--pos-तुरंत-बिलिंग)
   - [Selecting Items & Categories](#selecting-items--categories)
   - [Loose Weight Pricing (खुला सामान: पाव, आधा किलो)](#loose-weight-pricing-खुला-सामान-पाव-आधा-किलो)
   - [Payment Options: Cash, Udhaar, and UPI](#payment-options-cash-udhaar-and-upi)
   - [Sharing Receipts via WhatsApp](#sharing-receipts-via-whatsapp)
3. [Udhaar & Bahi-Khata Ledger (ग्राहक उधार बही-खाता)](#3-udhaar--bahi-khata-ledger-ग्राहक-उधार-बही-खाता)
   - [Village Mohalla / Para Grouping](#village-mohalla--para-grouping)
   - [Harvest & Scheme Repayment Dates (धान खरीदी / महतारी वंदन)](#harvest--scheme-repayment-dates-धान-खरीदी--महतारी-वंदन)
   - [Recording Payments Received (जमा) & New Credit (उधार)](#recording-payments-received-जमा--new-credit-उधार)
   - [WhatsApp Payment Receipts & Reminders (जमा रसीद व तगादा)](#whatsapp-payment-receipts--reminders-जमा-रसीद-व-तगादा)
   - [Direct Phone Dialing & Safe Customer Guard (कॉल व खाता सुरक्षा)](#direct-phone-dialing--safe-customer-guard-कॉल-व-खाता-सुरक्षा)
   - [Viewing Customer Transaction History](#viewing-customer-transaction-history)
4. [Mandi Restock Planner (मंडी / शहर खरीदारी लिस्ट)](#4-mandi-restock-planner-मंडी--शहर-खरीदारी-लिस्ट)
   - [Auto-Generated Low Stock List](#auto-generated-low-stock-list)
   - [Calculating Cash Needed for Mandi Trip](#calculating-cash-needed-for-mandi-trip)
   - [Sending Purchase Order to Town Wholesaler](#sending-purchase-order-to-town-wholesaler)
   - [Wholesaler Directory & Bulk Stock Receiving (थोक व्यापारी व माल आया स्टॉक अपडेट)](#wholesaler-directory--bulk-stock-receiving-थोक-व्यापारी-व-माल-आया-स्टॉक-अपडेट)
5. [Spoilage & Expiry Guard (खराबी व एक्सपायरी गार्ड)](#5-spoilage--expiry-guard-खराबी-व-एक्सपायरी-गार्ड)
   - [Logging Power-Cut & Heat Losses (दूध/दही/कोल्ड ड्रिंक)](#logging-power-cut--heat-losses-दूधदहीकोल्ड-ड्रिंक)
   - [Cause-Wise Loss Breakdown (कारण अनुसार नुकसान वर्गीकरण)](#cause-wise-loss-breakdown-कारण-अनुसार-नुकसान-वर्गीकरण)
   - [Tracking Upcoming Expiry Items](#tracking-upcoming-expiry-items)
6. [Inventory Management (दुकान का पूरा स्टॉक)](#6-inventory-management-दुकान-का-पूरा-स्टॉक)
   - [Updating Rates & Profit Margins](#updating-rates--profit-margins)
   - [Barcode Management & Duplicate Warning (बारकोड व डुप्लीकेट रोक)](#barcode-management--duplicate-warning-बारकोड-व-डुप्लीकेट-रोक)
   - [Quick Price Revisions (+1, +2, -1) (तुरंत दर बदलाव)](#quick-price-revisions-1-2--1-तुरंत-दर-बदलाव)
   - [Adding New Items](#adding-new-items)
7. [Voice Assistant (बोलकर दर्ज करें)](#7-voice-assistant-बोलकर-दर्ज-करें)
   - [Rural Dialect & Quantity Recognition (गाँव की तौल व बोलचाल)](#rural-dialect--quantity-recognition-गाँव-की-तौल-व-बोलचाल)
8. [Data Backup, Privacy & App Installation (डेटा बैकअप, सुरक्षा व ऐप इंस्टॉलेशन)](#8-data-backup-privacy--app-installation-डेटा-बैकअप-सुरक्षा-व-ऐप-इंस्टॉलेशन)
   - [Offline Data Export & Restore](#offline-data-export--restore)
   - [Installing App on Phone or PC (PWA होमस्क्रीन ऐप)](#installing-app-on-phone-or-pc-pwa-होमस्क्रीन-ऐप)
9. [Store Login & Multi-Staff Access (दुकानदार लॉगिन व मुनीम खाता)](#9-store-login--multi-staff-access-दुकानदार-लॉगिन-व-मुनीम-खाता)
   - [Registering Your Store & PIN Recovery Helpline](#registering-your-store--pin-recovery-helpline)
   - [Roles & Sensitive Data Privacy Guardrails](#roles--sensitive-data-privacy-guardrails)
10. [Automatic Cloud Sync & Multi-Store Isolation (क्लाउड ऑटो-सिंक व सुरक्षा)](#10-automatic-cloud-sync--multi-store-isolation-क्लाउड-ऑटो-सिंक-व-सुरक्षा)
    - [100% Offline with Live Cloud Sync & 1-Click Backup](#100-offline-with-live-cloud-sync--1-click-backup)
    - [Multi-Store Local Switching Isolation Guarantee](#multi-store-local-switching-isolation-guarantee-सुरक्षित-दुकान-बदलाव)
11. [Village Premium Look & Multi-Device Usability (ग्रामीण प्रीमियम लुक व मोबाइल/टैबलेट उपयोग)](#11-village-premium-look--multi-device-usability-ग्रामीण-प्रीमियम-लुक-व-मोबाइलटैबलेट-उपयोग)
12. [Daily Cash Drawer Closing (दैनिक गल्ला व रोकड़ हिसाब)](#12-daily-cash-drawer-closing-दैनिक-गल्ला-व-रोकड़-हिसाब)
    - [Evening Cash Count (शाम का गल्ला मिलान)](#evening-cash-count-शाम-का-गल्ला-मिलान)
    - [Daily Shop Expenses & Quick Category Chips (दुकान के खर्चे व त्वरित बटन)](#daily-shop-expenses--quick-category-chips-दुकान-के-खर्चे-व-त्वरित-बटन)
    - [Cash Reconciliation & Difference (गल्ला अंतर व मिलान)](#cash-reconciliation--difference-गल्ला-अंतर-व-मिलान)
    - [1-Click WhatsApp Day Summary (व्हाट्सएप पर दिन सारांश)](#1-click-whatsapp-day-summary-व्हाट्सएप-पर-दिन-सारांश)
    - [Past Cash Drawer Archive & Historical Slips (पिछला गल्ला इतिहास व पुरानी पर्ची)](#past-cash-drawer-archive--historical-slips-पिछला-गल्ला-इतिहास-व-पुरानी-पर्ची)
13. [Bluetooth Thermal Printing (ब्लूटूथ व 58mm थर्मल प्रिंटर)](#13-bluetooth-thermal-printing-ब्लूटूथ-व-58mm-थर्मल-प्रिंटर)
    - [Connecting Inexpensive Bluetooth Printers](#connecting-inexpensive-bluetooth-printers)
    - [Top Bar Quick Connection Indicator (शीर्ष प्रिंटर स्थिति)](#top-bar-quick-connection-indicator-शीर्ष-प्रिंटर-स्थिति)
    - [Custom Receipt Slogan & Footer (दुकान स्लोगन व आभार संदेश)](#custom-receipt-slogan--footer-दुकान-स्लोगन-व-आभार-संदेश)
    - [1-Click POS Bill Receipt Print](#1-click-pos-bill-receipt-print)
    - [Daily Cash Close Summary Slip](#daily-cash-close-summary-slip)
14. [Camera Barcode Scanner (कैमरा बारकोड स्कैनर)](#14-camera-barcode-scanner-कैमरा-बारकोड-स्कैनर)
   - [1-Second Camera Item Scan (कैमरा से तुरंत बिलिंग)](#1-second-camera-item-scan-कैमरा-से-तुरंत-बिलिंग)
   - [Torch Light & Night Counter Usability (टॉर्च लाइट)](#torch-light--night-counter-usability-टॉर्च-लाइट)
   - [USB Handheld Barcode Reader Compatibility (USB स्कैनर सपोर्ट)](#usb-handheld-barcode-reader-compatibility-usb-स्कैनर-सपोर्ट)
15. [Customer Khata Statement Slip (ग्राहक खाता पर्ची प्रिंट व व्हाट्सएप)](#15-customer-khata-statement-slip-ग्राहक-खाता-पर्ची-प्रिंट-व-व्हाट्सएप)
   - [Date-Wise Udhaar & Jama Statement (तारीखवार बही-खाता पर्ची)](#date-wise-udhaar--jama-statement-तारीखवार-बही-खाता-पर्ची)
   - [Bluetooth Thermal Statement Slip (58mm पर्ची प्रिंट)](#bluetooth-thermal-statement-slip-58mm-पर्ची-प्रिंट)
   - [1-Click Detailed WhatsApp Statement (व्हाट्सएप पर पूरी पर्ची)](#1-click-detailed-whatsapp-statement-व्हाट्सएप-पर-पूरी-पर्ची)
16. [Weekly Haat-Bazaar High-Speed Mode (साप्ताहिक हाट-बाजार मोड)](#16-weekly-haat-bazaar-high-speed-mode-साप्ताहिक-हाट-बाजार-मोड)
   - [Top 12 Extra-Large Touch Tiles (मोटी टच बटन)](#top-12-extra-large-touch-tiles-मोटी-टच-बटन)
   - [Quick Tender & Change Calculator (छुट्टे पैसे हिसाब)](#quick-tender--change-calculator-छुट्टे-पैसे-हिसाब)
   - [1-Tap Cash Checkout & Zero-Wait Queue (1-टैप नकद बिल)](#1-tap-cash-checkout--zero-wait-queue-1-टैप-नकद-बिल)
   - [Live Haat Cash & Customer Meter (हाट रोकड़ मीटर)](#live-haat-cash--customer-meter-हाट-रोकड़-मीटर)
17. [Village Subscription Plans & Transparent Pricing (दुकान प्लान व सुविधाएं)](#17-village-subscription-plans--transparent-pricing-दुकान-प्लान-व-सुविधाएं)
18. [Progressive Web App (PWA) & Seamless Updates (ऐप इंस्टॉलेशन व ऑटो-अपडेट)](#18-progressive-web-app-pwa--seamless-updates-ऐप-इंस्टॉलेशन-व-ऑटो-अपडेट)
    - [Installing Gramin Kirana on Mobile & PC (होम स्क्रीन पर ऐप जोड़ें)](#installing-gramin-kirana-on-mobile--pc-होम-स्क्रीन-पर-ऐप-जोड़ें)
    - [1-Tap Update Notification Banner (1-टैप में नया वर्शन लागू करें)](#1-tap-update-notification-banner-1-टैप-में-नया-वर्शन-लागू-करें)
    - [Uninterrupted Offline Counter Reliability (बिना नेटवर्क के अटूट काम)](#uninterrupted-offline-counter-reliability-बिना-नेटवर्क-के-अटूट-काम)
   - [Village Starter Free Plan (🌾 गाँव स्टार्टर - आजीवन मुफ़्त)](#village-starter-free-plan-गाँव-स्टार्टर---आजीवन-मुफ़्त)
   - [Gramin Pro Plan (🚀 ग्रामिन प्रो - ₹49/माह)](#gramin-pro-plan-ग्रामिन-प्रो---49माह)
   - [Zero Counter Distraction Policy (काउंटर पर कोई रुकावट नहीं)](#zero-counter-distraction-policy-काउंटर-पर-कोई-रुकावट-नहीं)

---

## 1. Overview & Quick Start

Gramin Kirana is built to run **100% offline** without needing a continuous internet connection. All customer records, bills, and stock data are saved directly on your phone, tablet, or computer. If the internet or electricity cuts off, you can continue billing customers without delay.

### First-Time Welcome & Onboarding Gateway (शुरुआती वेलकम स्क्रीन)
- When opening the application for the first time, you are welcomed by the **Welcome Landing Page**:
  - **प्रमुख खूबियाँ (Core Pillars):** Highlights 100% offline billing, Bluetooth thermal printing, Bahi-Khata WhatsApp reminders, camera barcode scanner, weekly Haat-Bazaar mode, and daily cash closing.
  - **पारदर्शी दरें (Transparent Pricing):** Side-by-side comparison of **गाँव स्टार्टर (₹0 आजीवन मुफ़्त)** vs **ग्रामिन प्रो (₹49/माह)**.
  - **दुकानदार लॉगिन व नई दुकान पंजीकरण:** Enter your registered mobile and 4-digit secret PIN, or register a new village shop in 30 seconds.
  - **🎪 लाइव डेमो (Try Live Demo):** Want to test the system before registering? Tap *"🎪 बिना खाता बनाए लाइव डेमो देखें"* to explore with 36+ preloaded Chhattisgarhi items.
  - **डेमो कोटा व वॉटरमार्क (15-Bill Demo Guardrail):** नए दुकानदारों के परीक्षण के लिए डेमो मोड में 15 बिल तक का ट्रायल कोटा दिया जाता है। इस दौरान पर्चियों पर *"⚠️ नमूना बिल / DEMO"* वाटरमार्क रहता है। अपनी दुकान का मुफ़्त खाता रजिस्टर करते ही आजीवन असीमित बिलिंग और असली दुकान के नाम से पर्चियाँ शुरू हो जाती हैं।

### Language & Offline Indicators
- **Language Toggle (भाषा चुनाव):** Click the language button in the top navigation bar to cycle instantly between **हिन्दी (Hindi)**, **छत्तीसगढ़ी (Chhattisgarhi)**, and **English**. The entire store counter, bills, Udhaar ledger, and categories switch into authentic local terminology.
- **Offline Indicator:** The top bar shows a green badge when internet is active and an amber badge when running offline.

---

## 2. Quick Billing & POS (तुरंत बिलिंग)

### Selecting Items & Categories (Zero-Scroll Category Grid)
- **Zero-Scroll Quick Access:** All 9 product categories (*अनाज, दालें, तेल, मसाले, नाश्ता, साबुन, दूध, ग्रामीण स्पेशल*) are visible at a single glance in a high-density, responsive 3-column (mobile) or 5-column (desktop) button matrix with icons. No horizontal swiping or sideways scrolling is needed.
- **Desktop Shortcut Keys:** On desktop or laptop computers, press **`Alt + 1`** through **`Alt + 9`** to switch between categories in less than half a second.
- Tap any product card to immediately add it to the active bill on the right.

### Loose Weight Pricing (खुला सामान: पाव, आधा किलो)
- For loose items like loose mustard oil, rice, sugar, or flour, tapping the item opens the **Loose Weight Selector**.
- Quick buttons include:
  - **100g (छटांक)**
  - **250g (पाव)**
  - **500g (आधा किलो)**
  - **1 kg (एक किलो)**
  - **2 kg & 5 kg**
- The total price calculates automatically based on your store's per-kg rate.

### Payment Options: Cash, Udhaar, and UPI
1. **Cash (नकद):** Standard cash purchase.
2. **Udhaar (उधार खाता):** Requires choosing a registered customer from the dropdown. The bill total is automatically added to that customer’s running debt balance.
3. **UPI (ऑनलाइन):** For digital payments received via phone scanner.

### Adding Ad-Hoc Items & 0-Stock Alerts (कस्टम सामान व स्टॉक चेतावनी)
- **+ सामान (Quick Ad-Hoc Item):** If a customer requests an unlisted item (e.g., coconut, festival items, or loose gur), tap **"+ सामान"** in the search bar. Enter the name, price, and unit. You can toggle **"दुकान स्टॉक लिस्ट में भी जोड़ें"** to permanently save it to your inventory for future billing.
- **⚠️ 0 स्टॉक चेतावनी (Out-of-Stock Warning):** If an item with 0 recorded inventory is added to the cart, a distinct amber warning badge appears on the item. This alerts you that untracked stock has arrived without blocking the customer checkout.

### Sharing Receipts via WhatsApp
- When a bill is finalized, a receipt appears with the option to click **"व्हाट्सएप पर पर्ची भेजें" (Share Bill via WhatsApp)**.
- This opens WhatsApp with a clean, itemized receipt and shows the customer their previous and new outstanding balance.

---

## 3. Udhaar & Bahi-Khata Ledger (ग्राहक उधार बही-खाता)

### Village Mohalla / Para Grouping
- In villages, multiple customers often share the same name (e.g. 4 "Ramesh Sahu").
- Every customer is tagged with their **Mohalla / Para** (e.g. *Patel Para, School Para, Bazar Mohalla, Talab Paar*). Use the drop-down filter to quickly view only customers from a specific neighborhood.

### Harvest & Scheme Repayment Dates (धान खरीदी / महतारी वंदन)
Instead of arbitrary monthly deadlines, you can tag each customer's expected repayment source:
- 🌾 **Kharif Dhan Kharidi (धान खरीदी):** Aligned with the state paddy procurement season (November–January).
- 🏛️ **Mahtari Vandan / PM-KISAN:** Aligned with monthly or quarterly government scheme transfers.
- 🎪 **Weekly Haat-Bazaar:** Aligned with the local weekly market day.

### Recording Payments Received (जमा) & New Credit (उधार)
- **जमा (+):** Green button to record a partial or full payment. Deducts from the customer's balance.
- **उधार (-):** Red button to add a new credit amount directly to the customer's ledger.

### WhatsApp Payment Receipts & Reminders (जमा रसीद व तगादा)
- **1-टैप जमा रसीद (Instant Repayment Receipt):** Whenever you record a payment (`जमा (+)`) from a customer, a prompt offers to send an immediate WhatsApp receipt directly to the customer confirming the received amount and their newly reduced balance.
- **उधार तगादा (Polite Balance Reminder):** Click the **WhatsApp तगादा** button on any customer card to send a respectful reminder in Hindi detailing their pending balance and agreed repayment festival/scheme date.

### Direct Phone Dialing & Safe Customer Guard (कॉल व खाता सुरक्षा)
- **1-टैप फोन कॉल (Direct Calling):** Tap the green telephone icon directly beside any customer's name on their card to dial their mobile number instantly without manual copy-pasting.
- **बकाया खाता सुरक्षा (Protection Against Accidental Deletion):** If a customer has an active outstanding balance (`₹1` or more), the red delete button is locked. You can only remove a customer card once their balance is completely paid up (`₹0`), guarding your store from accidental loss of credit records.

### Viewing Customer Transaction History
- Click the **इतिहास (History)** icon on any customer card to review all historical purchases and payments.

---

## 4. Mandi Restock Planner (मंडी / शहर खरीदारी लिस्ट)

### Auto-Generated Low Stock List
- As items are sold, any product falling below your safety threshold automatically appears in the Mandi Planner.

### Calculating Cash Needed for Mandi Trip
- The planner calculates the **total wholesale cash budget** needed before traveling 20–30 km to the tehsil or district wholesale mandi.
- You can adjust the quantities or add one-off seasonal festival items manually.

### Sending Purchase Order to Town Wholesaler
- Enter the town wholesaler's mobile number and click **"व्हाट्सएप पर लिस्ट भेजें"**.
- Your complete shopping list is formatted cleanly and sent in advance so the wholesaler can pack the bags before you arrive.

### Wholesaler Directory & Bulk Stock Receiving (थोक व्यापारी व माल आया स्टॉक अपडेट)
- **Wholesaler Contact Memory:** Enter your primary wholesaler's name and mobile number (*e.g., साहू ट्रेडर्स, 98271XXXXX*). The app remembers these details on your device so you do not have to type the wholesaler's phone number repeatedly every week.
- **मंडी से माल आया (One-Tap Restock Checklist):** When you return from town with purchased bags, click **"मंडी से माल आया"**.
  - A clean checklist displays all items ordered from the mandi with their incoming quantities and purchase rates.
  - You can adjust the exact quantities that arrived and update purchase rates if wholesale prices changed.
  - Tap **"पुष्टि करें व स्टॉक में जोड़ें"** to instantly increment your shop's inventory stock in a single batch, eliminating the need to manually edit dozens of items individually.

---

## 5. Spoilage & Expiry Guard (खराबी व एक्सपायरी गार्ड)

### Logging Power-Cut & Heat Losses (दूध/दही/कोल्ड ड्रिंक)
- Unstable electricity and load-shedding can spoil dairy and beverages.
- Click **"+ नुकसान दर्ज करें" (Log Loss)** to record spoiled milk, curd, or broken bottles, specifying the reason (⚡ *बिजली कटौती*, ☀️ *गर्मी*, 🐀 *चूहा/कीड़ा*).
- **ऑटो-स्टॉक कटौती (Automatic Stock Deduction):** When you select an item from your inventory, the system automatically suggests the purchase rate and calculates the loss. With the **"दुकान स्टॉक में से भी घटाएं"** option enabled, the spoiled count is automatically subtracted from your store inventory so your stock counts remain accurate without manual adjustment.
- Keeps an accurate tally of total financial losses.

### Cause-Wise Loss Breakdown (कारण अनुसार नुकसान वर्गीकरण)
- Displays four clear loss breakdown cards:
  - ⚡ **बिजली कटौती (Power Cut):** Cold chain losses (milk, curd, ice-cream, cold drinks).
  - ☀️ **गर्मी व धूप (Heat):** Melted sweets, confectionery, or sun-damaged packaging.
  - 🐀 **चूहा व कीट (Rodent/Pest):** Damaged bags, spillage, and vermin losses.
  - ⏳ **तारीख समाप्त (Expired):** Stock unsold before distributor return deadlines.
- Helps village store owners monitor exact electricity load-shedding costs and store insulation needs.

### Tracking Upcoming Expiry Items
- Shows an alert radar of packaged FMCG items expiring in the next 7 to 30 days so you can discount or return them before distributor deadlines.

---

## 6. Inventory Management (दुकान का पूरा स्टॉक)

### Updating Rates & Profit Margins
- Review purchase rates, selling rates, and real-time profit margin percentages for every item.
- Click the edit pencil to update rates when wholesale prices change.

### Barcode Management & Duplicate Warning (बारकोड व डुप्लीकेट रोक)
- When adding or editing any item in your catalog, you can assign an authentic barcode.
- **डुप्लीकेट चेतावनी (Duplicate Alert):** If the barcode you entered or scanned is already assigned to another product in your store, an immediate amber warning appears identifying the existing product. This prevents overlapping barcodes from corrupting your POS billing.

### Quick Price Revisions (+1, +2, -1) (तुरंत दर बदलाव)
- When commodity wholesale prices fluctuate in the mandi, use the quick **-1**, **+1**, or **+2** adjustment buttons directly on each item card/table row.
- Instantly revises your selling price without needing to open the full edit dialog.

### Adding New Items
- Click **"+ नया सामान जोड़ें"** to add any packaged or loose product with local names in Hindi and English.

---

## 7. Voice Assistant (बोलकर दर्ज करें)

- Click **"बोलकर खोजें" (Mic icon)** in the top bar.
- Speak in Hindi or English, for example:
  - *"सरसों तेल"* (searches product in POS)
  - *"रमेश 200 उधार"* (records ₹200 credit to Ramesh)
  - *"सुरेश 500 जमा"* (records ₹500 payment from Suresh)

### Rural Dialect & Quantity Recognition (गाँव की तौल व बोलचाल)
- The voice assistant recognizes authentic village weights and measures in everyday Hindi/Chhattisgarhi:
  - *"पाव भर जीरा"* or *"एक पाव जीरा"* (automatically searches for 0.25 kg)
  - *"अधिया सरसों तेल"* or *"आधा किलो"* (searches for 0.5 kg/liter)
  - *"तीन पाव"* (searches for 0.75 kg)
  - *"एक पसेरी आलू"* (searches for 5 kg)
  - *"एक बोरी / कट्टा चावल"* (searches for 50 kg)
  - *"दो किलो शक्कर"* or *"5 पैकेट बिस्किट"* (extracts quantity and unit)
- Tap **"यह लागू करें"** to instantly apply the search query in your active billing screen.

---

## 8. Data Backup, Privacy & App Installation (डेटा बैकअप, सुरक्षा व ऐप इंस्टॉलेशन)

### Offline Data Export & Restore
- All financial and customer records are stored securely on your local device.
- **Download Backup:** Click **"पूरा बैकअप डाउनलोड करें"** under Settings to save a backup file to your device, WhatsApp, or Google Drive.
- **Restore Data:** If you switch devices, choose your backup file to instantly restore all ledgers, products, and sales.

### Installing App on Phone or PC (PWA होमस्क्रीन ऐप)
- Gramin Kirana can be installed as a full standalone application on your Android smartphone, iPhone, tablet, or Windows computer without downloading from app stores.
- **How to Install:**
  - When opening the system in your browser, tap **"ऐप इंस्टॉल करें"** in the top bar or inside the **डेटा बैकअप व सेटिंग्स** section.
  - A friendly prompt will ask you to add Gramin Kirana to your Home Screen.
  - Once added, a native green grain icon (*धान/गेहूं की बाली*) appears on your phone screen.
- **Benefits:**
  - Opens in full-screen mode like a native app with zero browser address bar clutter.
  - Starts up instantly and functions **100% offline** even during deep rural network blackouts.

---

## 9. Store Login & Multi-Staff Access (दुकानदार लॉगिन व मुनीम खाता)

Gramin Kirana supports distinct operational roles and multi-store privacy to ensure counter convenience and shop secrecy:

### Registering Your Store & PIN Recovery Helpline
- **स्वागत स्क्रीन (Welcome Landing Screen):** Unauthenticated users first see the Welcome Landing Page with features, pricing, and side-by-side tabs for **"दुकानदार लॉगिन"** and **"+ नई दुकान जोड़ें"**.
- Fill in your store name, owner name, village, district, 10-digit mobile number, and a 4-digit secret PIN.
- **पिन भूल गए? (Forgot PIN Helpline):** If you ever forget your 4-digit PIN, click the **"पिन भूल गए? सहायता पाएं"** link on the login screen. It directly opens a pre-composed WhatsApp message to our support desk with your shop's mobile number for verified, rapid reset assistance.
- **सीधे काउंटर पर प्रवेश (Immediate Counter Access):** As soon as you register or log in, the welcome landing screen closes and your shop's **तुरंत बिलिंग (POS)** counter opens instantly—no distracting ads or extra clicks.
- Once logged in, your shop identity is clearly visible at the top of every screen:
  - **🏪 दुकान का नाम व गाँव:** Displays your store name and village/district location so you always know which shop ledger is active.
  - **👑 पदवी बैज (Role Badge):** Clearly indicates whether you are logged in as **दुकानदार (Owner)** or **मुनीम (Cashier)**.
  - **🎪 नमूना मोड (Demo Mode):** If you are browsing via the *"🎪 लाइव डेमो"* option, a warm amber banner shows sample data with an easy 1-click button to return to the **"🏠 मुख्य पेज / लॉगिन"** screen or register your own shop.

### Roles & Sensitive Data Privacy Guardrails
- **दुकानदार (Store Owner):**
  - Complete control over customer ledgers, rate updates, profit analysis, Mandi procurement orders, stock additions, and staff permissions.
  - Exclusive access to download or restore JSON store backups and reset data.
- **काउंटर मुनीम (Counter Cashier):**
  - Designed for helpers or family members running the counter while you are away.
  - Can quickly bill customers, search items, and record repayment receipts (जमा).
  - **थोक भाव व मुनाफ़ा गोपनीयता (Wholesale Price & Margin Hidden):** In the inventory list, wholesale purchase prices (`खरीद भाव`) and profit percentages (`मुनाफ़ा`) are completely masked so counter staff cannot view your supplier costs or margin secrets.
  - **स्टॉक सुरक्षा (Stock Lock):** Adding new products or modifying item rates is reserved exclusively for the shop owner.
  - **बैकअप सुरक्षा (Backup Lock):** Full shop database downloads, file restores, and data resets are strictly locked to prevent unauthorized data exports.

---

## 10. Automatic Cloud Sync & Multi-Store Isolation (क्लाउड ऑटो-सिंक व सुरक्षा)

### 100% Offline with Live Cloud Sync & 1-Click Backup
- You can continue billing customers even when village electricity or mobile network is down.
- **लाइव सिंक काउंटर व अंतिम समय (Live Status & Timestamp):** The top navigation bar displays a live sync badge showing the time of the last successful backup (e.g., `अंतिम सिंक: 07:45 PM`):
  - `🟢 बैकअप सुरक्षित • सिंक करें`: Indicates all bills and ledger entries are safely backed up in the cloud. You can click anytime to run an on-demand refresh.
  - `🟠 N बाकी • अभी सिंक करें`: Shows the exact number of offline bills or repayments waiting to be uploaded. Tapping this badge immediately initiates background sync as soon as connectivity returns, with a clear spinning indicator.

### Multi-Store Local Switching Isolation Guarantee (सुरक्षित दुकान बदलाव)
- When multiple shopkeepers or branches share a single counter tablet or phone, Gramin Kirana enforces complete privacy isolation.
- **डेटा अलगाव (Safe Store Switching):** When logging out of one shop and logging into another, the previous shop's local counter cache is cleanly detached so that customer lists, credit balances, and sales history never bleed or mix between shops.
- **लॉगआउट सुरक्षा चेतावनी (Pending Sync Warning):** If you attempt to log out while offline transactions are still pending upload, the app warns you to connect to the internet first so that no village bills are left un-synced.

---

## 11. Village Premium Look & Multi-Device Usability (ग्रामीण प्रीमियम लुक व मोबाइल/टैबलेट उपयोग)

Gramin Kirana is crafted with a high-contrast, authentic **Village Premium (ग्रामीण प्रीमियम)** aesthetic, balancing traditional Indian grocery aesthetics with rapid digital counter speed:

### 1. Sunlight-Friendly Counter Contrast (धूप में स्पष्टता)
- Built for village counters under tin roofs, veranda counters, or bright outdoor sunlight.
- Dark, rich charcoal and auspicious teak accents (`#1c1917`), warm brass-gold trims, and deep emerald tags prevent washed-out text on bright phone screens.

### 2. Traditional Bahi-Khata Ledger Ribbons (लाल व हरा खाता रिबन)
- In the **उधार (खाता)** module, customer cards feature authentic ledger margin colors:
  - **लाल रिबन (Red Left Edge):** Indicates active outstanding debt.
  - **हरा रिबन (Green Left Edge):** Indicates all previous dues have been fully cleared.
- Large, thumb-friendly **जमा (+)** and **उधार (-)** buttons allow single-tap updates without mis-typing.

### 3. Mobile Floating Cart & Drawer (स्मार्टफोन पर 1-हाथ से बिलिंग)
- When adding items on a smartphone, you do not need to scroll past dozen items to find the bill.
- A **Floating Cart Summary Bar** (`🛒 X सामान • ₹XXX | बिल देखें ➔`) appears above your phone's bottom menu.
- Tapping it instantly opens the bill drawer to select cash, credit (उधार), or online payment and finalize the sale in seconds.

### 4. Hybrid Views Across Devices (मोबाइल, टैबलेट व कंप्यूटर)
- **Mobile Phones (320px–480px):** Single-column cards, easy thumb reach, sticky quick actions, and zero horizontal scrolling.
- **Tablets & iPad (768px–1024px):** Ergonomic dual-column cards for Mandi restock and customer ledgers.
- **Desktop & Laptops (1280px+):** Full side-by-side split screen—catalog on the left and sticky receipt pad on the right for fast barcode scanner or keyboard billing.

---

## 12. Daily Cash Drawer Closing (दैनिक गल्ला व रोकड़ हिसाब)

Village store owners and counter staff often finish long days without knowing the exact cash balance in the drawer versus sales recorded. The **गल्ला हिसाब (Cash Drawer)** module solves this in under 2 minutes:

### Evening Cash Count (शाम का गल्ला मिलान)
- At the end of the business day, open the **🏦 गल्ला हिसाब** tab from the top navigation (or bottom bar on mobile).
- The app automatically totals:
  - **नकद बिक्री (Cash Sales):** All sales completed with cash payment today.
  - **जमा मिला उधार (Jama Received):** Repayments collected from credit customers today.
- In the large **💵 गल्ले में गिना हुआ नकद** field, enter the actual cash counted in your till/drawer.

### Daily Shop Expenses & Quick Category Chips (दुकान के खर्चे व त्वरित बटन)
- Enter any daily out-of-pocket expenses paid directly from the cash till (e.g., auto/tempo fare for stock delivery, helper wages, tea/snacks for guests, electricity bulb replacement).
- **त्वरित खर्च बटन (Quick Category Chips):** Tap common village expense chips (*सवारी/भाड़ा, मजदूरी/हमाली, चाय/नाश्ता, बिजली/दुकान खर्च, पॉलिथीन/पैकिंग*) to instantly autofill the description without manual typing.
- Tap **+** to add each expense item. The total expenses are automatically subtracted from your expected cash balance.

### Cash Reconciliation & Difference (गल्ला अंतर व मिलान)
- The app calculates:
  $$\text{अपेक्षित नकद} = \text{नकद बिक्री} + \text{जमा उधार} - \text{दैनिक खर्चे}$$
- **गल्ला मिलान (Difference):**
  - **✅ गल्ला बिल्कुल मिला:** Physical cash matches expected cash exactly.
  - **📈 अतिरिक्त नकद (Surplus):** Extra cash in drawer (e.g., untracked receipts).
  - **⚠️ नकद कम है (Deficit):** Cash shortage flagged in red for immediate investigation with counter staff.
- Tap **💾 दिन बंद करें व सुरक्षित करें** to permanently save the day's closing record on your device.

### 1-Click WhatsApp Day Summary (व्हाट्सएप पर दिन सारांश)
- Tap **📲 व्हाट्सएप** to instantly generate a clean, formatted daily report sent directly to the store owner or accountant’s WhatsApp number.
- Includes total sales, collections, itemized expenses, cash counted, and surplus/deficit status.

### Past Cash Drawer Archive & Historical Slips (पिछला गल्ला इतिहास व पुरानी पर्ची)
- **Archive Tab:** At the top of the **गल्ला हिसाब** module, tap the **"पिछला इतिहास (Archive)"** tab.
- Displays a complete historical record of all past daily drawer reconciliations sorted with the most recent first.
- **Card Breakdown:** For each past day, you see:
  - Exact date and evening closing timestamp.
  - Cash sales, Udhaar Jama recoveries, total expenses, and physical cash counted.
  - Color-coded reconciliation badge (Green for matched, Blue for surplus, Red for shortage).
  - Any notes recorded during closing.
- **1-Tap Past Actions:** Every past card has dedicated **📲 WhatsApp** and **🖨️ पर्ची प्रिंट** buttons so you can reprint previous day slips or resend summaries at any time.

---

## 13. Bluetooth Thermal Printing (ब्लूटूथ व 58mm थर्मल प्रिंटर)

Gramin Kirana connects with affordable Bluetooth and USB thermal receipt printers (such as TVS LP45 Neo, Everycom EC-58, NGX BTP-90, and common ₹1,500–₹2,500 portable 58mm printers):

### Connecting Inexpensive Bluetooth Printers
1. Power on your Bluetooth thermal printer and enable Bluetooth on your phone, tablet, or laptop.
2. In the **गल्ला हिसाब** tab, tap **🖨️ ब्लूटूथ प्रिंटर से जोड़ें**.
3. Select your printer name from the nearby device list to pair.
4. Once connected, a green **प्रिंटर जुड़ा ✅** indicator confirms the printer is ready for instant printing.

### Top Bar Quick Connection Indicator (शीर्ष प्रिंटर स्थिति)
- The main top header bar includes a persistent **"प्रिंटर जोड़ें / प्रिंटर कनेक्टेड"** button.
- You can check whether your thermal printer is actively connected or reconnect with 1 tap directly from the billing counter without leaving your current sale.

### Custom Receipt Slogan & Footer (दुकान स्लोगन व आभार संदेश)
- In the **डेटा बैकअप व सेटिंग्स** section under **प्रिंटर व पर्ची सेटिंग्स**, you can customize your receipts:
  - **शीर्ष संदेश (Header):** Add your shop slogan, proprietor name, GST, or mobile number (उदा. *"प्रो. रामप्रसाद साहू | मो. 98260XXXXX | शुद्ध व ताज़ा सामान"*). This appears directly beneath your store name on every printed bill.
  - **निचला संदेश (Footer):** Add your customized thank-you note or return policy (उदा. *"धन्यवाद! फिर पधारें 🙏 बिका माल वापस नहीं होगा"*).

### 1-Click POS Bill Receipt Print
- Immediately upon completing any sale in the **तुरंत बिलिंग (POS)** counter, a **🖨️ पर्ची प्रिंट करें (58mm / BT)** button is displayed.
- Tapping it sends an authentic ESC/POS thermal slip to your paired printer.
- **Printed Receipt Includes:**
  - Store Name & Custom Header Slogan & Date/Time
  - Itemized product names with loose quantities (e.g., 250g, 500g) and rates
  - Grand total and payment mode (Cash, Udhaar, or UPI)
  - For Udhaar sales: Customer name, previous balance, and updated total balance due
  - Auspicious village greeting or custom footer message
- **Non-Bluetooth Fallback:** If no Bluetooth printer is paired, the app automatically opens the standard browser print window formatted for 58mm thermal receipt paper.

### Daily Cash Close Summary Slip
- Print a permanent paper slip of the day's closing figures for physical ledger filing by tapping **🖨️ थर्मल प्रिंटर से पर्ची** in the Cash Drawer tab.

---

## 14. Camera Barcode Scanner (कैमरा बारकोड स्कैनर)

Gramin Kirana turns any standard Android phone, iPhone, or laptop webcam into a rapid point-of-sale laser barcode scanner for packaged products:

### 1-Second Camera Item Scan (कैमरा से तुरंत बिलिंग)
- In the **तुरंत बिलिंग (POS)** screen, tap the **बारकोड (Camera/Scan)** button next to the search bar.
- The rear camera viewfinder opens with a red laser alignment reticle.
- Point the camera at any packaged item's barcode (*e.g., Parle-G, Rin साबुन, Tata नमक, घड़ी पाउडर, मसाले*).
- As soon as the barcode enters the frame, the app emits a crisp cashier beep sound, identifies the item, and **adds it directly to the customer’s bill cart in 1 second**.
- Scan the same package again to automatically increase quantity (`1, 2, 3...`).

### Torch Light & Night Counter Usability (टॉर्च लाइट)
- For dimly lit village counters or evening power cuts, tap the **टॉर्च (Flashlight)** icon inside the camera window to illuminate the package barcode instantly.

### Camera Permission Guide & Quick Retry (कैमरा अनुमति व सुधार)
- If your phone or browser displays a permission blocked message, the app displays a simple 3-step visual instruction box directly inside the window.
- Click the **🔒 लॉक** icon in your browser's address bar, set **Camera** to **Allow**, and tap **"पुनः प्रयास करें (Retry)"** to resume instant scanning without closing your current cart.

### USB Handheld Barcode Reader Compatibility (USB स्कैनर सपोर्ट)
- If you use a physical USB handheld barcode gun or wireless desktop scanner, it works automatically without configuration. Simply plug the scanner into your computer or phone (via OTG adapter) and scan barcodes directly into the bill.

---

## 15. Customer Khata Statement Slip (ग्राहक खाता पर्ची प्रिंट व व्हाट्सएप)

To prevent credit misunderstandings and provide 100% transparency between storekeeper and villager:

### Date-Wise Udhaar & Jama Statement (तारीखवार बही-खाता पर्ची)
- In the **📒 बही-खाता (Khata)** ledger, tap any customer card to open their account history.
- The statement displays every past transaction with exact dates:
  - **उधार (+):** Goods taken on credit with item notes.
  - **जमा (-):** Cash or scheme DBT repayments received.
  - **कुल अंतिम बाकी:** Accurate net outstanding balance due.

### Bluetooth Thermal Statement Slip (58mm पर्ची प्रिंट)
- Tap **🖨️ पर्ची प्रिंट** inside the customer's ledger modal.
- Prints a neat, physical 58mm paper receipt slip on your Bluetooth thermal printer to hand directly to the customer or family member.

### 1-Click Detailed WhatsApp Statement (व्हाट्सएप पर पूरी पर्ची)
- Tap **📲 खाता पर्ची** to generate a formatted date-wise statement and send it directly to the customer’s WhatsApp phone number in seconds.

---

## 16. Weekly Haat-Bazaar High-Speed Mode (साप्ताहिक हाट-बाजार मोड)

Village grocery stores experience intense counter rushes on weekly market days (अठवरिया हाट-बाजार) where dozens of villagers queue up simultaneously for small, cash-and-carry purchases. **हाट-बाजार मोड** transforms the app into an ultra-fast tally pad:

### Top 12 Extra-Large Touch Tiles (मोटी टच बटन)
- Open the **🎪 हाट मोड** tab (or tap the **🎪 हाट मोड** quick-switch badge in the POS screen).
- The screen displays the top 12 high-velocity market items (*गुड़, खुला सरसों तेल, नमक, बीड़ी 502, चीता माचिस, पारले-जी, रिन साबुन, चायपत्ती, दालें*) as oversized, high-contrast touch tiles.
- Tapping any item adds it to the tally with a single touch—no sub-menus, search typing, or weight selectors required.
- **⚙️ 12 बटन बदलें (Customize Tiles):** If you sell different items during different festival markets (e.g. Holi, Diwali, or summer season), click **"12 बटन बदलें"** in the top bar to select any 12 products from your shop inventory.

### Quick Tender & Change Calculator (छुट्टे पैसे हिसाब)
- Quick-tap cash tender buttons (**बराबर, ₹50, ₹100, ₹200, ₹500**) let the cashier instantly check exact change to return to the customer in bold numerals.

### 1-Tap Cash Checkout & Zero-Wait Queue (1-टैप नकद बिल)
- Tapping the giant green **⚡ 1-टैप नकद पूरा** button (or pressing **Enter** on keyboard) completes the sale in under 1.5 seconds.
- Automatically saves the sale, deducts stock, rings a cashier chime, and clears the pad instantly for the next villager waiting in line.

### Live Haat Cash & Session Summary (हाट रोकड़ मीटर व सत्र सारांश)
- The header displays a live ticker showing total Haat cash collected today along with the total count of customers served during the market session.
- **🏁 सत्र सारांश (WhatsApp Report):** At the end of the market rush, tap **"सत्र सारांश"** to generate a clean summary of total cash collected and customers served, ready to share to your family or shop phone via WhatsApp.

---

## 17. Village Subscription Plans & Transparent Pricing (दुकान प्लान व सुविधाएं)

Gramin Kirana is built with 100% pricing transparency and a village-first approach. Store owners never face unexpected subscription lockouts or hidden charges.

### Village Starter Free Plan (🌾 गाँव स्टार्टर - आजीवन मुफ़्त)
- **कीमत:** ₹0 (आजीवन मुफ़्त / Lifetime Free)
- **किराने के लिए उपयुक्त:** गाँव की एकल किराना दुकान के लिए जो बिना किसी मासिक खर्च के डिजिटल बिलिंग व उधारी संभालना चाहते हैं।
- **शामिल सुविधाएं:**
  - 100% ऑफ़लाइन बिलिंग (बिना इंटरनेट या बिजली के कभी काम नहीं रुकता)।
  - असीमित ग्राहक बही-खाता (उधार/जमा) और 1-टैप व्हाट्सएप तकादा।
  - कैमरा बारकोड स्कैनर व खुला वजन कैलकुलेटर (पाव, आधा किलो)।
  - साप्ताहिक हाट-बाज़ार 1-टैप नकद मोड।
  - ब्लूटूथ थर्मल पर्ची प्रिंटर (58mm) और शाम का गल्ला मिलान।

### Gramin Pro Plan (🚀 ग्रामिन प्रो - ₹99/माह)
- **कीमत:** ₹99 प्रति माह (या ₹999 वार्षिक)
- **किराने के लिए उपयुक्त:** बड़े काउंटर और व्यस्त दुकानें जहाँ कई स्टाफ काम करते हैं, माहवारी मुनाफ़ा देखना चाहते हैं और क्लाउड बैकअप की ज़रूरत होती है।
- **अतिरिक्त सुविधाएं:**
  - **📲 WhatsApp तगादा ब्लास्ट:** सभी उधारी ग्राहकों को 1-टैप में हिसाब याद दिलाने की सुविधा।
  - **📊 माहवारी लाभ-हानि रिपोर्ट:** असली मुनाफ़ा, लागत, खराबी और शुद्ध बचत का सुंदर विवरण।
  - **🔔 कम स्टॉक सुबह अलर्ट:** दुकान खुलने पर आवश्यक माल खत्म होने से पहले सूचना।
  - **👥 मुनीम/स्टाफ PIN लॉगिन:** काउंटर स्टाफ के लिए सुरक्षित PIN, जिसमें थोक खरीद भाव और मुनाफ़ा पूरी तरह गुप्त रहता है।
  - **☁️ क्लाउड बैकअप (Cloud Backup):** फ़ोन टूटने, खोने या खराब होने पर भी दुकान का सारा हिसाब-किताब 100% सुरक्षित।
  - **मल्टी-डिवाइस काउंटर:** एक से अधिक फ़ोन या टैबलेट पर एक ही दुकान का हिसाब साझा करने की सुविधा।

### Zero Counter Distraction Policy (काउंटर पर कोई रुकावट नहीं)
- **कोई विज्ञापन या पॉप-अप नहीं:** जब दुकानदार या मुनीम काउंटर पर काम कर रहे हों, तो कभी कोई मार्केटिंग पॉप-अप या रुकावट नहीं आती।
- **प्लान देखना व अपग्रेड करना:**
  - **डेमो मोड में:** ऊपर हेडर में **"सुविधाएं व प्लान"** बटन दबाकर सभी फीचर्स व प्लान देखे जा सकते हैं।
  - **लॉगिन होने पर:** हेडर में लगा छोटा बैज (`🌾 मुफ़्त प्लान` या `👑 प्रो`) या **सेटिंग्स टैब** में जाकर प्लान का विवरण देखा जा सकता है और व्हाट्सएप के ज़रिये अपग्रेड का अनुरोध किया जा सकता है।

---

## 18. Progressive Web App (PWA) & Seamless Updates (ऐप इंस्टॉलेशन व ऑटो-अपडेट)

Gramin Kirana एक आधुनिक प्रोग्रेसिव वेब ऐप (PWA) है जो किसी भारी ऐप स्टोर डाउनलोड के बिना सीधे आपके मोबाइल, टैबलेट या कंप्यूटर पर सामान्य ऐप की तरह इंस्टॉल हो जाती है।

### Installing Gramin Kirana on Mobile & PC (होम स्क्रीन पर ऐप जोड़ें)
- **Android / Chrome:** ब्राउज़र में मेनू (तीन बिंदु) दबाकर **"Add to Home screen"** या **"Install App"** चुनें।
- **iPhone / Safari:** शेयर बटन दबाकर **"Add to Home Screen"** चुनें।
- **Windows PC / Laptop:** ब्राउज़र एड्रेस बार में दिखने वाले **"Install"** आइकन पर क्लिक करें।
- **स्टैंडअलोन अनुभव:** ऐप फुल स्क्रीन में खुलती है, ब्राउज़र का URL बार छिप जाता है, और यह बिल्कुल नेटिव ऐप की तरह तेज़ चलती है।

### 1-Tap Update Notification Banner (1-टैप में नया वर्शन लागू करें)
- जब भी नया सॉफ्टवेयर सुधार या फीचर जारी होता है, ऐप के ऊपर सुनहरे बॉर्डर वाला छोटा बैनर दिखाई देता है:
  > **"✨ नया वर्शन उपलब्ध है! [अभी अपडेट करें]"**
- **"अभी अपडेट करें"** बटन दबाते ही ऐप 1 सेकंड में नए वर्शन के साथ रीफ्रेश हो जाती है।
- **काउंटर डेटा की सुरक्षा:** अपडेट के दौरान चालू बिल या ग्राहकों का कोई भी हिसाब-किताब डिलीट नहीं होता।

### Uninterrupted Offline Counter Reliability (बिना नेटवर्क के अटूट काम)
- एक बार खुलने के बाद, ग्रामीण किराना पूरी तरह सुरक्षित रूप से डिवाइस में संचित हो जाती है।
- बरसात में नेटवर्क उड़ने या गाँव में टावर बंद होने पर भी दुकान की बिलिंग, पर्ची प्रिंट, और खाता प्रबंधन कभी नहीं रुकता।


