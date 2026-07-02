import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';

export type QuoteDifficulty = 'easy' | 'medium' | 'hard';

export interface QuoteLineInput {
  space: string;
  qty: number;
  minsPerUnit: number;
  difficulty: QuoteDifficulty;
  minutes: number;
  total: number;
}

export interface QuoteEmailInput {
  quoteRef: string;
  quoteDate: string;
  validDays: number;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  jobAddress?: string;
  notes?: string;
  hourlyRate: number;
  taxRate: number;
  totals: {
    minutes: number;
    hours: number;
    subtotal: number;
    discountAmount?: number;
    discountedSubtotal?: number;
    tax: number;
    grand: number;
  };
  lines: QuoteLineInput[];
  discount?: number;
  manualTotalHours?: string;
}

const difficultyLabels: Record<QuoteDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value || 0);

const safe = (value: string | undefined, fallback = '') => value?.trim() || fallback;

const getTransport = () => {
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: smtpPort === 465,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const drawRow = (
  doc: PDFKit.PDFDocument,
  y: number,
  columns: Array<{ text: string; x: number; width: number; align?: 'left' | 'right' }>,
  options: { bold?: boolean; fill?: string } = {}
) => {
  if (options.fill) {
    doc.rect(42, y - 7, 511, 28).fill(options.fill);
  }
  doc.fillColor('#1f2937').font(options.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
  columns.forEach((column) => {
    doc.text(column.text, column.x, y, { width: column.width, align: column.align || 'left' });
  });
};

export const generateQuotePdf = (quote: QuoteEmailInput): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 42 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const logoPath = path.resolve(process.cwd(), '../frontend/public/images/logo2.jpeg');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 42, 42, { width: 58, height: 58 });
    }

    doc
      .fillColor('#2d3748')
      .font('Helvetica-Bold')
      .fontSize(21)
      .text('Max hygiene cleaning services', 112, 48)
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#4a5568')
      .text('local cleaner near you.', 112, 76)
      .text('Technology House Newton Place\nPost code: G3 7PR\n(07743173136) | info@max-hygiencleaningpro.co.uk', 112, 91, { lineGap: 2 });

    doc
      .font('Helvetica-Bold')
      .fontSize(15)
      .fillColor('#3bb0bd')
      .text('Service Quote', 390, 48, { width: 163, align: 'right' })
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#4a5568')
      .text(safe(quote.quoteRef, 'Draft Quote'), 390, 72, { width: 163, align: 'right' })
      .text(new Date(quote.quoteDate || Date.now()).toLocaleDateString('en-GB'), 390, 88, { width: 163, align: 'right' });

    doc.moveTo(42, 140).lineTo(553, 140).strokeColor('#e2e8f0').lineWidth(1).stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#718096')
      .text('PREPARED FOR', 42, 160)
      .text('PROPERTY', 310, 160);

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#2d3748')
      .text(safe(quote.clientName, 'Client Name'), 42, 176, { width: 220 })
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#4a5568')
      .text(safe(quote.clientEmail, 'client@email.com'), 42, 196, { width: 220 })
      .text(safe(quote.clientPhone, 'Client phone'), 42, 211, { width: 220 })
      .text(safe(quote.jobAddress, 'Property address'), 310, 176, { width: 240 });

    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor('#2d3748')
      .text('Quote Summary', 42, 254)
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#4a5568')
      .text(
        safe(
          quote.notes,
          'Thank you for the opportunity to quote for this job. We look forward to working with you.'
        ),
        42,
        276,
        { width: 511, lineGap: 3 }
      );

    let y = Math.max(doc.y + 22, 330);
    drawRow(
      doc,
      y,
      [
        { text: 'SERVICE TYPE', x: 54, width: 300 },
        { text: 'QTY', x: 380, width: 50 },
        { text: 'TOTAL', x: 472, width: 68, align: 'right' },
      ],
      { bold: true, fill: '#e6f7f9' }
    );
    y += 30;

    quote.lines.forEach((line) => {
      if (y > 690) {
        doc.addPage();
        y = 60;
      }
      doc.moveTo(42, y - 10).lineTo(553, y - 10).strokeColor('#e2e8f0').lineWidth(0.7).stroke();
      drawRow(doc, y, [
        { text: safe(line.space, 'Cleaning item'), x: 54, width: 300 },
        { text: String(line.qty || 0), x: 380, width: 50 },
        { text: formatCurrency(line.total), x: 472, width: 68, align: 'right' },
      ]);
      y += 28;
    });

    y += 16;
    const totalsX = 42;
    const totalValueX = 440;
    const totalRows: Array<[string, string]> = [
      ['Net', formatCurrency(quote.totals.subtotal)]
    ];
    if (quote.discount && quote.totals.discountAmount) {
      totalRows.push([`Discount (${quote.discount}%)`, `-${formatCurrency(quote.totals.discountAmount)}`]);
    }
    totalRows.push([`VAT / Tax (${quote.taxRate || 0}%)`, formatCurrency(quote.totals.tax)]);
    
    if (quote.manualTotalHours) {
      totalRows.push(['Total Hours', quote.manualTotalHours]);
    }

    totalRows.forEach(([label, value]) => {
      if (y > 730) {
        doc.addPage();
        y = 60;
      }
      doc.font('Helvetica').fontSize(10).fillColor('#4a5568').text(label, totalsX, y, { width: 260 });
      doc.font('Helvetica-Bold').fillColor('#2d3748').text(value, totalValueX, y, { width: 113, align: 'right' });
      y += 20;
    });

    y += 5;
    doc.moveTo(42, y).lineTo(553, y).strokeColor('#e2e8f0').lineWidth(1.5).stroke();
    y += 18;
    doc.font('Helvetica').fontSize(12).fillColor('#2d3748').text('Total', totalsX, y, { width: 260 });
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#2a9aa7').text(formatCurrency(quote.totals.grand), totalValueX, y - 3, {
      width: 113,
      align: 'right',
    });

    y += 58;
    doc.moveTo(42, y).lineTo(553, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
    y += 18;
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#4a5568')
      .text(`This quote is valid for ${quote.validDays || 30} days.`, 42, y)
      .text('Invoices can be paid by BACS, Direct Debit, or agreed payment method.', 42, y + 15)
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor('#3bb0bd')
      .text('Spotless Homes. Zero Stress', 42, y + 35);

    doc.end();
  });

