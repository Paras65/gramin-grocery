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
   - [Sending WhatsApp Payment Reminders](#sending-whatsapp-payment-reminders)
   - [Viewing Customer Transaction History](#viewing-customer-transaction-history)
4. [Mandi Restock Planner (मंडी / शहर खरीदारी लिस्ट)](#4-mandi-restock-planner-मंडी--शहर-खरीदारी-लिस्ट)
   - [Auto-Generated Low Stock List](#auto-generated-low-stock-list)
   - [Calculating Cash Needed for Mandi Trip](#calculating-cash-needed-for-mandi-trip)
   - [Sending Purchase Order to Town Wholesaler](#sending-purchase-order-to-town-wholesaler)
5. [Spoilage & Expiry Guard (खराबी व एक्सपायरी गार्ड)](#5-spoilage--expiry-guard-खराबी-व-एक्सपायरी-गार्ड)
   - [Logging Power-Cut & Heat Losses (दूध/दही/कोल्ड ड्रिंक)](#logging-power-cut--heat-losses-दूधदहीकोल्ड-ड्रिंक)
   - [Tracking Upcoming Expiry Items](#tracking-upcoming-expiry-items)
6. [Inventory Management (दुकान का पूरा स्टॉक)](#6-inventory-management-दुकान-का-पूरा-स्टॉक)
   - [Updating Rates & Profit Margins](#updating-rates--profit-margins)
   - [Adding New Items](#adding-new-items)
7. [Voice Assistant (बोलकर दर्ज करें)](#7-voice-assistant-बोलकर-दर्ज-करें)
8. [Data Backup & Privacy (डेटा बैकअप व सुरक्षा)](#8-data-backup--privacy-डेटा-बैकअप-व-सुरक्षा)
9. [Store Login & Multi-Staff Access (दुकानदार लॉगिन व मुनीम खाता)](#9-store-login--multi-staff-access-दुकानदार-लॉगिन-व-मुनीम-खाता)
   - [Registering Your Store & Active Shop Banner](#registering-your-store--active-shop-banner)
   - [Roles & Sensitive Data Privacy Guardrails](#roles--sensitive-data-privacy-guardrails)
10. [Automatic Cloud Sync & Multi-Store Isolation (क्लाउड ऑटो-सिंक व सुरक्षा)](#10-automatic-cloud-sync--multi-store-isolation-क्लाउड-ऑटो-सिंक-व-सुरक्षा)
   - [100% Offline with Live Cloud Sync Badge](#100-offline-with-live-cloud-sync-badge)
   - [Multi-Store Local Switching Isolation Guarantee](#multi-store-local-switching-isolation-guarantee-सुरक्षित-दुकान-बदलाव)
11. [Village Premium Look & Multi-Device Usability (ग्रामीण प्रीमियम लुक व मोबाइल/टैबलेट उपयोग)](#11-village-premium-look--multi-device-usability-ग्रामीण-प्रीमियम-लुक-व-मोबाइलटैबलेट-उपयोग)
12. [Daily Cash Drawer Closing (दैनिक गल्ला व रोकड़ हिसाब)](#12-daily-cash-drawer-closing-दैनिक-गल्ला-व-रोकड़-हिसाब)
   - [Evening Cash Count (शाम का गल्ला मिलान)](#evening-cash-count-शाम-का-गल्ला-मिलान)
   - [Daily Shop Expenses (दुकान के दैनिक खर्चे)](#daily-shop-expenses-दुकान-के-दैनिक-खर्चे)
   - [Cash Reconciliation & Difference (गल्ला अंतर व मिलान)](#cash-reconciliation--difference-गल्ला-अंतर-व-मिलान)
   - [1-Click WhatsApp Day Summary (व्हाट्सएप पर दिन सारांश)](#1-click-whatsapp-day-summary-व्हाट्सएप-पर-दिन-सारांश)
13. [Bluetooth Thermal Printing (ब्लूटूथ व 58mm थर्मल प्रिंटर)](#13-bluetooth-thermal-printing-ब्लूटूथ-व-58mm-थर्मल-प्रिंटर)
   - [Connecting Inexpensive Bluetooth Printers](#connecting-inexpensive-bluetooth-printers)
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

### Sending WhatsApp Payment Reminders
- Click the **WhatsApp तगादा** button on any customer card.
- Automatically generates a polite reminder message in Hindi mentioning their exact balance and repayment agreement date.

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

---

## 5. Spoilage & Expiry Guard (खराबी व एक्सपायरी गार्ड)

### Logging Power-Cut & Heat Losses (दूध/दही/कोल्ड ड्रिंक)
- Unstable electricity and load-shedding can spoil dairy and beverages.
- Click **"+ नुकसान दर्ज करें" (Log Loss)** to record spoiled milk, curd, or broken bottles, specifying the reason (⚡ *बिजली कटौती*, ☀️ *गर्मी*, 🐀 *चूहा/कीड़ा*).
- Keeps an accurate tally of total financial losses.

### Tracking Upcoming Expiry Items
- Shows an alert radar of packaged FMCG items expiring in the next 7 to 30 days so you can discount or return them before distributor deadlines.

---

## 6. Inventory Management (दुकान का पूरा स्टॉक)

### Updating Rates & Profit Margins
- Review purchase rates, selling rates, and real-time profit margin percentages for every item.
- Click the edit pencil to update rates when wholesale prices change.

### Adding New Items
- Click **"+ नया सामान जोड़ें"** to add any packaged or loose product with local names in Hindi and English.

---

## 7. Voice Assistant (बोलकर दर्ज करें)

- Click **"बोलकर खोजें" (Mic icon)** in the top bar.
- Speak in Hindi or English, for example:
  - *"सरसों तेल"* (searches product in POS)
  - *"रमेश 200 उधार"* (records ₹200 credit to Ramesh)
  - *"सुरेश 500 जमा"* (records ₹500 payment from Suresh)

---

## 8. Data Backup & Privacy (डेटा बैकअप व सुरक्षा)

- All financial and customer records are stored securely on your local device.
- **Download Backup:** Click **"पूरा बैकअप डाउनलोड करें"** under Settings to save a backup file to your device, WhatsApp, or Google Drive.
- **Restore Data:** If you switch devices, choose your backup file to instantly restore all ledgers, products, and sales.

---

## 9. Store Login & Multi-Staff Access (दुकानदार लॉगिन व मुनीम खाता)

Gramin Kirana supports distinct operational roles and multi-store privacy to ensure counter convenience and shop secrecy:

### Registering Your Store & Welcome Screen Onboarding
- **स्वागत स्क्रीन (Welcome Landing Screen):** Unauthenticated users first see the Welcome Landing Page with features, pricing, and side-by-side tabs for **"दुकानदार लॉगिन"** and **"+ नई दुकान जोड़ें"**.
- Fill in your store name, owner name, village, district, mobile number, and a 4-digit secret PIN.
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

### 100% Offline with Live Cloud Sync Badge
- You can continue billing customers even when village electricity or mobile network is down.
- **लाइव सिंक काउंटर (Live Delta Counter):** The top navigation bar displays a live sync badge:
  - `🟢 सिंक सुरक्षित (Synced)`: Indicates all bills and ledger entries are safely backed up in the cloud.
  - `🟠 N बिल सिंक बाकी (N Pending)`: Shows the exact number of offline bills or repayments waiting to be uploaded. Tapping this badge immediately initiates background sync as soon as connectivity returns.

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

### Daily Shop Expenses (दुकान के दैनिक खर्चे)
- Enter any daily out-of-pocket expenses paid directly from the cash till (e.g., auto/tempo fare for stock delivery, helper wages, tea/snacks for guests, electricity bulb replacement).
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

---

## 13. Bluetooth Thermal Printing (ब्लूटूथ व 58mm थर्मल प्रिंटर)

Gramin Kirana connects with affordable Bluetooth and USB thermal receipt printers (such as TVS LP45 Neo, Everycom EC-58, NGX BTP-90, and common ₹1,500–₹2,500 portable 58mm printers):

### Connecting Inexpensive Bluetooth Printers
1. Power on your Bluetooth thermal printer and enable Bluetooth on your phone, tablet, or laptop.
2. In the **गल्ला हिसाब** tab, tap **🖨️ ब्लूटूथ प्रिंटर से जोड़ें**.
3. Select your printer name from the nearby device list to pair.
4. Once connected, a green **प्रिंटर जुड़ा ✅** indicator confirms the printer is ready for instant printing.

### 1-Click POS Bill Receipt Print
- Immediately upon completing any sale in the **तुरंत बिलिंग (POS)** counter, a **🖨️ पर्ची प्रिंट करें (58mm / BT)** button is displayed.
- Tapping it sends an authentic ESC/POS thermal slip to your paired printer.
- **Printed Receipt Includes:**
  - Store Name & Date/Time
  - Itemized product names with loose quantities (e.g., 250g, 500g) and rates
  - Grand total and payment mode (Cash, Udhaar, or UPI)
  - For Udhaar sales: Customer name, previous balance, and updated total balance due
  - Auspicious village greeting (*"धन्यवाद! फिर आइए 🙏"*)
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

### Quick Tender & Change Calculator (छुट्टे पैसे हिसाब)
- Quick-tap cash tender buttons (**बराबर, ₹50, ₹100, ₹200, ₹500**) let the cashier instantly check exact change to return to the customer in bold numerals.

### 1-Tap Cash Checkout & Zero-Wait Queue (1-टैप नकद बिल)
- Tapping the giant green **⚡ 1-टैप नकद पूरा** button (or pressing **Enter** on keyboard) completes the sale in under 1.5 seconds.
- Automatically saves the sale, deducts stock, rings a cashier chime, and clears the pad instantly for the next villager waiting in line.

### Live Haat Cash & Customer Meter (हाट रोकड़ मीटर)
- The header displays a live ticker showing total Haat cash collected today along with the total count of customers served during the market session.

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

### Gramin Pro Plan (🚀 ग्रामिन प्रो - ₹49/माह)
- **कीमत:** ₹49 प्रति माह (या ₹499 वार्षिक)
- **किराने के लिए उपयुक्त:** बड़े काउंटर और व्यस्त दुकानें जहाँ कई स्टाफ काम करते हैं और क्लाउड बैकअप की ज़रूरत होती है।
- **अतिरिक्त सुविधाएं:**
  - **क्लाउड ऑटो-सिंक (Cloud Backup):** फ़ोन टूटने, खोने या खराब होने पर भी दुकान का सारा हिसाब-किताब 100% सुरक्षित रहता है।
  - **मुनीम/स्टाफ खाता (Cashier Logins):** काउंटर स्टाफ के लिए अलग लॉगिन, जिसमें थोक खरीद भाव और मुनाफ़ा पूरी तरह गुप्त रहता है।
  - **मल्टी-डिवाइस काउंटर:** एक से अधिक फ़ोन या टैबलेट पर एक ही दुकान का हिसाब साझा करने की सुविधा।
  - **24×7 प्राथमिकता सहायता:** फ़ोन व व्हाट्सएप पर तकनीकी सहयोग।

### Zero Counter Distraction Policy (काउंटर पर कोई रुकावट नहीं)
- **कोई विज्ञापन या पॉप-अप नहीं:** जब दुकानदार या मुनीम काउंटर पर काम कर रहे हों, तो कभी कोई मार्केटिंग पॉप-अप या रुकावट नहीं आती।
- **प्लान देखना व अपग्रेड करना:**
  - **डेमो मोड में:** ऊपर हेडर में **"सुविधाएं व प्लान"** बटन दबाकर सभी फीचर्स व प्लान देखे जा सकते हैं।
  - **लॉगिन होने पर:** हेडर में लगा छोटा बैज (`🌾 मुफ़्त प्लान` या `👑 प्रो`) या **सेटिंग्स टैब** में जाकर प्लान का विवरण देखा जा सकता है और व्हाट्सएप के ज़रिये अपग्रेड का अनुरोध किया जा सकता है।


