# Gramin Kirana (ग्रामीण किराना) — User Manual & Operational Guide

Welcome to **Gramin Kirana**, an easy-to-use digital billing, Udhaar (Khata) management, and Mandi procurement system designed for village grocery stores.

---

## 📖 Table of Contents

1. [Overview & Quick Start](#1-overview--quick-start)
2. [Quick Billing & POS (तुरंत बिलिंग)](#2-quick-billing--pos-तुरंत-बिलिंग)
   - [Selecting Items & Categories](#selecting-items--categories)
   - [Loose Weight Pricing (खुला सामान: पाव, आधा किलो)](#loose-weight-pricing-खुला-सामान-पाव-आधा-किलो)
   - [Dynamic Market Rate Adjustments (मंडी व बाज़ार दैनिक दर बदलाव)](#dynamic-market-rate-adjustments-मंडी-व-बाज़ार-दैनिक-दर-बदलाव)
   - [Payment Options: Cash, Udhaar, and UPI](#payment-options-cash-udhaar-and-upi)
   - [Split & Mixed Payment: Part Cash + Part Udhaar (मिश्रित भुगतान: कुछ नकद + कुछ उधार)](#split--mixed-payment-part-cash--part-udhaar-मिश्रित-भुगतान-कुछ-नकद--कुछ-उधार)
   - [Dynamic Offline UPI Payment QR Code (स्वचालित UPI QR कोड)](#dynamic-offline-upi-payment-qr-code-स्वचालित-upi-qr-कोड)
   - [Bill Discount & Round-Off Chips (छूट / बट्टा व सिक्के छोड़ें)](#bill-discount--round-off-chips-छूट--बट्टा-व-सिक्के-छोड़ें)
   - [Sharing Receipts via WhatsApp](#sharing-receipts-via-whatsapp)
3. [Udhaar & Bahi-Khata Ledger (ग्राहक उधार बही-खाता)](#3-udhaar--bahi-khata-ledger-ग्राहक-उधार-बही-खाता)
   - [Village Mohalla / Para Grouping](#village-mohalla--para-grouping)
   - [Customer Deduplication & Mobile Number Validation (ग्राहक नाम व मोबाइल दोहराव सुरक्षा)](#customer-deduplication--mobile-number-validation-ग्राहक-नाम-व-मोबाइल-दोहराव-सुरक्षा)
   - [Customer Credit Limit Guard (ग्राहक उधारी सीमा व सुरक्षा अलर्ट)](#customer-credit-limit-guard-ग्राहक-उधारी-सीमा-व-सुरक्षा-अलर्ट)
   - [Harvest & Scheme Repayment Dates (धान खरीदी / महतारी वंदन)](#harvest--scheme-repayment-dates-धान-खरीदी--महतारी-वंदन)
   - [Recording Payments Received (जमा) & New Credit (उधार)](#recording-payments-received-जमा--new-credit-उधार)
   - [Zero-Balance Debt Settlement Celebration & Clearance Receipt (पूर्ण हिसाब चुकता व पावती पर्ची)](#zero-balance-debt-settlement-celebration--clearance-receipt-पूर्ण-हिसाब-चुकता-व-पावती-पर्ची)
   - [WhatsApp Payment Receipts & Reminders (जमा रसीद व तगादा)](#whatsapp-payment-receipts--reminders-जमा-रसीद-व-तगादा)
   - [Customer Digital Khata Passbook & Direct UPI Payments (ग्राहक डिजिटल पासबुक व तुरंत UPI भुगतान)](#customer-digital-khata-passbook--direct-upi-payments-ग्राहक-डिजिटल-पासबुक-व-तुरंत-upi-भुगतान)
   - [Direct Phone Dialing & Safe Customer Guard (कॉल व खाता सुरक्षा)](#direct-phone-dialing--safe-customer-guard-कॉल-व-खाता-सुरक्षा)
   - [Viewing Customer Transaction History](#viewing-customer-transaction-history)
4. [Mandi Restock Planner (मंडी / शहर खरीदारी लिस्ट)](#4-mandi-restock-planner-मंडी--शहर-खरीदारी-लिस्ट)
   - [Auto-Generated Low Stock List](#auto-generated-low-stock-list)
   - [Calculating Cash Needed for Mandi Trip](#calculating-cash-needed-for-mandi-trip)
   - [Department Category & Search Filtering (श्रेणी व सामान खोज)](#department-category--search-filtering-श्रेणी-व-सामान-खोज)
   - [Sending Purchase Order to Town Wholesaler](#sending-purchase-order-to-town-wholesaler)
   - [Multi-Wholesaler Directory & 1-Tap Switching (थोक व्यापारी डायरी व त्वरित चुनाव)](#multi-wholesaler-directory--1-tap-switching-थोक-व्यापारी-डायरी-व-त्वरित-चुनाव)
   - [Bulk Stock Receiving & Auto-Cataloging (मंडी से माल आया व नया सामान इन्वेंटरी में जोड़ें)](#bulk-stock-receiving--auto-cataloging-मंडी-से-माल-आया-व-नया-सामान-इन्वेंटरी-में-जोड़ें)
   - [Inverted Price & Margin Loss Guard on Stock Intake (थोक खरीद दर व मार्जिन नुकसान सुरक्षा)](#inverted-price--margin-loss-guard-on-stock-intake-थोक-खरीद-दर-व-मार्जिन-नुकसान-सुरक्षा)
   - [Daily Morning Rate Sheet (दुकानदार त्वरित दैनिक मंडी भाव शीट)](#daily-morning-rate-sheet-दुकानदार-त्वरित-दैनिक-मंडी-भाव-शीट)
5. [Spoilage & Expiry Guard (खराबी व एक्सपायरी गार्ड)](#5-spoilage--expiry-guard-खराबी-व-एक्सपायरी-गार्ड)
   - [Logging Power-Cut & Heat Losses (दूध/दही/कोल्ड ड्रिंक)](#logging-power-cut--heat-losses-दूधदहीकोल्ड-ड्रिंक)
   - [Cause-Wise Loss Breakdown & History Filtering (कारण अनुसार वर्गीकरण व फ़िल्टर)](#cause-wise-loss-breakdown--history-filtering-कारण-अनुसार-वर्गीकरण-व-फ़िल्टर)
   - [Tracking Upcoming Expiry Items & Clearance Pricing (एक्सपायरी रडार व रियायती बिक्री)](#tracking-upcoming-expiry-items--clearance-pricing-एक्सपायरी-रडार-व-रियायती-बिक्री)
   - [1-Click WhatsApp Distributor Return Claim (डिस्ट्रीब्यूटर वापसी क्लेम)](#1-click-whatsapp-distributor-return-claim-डिस्ट्रीब्यूटर-वापसी-क्लेम)
   - [Safe Spoilage Deletion & Stock Restoration (गलती से हटाए रिकॉर्ड पर स्टॉक बहाली)](#safe-spoilage-deletion--stock-restoration-गलती-से-हटाए-रिकॉर्ड-पर-स्टॉक-बहाली)
6. [Inventory Management (दुकान का पूरा स्टॉक)](#6-inventory-management-दुकान-का-पूरा-स्टॉक)
   - [Updating Rates, Profit Margins & Loss Alert (दरें, मार्जिन व नुकसान सुरक्षा)](#updating-rates-profit-margins--loss-alert-दरें-मार्जिन-व-नुकसान-सुरक्षा)
   - [Barcode Management & Strict Duplicate Block (बारकोड व डुप्लीकेट रोक)](#barcode-management--strict-duplicate-block-बारकोड-व-डुप्लीकेट-रोक)
   - [Smart Name Match & 1-Click Stock Merge (स्मार्ट नाम मिलान व स्टॉक विलय)](#smart-name-match--1-click-stock-merge-स्मार्ट-नाम-मिलान-व-स्टॉक-विलय)
   - [Catalog Deduplication Audit & 1-Click Merger Tool (स्टॉक ऑडिट व डुप्लीकेट सफाई)](#catalog-deduplication-audit--1-click-merger-tool-स्टॉक-ऑडिट-व-डुप्लीकेट-सफाई)
   - [Quick Price Revisions (+1, +2, -1) (तुरंत दर बदलाव)](#quick-price-revisions-1-2--1-तुरंत-दर-बदलाव)
   - [Adding New Items & Input Sanitization](#adding-new-items--input-sanitization)
7. [Voice Assistant (बोलकर दर्ज करें)](#7-voice-assistant-बोलकर-दर्ज-करें)
   - [Rural Dialect & Quantity Recognition (गाँव की तौल व बोलचाल)](#rural-dialect--quantity-recognition-गाँव-की-तौल-व-बोलचाल)
8. [Data Backup, Privacy & App Installation (डेटा बैकअप, सुरक्षा व ऐप इंस्टॉलेशन)](#8-data-backup-privacy--app-installation-डेटा-बैकअप-सुरक्षा-व-ऐप-इंस्टॉलेशन)
   - [Offline Data Export & Restore](#offline-data-export--restore)
   - [Fiscal Year Archiving & Local Storage Cleanup (वित्तीय वर्ष डेटा आर्काइव व स्थानीय स्टोरेज सफाई)](#fiscal-year-archiving--local-storage-cleanup-वित्तीय-वर्ष-डेटा-आर्काइव-व-स्थानीय-स्टोरेज-सफाई)
   - [Installing App on Phone or PC (PWA होमस्क्रीन ऐप)](#installing-app-on-phone-or-pc-pwa-होमस्क्रीन-ऐप)
9. [Store Login & Multi-Staff Access (दुकानदार लॉगिन व मुनीम खाता)](#9-store-login--multi-staff-access-दुकानदार-लॉगिन-व-मुनीम-खाता)
   - [Registering Your Store & PIN Recovery Helpline (15 सेकंड में सुपर-फास्ट दुकान पंजीकरण)](#registering-your-store--pin-recovery-helpline-15-सेकंड-में-सुपर-फास्ट-दुकान-पंजीकरण)
   - [1-Click Store Onboarding Wizard & 52 Rural Kirana Essentials (दुकान सेटअप विज़ार्ड व 52 किराना सामान)](#1-click-store-onboarding-wizard--52-rural-kirana-essentials-दुकान-सेटअप-विज़ार्ड-व-52-किराना-सामान)
   - [Roles & Sensitive Data Privacy Guardrails](#roles--sensitive-data-privacy-guardrails)
   - [1-Click Logout & Safe Munim Shift Exit (1-क्लिक लॉगआउट व मुनीम सत्र समाप्ति)](#1-click-logout--safe-munim-shift-exit-1-क्लिक-लॉगआउट-व-मुनीम-सत्र-समाप्ति)
10. [Automatic Cloud Sync & Multi-Store Isolation (क्लाउड ऑटो-सिंक व सुरक्षा)](#10-automatic-cloud-sync--multi-store-isolation-क्लाउड-ऑटो-सिंक-व-सुरक्षा)
    - [100% Offline with Live Cloud Sync & 1-Click Backup](#100-offline-with-live-cloud-sync--1-click-backup)
    - [High-Efficiency Delta Sync (कम इंटरनेट डेटा व सुपरफ़ास्ट सिंक)](#high-efficiency-delta-sync-कम-इंटरनेट-डेटा-व-सुपरफ़ास्ट-सिंक)
    - [Multi-Store Local Switching Isolation Guarantee](#multi-store-local-switching-isolation-guarantee-सुरक्षित-दुकान-बदलाव)
11. [Village Premium Look & Multi-Device Usability (ग्रामीण प्रीमियम लुक व मोबाइल/टैबलेट उपयोग)](#11-village-premium-look--multi-device-usability-ग्रामीण-प्रीमियम-लुक-व-मोबाइलटैबलेट-उपयोग)
    - [Sunlight-Friendly Counter Contrast (धूप में स्पष्टता)](#1-sunlight-friendly-counter-contrast-धूप-में-स्पष्टता)
    - [Traditional Bahi-Khata Ledger Ribbons (लाल व हरा खाता रिबन)](#2-traditional-bahi-khata-ledger-ribbons-लाल-व-हरा-खाता-रिबन)
    - [Ultra-Compact Mobile Header & Maximum Screen Space (अल्ट्रा-कॉम्पैक्ट मोबाइल हेडर)](#3-ultra-compact-mobile-header--maximum-screen-space-अल्ट्रा-कॉम्पैक्ट-मोबाइल-हेडर)
    - [5-Button Rural Counter Navigation & More Tools Drawer (5 मुख्य काउंटर बटन व मेनू ड्रॉवर)](#4-5-button-rural-counter-navigation--more-tools-drawer-5-मुख्य-काउंटर-बटन-व-मेनू-ड्रॉवर)
    - [Mobile Floating Cart & Drawer (स्मार्टफोन पर 1-हाथ से बिलिंग)](#5-mobile-floating-cart--drawer-स्मार्टफोन-पर-1-हाथ-से-बिलिंग)
    - [Hybrid Views Across Devices (मोबाइल, टैबलेट व कंप्यूटर)](#6-hybrid-views-across-devices-मोबाइल-टैबलेट-व-कंप्यूटर)
12. [Daily Cash Drawer Closing (दैनिक गल्ला व रोकड़ हिसाब)](#12-daily-cash-drawer-closing-दैनिक-गल्ला-व-रोकड़-हिसाब)
    - [Morning Opening Float (शुरुआती रोकड़ / सुबह का गल्ला)](#morning-opening-float-शुरुआती-रोकड़--सुबह-का-गल्ला)
    - [Evening Cash Count & Denomination Calculator (शाम का गल्ला मिलान व नोट-सिक्के कैलकुलेटर)](#evening-cash-count--denomination-calculator-शाम-का-गल्ला-मिलान-व-नोट-सिक्के-कैलकुलेटर)
    - [UPI & 360° Day Business Overview (डिजिटल बिक्री व कुल दिन का कारोबार)](#upi--360-day-business-overview-डिजिटल-बिक्री-व-कुल-दिन-का-कारोबार)
    - [Daily Shop Expenses & Quick Category Chips (दुकान के खर्चे व त्वरित बटन)](#daily-shop-expenses--quick-category-chips-दुकान-के-खर्चे-व-त्वरित-बटन)
    - [Cash Reconciliation & Reopen Guard (गल्ला अंतर मिलान व पुनः खोलने की सुरक्षा)](#cash-reconciliation--reopen-guard-गल्ला-अंतर-मिलान-व-पुनः-खोलने-की-सुरक्षा)
    - [1-Click WhatsApp Day Summary (व्हाट्सएप पर दिन सारांश)](#1-click-whatsapp-day-summary-व्हाट्सएप-पर-दिन-सारांश)
    - [Past Cash Drawer Archive & Historical Slips (पिछला गल्ला इतिहास व पुरानी पर्ची)](#past-cash-drawer-archive--historical-slips-पिछला-गल्ला-इतिहास-व-पुरानी-पर्ची)
    - [Automated 30-Day Storage Maintenance (स्वचालित 30-दिन बैकग्राउंड सफाई)](#automated-30-day-storage-maintenance-स्वचालित-30-दिन-बैकग्राउंड-सफाई)
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
   - [Top 12 Extra-Large Touch Tiles & Low-Stock Radar (मोटी टच बटन व स्टॉक सूचना)](#top-12-extra-large-touch-tiles--low-stock-radar-मोटी-टच-बटन-व-स्टॉक-सूचना)
   - [Ad-Hoc Produce & Miscellaneous Quick-Add (त्वरित खुला सामान व मौसमी भाजी)](#ad-hoc-produce--miscellaneous-quick-add-त्वरित-खुला-सामान-व-मौसमी-भाजी)
   - [Quick Tender & Change Calculator (छुट्टे पैसे हिसाब)](#quick-tender--change-calculator-छुट्टे-पैसे-हिसाब)
   - [1-Tap Cash & UPI Checkout (1-टैप नकद व UPI बिल)](#1-tap-cash--upi-checkout-1-टैप-नकद-व-upi-बिल)
   - [Live Haat Meter, Mute & Session Summary (हाट रोकड़ मीटर, आवाज़ नियंत्रण व सारांश)](#live-haat-meter-mute--session-summary-हाट-रोकड़-मीटर-आवाज़-नियंत्रण-व-सारांश)
17. [Village Subscription Plans & Transparent Pricing (दुकान प्लान व सुविधाएं)](#17-village-subscription-plans--transparent-pricing-दुकान-प्लान-व-सुविधाएं)
    - [Village Starter Free Plan (🌾 गाँव स्टार्टर - आजीवन मुफ़्त)](#village-starter-free-plan-गाँव-स्टार्टर---आजीवन-मुफ़्त)
    - [Gramin Pro Plan (🚀 ग्रामिन प्रो - ₹99/माह)](#gramin-pro-plan-ग्रामिन-प्रो---99माह)
    - [Zero Counter Distraction Policy (काउंटर पर कोई रुकावट नहीं)](#zero-counter-distraction-policy-काउंटर-पर-कोई-रुकावट-नहीं)
    - [Graceful Downgrade Protection (योजना समाप्ति पर भी अटूट काउंटर सुरक्षा)](#graceful-downgrade-protection-योजना-समाप्ति-पर-भी-अटूट-काउंटर-सुरक्षा)
18. [Progressive Web App (PWA) & Seamless Updates (ऐप इंस्टॉलेशन व ऑटो-अपडेट)](#18-progressive-web-app-pwa--seamless-updates-ऐप-इंस्टॉलेशन-व-ऑटो-अपडेट)
    - [Installing Gramin Kirana on Mobile & PC (होम स्क्रीन पर ऐप जोड़ें)](#installing-gramin-kirana-on-mobile--pc-होम-स्क्रीन-पर-ऐप-जोड़ें)
    - [1-Tap Update Notification Banner (1-टैप में नया वर्शन लागू करें)](#1-tap-update-notification-banner-1-टैप-में-नया-वर्शन-लागू-करें)
    - [Uninterrupted Offline Counter Reliability (बिना नेटवर्क के अटूट काम)](#uninterrupted-offline-counter-reliability-बिना-नेटवर्क-के-अटूट-काम)
19. [Platform Administration & Store Support (सुपर एडमिन व दुकान सहायता)](#19-platform-administration--store-support-सुपर-एडमिन-व-दुकान-सहायता)
    - [Central Village Commerce Command Center (केंद्रीय मंच संचालन डैशबोर्ड)](#central-village-commerce-command-center-केंद्रीय-मंच-संचालन-डैशबोर्ड)
    - [District Distribution & Real-Time Metrics (जिलावार दुकान आंकड़े)](#district-distribution--real-time-metrics-जिलावार-दुकान-आंकड़े)
    - [Direct Merchant Support & 1-Click Plan Activation (दुकानदार सहायता व 1-क्लिक प्रो एक्टिवेशन)](#direct-merchant-support--1-click-plan-activation-दुकानदार-सहायता-व-1-क्लिक-प्रो-एक्टिवेशन)
    - [Store Account Security & Isolation (दुकान डेटा व खाता सुरक्षा)](#store-account-security--isolation-दुकान-डेटा-व-खाता-सुरक्षा)

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

### Dynamic Market Rate Adjustments (मंडी व बाज़ार दैनिक दर बदलाव)
- **बदलते मंडी भाव (Fluctuating Commodity Rates):** किराना दुकान में सब्ज़ी, तेल, चीनी और दालों के थोक व खुदरा भाव रोज़ाना बदलते हैं। दुकानदार को इन्वेंटरी में जाकर रेट बदलने की ज़रूरत नहीं है—काउंटर पर बिलिंग करते समय ही सीधे दर बदली जा सकती है।
- **खुला सामान तौलते समय दर बदलाव (Loose Modal Rate Edit):**
  - जब आप किसी खुले सामान (जैसे: चीनी, तेल, आलू) पर क्लिक करते हैं, तो तौल स्क्रीन पर **"🏷️ आज का भाव"** का संपादन योग्य फ़ील्ड मिलता है।
  - यदि आज बाज़ार में भाव बदल गया है, तो तुरंत नया भाव दर्ज करें। पाव, आधा किलो व किलो की कुल कीमत नए भाव के अनुसार तुरंत बन जाएगी।
  - **आगे के लिए सुरक्षित करें (Save to Catalog):** नीचे दिया गया चेकबॉक्स टिक करने पर यह नया भाव हमेशा के लिए इन्वेंटरी में सुरक्षित हो जाता है, ताकि अगले ग्राहकों के लिए भी नया भाव खुद ब खुद लागू रहे।
- **बिलिंग कार्ट में सीधे दर संपादन (Inline Cart Rate Edit):**
  - कार्ट में दर्ज किसी भी सामान की दर के बगल में लगे **"✏️ भाव बदलें"** लिंक पर टैप करें।
  - नया प्रति-इकाई भाव लिखकर **"लागू करें ✓"** दबाते ही उस आइटम की कुल रकम दोबारा सही से जुड़ जाती है।
  - बिल में *"नया भाव"* का स्पष्ट बैज दिखाई देता है।
  - यह सुविधा मोल-भाव करने वाले ग्राहकों को रियायत देने या आज के मंडी भाव पर तुरंत बिल काटने के लिए अत्यंत उपयोगी है।
- **पर्ची व व्हाट्सएप रसीद पारदर्शिता:** बदले गए भाव के अनुसार ही थर्मल पर्ची और व्हाट्सएप बिल में सही दर (`@₹XX`) और कुल रकम दर्ज होती है।

### Payment Options: Cash, Udhaar, and UPI
1. **Cash (नकद):** Standard cash purchase.
2. **Udhaar (उधार खाता):** Requires choosing a registered customer from the dropdown. The bill total is automatically added to that customer’s running debt balance.
3. **UPI (ऑनलाइन):** For digital payments received via phone scanner.

### Split & Mixed Payment: Part Cash + Part Udhaar (मिश्रित भुगतान: कुछ नकद + कुछ उधार)
- **ग्रामीण काउंटर की आम ज़रूरत:** गाँव में अक्सर ग्राहक ₹500 का सामान खरीदते समय जेब में मौजूद ₹200 नकद दे देते हैं और शेष ₹300 अपने खाते में उधार दर्ज करने को कहते हैं।
- **त्वरित नकद चिप्स (Quick Cash Chips):** बिलिंग कार्ट में उधार चुनते ही **"💵 नकद भुगतान अभी"** का विकल्प खुलता है। इसमें तुरंत चुनने के लिए **[आधा]**, **[₹100]**, **[₹200]**, **[₹500]** के बटन तथा मनचाही रकम लिखने का बॉक्स दिया गया है।
- **सटीक हिसाब व उधारी कटौती:** दुकानदार जितना नकद प्राप्त करता है, सिस्टम केवल बची हुई शेष रकम ही ग्राहक के बही-खाते में जोड़ता है।
- **दैनिक गल्ला व रोकड़ मिलान:** प्राप्त नकद राशि स्वचालित रूप से शाम के दैनिक गल्ला क्लोजिंग (Daily Cash Drawer) में नकद बिक्री के रूप में जुड़ जाती है, जिससे गल्ले में ₹1 का भी अंतर नहीं आता।
- **थर्मल पर्ची व व्हाट्सएप पारदर्शिता:** ग्राहक को दी जाने वाली 58mm ब्लूटूथ पर्ची व व्हाट्सएप बिल में नकद दिया गया रुपया और खाते में चढ़ा उधार दोनों साफ-साफ दर्ज होते हैं।

### Dynamic Offline UPI Payment QR Code (स्वचालित UPI QR कोड)
- **100% Offline QR Generation:** Gramin Kirana generates dynamic payment QR codes directly inside your device without relying on internet servers or third-party image APIs.
- **Shopkeeper UPI Setup:** Go to **सेटिंग्स व बैकअप (Settings)** to enter your store's UPI ID (e.g. PhonePe, Google Pay, Paytm, or BHIM UPI ID). You can also set or change it directly on the POS counter with 1-tap.
- **Exact Bill QR Display:** When selecting **ऑनलाइन (UPI)** during checkout, an instant QR code appears showing the exact net bill amount (e.g. ₹150.00).
- **Customer Convenience:** The customer simply opens any UPI app on their phone (PhonePe, GPay, Paytm, BHIM, Cred) and scans your screen. There is zero risk of the customer typing an incorrect amount or sending money to the wrong account.

### Bill Discount & Round-Off Chips (छूट / बट्टा व सिक्के छोड़ें)
- **Quick Coin Round-Off (सिक्के छोड़ें):** In village stores, loose coins (paise) are often rounded off to the nearest rupee. If a bill contains coins (e.g., ₹148.50), a 1-tap chip appears to round down to whole rupees.
- **Quick Discount Chips (-₹1, -₹2, -₹5):** For familiar neighbors or round figures, quickly deduct ₹1, ₹2, or ₹5 with a single tap.
- **Custom Discount Entry:** Enter any custom discount amount in the ₹ box.
- **Net Bill Integrity:** The bill summary, customer Udhaar ledger balance, and receipt reflect the actual net payable amount after discount.

### Adding Ad-Hoc Items & 0-Stock Alerts (कस्टम सामान व स्टॉक चेतावनी)
- **+ सामान (Quick Ad-Hoc Item):** If a customer requests an unlisted item (e.g., coconut, festival items, or loose gur), tap **"+ सामान"** in the search bar. Enter the name, price, and unit. You can toggle **"दुकान स्टॉक लिस्ट में भी जोड़ें"** to permanently save it to your inventory for future billing.
- **⚠️ 0 स्टॉक चेतावनी (Out-of-Stock Warning):** If an item with 0 recorded inventory is added to the cart, a distinct amber warning badge appears on the item. This alerts you that untracked stock has arrived without blocking the customer checkout.

### Sharing Receipts via WhatsApp
- When a bill is finalized, a receipt appears with the option to click **"व्हाट्सएप पर पर्ची भेजें" (Share Bill via WhatsApp)**.
- This opens WhatsApp with a clean, itemized receipt showing the gross bill, any discounts given, the net paid amount, and the customer's previous and new outstanding balance.

---

## 3. Udhaar & Bahi-Khata Ledger (ग्राहक उधार बही-खाता)

### Village Mohalla / Para Grouping
- In villages, multiple customers often share the same name (e.g. 4 "Ramesh Sahu").
- Every customer is tagged with their **Mohalla / Para** (e.g. *Patel Para, School Para, Bazar Mohalla, Talab Paar*). Use the drop-down filter to quickly view only customers from a specific neighborhood.

### Customer Deduplication & Mobile Number Validation (ग्राहक नाम व मोबाइल दोहराव सुरक्षा)
- **10-अंकों का मोबाइल सत्यापन:** नया ग्राहक जोड़ते समय गैर-अंकीय अक्षर अपने आप साफ़ हो जाते हैं और केवल 10 अंकों का मान्य भारतीय मोबाइल नंबर ही स्वीकार किया जाता है।
- **डुप्लीकेट मोबाइल नंबर पर तत्काल रोक:** यदि दर्ज किया गया मोबाइल नंबर पहले से किसी अन्य ग्राहक के खाते में मौजूद है, तो सिस्टम तुरंत लाल चेतावनी दिखाकर नया खाता बनाने से रोक देता है। इससे एक ही व्यक्ति के दो अलग-अलग खाते बनने का जोखिम शून्य हो जाता है।
- **एक ही पारा में समान नाम चेतावनी:** यदि एक ही मोहल्ले/पारे में उसी नाम का ग्राहक पहले से मौजूद है, तो सिस्टम अंबर रंग का चेतावनी अलर्ट प्रदर्शित करता है और पहचान हेतु पिता का नाम या उपनाम जोड़ने का सुझाव देता है।

### Customer Credit Limit Guard (ग्राहक उधारी सीमा व सुरक्षा अलर्ट)
- **Setting an Udhaar Limit:** When adding a new customer in the Khata Ledger, you can set a safe maximum credit limit (defaults to ₹2,000, or any custom amount like ₹5,000 or ₹10,000).
- **1-Tap Limit Revisions:** On existing customer ledger accounts, tap the limit badge (✏️ बदलें) at any time to revise the approved credit ceiling.
- **Visual Alert Badges:** If a customer's outstanding balance exceeds their approved limit, their card displays a prominent red **"सीमा पार!" (Limit Exceeded)** badge.
- **POS Checkout Protection:** In the POS billing screen, when Udhaar is chosen, the system calculates the projected balance in real time. If the new bill pushes the customer past their approved limit, an instant warning banner appears in the cart, and the system prompts for explicit confirmation before finalizing the credit sale.

### Harvest & Scheme Repayment Dates (धान खरीदी / महतारी वंदन)
Instead of arbitrary monthly deadlines, you can tag each customer's expected repayment source:
- 🌾 **Kharif Dhan Kharidi (धान खरीदी):** Aligned with the state paddy procurement season (November–January).
- 🏛️ **Mahtari Vandan / PM-KISAN:** Aligned with monthly or quarterly government scheme transfers.
- 🎪 **Weekly Haat-Bazaar:** Aligned with the local weekly market day.

### Recording Payments Received (जमा) & New Credit (उधार)
- **जमा (+):** Green button to record a partial or full payment. Deducts from the customer's balance.
- **उधार (-):** Red button to add a new credit amount directly to the customer's ledger.

### Zero-Balance Debt Settlement Celebration & Clearance Receipt (पूर्ण हिसाब चुकता व पावती पर्ची)
- **शुभ कर्ज़-मुक्ति उत्सव (Debt-Free Celebration):** जब कोई ग्रामीण ग्राहक अपना पूरा पिछला उधार चुका देता है और उसका कुल बकाया ₹0 हो जाता है, तो स्क्रीन पर उत्सव सूचक बधाई संवाद (Celebration Modal) खुलता है।
- **1-क्लिक व्हाट्सएप चुकता पावती (Clearance Receipt):** संवाद में दिए गए बटन पर टैप करते ही ग्राहक के व्हाट्सएप पर एक पावती संदेश भेजा जाता है। इसमें दुकानदार की ओर से समय पर पूरा भुगतान करने हेतु आभार, ₹0 शेष बकाया की आधिकारिक पुष्टि, तथा अद्यतन डिजिटल पासबुक का लिंक शामिल रहता है।

### WhatsApp Payment Receipts & Reminders (जमा रसीद व तगादा)
- **1-टैप जमा रसीद (Instant Repayment Receipt):** Whenever you record a payment (`जमा (+)`) from a customer, a prompt offers to send an immediate WhatsApp receipt directly to the customer confirming the received amount and their newly reduced balance.
- **उधार तगादा (Polite Balance Reminder):** Click the **WhatsApp तगादा** button on any customer card to send a respectful reminder in Hindi detailing their pending balance and agreed repayment festival/scheme date.

### Customer Digital Khata Passbook & Direct UPI Payments (ग्राहक डिजिटल पासबुक व तुरंत UPI भुगतान)
- **पारदर्शी डिजिटल पासबुक (Transparent Passbook):** बही-खाता स्क्रीन में प्रत्येक ग्राहक कार्ड पर **"📖 डिजिटल पासबुक"** बटन दिया गया है। इस पर टैप करते ही ग्राहक का पूरा खाता एक आधुनिक डिजिटल बैंक पासबुक की तरह खुल जाता है।
- **तिथि-वार लेन-देन व चालू शेष (Running Balance Ledger):** पासबुक में हर तारीख का उधार (+ लाल रंग में) और जमा चुकाया गया रुपया (- हरे रंग में), खरीदे गए सामान का संक्षिप्त विवरण, तथा प्रत्येक लेन-देन के बाद बचा हुआ शुद्ध चालू शेष (Running Balance) बिल्कुल साफ दिखता है।
- **सीधे दुकान खाते में UPI भुगतान QR कोड (Direct UPI Settlement):** यदि ग्राहक पर बकाया बाकी है, तो पासबुक विंडो में सीधे दुकानदार के बैंक खाते का सुरक्षित QR कोड प्रदर्शित होता है। ग्राहक अपने मोबाइल से PhonePe, Google Pay, Paytm या BHIM द्वारा स्कैन करके तुरंत अपने बकाये का पूरा या आंशिक भुगतान कर सकता है।
- **1-क्लिक व्हाट्सएप पासबुक लिंक (WhatsApp Passbook Link):** दुकानदार जब भी ग्राहक को तगादा या जमा रसीद भेजता है, तो व्हाट्सएप संदेश में ग्राहक की अपनी पासबुक का सीधा वेब लिंक स्वतः शामिल रहता है। गाँव के ग्राहक अपने स्मार्टफोन पर वह लिंक खोलकर अपना पूरा हिसाब-किताब कभी भी घर बैठे देख सकते हैं।
- **58mm पर्ची प्रिंटिंग व शेयरिंग:** पासबुक विंडो से दुकानदार या ग्राहक सीधे 1-टैप में पूरा खाता विवरण 58mm ब्लूटूथ थर्मल प्रिंटर पर प्रिंट कर सकते हैं या पासबुक का लिंक कॉपी कर सकते हैं।

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

### Department Category & Search Filtering (श्रेणी व सामान खोज)
- **आइसल-वार वर्गीकरण:** मंडी लिस्ट में सामानों की संख्या अधिक होने पर आप श्रेणी चिप्स (*अनाज, दालें, तेल/घी, मसाले, नाश्ता, साबुन, डेयरी, अन्य जोड़े*) दबाकर संबंधित विभाग के सामानों को अलग देख सकते हैं।
- **त्वरित खोज:** सर्च बार में किसी भी सामान का नाम लिखकर उसकी मात्रा व थोक दर तुरंत जांची जा सकती है।

### Multi-Wholesaler Directory & 1-Tap Switching (थोक व्यापारी डायरी व त्वरित चुनाव)
- **कमोडिटी अनुसार अलग-अलग व्यापारी:** गाँव के दुकानदार गल्ला मंडी से अनाज, तेल डिपो से खाद्य तेल, और शहर की एजेंसी से साबुन/बिस्कुट अलग-अलग व्यापारियों से खरीदते हैं।
- **डिजिटल व्यापारी डायरी (Wholesaler Directory):** शीर्ष बार में **"डायरी ✏️"** बटन दबाकर आप अपने सभी थोक व्यापारियों के नाम, 10-अंकों का मोबाइल नंबर, मंडी का पता (उदा. *तहसील मंडी, गंज बाज़ार*) और श्रेणी सुरक्षित रख सकते हैं।
- **1-टैप चुनाव व कॉल:** ड्रॉपडाउन से किसी भी व्यापारी को चुनते ही उनका नाम, नंबर और मंडी स्थान स्वतः सक्रिय हो जाता है।

### Sending Purchase Order to Town Wholesaler
- चुनिंदा व्यापारी के लिए **"व्हाट्सएप पर लिस्ट भेजें"** दबाते ही दुकान के नाम, गाँव के पते, तारीख और व्यापारी के नाम के साथ एक सुव्यवस्थित आर्डर लिस्ट तैयार हो जाती है।
- इसे व्यापारी को पहले से भेज देने पर वे आपके पहुँचने से पहले बोरियाँ व कार्टन पैक करके तैयार रखते हैं।

### Bulk Stock Receiving & Auto-Cataloging (मंडी से माल आया व नया सामान इन्वेंटरी में जोड़ें)
- **1-क्लिक बल्क स्टॉक अपडेट:** जब आप मंडी से खरीदारी करके दुकान लौटें, तो **"मंडी से माल आया"** बटन दबाएं।
- **आई हुई मात्रा व दर मिलान:** चेकलिस्ट में आई हुई मात्रा और बिल अनुसार थोक भाव की जांच करें।
- **✨ नए सामान का स्वतः इन्वेंटरी में जुड़ाव:** यदि आपने मंडी लिस्ट में कोई अनलिस्टेड सामान (उदा. देसी गुड़ या त्यौहार का नया सामान) जोड़ा था, तो चेकलिस्ट में वह *✨ नया सामान* बैज के साथ दिखता है। पुष्टि करते ही वह सीधे दुकान की मुख्य इन्वेंटरी में 15% सुरक्षित मुनाफ़ा मार्जिन के साथ जुड़ जाता है, जिससे दोबारा अलग से डेटा एंट्री नहीं करनी पड़ती।
- **"पुष्टि करें व स्टॉक में जोड़ें"** दबाते ही सभी चयनित सामानों का स्टॉक एक साथ बढ़ जाता है।

### Inverted Price & Margin Loss Guard on Stock Intake (थोक खरीद दर व मार्जिन नुकसान सुरक्षा)
- **मंडी में थोक भाव बढ़ने पर सुरक्षा:** यदि मंडी में किसी सामान का थोक भाव बढ़कर दुकान की वर्तमान बिक्री दर के बराबर या उससे अधिक हो गया है (उदा. थोक खरीद ₹155 हो गई और दुकान में बिक्री दर ₹150 है), तो चेकलिस्ट में तुरंत लाल चेतावनी दिखाई देती है:
  *⚠️ खरीद दर (₹155) दुकान की बिक्री दर (₹150) से अधिक/बराबर है! घाटा होगा।*
- **तुरंत नई बिक्री दर सेट करें:** पंक्ति में ही **"नई बिक्री दर ₹"** का बॉक्स मिलता है, जहाँ दुकानदार तुरंत सही खुदरा भाव (उदा. ₹170) दर्ज कर सकता है। स्टॉक जुड़ते ही काउंटर पर नया भाव स्वतः लागू हो जाता है।

### Daily Morning Rate Sheet (दुकानदार त्वरित दैनिक मंडी भाव शीट)
- **रोज़ सुबह 30-सेकंड में भाव बदलाव:** तेल, चीनी, गुड़, आलू, प्याज और दालों जैसे मुख्य राशन के खुदरा भाव रोज़ाना बदलते हैं। हर सामान को अलग-अलग एडिट करने के बजाय, **"🌅 दैनिक भाव शीट"** बटन दबाकर सभी मुख्य वस्तुओं की सूची एक साथ खुल जाती है।
- **त्वरित चिप्स (+1, +2, +5, -1, -2, -5):** किसी वस्तु का भाव ₹2 बढ़ाना या घटाना हो, तो बिना टाइप किए सीधे `+2` या `-2` बटन दबाते ही नया भाव सेट हो जाता है।
- **लागत व मुनाफ़ा सुरक्षा गार्ड (Margin Guard):** दुकान मालिक को थोक खरीद दर और मुनाफ़ा मार्जिन दिखता है। यदि कोई नया भाव थोक खरीद से कम हो जाता है, तो तुरंत लाल चेतावनी (`⚠️ लागत से कम`) दिखाई देती है ताकि नुकसान से बचा जा सके।
- **1-क्लिक में पूरी दुकान में लागू (Apply All Rates):** नीचे लगे **"💾 सभी नए भाव लागू करें"** बटन पर टैप करते ही पूरे काउंटर (POS), बारकोड बिलिंग और खुला वजन कैलकुलेटर में नए भाव तुरंत सक्रिय हो जाते हैं।
- **📲 व्हाट्सएप पर आज का रेट बोर्ड भेजें (WhatsApp Rate Broadcast):** शीट में दिए गए **"📲 आज का रेट बोर्ड भेजें"** बटन पर क्लिक करते ही दुकान के नाम और आज के ताज़ा भावों के साथ एक सुंदर व्हाट्सएप संदेश तैयार हो जाता है, जिसे दुकानदार गाँव के व्हाट्सएप ग्रुप या स्टेटस पर 1-टैप में साझा कर सकता है।

---

## 5. Spoilage & Expiry Guard (खराबी व एक्सपायरी गार्ड)

### Logging Power-Cut & Heat Losses (दूध/दही/कोल्ड ड्रिंक)
- **गाँव की बिजली कटौती व गर्मी से नुकसान:** गाँव में अनियमित बिजली कटौती या अत्यधिक गर्मी के कारण दूध, दही, पनीर, मक्खन, आइसक्रीम और कोल्ड ड्रिंक्स खराब होने का जोखिम बना रहता है।
- **त्वरित नुकसान प्रविष्टि (+ नुकसान दर्ज करें):** खराब हुए सामान की मात्रा, इकाई और थोक खरीद दर दर्ज करके तुरंत नुकसान का रिकॉर्ड बनाएं। 
- **स्वचालित स्टॉक कटौती (Automatic Stock Deduction):** इन्वेंट्री से सामान चुनते ही सिस्टम उसकी थोक खरीद दर स्वतः सुझाता है और कुल नुकसान की गणना करता है। यदि **"दुकान स्टॉक में से भी घटाएं"** विकल्प चुना जाता है, तो खराब हुआ माल दुकान के मुख्य स्टॉक में से अपने-आप घट जाता है ताकि इन्वेंट्री हमेशा 100% सटीक रहे।

### Cause-Wise Loss Breakdown & History Filtering (कारण अनुसार वर्गीकरण व फ़िल्टर)
- **4 मुख्य ग्रामीण कारण कार्ड:**
  - ⚡ **बिजली कटौती (Power Cut):** डीप फ्रीजर बंद होने से दूध, दही, लस्सी व कोल्ड ड्रिंक का नुकसान।
  - ☀️ **गर्मी व धूप (Heat):** धूप या तेज गर्मी से पिघली चॉकलेट, बिस्कुट, तेल व कन्फेक्शनरी।
  - 🐀 **चूहा व कीट (Rodents/Pests):** बोरियों में चूहे का काटना, अनाज की बर्बादी व पैकेट फटना।
  - ⏳ **तारीख समाप्त (Expired):** समय पर न बिक पाने के कारण एक्सपायर हुआ पैकेटबंद सामान।
- **इतिहास फ़िल्टरिंग चिप्स (History Filter Chips):** नुकसान इतिहास सूची के ऊपर दिए गए त्वरित फ़िल्टर चिप्स (`सभी`, `⚡ बिजली कटौती`, `☀️ गर्मी व धूप`, `🐀 चूहे व कीट`, `⏳ तारीख समाप्त`) से दुकानदार किसी एक विशेष कारण से हुए नुकसान का अलग से हिसाब देख सकता है।

### Tracking Upcoming Expiry Items & Clearance Pricing (एक्सपायरी रडार व रियायती बिक्री)
- **एक्सपायरी रडार (Expiry Radar):** अगले 7 से 30 दिनों में एक्सपायर होने वाले पैकेटबंद सामानों (जैसे ब्रेड, बिस्कुट, नमकीन, मसाले) की सूची सीधे अलर्ट कार्ड्स में दिखाई देती है।
- **🏷️ रियायती दर (Clearance Sale Shortcut):** जो सामान जल्दी एक्सपायर होने वाला है, उसे फेंकने या नुकसान में डालने के बजाय दुकानदार कार्ड पर ही दिए गए **"🏷️ रियायती दर"** बटन को दबाकर तुरंत बिक्री दर घटा सकता है (उदा. ₹50 वाले पैकेट को ₹40 कर देना)। यह नया भाव सीधे काउंटर बिलिंग में सक्रिय हो जाता है ताकि सामान समय रहते बिक जाए।
- **⚡ खराबी दर्ज (Quick Spoilage Log):** यदि कोई सामान पूरी तरह खराब हो चुका है, तो कार्ड से ही 1-क्लिक में खराबी दर्ज करने वाला फॉर्म खुल जाता है जिसमें सामान का नाम, मात्रा व थोक भाव पहले से भरे रहते हैं।

### 1-Click WhatsApp Distributor Return Claim (डिस्ट्रीब्यूटर वापसी क्लेम)
- **शहर के डिस्ट्रीब्यूटर को एक्सपायरी माल की वापसी:** किराना स्टोर में एक्सपायर या एक्सपायरी के नजदीक माल की वापसी (Credit Note / Replacement) के लिए डिस्ट्रीब्यूटर को लिखित लिस्ट देनी होती है।
- **📲 डिस्ट्रीब्यूटर वापसी क्लेम भेजें (WhatsApp Claim):** एक्सपायरी रडार के ऊपर दिए गए बटन पर टैप करते ही सिस्टम सभी एक्सपायर व एक्सपायरी के नजदीक सामानों की सुव्यवस्थित, क्रमबद्ध सूची तैयार करता है।
- **विस्तृत विवरण के साथ संदेश:** इस व्हाट्सएप संदेश में दुकान का नाम, गाँव का पता, प्रत्येक सामान का नाम, बैच/मात्रा, एक्सपायरी तारीख और थोक खरीद मूल्य स्पष्ट लिखा होता है ताकि शहर की एजेंसी बिना किसी विवाद के क्रेडिट नोट या रिप्लेसमेंट जारी कर सके।

### Safe Spoilage Deletion & Stock Restoration (गलती से हटाए रिकॉर्ड पर स्टॉक बहाली)
- **गलती से रिकॉर्ड डिलीट होने पर सुरक्षा:** यदि दुकानदार या मुनीम से कोई पुराना खराबी रिकॉर्ड गलती से डिलीट हो जाता है, तो सिस्टम पुष्टि मांगता है।
- **स्टॉक स्वतः वापस जोड़ना (Stock Restoration):** यदि उस खराबी रिकॉर्ड को दर्ज करते समय दुकान की इन्वेंट्री में से माल घटाया गया था, तो रिकॉर्ड हटाते ही सिस्टम घटी हुई मात्रा को वापस इन्वेंट्री स्टॉक में जोड़ देता है। इससे दुकान के स्टॉक में कोई अंतर (Inventory Leakage) नहीं आता।

---

## 6. Inventory Management (दुकान का पूरा स्टॉक)

### Updating Rates, Profit Margins & Loss Alert (दरें, मार्जिन व नुकसान सुरक्षा)
- Review purchase rates, selling rates, and real-time profit margin percentages for every item.
- Click the edit pencil to update rates when wholesale prices change.
- **लागत से कम भाव पर नुकसान चेतावनी (Loss Guard):** यदि नया सामान जोड़ते समय या एडिट करते समय खुदरा बिक्री दर थोक खरीद से कम डाली जाए, तो सिस्टम तुरंत लाल चेतावनी प्रदर्शित करता है (उदा. *"⚠️ नुकसान चेतावनी: बिक्री दर थोक खरीद से कम है"*), जिससे दुकानदार अनजाने में होने वाले घाटे से सुरक्षित रहता है।

### Barcode Management & Strict Duplicate Block (बारकोड व डुप्लीकेट रोक)
- When adding or editing any item in your catalog, you can assign an authentic barcode via manual entry or handheld/camera scanner.
- **सख्त डुप्लीकेट बारकोड रोक (Strict Duplicate Prevention):** यदि दर्ज किया गया बारकोड पहले से दुकान के किसी अन्य सामान में असाइन है, तो सिस्टम नया सामान सेव होने से रोकता है और चेतावनी देता है। इससे काउंटर पर बारकोड स्कैनर में गलत सामान स्कैन होने या बिलिंग में गड़बड़ी होने का खतरा पूरी तरह समाप्त हो जाता है।

### Smart Name Match & 1-Click Stock Merge (स्मार्ट नाम मिलान व स्टॉक विलय)
- **मिलता-जुलता सामान तुरंत पहचानना:** नया सामान जोड़ते समय जैसे ही दुकानदार नाम (उदा. "सूजी" या "Suji") टाइप करता है, सिस्टम तुरंत जांचता है कि क्या यह सामान पहले से स्टॉक में है।
- **1-क्लिक में मौजूदा स्टॉक में जोड़ें (Merge on Add):** यदि सामान पहले से मौजूद है, तो सिस्टम एक त्वरित बटन दिखाता है: **"मौजूदा सामान में +[N] स्टॉक जोड़ें (बिना डुप्लीकेट बनाए)"**। इस पर टैप करते ही नया डुप्लीकेट सामान बनने के बजाय मौजूदा सामान का स्टॉक स्वतः बढ़ जाता है और सूची पूरी तरह व्यवस्थित रहती है।

### Catalog Deduplication Audit & 1-Click Merger Tool (स्टॉक ऑडिट व डुप्लीकेट सफाई)
- **स्वचालित डुप्लीकेट पहचान:** यदि पूर्व में दर्ज सामानों में से किसी दो सामानों का बारकोड एक जैसा हो, या एक ही नाम व इकाई (जैसे दो बार "अरवा चावल (kg)") के अलग-अलग रिकॉर्ड बने हों, तो इन्वेंट्री स्क्रीन के शीर्ष पर एक स्पष्ट ऑडिट बैनर दिखाई देता है।
- **1-क्लिक में सभी डुप्लीकेट मिलाएं (1-Click Consolidator):** **"सभी डुप्लीकेट मिलाएं"** बटन दबाते ही सिस्टम सभी डुप्लीकेट रिकॉर्ड्स का स्टॉक आपस में जोड़ देता है, सबसे बेहतर भाव सुरक्षित रखता है, और अतिरिक्त फालतू रिकॉर्ड्स को हटाकर दुकान का स्टॉक 100% सटीक व साफ़ कर देता है।

### Quick Price Revisions (+1, +2, -1) (तुरंत दर बदलाव)
- When commodity wholesale prices fluctuate in the mandi, use the quick **-1**, **+1**, or **+2** adjustment buttons directly on each item card/table row.
- Instantly revises your selling price without needing to open the full edit dialog.

### Adding New Items & Input Sanitization
- Click **"+ नया सामान जोड़ें"** to add any packaged or loose product with local names in Hindi and English.
- सभी इनपुट फ़ील्ड्स में नकारात्मक संख्याएं (`< 0`) और अनावश्यक खाली स्पेस (Whitespace) स्वतः साफ़ कर दिए जाते हैं।

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

### Fiscal Year Archiving & Local Storage Cleanup (वित्तीय वर्ष डेटा आर्काइव व स्थानीय स्टोरेज सफाई)
- **तेज़ काउंटर स्पीड बनाए रखें (Maintain Superfast Billing):** As your village store records thousands of bills over months, storing years of past sales in the main active billing screen can slow down older phones or budget tablets.
- **180-Day Rolling Storage Window (180 दिन से पुराने बिल आर्काइव करें):** Under the **सेटिंग्स व बैकअप (Settings)** tab, store owners can view a live counter of **सक्रिय बिल**, **आर्काइव बिल**, **आर्काइव खाता लेन-देन**, and estimated phone storage.
  - Tapping **"📦 180 दिन से पुराने बिल आर्काइव करें"** safely moves past sales older than 6 months into offline cold storage.
  - Active billing and daily cash summaries remain lightning fast, while older sales are kept 100% safe and accessible on your device.
- **Settled Khata Archiving (निपट चुके पुराने खाते आर्काइव करें):**
  - Tapping **"📒 निपट चुके पुराने खाते आर्काइव करें"** finds customers who have completely paid off their loans (`₹0 बकाया`) and archives their older historical payment lines (>180 days) into cold storage.
  - **पूर्ण वित्तीय सुरक्षा (Active Debt Safety):** Active debtor balances are **never modified or touched**, guaranteeing absolute ledger accuracy.
- **Download Cold Archives (आर्काइव डेटा डाउनलोड करें):** Store owners can download separate JSON backup files for both past sales archives and settled Khata archives to preserve for long-term tax or village records.

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

### Registering Your Store & PIN Recovery Helpline (15 सेकंड में सुपर-फास्ट दुकान पंजीकरण)
- **स्वागत स्क्रीन (Welcome Landing Screen):** Unauthenticated users first see the Welcome Landing Page with features, pricing, and side-by-side tabs for **"दुकानदार लॉगिन"** and **"+ नई दुकान जोड़ें"** (also accessible anytime via the **स्टोर लॉगिन / स्विच** modal).
- **15 सेकंड में सुपर-फास्ट 4-फील्ड ऑनबोर्डिंग:** ग्रामीण दुकानदारों की सुविधा के लिए पंजीकरण को बेहद आसान बनाया गया है—केवल 4 आवश्यक विवरण दर्ज करने होते हैं:
  1. **📱 10-अंकों का मोबाइल नंबर:** दुकान का प्राथमिक संपर्क नंबर।
  2. **📮 6-अंकों का डाक पिनकोड (Dynamic Pincode Auto-Fill):**
     - जैसे ही दुकानदार 6 अंकों का पिनकोड (उदा. `493441`) दर्ज करते हैं, सिस्टम स्वतः डाक विभाग निर्देशिका से ज़िला व ब्लॉक पहचान लेता है।
     - पिनकोड के अंतर्गत आने वाले सभी प्रमुख गाँवों के नाम **1-टैप बटन (Village Chips)** के रूप में तुरंत दिख जाते हैं (उदा. `[आरंग] [लखोली] [भानसोज] [गुल्लू] [रसनी]...`)।
     - दुकानदार केवल 1 टैप से अपना गाँव चुन सकते हैं। यदि गाँव का नाम सूची में न हो तो नीचे आसानी से टाइप भी कर सकते हैं।
  3. **🏪 दुकान का नाम:** जैसे *"जय माँ बम्लेश्वरी किराना स्टोर"*। दुकानदार का नाम दुकान के नाम से स्वतः सेट हो जाता है, जिससे अलग से टाइप करने की ज़रूरत नहीं पड़ती।
  4. **🔒 4-अंकों का गुप्त पिन (Secret PIN):** रोज़ाना दुकान खोलने और काउंटर पर सुरक्षित लॉगिन के लिए 4 अंकों का गुप्त पिन।
- **वैकल्पिक विवरण विस्तार (Optional Advanced Customization):** यदि कोई दुकानदार अपनी दुकान के नाम से अलग व्यक्तिगत नाम, ब्लॉक या ज़िला मैन्युअल रूप से बदलना चाहें, तो वे *"▼ दुकानदार का नाम या ब्लॉक बदलें (वैकल्पिक)"* पर क्लिक करके आसानी से कस्टमाइज़ कर सकते हैं।
- **ऑफ़लाइन व कमजोर नेटवर्क सुरक्षा:** ग्रामीण क्षेत्रों में धीमे या अनुपलब्ध इंटरनेट के दौरान भी पिनकोड डायरेक्टरी तुरंत काम करती है, जिससे दुकान पंजीकरण कभी नहीं रुकता।
- **पिन भूल गए? (Forgot PIN Helpline):** If you ever forget your 4-digit PIN, click the **"पिन भूल गए? सहायता पाएं"** link on the login screen. It directly opens a pre-composed WhatsApp message to our support desk with your shop's mobile number for verified, rapid reset assistance.
- **सीधे काउंटर पर प्रवेश (Immediate Counter Access):** As soon as you register or log in, the welcome landing screen closes and your shop's **तुरंत बिलिंग (POS)** counter opens instantly—no distracting ads or extra clicks.
- Once logged in, your shop identity is clearly visible at the top of every screen:
  - **🏪 दुकान का नाम व गाँव:** Displays your store name and village/district location so you always know which shop ledger is active.
  - **👑 पदवी बैज (Role Badge):** Clearly indicates whether you are logged in as **दुकानदार (Owner)** or **मुनीम (Cashier)**.
  - **🎪 नमूना मोड (Demo Mode):** If you are browsing via the *"🎪 लाइव डेमो"* option, a warm amber banner shows sample data with an easy 1-click button to return to the **"🏠 मुख्य पेज / लॉगिन"** screen or register your own shop.

### 1-Click Store Onboarding Wizard & 52 Rural Kirana Essentials (दुकान सेटअप विज़ार्ड व 52 किराना सामान)
- **30 सेकंड में दुकान की शुरुआत:** नई दुकान पंजीकृत करते समय या खाली दुकान शुरू करते समय, दुकानदार को एक-एक सामान हाथ से टाइप करने की आवश्यकता नहीं होती। 1-क्लिक ऑनबोर्डिंग विज़ार्ड तुरंत खुलकर दुकान तैयार कर देता है।
- **चरण 1: दुकान व UPI विवरण:**
  - दुकानदार अपनी दुकान का नाम और गाँव का नाम सत्यापित करते हैं।
  - दुकान का UPI ID (GooglePay, PhonePe, Paytm या BHIM) दर्ज किया जाता है, जिससे काउंटर बिलिंग और ग्राहक पासबुक में डायनामिक QR कोड से सीधे बैंक खाते में भुगतान आ सके।
- **चरण 2: 52 आवश्यक ग्रामीण सामान लोड करें (1-Tap Catalog Populator):**
  - **"🌾 52 आवश्यक किराना सामानों के साथ दुकान लोड करें"** बटन दबाते ही छत्तीसगढ़ व ग्रामीण भारत के 52 सबसे लोकप्रिय सामान असली थोक व खुदरा भावों, यूनिट और बारकोड के साथ दुकान स्टॉक में स्वतः जुड़ जाते हैं।
  - **शामिल वस्तुएं:** 
    - *अनाज व आटा:* अरवा चावल, गेहूं आटा (चक्की), चना बेसन, सूजी, मैदा, पोहा, साबूदाना
    - *दालें:* तुअर (रहर), चना दाल, उड़द, मूंग दाल (धुली), लाल मसूर, काला चना, सफेद काबुली छोले, सोयाबीन बड़ी
    - *तेल व घी:* सरसों तेल (खुला व पाउच), सोयाबीन तेल (पाउच), देसी घी
    - *मसाले व शक्कर:* शक्कर, देसी गुड़ भेली, टाटा नमक, खुला नमक, हल्दी, लाल मिर्च, धनिया पाउडर, गरम मसाला, जीरा, राई, मेथी दाना, अजवाइन, हींग
    - *साबुन व डिटर्जेंट:* घड़ी डिटर्जेंट पाउडर, व्हील साबुन, रिन, विम बर्तन बार, सर्फ एक्सेल, लाइफबॉय, क्लिनिक प्लस पाउच, कोलगेट पेस्ट
    - *ग्रामीण दैनिक वस्तुएं:* पारले-जी, टाइगर, मैगी, बीड़ी (502 छाप), चीता माचिस, अगरबत्ती, मच्छर कॉइल, सूखा नारियल गोला, दर्द की गोली (सैरिडॉन)
- **चरण 3: तुरंत काउंटर बिलिंग शुरू:** सामान लोड होते ही दुकानदार सीधे तुरंत बिलिंग (POS) काउंटर पर पहुँचकर ग्राहकों का बिल बनाना शुरू कर सकते हैं।

### Roles & Sensitive Data Privacy Guardrails
- **दुकानदार (Store Owner):**
  - Complete control over customer ledgers, rate updates, profit analysis, Mandi procurement orders, stock additions, and staff permissions.
  - Exclusive access to download or restore JSON store backups and reset data.
- **काउंटर मुनीम (Counter Cashier):**
  - Designed for helpers or family members running the counter while you are away.
  - Can quickly bill customers, search items, and record repayment receipts (जमा).
  - **थोक भाव व मुनाफ़ा गोपनीयता (Wholesale Price & Margin Hidden):** In the inventory list, wholesale purchase prices (`खरीद भाव`) and profit percentages (`मुनाफ़ा`) are completely masked so counter staff cannot view your supplier costs or margin secrets.
  - **स्टॉक व मंडी सुरक्षा (Stock & Mandi Lock):** Adding new products, modifying item rates, and accessing Mandi procurement budgeting are reserved exclusively for the shop owner.
  - **वित्तीय रिपोर्ट व बैकअप सुरक्षा (Financial Report & Backup Lock):** Monthly profit/loss reports, evening cash till reconciliations, full shop database downloads, and data resets are strictly locked to prevent unauthorized access.

### 1-Click Logout & Safe Munim Shift Exit (1-क्लिक लॉगआउट व मुनीम सत्र समाप्ति)
- **शीर्ष हेडर में सीधा लॉगआउट (Direct Header Logout):** हेडर की स्टेटस पट्टी में बैकअप सिंक बटन के ठीक बगल में लाल रंग का **"लॉगआउट"** बटन दिया गया है ताकि दुकानदार किसी भी समय एक टैप में सुरक्षित रूप से बाहर निकल सकें।
- **मुनीम शिफ्ट समाप्ति (Exit Munim Shift):** जब मुनीम काउंटर पर काम कर रहे हों, तो हेडर में **"मुनीम बंद"** का त्वरित बटन दिखाई देता है। इस पर टैप करते ही मुनीम सत्र समाप्त हो जाता है और मुख्य दुकानदार तुरंत काउंटर का पूर्ण नियंत्रण वापस ले सकते हैं।
- **डेटा सुरक्षा चेतावनी (Unsynced Records Warning):** यदि कोई ऑफ़लाइन बिल अभी क्लाउड पर सुरक्षित नहीं हुए हैं, तो लॉगआउट दबाने पर सिस्टम पहले चेतावनी देता है ताकि दुकान का कोई भी हिसाब न छूटे।
- **सेटिंग्स टैब में लॉगआउट कार्ड:** **सेटिंग्स व बैकअप** टैब के अंत में भी दुकान की जानकारी के साथ एक समर्पित लॉगआउट विकल्प उपलब्ध है।

---

## 10. Automatic Cloud Sync & Multi-Store Isolation (क्लाउड ऑटो-सिंक व सुरक्षा)

### 100% Offline with Live Cloud Sync & 1-Click Backup
- You can continue billing customers even when village electricity or mobile network is down.
- **लाइव सिंक काउंटर व अंतिम समय (Live Status & Timestamp):** The top navigation bar displays a live sync badge showing the time of the last successful backup (e.g., `अंतिम सिंक: 07:45 PM`):
  - `🟢 बैकअप सुरक्षित • सिंक करें`: Indicates all bills and ledger entries are safely backed up in the cloud. You can click anytime to run an on-demand refresh.
  - `🟠 N बाकी • अभी सिंक करें`: Shows the exact number of offline bills or repayments waiting to be uploaded. Tapping this badge immediately initiates background sync as soon as connectivity returns, with a clear spinning indicator.

### High-Efficiency Delta Sync (कम इंटरनेट डेटा व सुपरफ़ास्ट सिंक)
- **बचत करें मोबाइल डेटा (Saves Village Mobile Data):** In rural areas with slow 2G/3G speeds or expensive mobile recharge packs, Gramin Kirana uses an intelligent incremental sync mechanism.
- **केवल नए व बदले हुए बिल अपलोड (Only New & Changed Records):**
  - Instead of re-uploading your entire store history every time connectivity returns, the app only transmits newly generated sales, customer balance adjustments, or stock updates since the last sync.
  - This reduces network data consumption by over 95%, allowing instant background sync in less than 2 seconds even with weak cellular signal.

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

### 3. Ultra-Compact Mobile Header & Maximum Screen Space (अल्ट्रा-कॉम्पैक्ट मोबाइल हेडर)
- Built specifically for village store counters using budget smartphones with limited screen height.
- **Single-Line Top Header (सिंगल-लाइन हेडर):** The top bar is streamlined into a single slim line (~46px) containing only essential indicators:
  - Store Name & live online/offline status dot.
  - Quick **Voice Search (🎙️)** button for instant spoken product lookup.
  - 1-Tap **Language Switcher (🌐)** toggle between Hindi, Chhattisgarhi, and English.
  - Store Status pill that opens the **Store Details & Quick Actions Sheet (दुकान एक्शन शीट)** to access Bluetooth printer pairing, cloud sync, app installation, and secure logout without wasting screen space.
- Over **140px of vertical screen space** is saved, giving shopkeepers maximum room for viewing product catalogs, loose weight calculations, and bill totals.

### 4. 5-Button Rural Counter Navigation & More Tools Drawer (5 मुख्य काउंटर बटन व मेनू ड्रॉवर)
- On smartphones, the bottom bar is focused on high-speed daily counter operations with 5 primary buttons:
  1. **⚡ POS (बिलिंग):** Standard barcode and loose grocery counter checkout.
  2. **🎪 हाट (हाट-बाज़ार):** 1-tap rapid cash checkout for weekly market rush.
  3. **📒 खाता (उधार):** Customer credit ledgers, Jama entries, and WhatsApp payment reminders.
  4. **🏦 गल्ला (रोकड़):** Evening cash drawer reconciliation and daily expense entry.
  5. **☰ मेनू (अतिरिक्त टूल्स):** Quick drawer for secondary store management features.
- **More Tools Drawer (अतिरिक्त टूल्स ड्रॉवर):** Tapping **"☰ मेनू"** slides up a clean sheet with 1-tap access to:
  - **🛒 मंडी खरीदारी (Mandi Restock):** Market purchase sheets and wholesale stock additions.
  - **⚠️ खराबी व वेस्टेज (Spoilage):** Logging spoiled fruits, vegetables, or expired packaged goods.
  - **📦 गोदाम व स्टॉक (Inventory):** Full inventory master, prices, low-stock alerts, and loose pack sizing.
  - **📊 लाभ-हानि रिपोर्ट (P&L):** Net profit, sales analytics, and business health.
  - **⚙️ दुकान सेटिंग्स (Settings):** Shop profile, receipt headers, UPI QR codes, and Munim staff PINs.

### 5. Mobile Floating Cart & Drawer (स्मार्टफोन पर 1-हाथ से बिलिंग)
- When adding items on a smartphone, you do not need to scroll past dozen items to find the bill.
- A **Floating Cart Summary Bar** (`🛒 X सामान • ₹XXX | बिल देखें ➔`) appears above your phone's bottom menu.
- Tapping it instantly opens the bill drawer to select cash, credit (उधार), or online payment and finalize the sale in seconds.

### 6. Hybrid Views Across Devices (मोबाइल, टैबलेट व कंप्यूटर)
- **Mobile Phones (320px–480px):** Single-column cards, ultra-compact single-row header, 5-tab thumb-friendly bottom bar, and zero horizontal scrolling.
- **Tablets & iPad (768px–1024px):** Ergonomic dual-column cards for Mandi restock and customer ledgers with top tabs navigation.
- **Desktop & Laptops (1280px+):** Full side-by-side split screen—catalog on the left and sticky receipt pad on the right for fast barcode scanner or keyboard billing.

---

## 12. Daily Cash Drawer Closing (दैनिक गल्ला व रोकड़ हिसाब)

गाँव के किराना स्टोर मालिक और काउंटर मुनीम दिनभर की भागदौड़ के बाद शाम को गल्ले में वास्तविक रोकड़, दिनभर की बिक्री और खर्चों का हिसाब 2 मिनट में बिना किसी कागजी माथापच्ची के मिला सकते हैं:

### Morning Opening Float (शुरुआती रोकड़ / सुबह का गल्ला)
- **सुबह का खुल्ला पैसा:** दुकान खोलते समय गल्ले में ग्राहकों को छुट्टे पैसे लौटाने के लिए जो रकम (उदा. ₹500 या ₹1,000) रखी जाती है, उसे **"🌅 शुरुआती रोकड़ / सुबह का गल्ला (Float)"** बॉक्स में दर्ज करें।
- **सटीक हिसाब:** शाम के मिलान में यह शुरुआती रकम स्वतः जुड़ जाती है, जिससे दुकानदार को अलग से घटाने की जरूरत नहीं पड़ती।

### Evening Cash Count & Denomination Calculator (शाम का गल्ला मिलान व नोट-सिक्के कैलकुलेटर)
- **सीधे कुल रकम या नोट गिनें:** शाम को गल्ले का नकद दर्ज करने के लिए सीधे राशि टाइप कर सकते हैं, या **"🧮 नोट व सिक्के गिनें"** बटन दबा सकते हैं।
- **भारतीय मुद्रा कैलकुलेटर:** इस कैलकुलेटर में ₹500, ₹200, ₹100, ₹50, ₹20, ₹10 के नोटों की संख्या और सिक्कों की कुल रकम डालते ही सिस्टम स्वतः कुल जोड़ निकाल देता है। **"कुल राशि गल्ले में भरें"** पर टैप करते ही यह रकम सीधे गल्ला मिलान बॉक्स में आ जाती है।

### UPI & 360° Day Business Overview (डिजिटल बिक्री व कुल दिन का कारोबार)
- **4 मुख्य दैनिक कार्ड:**
  - 🟢 **नकद बिक्री (Cash Sales):** आज काउंटर पर नकद में बिका सामान।
  - 📥 **जमा वसूली (Jama Collected):** उधारी ग्राहकों द्वारा बही-खाते में जमा की गई पुरानी रकम।
  - 📲 **UPI / ऑनलाइन बिक्री:** आज क्यूआर कोड या ऑनलाइन माध्यम से सीधे बैंक खाते में आई रकम।
  - 📊 **कुल दिन का कारोबार:** दिनभर का संपूर्ण व्यापार (नकद + UPI + नई उधारी का योग)।
- इससे दुकानदार को नकद और बैंक खाते की आवक का एक नज़र में पूरा नक्शा मिल जाता है।

### Daily Shop Expenses & Quick Category Chips (दुकान के खर्चे व त्वरित बटन)
- **दुकान के दैनिक खर्चे दर्ज करना:** दिनभर में गल्ले से किए गए छोटे-बड़े खर्चे (जैसे माल ढुलाई का ऑटो भाड़ा, हमाली, मेहमानों की चाय, दुकान का बल्ब या पॉलिथीन)।
- **त्वरित खर्च बटन:** बिना टाइप किए सीधे *सवारी/भाड़ा, मजदूरी/हमाली, चाय/नाश्ता, दुकान खर्च/बिजली, पॉलिथीन/पैकिंग* बटन दबाकर खर्च का नाम भरें, राशि लिखें और `+` दबाएं। कुल खर्च अपेक्षित नकद से अपने-आप घट जाता है।

### Cash Reconciliation & Reopen Guard (गल्ला अंतर मिलान व पुनः खोलने की सुरक्षा)
- **स्वचालित मिलान सूत्र:**
  $$\text{अपेक्षित नकद} = \text{शुरुआती रोकड़} + \text{नकद बिक्री} + \text{जमा वसूली} - \text{दैनिक खर्चे}$$
- **गल्ला मिलान संकेत (Difference):**
  - **✅ गल्ला बिल्कुल मिला:** गल्ले का वास्तविक नकद और बही-खाता हिसाब 100% बराबर है।
  - **📈 अतिरिक्त नकद (Surplus):** गल्ले में अधिक पैसे होने पर नीले रंग में बढ़त दिखती है।
  - **⚠️ नकद कम है (Deficit):** गल्ले में पैसे कम होने पर लाल रंग में चेतावनी दिखती है ताकि मुनीम या स्टाफ से तुरंत जांच की जा सके।
- **गल्ला पुनः खोलना व संशोधन (Reopen Guard):** यदि शाम को गल्ला बंद करने के बाद कोई देर रात ग्राहक आ जाए या कोई खर्च लिखना छूट गया हो, तो दुकानदार **"🔓 गल्ला पुनः खोलें / संशोधित करें"** बटन दबाकर आज के हिसाब को फिर से खोल सकता है और नया सुधार करके दोबारा सुरक्षित कर सकता है।

### 1-Click WhatsApp Day Summary (व्हाट्सएप पर दिन सारांश)
- **📲 व्हाट्सएप:** 1-क्लिक में दुकान के नाम, गाँव के पते, सुबह के गल्ले, नकद बिक्री, जमा वसूली, UPI आवक, खर्चों और मिलान स्थिति के साथ एक सुंदर संदेश तैयार हो जाता है जिसे दुकान मालिक या मुनीम को भेजा जा सकता है।

### Past Cash Drawer Archive & Historical Slips (पिछला गल्ला इतिहास व पुरानी पर्ची)
- **पिछला इतिहास (Archive) टैब:** पिछले महीनों के किसी भी दिन का गल्ला हिसाब तारीखवार देखें।
- प्रत्येक पिछले कार्ड में नकद बिक्री, शुरुआती रोकड़, UPI आवक, खर्चे, मिलान स्थिति और उस दिन का नोट सुरक्षित रहता है।
- कार्ड से ही कभी भी **📲 WhatsApp** पर दोबारा भेज सकते हैं या **🖨️ पर्ची प्रिंट** निकाल सकते हैं।

### Automated 30-Day Storage Maintenance (स्वचालित 30-दिन बैकग्राउंड सफाई)
- **शून्य रखरखाव:** दिन का गल्ला बंद करते समय सिस्टम बैकग्राउंड में स्वतः जांचता है कि क्या 30 दिन बीत चुके हैं। यदि आवश्यक हो, तो 180 दिन से पुराने बिलों को शांत रूप से डिवाइस के कोल्ड स्टोरेज में सुरक्षित कर देता है ताकि फोन कभी हैंग या धीमा न हो।

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

### Top 12 Extra-Large Touch Tiles & Low-Stock Radar (मोटी टच बटन व स्टॉक सूचना)
- Open the **🎪 हाट मोड** tab (or tap the **🎪 हाट मोड** quick-switch badge in the POS screen).
- The screen displays the top 12 high-velocity market items (*गुड़, खुला सरसों तेल, नमक, बीड़ी 502, चीता माचिस, पारले-जी, रिन साबुन, चायपत्ती, दालें*) as oversized, high-contrast touch tiles.
- Tapping any item adds it to the tally with a single touch—no sub-menus, search typing, or weight selectors required.
- **⚠️ काउंटर लो-स्टॉक रडार (Counter Stock Radar):** Every item tile actively monitors remaining shelf quantities. If an item runs out or falls dangerously low during the market surge, an alert badge appears directly on the tile (`⚠️ खत्म (0)` or `⚠️ N बचा`), signaling the store assistant to immediately bring more sacks or cartons from the store room.
- **⚙️ 12 बटन बदलें (Customize Tiles):** If you sell different items during different festival markets (e.g. Holi, Diwali, or summer season), click **"12 बटन बदलें"** in the top bar to select any 12 products from your shop inventory.

### Ad-Hoc Produce & Miscellaneous Quick-Add (त्वरित खुला सामान व मौसमी भाजी)
- On weekly bazaar days, farmers and local vendors frequently buy or bring seasonal loose items, fresh farm produce, firewood, or miscellaneous greens that are not pre-cataloged in the shop inventory.
- **त्वरित मूल्य बटन (Quick Amount Buttons):** Tap preset fast buttons (**+₹10, +₹20, +₹30, +₹50, +₹100**) to add produce directly to the customer's cart in under a second.
- **कस्टम राशि जोड़ें (Custom ₹ Input):** Type any specific amount (e.g. ₹75) into the quick box and tap **+ जोड़ें** to include it immediately without halting the queue or creating a new product listing.

### Quick Tender & Change Calculator (छुट्टे पैसे हिसाब)
- Quick-tap cash tender buttons (**बराबर, ₹50, ₹100, ₹200, ₹500**) let the cashier instantly check exact change to return to the customer in bold numerals.

### 1-Tap Cash & UPI Checkout (1-टैप नकद व UPI बिल)
- **1-टैप भुगतान विकल्प (Cash vs UPI):** Toggle between **💵 नकद (Cash)** and **📱 UPI / QR** with a single tap. During fast counter rushes, villagers paying through QR code can be processed instantly without switching screens.
- **बिजली जैसी बिलिंग (Instant Checkout):** Tapping the giant green **⚡ 1-टैप नकद पूरा** (or **⚡ 1-टैप UPI पूरा**) button (or pressing **Enter** on keyboard) completes the sale in under 1.5 seconds.
- Automatically saves the sale record, deducts stock, plays a pleasant cashier audio chime, prints receipt with your shop name & slogan, and clears the tally pad immediately for the next villager in line.

### Live Haat Meter, Mute & Session Summary (हाट रोकड़ मीटर, आवाज़ नियंत्रण व सारांश)
- **लाइव रोकड़ व UPI मीटर:** The top header displays a live ticker showing total Haat Cash (नकद), total UPI received, and total customer footfall served during the day's market rush.
- **🔊 / 🔇 आवाज़ चालू/बंद (Audio Mute Toggle):** In noisy bazaar environments or during sensitive store hours, toggle the audio icon to mute or unmute checkout chime sounds.
- **🏁 सत्र सारांश (WhatsApp Report):** At the end of the market rush, tap **"सत्र सारांश"** to generate a clean breakdown of Cash, UPI, and total sales, ready to share to your family or shop phone via WhatsApp.

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

### Graceful Downgrade Protection (योजना समाप्ति पर भी अटूट काउंटर सुरक्षा)
- **दुकान की बिक्री कभी बंद नहीं होती:** यदि किसी दुकानदार का प्रो प्लान समाप्त हो जाता है, तो दुकान का काम या ऑफ़लाइन बिलिंग कभी लॉक नहीं होती।
- **मुफ़्त मोड में निर्बाध चालू:** आपका काउंटर तुरंत मुफ़्त (Free) प्लान में सुरक्षित रूप से चलता रहता है—दैनिक नकद बिक्री, उधारी खाता, बारकोड स्कैनिंग, पर्ची प्रिंटिंग और सभी स्थानीय डेटा 100% सुरक्षित और सक्रिय रहते हैं।
- **शालीन सूचना (Gentle Reminder Banner):** हेडर में एक सहज सूचना दिखाई देती है जिससे दुकानदार चाहें तो सीधे व्हाट्सएप के माध्यम से प्रो प्लान का नवीनीकरण कर सकते हैं।

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

---

## 19. Platform Administration & Store Support (सुपर एडमिन व दुकान सहायता)

ग्रामिन किराना प्लेटफ़ॉर्म ऑपरेटरों, ग्रामीण संयोजकों और तकनीकी सहायता टीम के लिए एक केंद्रीय नियंत्रण केंद्र (Command Center) प्रदान करता है, जिससे पूरे राज्य के किराना स्टोरों की सुचारू सेवा और त्वरित सहायता सुनिश्चित की जाती है।

### Central Village Commerce Command Center (केंद्रीय मंच संचालन डैशबोर्ड)
- **प्रवेश का माध्यम (गोपनीय व सुरक्षित प्रवेश):**
  - आम दुकानदारों व ग्राहकों के लिए यह लिंक सामान्य स्क्रीन पर पूरी तरह छिपा रहता है।
  - व्यवस्थापक अपने ब्राउज़र URL में `?admin=1` अथवा `#admin` लगाकर सीधे एडमिन पोर्टल खोल सकते हैं, अथवा कीबोर्ड पर `Ctrl + Shift + A` दबा सकते हैं।
  - अधिकृत मास्टर एडमिन सुरक्षा पासवर्ड दर्ज करके तुरंत कमांड सेंटर में प्रवेश किया जा सकता है।
- **मुख्य प्रदर्शन संकेतक (Platform KPI Metrics):**
  - **कुल पंजीकृत दुकानें (Total Stores):** प्लेटफ़ॉर्म पर सक्रिय और मुफ़्त/प्रो दुकानों की कुल संख्या।
  - **गाँव स्टार्टर बनाम ग्रामिन प्रो विभाजन:** मुफ़्त और सशुल्क योजना वाले स्टोरों का अनुपात।
  - **सकल व्यापार मात्रा (Platform GMV ₹):** ग्रामीण किराना द्वारा संसाधित कुल सफल बिक्री का योग।
  - **सक्रिय गाँव उधारी (Village Udhaar Debt ₹):** सभी गाँवों में कुल मिलाकर बही-खाते में दर्ज बाक़ी राशि का योग, जिससे ग्रामीण ऋण स्वास्थ्य का सटीक अनुमान मिलता है।
  - **दर्ज उत्पाद व ग्राहक:** कुल सक्रिय इन्वेंट्री आइटम और पंजीकृत ग्राहक आधार।

### District Distribution & Real-Time Metrics (जिलावार दुकान आंकड़े)
- **छत्तीसगढ़ जिलावार फ़िल्टर (District Chips):**
  - रायपुर, दुर्ग, बिलासपुर, बस्तर, सरगुजा, राजनांदगांव, जांजगीर-चांपा, कवर्धा, धमतरी आदि जिलों के लिए त्वरित फ़िल्टर चिप्स उपलब्ध हैं।
  - किसी भी जिले के चिप पर टैप करते ही संबंधित जिले में कार्यरत सभी किराना दुकानों की सूची और आंकड़े सामने आ जाते हैं।
- **त्वरित योजना फ़िल्टर (Plan Filters):**
  - सभी दुकानें (ALL), केवल प्रो स्टोर (PRO), अथवा केवल मुफ़्त स्टोर (FREE) को एक क्लिक में अलग-अलग देखा जा सकता है।

### Direct Merchant Support & 1-Click Plan Activation (दुकानदार सहायता व 1-क्लिक प्रो एक्टिवेशन)
- **1-क्लिक फ़ोन कॉलिंग (📞 डायल करें):**
  - किसी भी दुकानदार को किसी भी समस्या या पूछताछ में सहायता देने के लिए सीधे उनके नंबर पर कॉल मिलाया जा सकता है।
- **1-टैप व्हाट्सएप सहायता (💬 व्हाट्सएप पर बात करें):**
  - सीधे दुकानदार के आधिकारिक व्हाट्सएप पर पूर्व-लिखित सहायता संदेश के साथ चैट शुरू की जा सकती है।
- **1-क्लिक प्रो अपग्रेड/डाउनग्रेड (Plan Toggle):**
  - जो ग्रामीण दुकानदार नकद या पंचायत स्तर पर ऑफ़लाइन भुगतान करके प्रो प्लान लेते हैं, व्यवस्थापक उन्हें 1-क्लिक में तुरंत **"ग्रामिन प्रो"** (PRO) में सक्रिय कर सकते हैं।
- **दुकान स्थिति नियंत्रण (सक्रिय / निलंबित):**
  - यदि किसी दुकान का खाता निष्क्रिय करना हो या फिर से चालू करना हो, तो **"सक्रिय रखें"** अथवा **"खाता रोकें"** बटन से तुरंत नियंत्रित किया जा सकता है।

### Store Account Security & Isolation (दुकान डेटा व खाता सुरक्षा)
- **गोपनीयता और डेटा अलगाव (Zero Merchant Leakage):**
  - प्रत्येक दुकानदार का बही-खाता, ग्राहक सूची, दैनिक गल्ला हिसाब और मुनीम PIN पूरी तरह निजी और सुरक्षित रहता है।
  - केंद्रीय डैशबोर्ड केवल प्लेटफ़ॉर्म संचालन, योजना प्रबंधन और तकनीकी सहायता के लिए आवश्यक सारांश प्रदर्शित करता है, जिससे ग्रामीण व्यापारियों का पूर्ण विश्वास और निजता बनी रहती है।


