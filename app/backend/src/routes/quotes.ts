import { Router, Request, Response } from 'express';
import Customer from '../models/Customer';
import { protect } from '../middleware/auth';
import { QuoteEmailInput, QuoteLineInput, sendQuoteEmail } from '../utils/quoteEmail';

const router = Router();

const toNumber = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

router.post('/send', protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, quote } = req.body as { customerId?: string; quote?: Partial<QuoteEmailInput> };

    if (!quote) {
      res.status(400).json({ success: false, error: 'Quote data is required' });
      return;
    }

    let customer:
      | {
          firstName: string;
          lastName: string;
          email: string;
          phone?: string;
          address?: { line1?: string; city?: string; postcode?: string };
        }
      | null = null;

    if (customerId) {
      customer = await Customer.findById(customerId).lean();
      if (!customer) {
        res.status(404).json({ success: false, error: 'Customer not found' });
        return;
      }
    }

    const clientName = customer ? `${customer.firstName} ${customer.lastName}`.trim() : String(quote.clientName || '').trim();
    const clientEmail = customer?.email || String(quote.clientEmail || '').trim();
    const clientPhone = customer?.phone || String(quote.clientPhone || '').trim();
    const customerAddress = customer?.address
      ? [customer.address.line1, customer.address.city, customer.address.postcode].filter(Boolean).join(', ')
      : '';
    const jobAddress = String(quote.jobAddress || customerAddress || '').trim();

    if (!clientName || !clientEmail || !isValidEmail(clientEmail)) {
      res.status(400).json({ success: false, error: 'A valid customer name and email are required' });
      return;
    }

    const lines: QuoteLineInput[] = Array.isArray(quote.lines)
      ? quote.lines
          .map((line) => ({
            space: String(line.space || '').trim(),
            qty: toNumber(line.qty, 1),
            minsPerUnit: toNumber(line.minsPerUnit, 0),
            difficulty: ['easy', 'medium', 'hard'].includes(String(line.difficulty))
              ? line.difficulty
              : 'easy',
            minutes: toNumber(line.minutes, 0),
            total: toNumber(line.total, 0),
          }))
          .filter((line) => line.space)
      : [];

    if (lines.length === 0) {
      res.status(400).json({ success: false, error: 'Add at least one quote line before sending' });
      return;
    }

    const quoteInput: QuoteEmailInput = {
      quoteRef: String(quote.quoteRef || `MHQ-${Date.now().toString().slice(-5)}`),
      quoteDate: String(quote.quoteDate || new Date().toISOString()),
      validDays: toNumber(quote.validDays, 30),
      clientName,
      clientEmail,
      clientPhone,
      jobAddress,
      notes: String(quote.notes || ''),
      hourlyRate: toNumber(quote.hourlyRate, 0),
      taxRate: toNumber(quote.taxRate, 0),
      discount: toNumber(quote.discount, 0),
      manualTotalHours: String(quote.manualTotalHours || '').trim(),
      totals: {
        minutes: toNumber(quote.totals?.minutes, 0),
        hours: toNumber(quote.totals?.hours, 0),
        subtotal: toNumber(quote.totals?.subtotal, 0),
        discountAmount: toNumber(quote.totals?.discountAmount, 0),
        discountedSubtotal: toNumber(quote.totals?.discountedSubtotal, 0),
        tax: toNumber(quote.totals?.tax, 0),
        grand: toNumber(quote.totals?.grand, 0),
      },
      lines,
    };

    await sendQuoteEmail(quoteInput);
    res.json({ success: true, message: `Quote sent to ${clientEmail}` });
  } catch (err) {
    console.error('Send quote failed:', err);
    res.status(500).json({ success: false, error: 'Failed to send quote email' });
  }
});

export default router;
