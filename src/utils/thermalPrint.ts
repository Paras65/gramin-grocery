/**
 * thermalPrint.ts — ESC/POS Bluetooth Thermal Printer Utility
 * Supports: 58mm / 80mm Bluetooth printers (TVS LP45 Neo, Everycom EC-58, NGX BTP-90)
 * Uses: Web Bluetooth API (SPP profile) with graceful browser-print fallback
 * No external npm dependencies — pure TypeScript ESC/POS command builder
 */

import { syncService } from '../services/syncService';

// ─── ESC/POS Command Constants ────────────────────────────────────────────────
const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;

const CMD = {
  INIT:           [ESC, 0x40],          // Initialize printer
  ALIGN_LEFT:     [ESC, 0x61, 0x00],   // Left align
  ALIGN_CENTER:   [ESC, 0x61, 0x01],   // Center align
  ALIGN_RIGHT:    [ESC, 0x61, 0x02],   // Right align
  BOLD_ON:        [ESC, 0x45, 0x01],   // Bold on
  BOLD_OFF:       [ESC, 0x45, 0x00],   // Bold off
  DOUBLE_HEIGHT:  [ESC, 0x21, 0x10],   // Double height
  NORMAL_SIZE:    [ESC, 0x21, 0x00],   // Normal font size
  CUT_FULL:       [GS,  0x56, 0x00],   // Full paper cut
  CUT_PARTIAL:    [GS,  0x56, 0x01],   // Partial paper cut
  LINE_FEED:      [LF],
};

// ─── ESC/POS byte builder ─────────────────────────────────────────────────────
function textToBytes(text: string): number[] {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(text));
}

function buildBytes(...parts: (number[] | string)[]): Uint8Array {
  const result: number[] = [];
  for (const part of parts) {
    if (typeof part === 'string') {
      result.push(...textToBytes(part));
    } else {
      result.push(...part);
    }
  }
  return new Uint8Array(result);
}

function line(text: string): string {
  return text + '\n';
}

function dashes(len = 32): string {
  return '-'.repeat(len) + '\n';
}

function col2(left: string, right: string, width = 32): string {
  const gap = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(gap) + right + '\n';
}

// ─── Print Data Types ─────────────────────────────────────────────────────────
export interface PrintReceiptItem {
  name: string;
  quantity: number;
  unit: string;
  total: number;
}

export interface PrintReceiptData {
  storeName: string;
  storeAddress?: string;
  date: string;
  time: string;
  items: PrintReceiptItem[];
  total: number;
  paymentMode: string;
  customerName?: string;
  oldBalance?: number;
  newBalance?: number;
  thankYouMsg?: string;
}

export interface PrintDaySummaryData {
  storeName: string;
  date: string;
  cashSales: number;
  jamaCollected: number;
  totalExpenses: number;
  expenses: { description: string; amount: number }[];
  physicalCash: number;
  expectedCash: number;
  difference: number;
  note?: string;
  closedAt: string;
}

export interface StatementTxnItem {
  date: string;
  type: 'UDHAAR' | 'JAMA';
  amount: number;
  note?: string;
}

export interface PrintCustomerStatementData {
  storeName: string;
  date: string;
  customerName: string;
  customerPara?: string;
  customerPhone?: string;
  transactions: StatementTxnItem[];
  totalUdhaar: number;
  totalJama: number;
  netBalance: number;
}