export const sendQuoteEmail = async (quote: QuoteEmailInput): Promise<void> => {
  const pdf = await generateQuotePdf(quote);
  const transport = getTransport();
  const fromName = process.env.FROM_NAME || 'Max-Hygiene';
  const fromAddr = process.env.SMTP_USER || '';
  const clientFirstName = safe(quote.clientName, 'there').split(' ')[0];
  const quoteRef = safe(quote.quoteRef, 'your quote');
  const total = formatCurrency(quote.totals.grand);

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#f7fafc;color:#4a5568">
      <div style="background:#3bb0bd;padding:22px 24px;border-radius:8px;margin-bottom:24px">
        <h1 style="margin:0;color:#fff;font-size:22px">Your Max-Hygiene Quote</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.9)">Reference: ${quoteRef}</p>
      </div>
      <p>Hi ${clientFirstName},</p>
      <p>Thank you for giving Max-Hygiene the opportunity to quote for your cleaning service.</p>
      <p>Your quote is attached as a PDF for your review. The estimated total is <strong style="color:#2a9aa7">${total}</strong>, and the quote is valid for <strong>${quote.validDays || 30} days</strong>.</p>
      <p>If everything looks good, reply to this email and we will confirm the next steps with you.</p>
      <div style="background:#fff;border-left:4px solid #3bb0bd;padding:14px 16px;border-radius:6px;margin:22px 0">
        <strong style="color:#2d3748">Quote summary</strong><br>
        Reference: ${quoteRef}<br>
        Property: ${safe(quote.jobAddress, 'Not specified')}<br>
        Total: ${total}
      </div>
      <p>Kind regards,<br><strong>Max-Hygiene Cleaning Services</strong></p>
      <p style="font-size:13px;color:#718096">0333 335 7932<br>info@max-hygienecleaningpro.co.uk</p>
    </div>`;

  const text = `Hi ${clientFirstName},

Thank you for giving Max-Hygiene the opportunity to quote for your cleaning service.

Your quote is attached as a PDF for your review.

Reference: ${quoteRef}
Property: ${safe(quote.jobAddress, 'Not specified')}
Estimated total: ${total}
Valid for: ${quote.validDays || 30} days

If everything looks good, reply to this email and we will confirm the next steps with you.

Kind regards,
Max-Hygiene Cleaning Services
0333 335 7932
info@max-hygienecleaningpro.co.uk`;

  await transport.sendMail({
    from: `"${fromName}" <${fromAddr}>`,
    to: quote.clientEmail,
    replyTo: fromAddr,
    subject: `Your Max-Hygiene Cleaning Quote - ${quoteRef}`,
    html,
    text,
    attachments: [
      {
        filename: `Max-Hygiene-Quote-${quoteRef.replace(/[^a-z0-9-]/gi, '-')}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
  });
};
