'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Customer } from '@/types';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import styles from './quotes.module.css';

type Difficulty = 'easy' | 'medium' | 'hard';

interface QuoteLine {
  id: number;
  space: string;
  qty: number;
  minsPerUnit: number;
  difficulty: Difficulty;
}

interface Preset {
  name: string;
  icon: string;
  lines: Omit<QuoteLine, 'id'>[];
}

interface QuoteDraft {
  quoteRef: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  jobAddress: string;
  quoteDate: string;
  validDays: number;
  hourlyRate: number;
  taxRate: number;
  notes: string;
  lines: QuoteLine[];
  space: string;
  qty: number;
  minsPerUnit: number;
  difficulty: Difficulty;
  discount: number;
  manualTotalHours: string;
  showTotalHours: boolean;
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const MARKUPS: Record<Difficulty, number> = {
  easy: 0,
  medium: 5,
  hard: 10,
};

const PRESETS: Preset[] = [
  {
    name: 'Deep Clean Home',
    icon: 'fas fa-house-user',
    lines: [
      { space: 'Bedroom', qty: 3, minsPerUnit: 35, difficulty: 'medium' },
      { space: 'Bathroom', qty: 2, minsPerUnit: 45, difficulty: 'hard' },
      { space: 'Living Room', qty: 1, minsPerUnit: 40, difficulty: 'medium' },
      { space: 'Kitchen', qty: 1, minsPerUnit: 70, difficulty: 'hard' },
      { space: 'Windows', qty: 8, minsPerUnit: 8, difficulty: 'easy' },
    ],
  },
  {
    name: 'Regular Clean',
    icon: 'fas fa-broom',
    lines: [
      { space: 'Bedroom', qty: 2, minsPerUnit: 20, difficulty: 'easy' },
      { space: 'Bathroom', qty: 1, minsPerUnit: 30, difficulty: 'medium' },
      { space: 'Living Room', qty: 1, minsPerUnit: 25, difficulty: 'easy' },
      { space: 'Kitchen', qty: 1, minsPerUnit: 35, difficulty: 'medium' },
    ],
  },
  {
    name: 'End of Tenancy',
    icon: 'fas fa-key',
    lines: [
      { space: 'Bedroom', qty: 2, minsPerUnit: 45, difficulty: 'hard' },
      { space: 'Bathroom', qty: 1, minsPerUnit: 55, difficulty: 'hard' },
      { space: 'Kitchen', qty: 1, minsPerUnit: 90, difficulty: 'hard' },
      { space: 'Oven', qty: 1, minsPerUnit: 60, difficulty: 'hard' },
      { space: 'Fridge', qty: 1, minsPerUnit: 25, difficulty: 'medium' },
      { space: 'Windows', qty: 6, minsPerUnit: 10, difficulty: 'medium' },
    ],
  },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);

const today = () => new Date().toISOString().slice(0, 10);

const DRAFT_KEY = 'max-hygiene.quote-generator.draft.v1';
const DEFAULT_NOTES = 'Thank you for the opportunity to quote for this job. We look forward to working with you.';

export default function QuotesPage() {
  const [quoteRef, setQuoteRef] = useState(`MHQ-${Date.now().toString().slice(-5)}`);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [jobAddress, setJobAddress] = useState('');
  const [quoteDate, setQuoteDate] = useState(today());
  const [validDays, setValidDays] = useState(30);
  const [hourlyRate, setHourlyRate] = useState(23);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState(DEFAULT_NOTES);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [space, setSpace] = useState('');
  const [qty, setQty] = useState(1);
  const [minsPerUnit, setMinsPerUnit] = useState(30);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [discount, setDiscount] = useState(0);
  const [manualTotalHours, setManualTotalHours] = useState('');
  const [showTotalHours, setShowTotalHours] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [sendingQuote, setSendingQuote] = useState(false);
  const [toast, setToast] = useState('');
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (!saved) {
        setDraftLoaded(true);
        return;
      }

      const draft = JSON.parse(saved) as Partial<QuoteDraft>;
      if (typeof draft.quoteRef === 'string') setQuoteRef(draft.quoteRef);
      if (typeof draft.clientName === 'string') setClientName(draft.clientName);
      if (typeof draft.clientEmail === 'string') setClientEmail(draft.clientEmail);
      if (typeof draft.clientPhone === 'string') setClientPhone(draft.clientPhone);
      if (typeof draft.jobAddress === 'string') setJobAddress(draft.jobAddress);
      if (typeof draft.quoteDate === 'string') setQuoteDate(draft.quoteDate);
      if (typeof draft.validDays === 'number') setValidDays(draft.validDays);
      if (typeof draft.hourlyRate === 'number') setHourlyRate(draft.hourlyRate);
      if (typeof draft.taxRate === 'number') setTaxRate(draft.taxRate);
      if (typeof draft.notes === 'string') setNotes(draft.notes);
      if (Array.isArray(draft.lines)) setLines(draft.lines);
      if (typeof draft.space === 'string') setSpace(draft.space);
      if (typeof draft.qty === 'number') setQty(draft.qty);
      if (typeof draft.minsPerUnit === 'number') setMinsPerUnit(draft.minsPerUnit);
      if (draft.difficulty === 'easy' || draft.difficulty === 'medium' || draft.difficulty === 'hard') {
        setDifficulty(draft.difficulty);
      }
      if (typeof draft.discount === 'number') setDiscount(draft.discount);
      if (typeof draft.manualTotalHours === 'string') setManualTotalHours(draft.manualTotalHours);
      if (typeof draft.showTotalHours === 'boolean') setShowTotalHours(draft.showTotalHours);
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;

    const timeout = window.setTimeout(() => {
      const draft: QuoteDraft = {
        quoteRef,
        clientName,
        clientEmail,
        clientPhone,
        jobAddress,
        quoteDate,
        validDays,
        hourlyRate,
        taxRate,
        notes,
        lines,
        space,
        qty,
        minsPerUnit,
        difficulty,
        discount,
        manualTotalHours,
        showTotalHours,
      };
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [
    clientEmail,
    clientName,
    clientPhone,
    difficulty,
    draftLoaded,
    hourlyRate,
    jobAddress,
    lines,
    minsPerUnit,
    notes,
    qty,
    quoteDate,
    quoteRef,
    space,
    taxRate,
    validDays,
    discount,
    manualTotalHours,
    showTotalHours,
  ]);

  const lineTotals = useMemo(() => {
    return lines.map((line) => {
      const minutes = line.qty * line.minsPerUnit;
      const base = (minutes / 60) * hourlyRate;
      const markup = base * (MARKUPS[line.difficulty] / 100);
      const total = Number((base + markup).toFixed(2));
      return { ...line, minutes, hours: minutes / 60, markup, total };
    });
  }, [hourlyRate, lines]);

  const totals = useMemo(() => {
    const minutes = lineTotals.reduce((sum, line) => sum + line.minutes, 0);
    const subtotal = Number(lineTotals.reduce((sum, line) => sum + line.total, 0).toFixed(2));
    const discountAmount = Number((subtotal * (discount / 100)).toFixed(2));
    const discountedSubtotal = Number((subtotal - discountAmount).toFixed(2));
    const tax = Number((discountedSubtotal * (taxRate / 100)).toFixed(2));
    return { 
      minutes, 
      hours: minutes / 60, 
      subtotal, 
      discountAmount,
      discountedSubtotal,
      tax, 
      grand: Number((discountedSubtotal + tax).toFixed(2)) 
    };
  }, [lineTotals, taxRate, discount]);

  const addLine = (event: FormEvent) => {
    event.preventDefault();
    const name = space.trim();
    if (!name) return;
    setLines((current) => [
      ...current,
      { id: Date.now() + Math.random(), space: name, qty: Math.max(1, qty), minsPerUnit: Math.max(1, minsPerUnit), difficulty },
    ]);
    setSpace('');
    setQty(1);
    setMinsPerUnit(30);
    setDifficulty('easy');
  };

  const applyPreset = (preset: Preset) => {
    setLines(preset.lines.map((line, index) => ({ ...line, id: Date.now() + Math.random() + index })));
  };

  const removeLine = (id: number) => setLines((current) => current.filter((line) => line.id !== id));

  const printQuote = () => window.print();

  const clearDraft = () => {
    window.localStorage.removeItem(DRAFT_KEY);
    setQuoteRef(`MHQ-${Date.now().toString().slice(-5)}`);
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setJobAddress('');
    setQuoteDate(today());
    setValidDays(30);
    setHourlyRate(23);
    setTaxRate(0);
    setNotes(DEFAULT_NOTES);
    setLines([]);
    setSpace('');
    setQty(1);
    setMinsPerUnit(30);
    setDifficulty('easy');
    setDiscount(0);
    setManualTotalHours('');
    setShowTotalHours(false);
    showToast('Local draft cleared');
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3500);
  };

  const loadCustomers = async (search = '') => {
    setLoadingCustomers(true);
    try {
      const res = await api.getCustomers({ limit: 100, search: search || undefined });
      setCustomers(res.data);
    } catch {
      showToast('Could not load customers');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const openShare = () => {
    setShareOpen(true);
    setSelectedCustomerId('');
    loadCustomers();
  };

  const selectedCustomer = customers.find((customer) => customer._id === selectedCustomerId);

  const buildQuotePayload = (customer?: Customer) => ({
    quoteRef,
    quoteDate,
    validDays,
    clientName: customer ? `${customer.firstName} ${customer.lastName}` : clientName,
    clientEmail: customer?.email || clientEmail,
    clientPhone: customer?.phone || clientPhone,
    jobAddress: customer
      ? [customer.address.line1, customer.address.city, customer.address.postcode].filter(Boolean).join(', ')
      : jobAddress,
    notes,
    hourlyRate,
    taxRate,
    discount,
    manualTotalHours: showTotalHours ? manualTotalHours : '',
    totals,
    lines: lineTotals.map((line) => ({
      space: line.space,
      qty: line.qty,
      minsPerUnit: line.minsPerUnit,
      difficulty: line.difficulty,
      minutes: line.minutes,
      total: line.total,
    })),
  });

  const sendQuote = async () => {
    if (!selectedCustomer) {
      showToast('Select a customer first');
      return;
    }
    if (lineTotals.length === 0) {
      showToast('Add quote lines before sending');
      return;
    }

    setSendingQuote(true);
    try {
      await api.sendQuote({
        customerId: selectedCustomer._id,
        quote: buildQuotePayload(selectedCustomer),
      });
      setClientName(`${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim());
      setClientEmail(selectedCustomer.email);
      setClientPhone(selectedCustomer.phone);
      setJobAddress([selectedCustomer.address.line1, selectedCustomer.address.city, selectedCustomer.address.postcode].filter(Boolean).join(', '));
      setShareOpen(false);
      showToast(`Quote sent to ${selectedCustomer.email}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send quote');
    } finally {
      setSendingQuote(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.screenOnly}>
        {toast && <div className={styles.toast}>{toast}</div>}

        <Header title="Quote Generator" subtitle="Build cleaning quotes and export client-ready PDFs" />

        <div className={styles.summaryStrip}>
          <div>
            <span>Total</span>
            <strong>{formatCurrency(totals.grand)}</strong>
          </div>
          <div>
            <span>Hours</span>
            <strong>{totals.hours.toFixed(2)}</strong>
          </div>
          <div>
            <span>Line Items</span>
            <strong>{lines.length}</strong>
          </div>
          <div className={styles.summaryActions}>
            <button className="btn btn-outline" onClick={openShare} disabled={lines.length === 0}>
              <i className="fas fa-envelope" /> Share
            </button>
            <button 
              className="btn btn-primary" 
              onClick={printQuote} 
              disabled={lines.length === 0 || !clientEmail.trim() || !clientPhone.trim()}
              title={(!clientEmail.trim() || !clientPhone.trim()) ? "Client email and phone are required" : ""}
            >
              <i className="fas fa-file-pdf" /> Download PDF
            </button>
          </div>
        </div>

        <div className={styles.workspace}>
          <section className={styles.builder}>
            <div className="card">
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Quote Details</h2>
                  <p>Client, rate, VAT and validity information.</p>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setQuoteRef(`MHQ-${Date.now().toString().slice(-5)}`)}
                >
                  <i className="fas fa-sync-alt" /> New Ref
                </button>
                <button className="btn btn-ghost btn-sm" onClick={clearDraft}>
                  <i className="fas fa-eraser" /> Clear Draft
                </button>
              </div>

              <div className={styles.formGrid}>
                <label className="form-group">
                  <span className="form-label">Quote Ref</span>
                  <input className="form-control" value={quoteRef} onChange={(e) => setQuoteRef(e.target.value)} />
                </label>
                <label className="form-group">
                  <span className="form-label">Quote Date</span>
                  <input className="form-control" type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} />
                </label>
                <label className="form-group">
                  <span className="form-label">Client Name</span>
                  <input className="form-control" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Rose Iade" />
                </label>
                <label className="form-group">
                  <span className="form-label">Client Email</span>
                  <input className="form-control" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@email.com" />
                </label>
                <label className="form-group">
                  <span className="form-label">Client Phone</span>
                  <input className="form-control" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="0333..." />
                </label>
                <label className="form-group">
                  <span className="form-label">Valid For</span>
                  <input className="form-control" type="number" min="1" value={validDays} onChange={(e) => setValidDays(Number(e.target.value))} />
                </label>
                <label className={`form-group ${styles.fullSpan}`}>
                  <span className="form-label">Job Address</span>
                  <input className="form-control" value={jobAddress} onChange={(e) => setJobAddress(e.target.value)} placeholder="Property address" />
                </label>
                <label className="form-group">
                  <span className="form-label">Hourly Rate</span>
                  <input className="form-control" type="number" min="0" step="0.5" value={hourlyRate} onChange={(e) => setHourlyRate(Number(e.target.value))} />
                </label>
                <label className="form-group">
                  <span className="form-label">VAT %</span>
                  <input className="form-control" type="number" min="0" step="0.5" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
                </label>
                <label className="form-group">
                  <span className="form-label">Discount %</span>
                  <select className="form-control" value={discount} onChange={(e) => setDiscount(Number(e.target.value))}>
                    <option value={0}>No discount</option>
                    <option value={5}>5% off</option>
                    <option value={10}>10% off</option>
                    <option value={15}>15% off</option>
                    <option value={20}>20% off</option>
                    <option value={25}>25% off</option>
                    <option value={30}>30% off</option>
                    <option value={35}>35% off</option>
                    <option value={40}>40% off</option>
                    <option value={45}>45% off</option>
                    <option value={50}>50% off</option>
                  </select>
                </label>
                <label className={`form-group ${styles.fullSpan}`} style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={showTotalHours} onChange={(e) => setShowTotalHours(e.target.checked)} />
                  <span className="form-label" style={{ marginBottom: 0 }}>Add Total Hours</span>
                </label>
                {showTotalHours && (
                  <label className="form-group">
                    <span className="form-label">Total Hours Value</span>
                    <input className="form-control" type="number" min="0" step="0.5" value={manualTotalHours} onChange={(e) => setManualTotalHours(e.target.value)} placeholder="e.g. 5.5" />
                  </label>
                )}
              </div>
            </div>

            <div className="card">
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Cleaning Presets</h2>
                  <p>Start from a typical clean, then adjust the line items.</p>
                </div>
              </div>

              <div className={styles.presetGrid}>
                {PRESETS.map((preset) => (
                  <button key={preset.name} className={styles.presetButton} onClick={() => applyPreset(preset)}>
                    <i className={preset.icon} />
                    <span>{preset.name}</span>
                    <small>{preset.lines.length} lines</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Add a Space</h2>
                  <p>Price by time, quantity and difficulty.</p>
                </div>
              </div>

              <form className={styles.lineForm} onSubmit={addLine}>
                <label className="form-group">
                  <span className="form-label">Space / Task</span>
                  <input className="form-control" value={space} onChange={(e) => setSpace(e.target.value)} placeholder="e.g. Bedroom" required />
                </label>
                <label className="form-group">
                  <span className="form-label">Quantity</span>
                  <input className="form-control" type="number" min="1" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
                </label>
                <label className="form-group">
                  <span className="form-label">Minutes / Unit</span>
                  <input className="form-control" type="number" min="1" value={minsPerUnit} onChange={(e) => setMinsPerUnit(Number(e.target.value))} />
                </label>
                <label className="form-group">
                  <span className="form-label">Difficulty</span>
                  <select className="form-control" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium +5%</option>
                    <option value="hard">Hard +10%</option>
                  </select>
                </label>
                <button className="btn btn-primary" type="submit">
                  <i className="fas fa-plus" /> Add Line
                </button>
              </form>
            </div>

            <div className="card">
              <div className={styles.sectionHeader}>
                <div>
                  <h2>Pricing</h2>
                  <p>{lines.length ? 'Review quote lines before exporting.' : 'Add a preset or custom space to begin.'}</p>
                </div>
                {lines.length > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setLines([])}>
                    <i className="fas fa-trash-alt" /> Clear
                  </button>
                )}
              </div>

              {lineTotals.length === 0 ? (
                <div className={styles.emptyLines}>
                  <i className="fas fa-file-invoice" />
                  <strong>No spaces added yet</strong>
                  <span>Select a preset or add a new space.</span>
                </div>
              ) : (
                <div className="table-wrap" style={{ padding: 0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Space</th>
                        <th>Qty</th>
                        <th>Difficulty</th>
                        <th>Line Total</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {lineTotals.map((line) => (
                        <tr key={line.id}>
                          <td>{line.space}</td>
                          <td>{line.qty}</td>
                          <td>{DIFFICULTY_LABELS[line.difficulty]}</td>
                          <td><strong>{formatCurrency(line.total)}</strong></td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => removeLine(line.id)} title="Remove line">
                              <i className="fas fa-times" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <label className="form-group">
                <span className="form-label">Quote Notes</span>
                <textarea className="form-control" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
            </div>
          </section>

          <aside className={styles.previewPanel}>
            <div className={styles.stickyPreview}>
              <div className={styles.previewToolbar}>
                <span>Live Preview</span>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={printQuote} 
                  disabled={lines.length === 0 || !clientEmail.trim() || !clientPhone.trim()}
                  title={(!clientEmail.trim() || !clientPhone.trim()) ? "Client email and phone are required" : ""}
                >
                  <i className="fas fa-file-pdf" /> PDF
                </button>
              </div>
              <QuoteDocument
                quoteRef={quoteRef}
                clientName={clientName}
                clientEmail={clientEmail}
                clientPhone={clientPhone}
                jobAddress={jobAddress}
                quoteDate={quoteDate}
                validDays={validDays}
                notes={notes}
                hourlyRate={hourlyRate}
                taxRate={taxRate}
                discount={discount}
                manualTotalHours={showTotalHours ? manualTotalHours : ''}
                lines={lineTotals}
                totals={totals}
              />
            </div>
          </aside>
        </div>

        <Modal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          title="Send Quote"
          size="lg"
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShareOpen(false)} disabled={sendingQuote}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={sendQuote} disabled={!selectedCustomer || sendingQuote}>
                {sendingQuote ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <i className="fas fa-paper-plane" />}
                {sendingQuote ? 'Sending...' : 'Send Quote PDF'}
              </button>
            </>
          }
        >
          <div className={styles.shareModal}>
            <div className={styles.customerSearch}>
              <i className="fas fa-search" />
              <input
                className="form-control"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') loadCustomers(customerSearch);
                }}
                placeholder="Search customers by name, email or phone"
              />
              <button className="btn btn-outline" onClick={() => loadCustomers(customerSearch)}>
                Search
              </button>
            </div>

            <div className={styles.shareGrid}>
              <div className={styles.customerList}>
                {loadingCustomers ? (
                  <div className={styles.modalState}><span className="spinner" /></div>
                ) : customers.length === 0 ? (
                  <div className={styles.modalState}>No customers found</div>
                ) : customers.map((customer) => {
                  const active = selectedCustomerId === customer._id;
                  return (
                    <button
                      key={customer._id}
                      className={`${styles.customerItem} ${active ? styles.customerItemActive : ''}`}
                      onClick={() => setSelectedCustomerId(customer._id)}
                    >
                      <strong>{customer.firstName} {customer.lastName}</strong>
                      <span>{customer.email}</span>
                      <small>{customer.phone}</small>
                    </button>
                  );
                })}
              </div>

              <div className={styles.emailPreview}>
                <span className={styles.previewLabel}>Email Template</span>
                <h3>Your Max-Hygiene Cleaning Quote - {quoteRef}</h3>
                <p>Hi {selectedCustomer ? selectedCustomer.firstName : 'Customer'},</p>
                <p>Thank you for giving Max-Hygiene the opportunity to quote for your cleaning service.</p>
                <p>
                  Your quote is attached as a PDF for your review. The estimated total is
                  {' '}<strong>{formatCurrency(totals.grand)}</strong>, and the quote is valid for
                  {' '}<strong>{validDays || 30} days</strong>.
                </p>
                <p>If everything looks good, reply to this email and we will confirm the next steps with you.</p>
                <div className={styles.attachmentPill}>
                  <i className="fas fa-file-pdf" />
                  Max-Hygiene-Quote-{quoteRef}.pdf
                </div>
              </div>
            </div>
          </div>
        </Modal>
      </div>

      <div className={styles.printOnly}>
        <QuoteDocument
          quoteRef={quoteRef}
          clientName={clientName}
          clientEmail={clientEmail}
          clientPhone={clientPhone}
          jobAddress={jobAddress}
          quoteDate={quoteDate}
          validDays={validDays}
          notes={notes}
          hourlyRate={hourlyRate}
          taxRate={taxRate}
          discount={discount}
          manualTotalHours={showTotalHours ? manualTotalHours : ''}
          lines={lineTotals}
          totals={totals}
        />
      </div>
    </div>
  );
}

function QuoteDocument({
  quoteRef,
  clientName,
  clientEmail,
  clientPhone,
  jobAddress,
  quoteDate,
  validDays,
  notes,
  hourlyRate,
  taxRate,
  discount,
  manualTotalHours,
  lines,
  totals,
}: {
  quoteRef: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  jobAddress: string;
  quoteDate: string;
  validDays: number;
  notes: string;
  hourlyRate: number;
  taxRate: number;
  discount: number;
  manualTotalHours: string;
  lines: Array<QuoteLine & { minutes: number; hours: number; markup: number; total: number }>;
  totals: { minutes: number; hours: number; subtotal: number; discountAmount: number; discountedSubtotal: number; tax: number; grand: number };
}) {
  return (
    <article className={styles.quoteDocument}>
      <header className={styles.quoteHeader}>
        <div className={styles.brandBlock}>
          <img src="/images/logo2.jpeg" alt="Max-Hygiene" />
          <div>
            <h1>Max hygiene cleaning services</h1>
            <p>local cleaner near you.</p>
            <p style={{ fontSize: '11px', color: '#666', marginTop: '4px', lineHeight: '1.4' }}>
              Technology House Newton Place<br />
              Post code: G3 7PR<br />
              (07743173136) | info@max-hygiencleaningpro.co.uk
            </p>
          </div>
        </div>
        <div className={styles.quoteMeta}>
          <strong>Service Quote</strong>
          <span>{quoteRef || 'Draft'}</span>
          <span>{quoteDate ? new Date(quoteDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}</span>
        </div>
      </header>

      <section className={styles.clientGrid}>
        <div>
          <span className={styles.docLabel}>Prepared For</span>
          <strong>{clientName || 'Client Name'}</strong>
          <p>{clientEmail || 'client@email.com'}</p>
          <p>{clientPhone || 'Client phone'}</p>
        </div>
        <div>
          <span className={styles.docLabel}>Property</span>
          <p>{jobAddress || 'Property address'}</p>
        </div>
      </section>

      <section className={styles.docIntro}>
        <h2>Quote Summary</h2>
        <p>{notes}</p>
      </section>

      <table className={styles.quoteTable}>
        <thead>
          <tr>
            <th>Service Type</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={3} className={styles.emptyDocLine}>No quote lines added yet.</td>
            </tr>
          ) : lines.map((line) => (
            <tr key={line.id}>
              <td>{line.space}</td>
              <td>{line.qty}</td>
              <td>{formatCurrency(line.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className={styles.docTotals}>
        <div>
          <span>Net</span>
          <strong>{formatCurrency(totals.subtotal)}</strong>
        </div>
        {discount > 0 && (
          <div>
            <span>Discount ({discount}%)</span>
            <strong>-{formatCurrency(totals.discountAmount)}</strong>
          </div>
        )}
        <div>
          <span>VAT ({taxRate}%)</span>
          <strong>{formatCurrency(totals.tax)}</strong>
        </div>
        {manualTotalHours && (
          <div>
            <span>Total Hours</span>
            <strong>{manualTotalHours}</strong>
          </div>
        )}
        <div className={styles.grandTotal}>
          <span>Total</span>
          <strong>{formatCurrency(totals.grand)}</strong>
        </div>
      </section>

      <footer className={styles.quoteFooter}>
        <p>This quote is valid for {validDays || 30} days.</p>
        <p>Invoices can be paid by BACS, Direct Debit, or agreed payment method.</p>
        <p style={{ marginTop: '1rem', fontWeight: 'bold', fontSize: '14px', color: '#3bb0bd' }}>Spotless Homes. Zero Stress</p>
      </footer>
    </article>
  );
}
