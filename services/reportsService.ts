import { getJournalEntries, getPayments } from './dataService';
import { JournalEntry } from '../types';

const CASH_ACCOUNT_KEYS = ['Cash', 'Bank', 'Wallet', 'Wallets', 'كاش'];

type CashFlowResult = {
  openingCash: number;
  operatingIn: number;
  operatingOut: number;
  investingIn: number;
  investingOut: number;
  financingIn: number;
  financingOut: number;
  netCashFlow: number;
  closingCash: number;
  unclassifiedCount: number;
};

function isCashAccount(accountId: string) {
  if (!accountId) return false;
  return CASH_ACCOUNT_KEYS.some(k => accountId.toLowerCase().includes(k.toLowerCase()));
}

function classifyEntry(entry: JournalEntry, cashLineIndex: number) {
  const cashLine = entry.lines[cashLineIndex];
  const others = entry.lines.filter((_, i) => i !== cashLineIndex);
  const otherAccounts = others.map(l => l.accountId || '').join(' ');
  const ref = String(entry.referenceType || '').toLowerCase();
  const desc = String(entry.description || '').toLowerCase();

  // Operating heuristics
  if (/customer|receivable|sales|revenue|income|payment|payments?/.test(otherAccounts) || ref === 'invoice' || ref === 'payment') {
    return 'operating';
  }
  if (/supplier|payable|purchase|vendor/.test(otherAccounts) || ref === 'purchase') {
    return 'operating';
  }

  // Investing heuristics
  if (/asset|equipment|fixedasset|fixed asset|sale of asset|asset sale|assets?/.test(otherAccounts) || ref === 'asset' || /asset/.test(desc)) {
    return 'investing';
  }

  // Financing heuristics
  if (/owner|capital|equity|contribution|investment/.test(otherAccounts) || ref === 'owner' || /owner|capital/.test(desc)) {
    return 'financing';
  }
  if (/loan|liability/.test(otherAccounts) || ref === 'loan') {
    return 'financing';
  }

  return 'unclassified';
}

export const getCashFlow = async (companyId: string, startISO: string, endISO: string): Promise<CashFlowResult> => {
  // Fetch journal entries in range and prior to compute opening balance
  const startFilter = startISO;
  const endFilter = endISO;

  // Entries in range
  const entriesRes = await getJournalEntries(companyId, { filters: [['date', '>=', startFilter], ['date', '<=', endFilter]] , limit: 1000 });
  const entries = entriesRes.data as JournalEntry[];

  // Entries before start for opening balance
  const beforeRes = await getJournalEntries(companyId, { filters: [['date', '<', startFilter]], limit: 2000 });
  const beforeEntries = beforeRes.data as JournalEntry[];

  // Payments (some systems record payments independently)
  const paymentsRes = await getPayments(companyId, { filters: [['date', '>=', startFilter], ['date', '<=', endFilter]] , limit: 1000 });
  const payments = paymentsRes.data || [];

  // Compute opening cash as net cash movement prior to start
  const openingCash = beforeEntries.reduce((sum, e) => {
    const cashIdx = e.lines.findIndex(l => isCashAccount(l.accountId));
    if (cashIdx === -1) return sum;
    const l = e.lines[cashIdx];
    return sum + ((l.credit || 0) - (l.debit || 0));
  }, 0);

  let operatingIn = 0;
  let operatingOut = 0;
  let investingIn = 0;
  let investingOut = 0;
  let financingIn = 0;
  let financingOut = 0;
  let unclassifiedCount = 0;

  // Process journal entries in range
  for (const e of entries) {
    const cashIdx = e.lines.findIndex(l => isCashAccount(l.accountId));
    if (cashIdx === -1) continue; // not a cash movement
    const cashLine = e.lines[cashIdx];
    const amt = (cashLine.credit || 0) - (cashLine.debit || 0); // credit = inflow, debit = outflow
    const cls = classifyEntry(e, cashIdx);
    if (cls === 'operating') {
      if (amt >= 0) operatingIn += amt; else operatingOut += Math.abs(amt);
    } else if (cls === 'investing') {
      if (amt >= 0) investingIn += amt; else investingOut += Math.abs(amt);
    } else if (cls === 'financing') {
      if (amt >= 0) financingIn += amt; else financingOut += Math.abs(amt);
    } else {
      unclassifiedCount += 1;
    }
  }

  // Process payments fallback (some payments may not have journal entries with clear lines)
  for (const p of payments) {
    // Expect payment.amount and date and possibly invoiceId
    const amt = (p as any).amount || 0;
    // Heuristic: a payment record is a customer payment => operating inflow
    operatingIn += amt;
  }

  const netCashFlow = operatingIn - operatingOut + investingIn - investingOut + financingIn - financingOut;
  const closingCash = openingCash + netCashFlow;

  return {
    openingCash,
    operatingIn,
    operatingOut,
    investingIn,
    investingOut,
    financingIn,
    financingOut,
    netCashFlow,
    closingCash,
    unclassifiedCount,
  };
};

export default { getCashFlow };