// ─── ESC/POS Slip Builder ─────────────────────────────────────────────────────
function buildReceiptBytes(data: PrintReceiptData): Uint8Array {
  const W = 32; // 58mm thermal = ~32 chars per line
  const parts: (number[] | string)[] = [];
  const isDemo = !syncService.isLoggedIn();

  parts.push(CMD.INIT);
  parts.push(CMD.ALIGN_CENTER);

  if (isDemo) {
    parts.push(CMD.BOLD_ON);
    parts.push(line('*** नमूना बिल / DEMO BILL ***'));
    parts.push(CMD.BOLD_OFF);
    parts.push(dashes(W));
  }

  parts.push(CMD.BOLD_ON);
  parts.push(CMD.DOUBLE_HEIGHT);
  parts.push(line(data.storeName));
  parts.push(CMD.NORMAL_SIZE);
  parts.push(CMD.BOLD_OFF);
  const customHeader = typeof window !== 'undefined' ? localStorage.getItem('gk_receipt_header') : '';
  const customFooter = typeof window !== 'undefined' ? localStorage.getItem('gk_receipt_footer') : '';
  if (customHeader) parts.push(line(customHeader));
  if (data.storeAddress) parts.push(line(data.storeAddress));
  parts.push(line(`${data.date}  ${data.time}`));
  parts.push(CMD.ALIGN_LEFT);
  parts.push(dashes(W));

  // Items
  parts.push(CMD.BOLD_ON);
  parts.push(col2('सामान', 'राशि', W));
  parts.push(CMD.BOLD_OFF);
  parts.push(dashes(W));

  for (const item of data.items) {
    const name = item.name.substring(0, 18);
    const qty = `${item.quantity}${item.unit}`;
    const amt = `₹${item.total}`;
    // Item name row
    parts.push(line(name));
    // Qty + amount row indented
    parts.push(col2(`  ${qty}`, amt, W));
  }

  parts.push(dashes(W));

  // Total
  parts.push(CMD.BOLD_ON);
  parts.push(col2('कुल देय:', `₹${data.total}`, W));
  parts.push(CMD.BOLD_OFF);

  // Payment mode
  parts.push(col2('भुगतान:', data.paymentMode, W));

  // Customer info (if udhaar)
  if (data.customerName) {
    parts.push(col2('ग्राहक:', data.customerName, W));
    if (data.oldBalance !== undefined) {
      parts.push(col2('पुराना बाकी:', `₹${data.oldBalance}`, W));
    }
    if (data.newBalance !== undefined) {
      parts.push(CMD.BOLD_ON);
      parts.push(col2('नया बाकी:', `₹${data.newBalance}`, W));
      parts.push(CMD.BOLD_OFF);
    }
  }

  parts.push(dashes(W));

  // Footer
  parts.push(CMD.ALIGN_CENTER);
  parts.push(line(data.thankYouMsg || customFooter || 'धन्यवाद! फिर आइए 🙏'));

  if (isDemo) {
    parts.push(dashes(W));
    parts.push(line('⚠️ DEMO: अपनी दुकान का नाम'));
    parts.push(line('जोड़ने हेतु मुफ़्त रजिस्टर करें'));
  }

  parts.push(CMD.LINE_FEED);
  parts.push(CMD.LINE_FEED);
  parts.push(CMD.LINE_FEED);
  parts.push(CMD.CUT_PARTIAL);

  return buildBytes(...parts);
}

