import React, { useState } from 'react';
import { motion } from 'framer-motion';

import { inr, plain, shortDate } from './HomeParts';
import { ACCENT, HAIR, MONO, PANEL, SANS } from '../theme/tokens';
import { printQuotation, previewQuotation } from '../lib/quotationHtml';
import { deleteQuotation } from '../services/Quotationservice';

/**
 * The quotation itself, ported from quotation_detail_screen.dart.
 *
 * This is what a card opens. Printing lives IN here rather than on the
 * card, because a print is irreversible from the customer's point of
 * view — the sheet comes out with their name on it — and the figures
 * should be read once before that happens. One tap from a list straight
 * to the printer is a way to hand someone the wrong quotation.
 *
 * The document itself is not re-implemented here: the Print button hands
 * the same record to quotationHtml, so the sheet on screen and the sheet
 * on paper can never drift apart.
 */

const GREEN = '#8CC98F';
const AMBER = '#E0B15C';

export default function QuotationDetail({
  quotation: q, isAdmin = false, onClose, onEdit, onDeleted,
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const agreement = q.totalPlotAmount * 0.20;
  const stampReg = q.stampDutyAmount + q.registrationAmount;

  const print = () => {
    if (!printQuotation(q)) {
      setErr('The print window was blocked. Allow pop-ups for this site.');
    }
  };

  const preview = () => {
    if (!previewQuotation(q)) {
      setErr('The preview window was blocked. Allow pop-ups for this site.');
    }
  };

  /* The Flutter app attaches the PDF to the system share sheet. A browser
     can only do that with a File in hand, and building one would mean
     shipping a PDF library to do what the print dialog already does — so
     this shares the figures as text, and the PDF route is Print → Save
     as PDF → share the file. */
  const share = async () => {
    const text = [
      `Quotation · ${q.projectName} · Plot ${q.plotNumber}`,
      `${q.customerName}${q.mobileNumber ? ` · ${q.mobileNumber}` : ''}`,
      `${plain.format(q.plotSize)} sq ft @ ${inr.format(q.ratePerSqFt)}/sq ft`,
      `Total ${inr.format(q.finalTotalAmount)}`,
    ].join('\n');
    try {
      if (navigator.share) await navigator.share({ title: 'Quotation', text });
      else {
        await navigator.clipboard.writeText(text);
        setErr('Summary copied to the clipboard.');
      }
    } catch {
      /* the user dismissed the share sheet — not an error */
    }
  };

  const remove = async () => {
    if (!q.id) return;
    setBusy(true);
    try {
      await deleteQuotation(q.id);
      if (onDeleted) onDeleted(q.id);
      onClose();
    } catch (e) {
      setBusy(false);
      setErr(e?.message || 'Could not delete this quotation.');
    }
  };

  const Row = ({ label, value, strong, auto }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', gap: 12,
      padding: '9px 0', borderBottom: `1px solid ${HAIR}`,
      fontFamily: MONO, fontSize: strong ? 14 : 13,
      fontWeight: strong ? 700 : 500,
      color: strong ? ACCENT : auto ? GREEN : '#D5DBE2',
    }}>
      <span>{label}</span><span>{inr.format(value)}</span>
    </div>
  );

  const Section = ({ title, children }) => (
    <div style={{ marginTop: 18 }}>
      <div style={{
        fontFamily: SANS, fontSize: 12, color: '#8B96A3', fontWeight: 700,
        letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4,
      }}>
        {title}
      </div>
      {children}
    </div>
  );

  const Fact = ({ label, value }) => (
    <div style={{ minWidth: 0 }}>
      <div style={{
        fontFamily: SANS, fontSize: 10, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: '#6F7A87', marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: MONO, fontSize: 13, color: '#EFEAE0', wordBreak: 'break-word',
      }}>
        {value || '—'}
      </div>
    </div>
  );

  const milestones = [
    ['Booking', q.bookingDate],
    ['Down payment', q.downPaymentDate],
    ['Sale deed', q.saleDeederDate],
  ];

  const btn = {
    padding: '13px 20px', borderRadius: 8, fontFamily: SANS, fontSize: 14,
    letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
    touchAction: 'manipulation',
  };

  return (
    <div
      onClick={onClose}
      role="presentation"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(8,11,15,0.78)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, zIndex: 40,
      }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Quotation for ${q.customerName}`}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%', maxWidth: 560, background: PANEL, border: `1px solid ${HAIR}`,
          borderRadius: 14, padding: 20, maxHeight: '90vh', overflowY: 'auto',
          WebkitOverflowScrolling: 'touch', boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontFamily: SANS, fontSize: 10, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: '#6F7A87',
            }}>
              Quotation{q.id ? ` · ${q.id.slice(0, 8).toUpperCase()}` : ''}
            </div>
            <div style={{
              fontFamily: SANS, fontSize: 24, color: ACCENT, fontWeight: 700,
              letterSpacing: '0.02em', marginTop: 2, wordBreak: 'break-word',
            }}>
              {q.customerName || 'Unnamed customer'}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 12, color: '#8B96A3', marginTop: 4 }}>
              {q.projectName} · Plot {q.plotNumber} · {shortDate.format(q.quotationDate)}
            </div>
          </div>
          <button
            type="button" onClick={onClose} aria-label="Close"
            style={{
              background: 'none', border: 'none', color: '#8B96A3',
              fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: 4,
            }}
          >
            ×
          </button>
        </div>

        <Section title="Details">
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12, padding: '12px 14px', background: '#0D1117',
            border: `1px solid ${HAIR}`, borderRadius: 10,
          }}>
            <Fact label="Mobile" value={q.mobileNumber} />
            <Fact label="Plot size" value={`${plain.format(q.plotSize)} sq ft`} />
            <Fact label="Rate" value={`${inr.format(q.ratePerSqFt)}/sq ft`} />
            <Fact label="Prepared by" value={q.createdByName} />
            {q.address && <Fact label="Address" value={q.address} />}
          </div>
        </Section>

        <Section title="Plot amount">
          <Row label="Total plot amount" value={q.totalPlotAmount} strong />
          <Row label="Agreement (20%)" value={agreement} auto />
          <Row label="Booking" value={q.bookingAmount} />
          {/* <Row label="Down payment" value={q.downPayment} /> */}
          <Row label="Remaining" value={q.loanAmount} auto />
        </Section>

        <Section title="Payment milestones">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {milestones.map(([label, date]) => (
              <span
                key={label}
                style={{
                  flex: '1 1 140px', padding: '9px 11px', borderRadius: 9,
                  border: `1px solid ${date ? 'rgba(224,177,92,0.4)' : HAIR}`,
                  background: date ? 'rgba(224,177,92,0.08)' : 'transparent',
                }}
              >
                <span style={{
                  display: 'block', fontFamily: SANS, fontSize: 10,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: date ? AMBER : '#6F7A87', marginBottom: 3,
                }}>
                  {label}
                </span>
                <span style={{
                  fontFamily: MONO, fontSize: 12,
                  color: date ? '#EFEAE0' : '#5C666F',
                }}>
                  {date ? shortDate.format(date) : 'Not set'}
                </span>
              </span>
            ))}
          </div>
        </Section>

        <Section title="Stamp duty & registration">
          <Row label={`Stamp duty (${Math.round(q.stampDutyPercent)}%)`} value={q.stampDutyAmount} />
          <Row label="Registration" value={q.registrationAmount} />
          <Row label="Sub total" value={stampReg} strong />
        </Section>

        <Section title="Administrative charges">
          <Row label="Mutation & 7/12" value={q.mutation} />
          <Row label="Maintenance (3 years)" value={q.societyCharges} />
          <Row label="Admin total" value={q.adminTotal} strong />
        </Section>

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          gap: 12, padding: '14px 16px', marginTop: 18,
          background: '#0D1117', border: `1px solid ${HAIR}`, borderRadius: 10,
        }}>
          <span style={{
            fontFamily: SANS, fontSize: 12, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: '#8B96A3',
          }}>
            Final total
          </span>
          <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: GREEN }}>
            {inr.format(q.finalTotalAmount)}
          </span>
        </div>

        {err && (
          <div style={{ fontFamily: MONO, fontSize: 12, color: '#E68A72', marginTop: 12 }}>
            {err}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          <button
            type="button" onClick={print}
            style={{
              ...btn, flex: '1 1 170px', border: 'none',
              background: ACCENT, color: '#141820', fontWeight: 700, letterSpacing: '0.1em',
            }}
          >
            Print / PDF
          </button>
          <button
            type="button" onClick={preview}
            style={{
              ...btn, flex: '0 1 130px', background: 'transparent',
              border: `1px solid ${HAIR}`, color: '#B7C0CA',
            }}
          >
            Preview
          </button>
          {/* <button
            type="button" onClick={share}
            style={{
              ...btn, flex: '0 1 120px', background: 'transparent',
              border: `1px solid ${GREEN}`, color: GREEN,
            }}
          >
            Share
          </button> */}
          {onEdit && (
            <button
              type="button" onClick={() => onEdit(q)}
              style={{
                ...btn, flex: '0 1 110px', background: 'transparent',
                border: `1px solid ${HAIR}`, color: '#B7C0CA',
              }}
            >
              Edit
            </button>
          )}
          {isAdmin && q.id && (
            <button
              type="button"
              onClick={confirmDelete ? remove : () => setConfirmDelete(true)}
              disabled={busy}
              style={{
                ...btn, flex: '0 1 130px', background: 'transparent',
                border: '1px solid rgba(230,138,114,0.5)', color: '#E68A72',
              }}
            >
              {busy ? 'Deleting…' : confirmDelete ? 'Confirm delete' : 'Delete'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}