function buildDaySummaryBytes(data: PrintDaySummaryData): Uint8Array {
  const W = 32;
  const parts: (number[] | string)[] = [];

  parts.push(CMD.INIT);
  parts.push(CMD.ALIGN_CENTER);
  parts.push(CMD.BOLD_ON);
  parts.push(CMD.DOUBLE_HEIGHT);
  parts.push(line(data.storeName));
  parts.push(CMD.NORMAL_SIZE);
  parts.push(line('दैनिक गल्ला रोकड़ हिसाब'));
  parts.push(CMD.BOLD_OFF);
  parts.push(line(data.date));
  parts.push(CMD.ALIGN_LEFT);
  parts.push(dashes(W));

  parts.push(CMD.BOLD_ON);
  parts.push(col2('नकद बिक्री:', `₹${data.cashSales}`, W));
  parts.push(col2('जमा (Udhaar):', `₹${data.jamaCollected}`, W));
  parts.push(CMD.BOLD_OFF);
  parts.push(dashes(W));

  if (data.expenses.length > 0) {
    parts.push(line('खर्चे:'));
    for (const exp of data.expenses) {
      parts.push(col2(`  ${exp.description.substring(0, 20)}`, `₹${exp.amount}`, W));
    }
    parts.push(col2('कुल खर्च:', `₹${data.totalExpenses}`, W));
    parts.push(dashes(W));
  }

  parts.push(CMD.BOLD_ON);
  parts.push(col2('अपेक्षित नकद:', `₹${data.expectedCash}`, W));
  parts.push(col2('गल्ले में नकद:', `₹${data.physicalCash}`, W));
  parts.push(CMD.BOLD_OFF);

  const diff = data.difference;
  const diffLabel = diff === 0 ? 'मिलान सही ✅' : diff > 0 ? `अतिरिक्त: ₹${diff}` : `कम: ₹${Math.abs(diff)}`;
  parts.push(CMD.BOLD_ON);
  parts.push(col2('गल्ला मिलान:', diffLabel, W));
  parts.push(CMD.BOLD_OFF);

  if (data.note) {
    parts.push(dashes(W));
    parts.push(line(`नोट: ${data.note}`));
  }

  parts.push(dashes(W));
  parts.push(CMD.ALIGN_CENTER);
  parts.push(line(`बंद: ${data.closedAt}`));
  parts.push(CMD.LINE_FEED);
  parts.push(CMD.LINE_FEED);
  parts.push(CMD.LINE_FEED);
  parts.push(CMD.CUT_PARTIAL);

  return buildBytes(...parts);
}

function buildCustomerStatementBytes(data: PrintCustomerStatementData): Uint8Array {
  const W = 32;
  const parts: (number[] | string)[] = [];

  parts.push(CMD.INIT);
  parts.push(CMD.ALIGN_CENTER);
  parts.push(CMD.BOLD_ON);
  parts.push(CMD.DOUBLE_HEIGHT);
  parts.push(line(data.storeName));
  parts.push(CMD.NORMAL_SIZE);
  parts.push(line('ग्राहक खाता पर्ची (Statement)'));
  parts.push(CMD.BOLD_OFF);
  parts.push(line(`तारीख: ${data.date}`));
  parts.push(CMD.ALIGN_LEFT);
  parts.push(dashes(W));

  parts.push(CMD.BOLD_ON);
  parts.push(line(`ग्राहक: ${data.customerName}`));
  parts.push(CMD.BOLD_OFF);
  if (data.customerPara) parts.push(line(`पारा: ${data.customerPara}`));
  if (data.customerPhone) parts.push(line(`फोन: ${data.customerPhone}`));
  parts.push(dashes(W));

  parts.push(CMD.BOLD_ON);
  parts.push(col2('तारीख / विवरण', 'उधार / जमा', W));
  parts.push(CMD.BOLD_OFF);
  parts.push(dashes(W));

  for (const tx of data.transactions) {
    const d = tx.date.split('T')[0];
    const typeLabel = tx.type === 'UDHAAR' ? 'उधार' : 'जमा';
    const sign = tx.type === 'UDHAAR' ? '+' : '-';
    parts.push(line(`${d} (${typeLabel})`));
    if (tx.note) parts.push(line(`  ${tx.note.substring(0, 20)}`));
    parts.push(col2(`  ${typeLabel}:`, `${sign}₹${tx.amount}`, W));
  }

  parts.push(dashes(W));
  parts.push(col2('कुल उधार:', `₹${data.totalUdhaar}`, W));
  parts.push(col2('कुल जमा:', `₹${data.totalJama}`, W));
  parts.push(dashes(W));

  parts.push(CMD.BOLD_ON);
  parts.push(CMD.DOUBLE_HEIGHT);
  parts.push(col2('कुल बाकी:', `₹${data.netBalance}`, W));
  parts.push(CMD.NORMAL_SIZE);
  parts.push(CMD.BOLD_OFF);
  parts.push(dashes(W));

  parts.push(CMD.ALIGN_CENTER);
  parts.push(line('धन्यवाद! शुद्ध ग्रामीण हिसाब 🙏'));
  parts.push(CMD.LINE_FEED);
  parts.push(CMD.LINE_FEED);
  parts.push(CMD.LINE_FEED);
  parts.push(CMD.CUT_PARTIAL);

  return buildBytes(...parts);
}

// Web Bluetooth interface shims for TypeScript DOM lib compatibility
interface BluetoothDeviceShim {
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServerShim>;
    disconnect(): void;
  };
  addEventListener?(type: string, listener: () => void): void;
}

interface BluetoothRemoteGATTServerShim {
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTServiceShim>;
}

interface BluetoothRemoteGATTServiceShim {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristicShim>;
}

interface BluetoothRemoteGATTCharacteristicShim {
  writeValue(value: BufferSource): Promise<void>;
}

interface NavigatorWithBluetooth extends Navigator {
  bluetooth?: {
    requestDevice(options: {
      filters: { services: string[] }[];
      optionalServices?: string[];
    }): Promise<BluetoothDeviceShim>;
  };
}

// ─── Bluetooth ESC/POS Sender ─────────────────────────────────────────────────
let _btDevice: BluetoothDeviceShim | null = null;
let _btCharacteristic: BluetoothRemoteGATTCharacteristicShim | null = null;
let _printerListeners: ((connected: boolean, name?: string) => void)[] = [];

export function subscribePrinterStatus(listener: (connected: boolean, name?: string) => void): () => void {
  _printerListeners.push(listener);
  listener(isBluetoothPrinterConnected(), _btDevice?.name);
  return () => {
    _printerListeners = _printerListeners.filter(l => l !== listener);
  };
}

function notifyPrinterListeners(connected: boolean, name?: string) {
  _printerListeners.forEach(l => l(connected, name));
}

export function isBluetoothPrinterConnected(): boolean {
  return !!(_btDevice && _btDevice.gatt?.connected);
}

export function getConnectedPrinterName(): string | undefined {
  return _btDevice?.name;
}

export function disconnectBluetoothPrinter(): void {
  if (_btDevice?.gatt) {
    try {
      _btDevice.gatt.disconnect();
    } catch (_) {}
  }
  _btDevice = null;
  _btCharacteristic = null;
  notifyPrinterListeners(false);
}

/**
 * Connect to a Bluetooth ESC/POS printer.
 * Uses BLE Serial Port Profile (SPP) service UUID.
 * Returns true on success, false if not supported or cancelled.
 */
export async function connectBluetoothPrinter(): Promise<boolean> {
  const nav = navigator as NavigatorWithBluetooth;
  if (!nav.bluetooth) return false;
  try {
    _btDevice = await nav.bluetooth.requestDevice({
      filters: [
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // BLE Serial
      ],
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '00001101-0000-1000-8000-00805f9b34fb', // SPP classic
      ]
    });

    const server = await _btDevice.gatt!.connect();
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    _btCharacteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

    if (_btDevice.addEventListener) {
      _btDevice.addEventListener('gattserverdisconnected', () => {
        _btCharacteristic = null;
        notifyPrinterListeners(false);
      });
    }

    notifyPrinterListeners(true, _btDevice.name);
    return true;
  } catch {
    return false;
  }
}

async function sendBytesToPrinter(bytes: Uint8Array): Promise<boolean> {
  if (!_btCharacteristic) return false;
  try {
    // Send in 20-byte chunks (BLE MTU safe)
    const CHUNK = 20;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      await _btCharacteristic.writeValue(bytes.slice(i, i + CHUNK));
      await new Promise(r => setTimeout(r, 20)); // small delay between chunks
    }
    return true;
  } catch {
    return false;
  }
}

// ─── Browser Print Fallback (CSS 58mm layout) ─────────────────────────────────
function browserPrintHTML(htmlContent: string): void {
  const printWindow = window.open('', '_blank', 'width=300,height=600');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>ग्रामीण किराना — पर्ची</title>
      <style>
        @page { size: 58mm auto; margin: 2mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 10px; width: 54mm; color: #000; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .big { font-size: 13px; }
        .row { display: flex; justify-content: space-between; }
        .dashes { border-top: 1px dashed #000; margin: 3px 0; }
        .item-name { font-size: 10px; }
        .item-sub { font-size: 9px; color: #333; display: flex; justify-content: space-between; }
      </style>
    </head>
    <body>
      ${htmlContent}
      <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }<\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function receiptToHTML(data: PrintReceiptData): string {
  const isDemo = !syncService.isLoggedIn();
  const items = data.items.map(item => `
    <div class="item-name">${item.name}</div>
    <div class="item-sub"><span>${item.quantity}${item.unit}</span><span>₹${item.total}</span></div>
  `).join('');

  const customerHTML = data.customerName ? `
    <div class="row"><span>ग्राहक:</span><span>${data.customerName}</span></div>
    ${data.oldBalance !== undefined ? `<div class="row"><span>पुराना बाकी:</span><span>₹${data.oldBalance}</span></div>` : ''}
    ${data.newBalance !== undefined ? `<div class="row bold"><span>नया बाकी:</span><span>₹${data.newBalance}</span></div>` : ''}
  ` : '';

  const demoHeaderHTML = isDemo ? `
    <div style="background:#fef3c7;border:1px dashed #d97706;padding:4px;margin-bottom:6px;text-align:center;font-weight:bold;font-size:10px;color:#92400e;">
      *** नमूना बिल / DEMO RECEIPT ***
    </div>
  ` : '';

  const demoFooterHTML = isDemo ? `
    <div class="dashes"></div>
    <div style="font-size:9px;color:#d97706;text-align:center;font-weight:bold;margin-top:4px;">
      ⚠️ डेमो बिल • असली दुकान का नाम जोड़ने हेतु मुफ़्त रजिस्टर करें
    </div>
  ` : '';

  return `
    ${demoHeaderHTML}
    <div class="center bold big">${data.storeName}</div>
    ${data.storeAddress ? `<div class="center">${data.storeAddress}</div>` : ''}
    <div class="center">${data.date} &nbsp; ${data.time}</div>
    <div class="dashes"></div>
    <div class="row bold"><span>सामान</span><span>राशि</span></div>
    <div class="dashes"></div>
    ${items}
    <div class="dashes"></div>
    <div class="row bold"><span>कुल देय:</span><span>₹${data.total}</span></div>
    <div class="row"><span>भुगतान:</span><span>${data.paymentMode}</span></div>
    ${customerHTML}
    <div class="dashes"></div>
    <div class="center">${data.thankYouMsg || 'धन्यवाद! फिर आइए 🙏'}</div>
    ${demoFooterHTML}
  `;
}

function daySummaryToHTML(data: PrintDaySummaryData): string {
  const expHTML = data.expenses.length > 0 ? `
    <div>खर्चे:</div>
    ${data.expenses.map(e => `<div class="row"><span>&nbsp;&nbsp;${e.description}</span><span>₹${e.amount}</span></div>`).join('')}
    <div class="row"><span>कुल खर्च:</span><span>₹${data.totalExpenses}</span></div>
    <div class="dashes"></div>
  ` : '';

  const diff = data.difference;
  const diffText = diff === 0 ? 'मिलान सही ✅' : diff > 0 ? `अतिरिक्त: ₹${diff}` : `कम: ₹${Math.abs(diff)}`;
  const diffClass = diff < 0 ? 'color:red' : diff > 0 ? 'color:green' : 'color:green';

  return `
    <div class="center bold big">${data.storeName}</div>
    <div class="center bold">दैनिक गल्ला रोकड़ हिसाब</div>
    <div class="center">${data.date}</div>
    <div class="dashes"></div>
    <div class="row bold"><span>नकद बिक्री:</span><span>₹${data.cashSales}</span></div>
    <div class="row bold"><span>जमा (Udhaar):</span><span>₹${data.jamaCollected}</span></div>
    <div class="dashes"></div>
    ${expHTML}
    <div class="row bold"><span>अपेक्षित नकद:</span><span>₹${data.expectedCash}</span></div>
    <div class="row bold"><span>गल्ले में नकद:</span><span>₹${data.physicalCash}</span></div>
    <div class="dashes"></div>
    <div class="row bold"><span>गल्ला मिलान:</span><span style="${diffClass}">${diffText}</span></div>
    ${data.note ? `<div class="dashes"></div><div>नोट: ${data.note}</div>` : ''}
    <div class="dashes"></div>
    <div class="center">बंद: ${data.closedAt}</div>
  `;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Print a sale receipt. Tries Bluetooth ESC/POS first, falls back to browser print.
 */
export async function printReceipt(data: PrintReceiptData): Promise<'bluetooth' | 'browser'> {
  if (_btCharacteristic) {
    const bytes = buildReceiptBytes(data);
    const sent = await sendBytesToPrinter(bytes);
    if (sent) return 'bluetooth';
  }
  browserPrintHTML(receiptToHTML(data));
  return 'browser';
}

/**
 * Print the daily cash-close day summary slip.
 */
export async function printDaySummary(data: PrintDaySummaryData): Promise<'bluetooth' | 'browser'> {
  if (_btCharacteristic) {
    const bytes = buildDaySummaryBytes(data);
    const sent = await sendBytesToPrinter(bytes);
    if (sent) return 'bluetooth';
  }
  browserPrintHTML(daySummaryToHTML(data));
  return 'browser';
}

function customerStatementToHTML(data: PrintCustomerStatementData): string {
  const txRows = data.transactions.map(tx => {
    const d = tx.date.split('T')[0];
    const typeLabel = tx.type === 'UDHAAR' ? 'उधार' : 'जमा';
    const color = tx.type === 'UDHAAR' ? 'color:#dc2626' : 'color:#059669';
    const sign = tx.type === 'UDHAAR' ? '+' : '-';
    return `
      <div>
        <div class="row">
          <span>${d} (${typeLabel})</span>
          <span style="${color};font-weight:bold">${sign}₹${tx.amount}</span>
        </div>
        ${tx.note ? `<div style="font-size:9px;color:#555;padding-left:4px;">${tx.note}</div>` : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="center bold big">${data.storeName}</div>
    <div class="center bold">ग्राहक खाता पर्ची (Statement)</div>
    <div class="center">${data.date}</div>
    <div class="dashes"></div>
    <div class="bold">ग्राहक: ${data.customerName}</div>
    ${data.customerPara ? `<div>पारा: ${data.customerPara}</div>` : ''}
    ${data.customerPhone ? `<div>फोन: ${data.customerPhone}</div>` : ''}
    <div class="dashes"></div>
    <div class="row bold"><span>तारीख / प्रकार</span><span>राशि</span></div>
    <div class="dashes"></div>
    ${txRows}
    <div class="dashes"></div>
    <div class="row"><span>कुल उधार:</span><span>₹${data.totalUdhaar}</span></div>
    <div class="row"><span>कुल जमा:</span><span>₹${data.totalJama}</span></div>
    <div class="dashes"></div>
    <div class="row bold big" style="padding:2px 0;"><span>कुल बाकी:</span><span style="color:#dc2626">₹${data.netBalance}</span></div>
    <div class="dashes"></div>
    <div class="center">धन्यवाद! शुद्ध ग्रामीण हिसाब 🙏</div>
  `;
}

/**
 * Print a customer's Udhaar & Jama statement slip.
 */
export async function printCustomerStatement(data: PrintCustomerStatementData): Promise<'bluetooth' | 'browser'> {
  if (_btCharacteristic) {
    const bytes = buildCustomerStatementBytes(data);
    const sent = await sendBytesToPrinter(bytes);
    if (sent) return 'bluetooth';
  }
  browserPrintHTML(customerStatementToHTML(data));
  return 'browser';
}


