// import React, {
//   useEffect, useMemo, useRef, useState,
// } from 'react';
// import Eyebrow from '../ui/Eyebrow';
// import { SQFT, inr } from '../../lib/units';
// import { ACCENT, HAIR, MONO, PANEL, SANS } from '../../theme/tokens';
// import {
//   derive, emptyForm, toDoc, toForm,
// } from '../../lib/Quote';
// import { createQuotation, updateQuotation } from '../../services/Quotationservice';
// import { printQuotation } from '../../lib/quotationHtml';
// import '../../styles/Quotationmodal.css';

// /**
//  * The full quotation, ported from create_quotation_screen.dart.
//  *
//  * The plot search is gone: on the phone you type a plot number because
//  * there is no map in front of you, whereas here the plot arrives from
//  * the layout you just clicked. Plot number and size come in read-only
//  * for that reason — they are facts about the drawing, not opinions.
//  *
//  * Everything computed is shown in green and stays EDITABLE. Overriding
//  * one sets its flag and derive() stops owning it; the ↺ hands it back.
//  * That is the same behaviour as the Flutter screen's
//  * _isDownPaymentManuallyEdited, generalised to the three fields that
//  * need it rather than special-cased for one.
//  */

// const GREEN = '#8CC98F';
// const GREEN_DIM = 'rgba(140,201,143,0.55)';

// // ── Field building blocks ───────────────────────────────────────────────
// // These live OUTSIDE QuotationModal on purpose. Defining a component inside
// // another component's function body means it's re-created — a brand new
// // function identity — on every render. React then treats it as a different
// // component type from one render to the next, unmounts the old DOM node,
// // and mounts a fresh one in its place. For an <input>, that means every
// // keystroke destroys and rebuilds the element that currently has focus, so
// // focus is lost after each character typed. Hoisting these here and passing
// // state down as props (instead of closing over it) keeps their identity
// // stable across renders, so React updates the existing input in place.

// function Field({
//   label, name, value, onChange, type, mode, readOnly, autoComplete,
// }) {
//   return (
//     <label className="qm-field">
//       <Eyebrow style={{ marginBottom: 5 }}>{label}</Eyebrow>
//       <input
//         className={`qm-input${readOnly ? ' qm-input--readonly' : ''}`}
//         name={name}
//         value={value}
//         onChange={onChange}
//         type={type}
//         inputMode={mode}
//         autoComplete={autoComplete}
//         readOnly={readOnly}
//       />
//     </label>
//   );
// }

// /* A computed field the user may take over. The label carries the state
//    so nobody has to guess whether a number is still following the
//    formula. `active` mirrors the form's ...Edited flag; `displayValue` is
//    already resolved by the caller (raw override value, or the rounded
//    live computation) so this component stays a plain, stateless view. */
// function Derived({
//   label, name, active, displayValue, onChange, onRelease,
// }) {
//   return (
//     <label className="qm-field">
//       <span className="qm-field-label-row">
//         <Eyebrow style={{ marginBottom: 0 }}>{label}</Eyebrow>
//         <button
//           type="button"
//           onClick={onRelease}
//           disabled={!active}
//           title="Back to the calculated value"
//           className={`qm-auto-toggle${active ? ' is-active' : ''}`}
//         >
//           {active ? '↺ auto' : 'auto'}
//         </button>
//       </span>
//       <input
//         className="qm-input qm-input--auto"
//         name={name}
//         type="number"
//         inputMode="decimal"
//         value={displayValue}
//         onChange={onChange}
//       />
//     </label>
//   );
// }

// function ReadonlyAuto({ label, value, title }) {
//   return (
//     <label className="qm-field">
//       <Eyebrow style={{ marginBottom: 5 }}>{label}</Eyebrow>
//       <input
//         className="qm-input qm-input--auto qm-input--dim"
//         value={Math.round(value)}
//         readOnly
//         title={title}
//       />
//     </label>
//   );
// }

// function Section({ title, children }) {
//   return (
//     <div className="qm-section">
//       <div className="qm-section-title">{title}</div>
//       {children}
//     </div>
//   );
// }

// function DateField({
//   label, name, value, onChange,
// }) {
//   return (
//     <label className="qm-field">
//       <Eyebrow style={{ marginBottom: 5 }}>{label}</Eyebrow>
//       <input className="qm-input" type="date" name={name} value={value} onChange={onChange} />
//     </label>
//   );
// }

// export default function QuotationModal({
//   plot, user, existing, projectName = '', onClose, onSaved,
// }) {
//   const areaSqft = plot ? Math.round(plot.area * SQFT) : 0;

//   const [f, setF] = useState(() => (existing
//     ? toForm(existing)
//     : emptyForm({ plotNo: plot?.name || '', areaSqft, projectName })));
//   const [saveState, setSaveState] = useState('idle');   // idle|saving|saved|failed
//   const [err, setErr] = useState('');

//   const d = useMemo(() => derive(f), [f]);
//   const dialogRef = useRef(null);

//   // ── Focus trap + Escape-to-close ────────────────────────────────────
//   // A dialog that steals focus visually but not for the keyboard is only
//   // half accessible: without this, Tab walks a keyboard user straight out
//   // of the modal and into the page underneath it.
//   useEffect(() => {
//     const dialog = dialogRef.current;
//     if (!dialog) return undefined;

//     const getFocusable = () => Array.from(
//       dialog.querySelectorAll(
//         'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), '
//         + 'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
//       ),
//     );

//     getFocusable()[0]?.focus();

//     const onKeyDown = (e) => {
//       if (e.key === 'Escape') {
//         onClose();
//         return;
//       }
//       if (e.key !== 'Tab') return;
//       const list = getFocusable();
//       if (list.length === 0) return;
//       const first = list[0];
//       const last = list[list.length - 1];
//       if (e.shiftKey && document.activeElement === first) {
//         e.preventDefault();
//         last.focus();
//       } else if (!e.shiftKey && document.activeElement === last) {
//         e.preventDefault();
//         first.focus();
//       }
//     };

//     dialog.addEventListener('keydown', onKeyDown);
//     return () => dialog.removeEventListener('keydown', onKeyDown);
//   }, [onClose]);

//   const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
//   const setOverride = (k, flag) => (e) => setF((s) => ({
//     ...s, [k]: e.target.value, [flag]: true,
//   }));
//   const release = (flag) => () => setF((s) => ({ ...s, [flag]: false }));

//   const save = async () => {
//     if (!f.customerName.trim() || !f.mobileNumber.trim()) {
//       setErr('Customer name and mobile number are required.');
//       return;
//     }
//     setErr('');
//     setSaveState('saving');
//     const data = toDoc(f, d, user);
//     try {
//       const id = existing?.id
//         ? (await updateQuotation(existing.id, data), existing.id)
//         : await createQuotation(data);
//       setSaveState('saved');
//       if (onSaved) onSaved({ ...data, id });
//       setTimeout(() => setSaveState('idle'), 1600);
//     } catch (e) {
//       setSaveState('failed');
//       setErr(e?.message || 'Firestore refused the write.');
//     }
//   };

//   const print = () => {
//     /* Print what is on screen, saved or not — a customer standing at the
//        desk wants the sheet now, and the record can be saved after. */
//     const ok = printQuotation({
//       ...toDoc(f, d, user),
//       id: existing?.id,
//       stampDutyPercent: d.stampDutyPercent,
//     });
//     if (!ok) setErr('The print window was blocked. Allow pop-ups for this site.');
//   };

//   const lines = [
//     ['Total plot amount', d.total],
//     ['Agreement amount (20%)', d.agreement],
//     ['Booking amount', d.booking],
//     ['Down payment', d.down],
//     ['Balance amount', d.balance],
//     [`Stamp duty (${Math.round(d.stampDutyPercent)}%)`, d.stampDuty],
//     ['Registration', d.registration],
//     ['Admin total', d.adminTotal],
//   ];

//   const saveLabel = {
//     idle: existing ? 'Update quotation' : 'Save quotation',
//     saving: 'Saving…', saved: 'Saved', failed: 'Try again',
//   }[saveState];

//   return (
//     <div
//       onClick={onClose}
//       role="presentation"
//       className="qm-overlay"
//     >
//       <div
//         ref={dialogRef}
//         onClick={(e) => e.stopPropagation()}
//         role="dialog"
//         aria-modal="true"
//         aria-label={`Quotation for plot ${f.plotNumber}`}
//         className="qm-dialog"
//         style={{
//           '--qm-accent': ACCENT,
//           '--qm-hair': HAIR,
//           '--qm-panel': PANEL,
//           '--qm-mono': MONO,
//           '--qm-sans': SANS,
//           '--qm-green': GREEN,
//           '--qm-green-dim': GREEN_DIM,
//         }}
//       >
//         <Eyebrow>Quotation</Eyebrow>
//         <div className="qm-title">
//           PLOT {f.plotNumber || '—'}
//           {f.plotSize ? ` · ${Number(f.plotSize).toLocaleString('en-IN')} SQ FT` : ''}
//         </div>

//         {/* the running total, up top where it is read most */}
//         <div className="qm-total">
//           <span className="qm-total-label">Final total</span>
//           <span className="qm-total-value">{inr(d.finalTotal)}</span>
//         </div>

//         <Section title="Customer">
//           <div className="qm-grid">
//             <Field
//               label="Full name"
//               name="customerName"
//               value={f.customerName}
//               onChange={set('customerName')}
//               autoComplete="name"
//             />
//             <Field
//               label="Mobile number"
//               name="mobileNumber"
//               value={f.mobileNumber}
//               onChange={set('mobileNumber')}
//               type="tel"
//               mode="numeric"
//               autoComplete="tel"
//             />
//           </div>
//           <label className="qm-field" style={{ marginTop: 10 }}>
//             <Eyebrow style={{ marginBottom: 5 }}>Address</Eyebrow>
//             <textarea
//               className="qm-input qm-textarea"
//               name="address"
//               autoComplete="street-address"
//               value={f.address}
//               onChange={set('address')}
//             />
//           </label>
//         </Section>

//         <Section title="Project">
//           <div className="qm-grid">
//             <Field
//               label="Project name"
//               name="projectName"
//               value={f.projectName}
//               onChange={set('projectName')}
//             />
//             <Field
//               label="Plot number"
//               name="plotNumber"
//               value={f.plotNumber}
//               onChange={set('plotNumber')}
//               readOnly={!!plot}
//             />
//             <DateField
//               label="Quotation date"
//               name="quotationDate"
//               value={f.quotationDate}
//               onChange={set('quotationDate')}
//             />
//           </div>
//         </Section>

//         <Section title="Plot amount">
//           <div className="qm-grid">
//             <Field
//               label="Plot size (sq ft)"
//               name="plotSize"
//               value={f.plotSize}
//               onChange={set('plotSize')}
//               type="number"
//               mode="decimal"
//               readOnly={!!plot}
//             />
//             <Field
//               label="Rate / sq ft"
//               name="ratePerSqFt"
//               value={f.ratePerSqFt}
//               onChange={set('ratePerSqFt')}
//               type="number"
//               mode="decimal"
//             />
//             <Derived
//               label="Total plot amount"
//               name="totalPlotAmount"
//               active={f.totalEdited}
//               displayValue={f.totalEdited ? f.totalPlotAmount : Math.round(d.total)}
//               onChange={setOverride('totalPlotAmount', 'totalEdited')}
//               onRelease={release('totalEdited')}
//             />
//             <ReadonlyAuto label="Agreement amount (20%)" value={d.agreement} />
//             <Field
//               label="Booking amount"
//               name="bookingAmount"
//               value={f.bookingAmount}
//               onChange={set('bookingAmount')}
//               type="number"
//               mode="decimal"
//             />
//             <label className="qm-field">
//               <Eyebrow style={{ marginBottom: 5 }}>Down payment plan</Eyebrow>
//               <select
//                 className="qm-input"
//                 name="downPaymentOption"
//                 value={f.downPaymentOption}
//                 onChange={(e) => setF((s) => ({
//                   ...s, downPaymentOption: e.target.value, downPaymentEdited: false,
//                 }))}
//               >
//                 <option value="10%">Down payment 10%</option>
//                 <option value="20%">Down payment 20%</option>
//               </select>
//             </label>
//             <Derived
//               label={`Down payment (${f.downPaymentOption} − booking)`}
//               name="downPayment"
//               active={f.downPaymentEdited}
//               displayValue={f.downPaymentEdited ? f.downPayment : Math.round(d.down)}
//               onChange={setOverride('downPayment', 'downPaymentEdited')}
//               onRelease={release('downPaymentEdited')}
//             />
//             <ReadonlyAuto label="Balance amount" value={d.balance} />
//           </div>
//         </Section>

//         <Section title="Payment milestone dates">
//           <div className="qm-grid">
//             <DateField
//               label="Booking date"
//               name="bookingDate"
//               value={f.bookingDate}
//               onChange={set('bookingDate')}
//             />
//             <DateField
//               label="Down payment date"
//               name="downPaymentDate"
//               value={f.downPaymentDate}
//               onChange={set('downPaymentDate')}
//             />
//             <DateField
//               label="Sale deed date"
//               name="saleDeedDate"
//               value={f.saleDeedDate}
//               onChange={set('saleDeedDate')}
//             />
//           </div>
//         </Section>

//         <Section title="Stamp duty & registration">
//           <div className="qm-grid">
//             <Field
//               label="Stamp duty %"
//               name="stampDutyPercent"
//               value={f.stampDutyPercent}
//               onChange={set('stampDutyPercent')}
//               type="number"
//               mode="decimal"
//             />
//             <ReadonlyAuto label="Stamp duty amount" value={d.stampDuty} />
//             <ReadonlyAuto
//               label="Registration (1% ≤ ₹30L, else ₹30,000)"
//               value={d.registration}
//             />
//           </div>
//         </Section>

//         <Section title="Administrative charges">
//           <div className="qm-grid">
//             <Field
//               label="Mutation & 7/12"
//               name="mutation"
//               value={f.mutation}
//               onChange={set('mutation')}
//               type="number"
//               mode="decimal"
//             />
//             <Field
//               label="Maintenance (3 years)"
//               name="societyCharges"
//               value={f.societyCharges}
//               onChange={set('societyCharges')}
//               type="number"
//               mode="decimal"
//             />
//             <Derived
//               label="Admin total"
//               name="adminTotal"
//               active={f.adminEdited}
//               displayValue={f.adminEdited ? f.adminTotal : Math.round(d.adminTotal)}
//               onChange={setOverride('adminTotal', 'adminEdited')}
//               onRelease={release('adminEdited')}
//             />
//           </div>
//         </Section>

//         <div className="qm-lines">
//           {lines.map(([l, v]) => (
//             <div key={l} className="qm-line">
//               <span>{l}</span><span>{inr(v)}</span>
//             </div>
//           ))}
//         </div>

//         {err && (
//           <div className="qm-error" role="alert">
//             {err}
//           </div>
//         )}

//         <div className="qm-actions">
//           <button
//             type="button"
//             onClick={save}
//             disabled={saveState === 'saving'}
//             className={`qm-btn qm-btn--primary${saveState === 'saved' ? ' is-saved' : ''}`}
//           >
//             {saveLabel}
//           </button>
//           <button type="button" onClick={print} className="qm-btn qm-btn--outline">
//             Print / PDF
//           </button>
//           <button type="button" onClick={onClose} className="qm-btn qm-btn--ghost">
//             Close
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }










// import React, {
//   useEffect, useMemo, useRef, useState,
// } from 'react';
// import Eyebrow from '../ui/Eyebrow';
// import { SQFT, inr } from '../../lib/units';
// import { ACCENT, HAIR, MONO, PANEL, SANS } from '../../theme/tokens';
// import {
//   derive, emptyForm, toDoc, toForm, userUid,
// } from '../../lib/Quote';
// import { createQuotation, updateQuotation } from '../../services/Quotationservice';
// import { printQuotation } from '../../lib/quotationHtml';
// import '../../styles/Quotationmodal.css';

// /**
//  * The full quotation, ported from create_quotation_screen.dart.
//  *
//  * The plot search is gone: on the phone you type a plot number because
//  * there is no map in front of you, whereas here the plot arrives from
//  * the layout you just clicked. Plot number and size come in read-only
//  * for that reason — they are facts about the drawing, not opinions.
//  *
//  * Everything computed is shown in green and stays EDITABLE. Overriding
//  * one sets its flag and derive() stops owning it; the ↺ hands it back.
//  * That is the same behaviour as the Flutter screen's
//  * _isDownPaymentManuallyEdited, generalised to the three fields that
//  * need it rather than special-cased for one.
//  */

// const GREEN = '#8CC98F';
// const GREEN_DIM = 'rgba(140,201,143,0.55)';

// // ── Field building blocks ───────────────────────────────────────────────
// // These live OUTSIDE QuotationModal on purpose. Defining a component inside
// // another component's function body means it's re-created — a brand new
// // function identity — on every render. React then treats it as a different
// // component type from one render to the next, unmounts the old DOM node,
// // and mounts a fresh one in its place. For an <input>, that means every
// // keystroke destroys and rebuilds the element that currently has focus, so
// // focus is lost after each character typed. Hoisting these here and passing
// // state down as props (instead of closing over it) keeps their identity
// // stable across renders, so React updates the existing input in place.

// function Field({
//   label, name, value, onChange, type, mode, readOnly, autoComplete,
// }) {
//   return (
//     <label className="qm-field">
//       <Eyebrow style={{ marginBottom: 5 }}>{label}</Eyebrow>
//       <input
//         className={`qm-input${readOnly ? ' qm-input--readonly' : ''}`}
//         name={name}
//         value={value}
//         onChange={onChange}
//         type={type}
//         inputMode={mode}
//         autoComplete={autoComplete}
//         readOnly={readOnly}
//       />
//     </label>
//   );
// }

// /* A computed field the user may take over. The label carries the state
//    so nobody has to guess whether a number is still following the
//    formula. `active` mirrors the form's ...Edited flag; `displayValue` is
//    already resolved by the caller (raw override value, or the rounded
//    live computation) so this component stays a plain, stateless view. */
// function Derived({
//   label, name, active, displayValue, onChange, onRelease,
// }) {
//   return (
//     <label className="qm-field">
//       <span className="qm-field-label-row">
//         <Eyebrow style={{ marginBottom: 0 }}>{label}</Eyebrow>
//         <button
//           type="button"
//           onClick={onRelease}
//           disabled={!active}
//           title="Back to the calculated value"
//           className={`qm-auto-toggle${active ? ' is-active' : ''}`}
//         >
//           {active ? '↺ auto' : 'auto'}
//         </button>
//       </span>
//       <input
//         className="qm-input qm-input--auto"
//         name={name}
//         type="number"
//         inputMode="decimal"
//         value={displayValue}
//         onChange={onChange}
//       />
//     </label>
//   );
// }

// function ReadonlyAuto({ label, value, title }) {
//   return (
//     <label className="qm-field">
//       <Eyebrow style={{ marginBottom: 5 }}>{label}</Eyebrow>
//       <input
//         className="qm-input qm-input--auto qm-input--dim"
//         value={Math.round(value)}
//         readOnly
//         title={title}
//       />
//     </label>
//   );
// }

// function Section({ title, children }) {
//   return (
//     <div className="qm-section">
//       <div className="qm-section-title">{title}</div>
//       {children}
//     </div>
//   );
// }

// function DateField({
//   label, name, value, onChange,
// }) {
//   return (
//     <label className="qm-field">
//       <Eyebrow style={{ marginBottom: 5 }}>{label}</Eyebrow>
//       <input className="qm-input" type="date" name={name} value={value} onChange={onChange} />
//     </label>
//   );
// }

// export default function QuotationModal({
//   plot, user, existing, projectName = '', onClose, onSaved,
// }) {
//   const areaSqft = plot ? Math.round(plot.area * SQFT) : 0;

//   const [f, setF] = useState(() => (existing
//     ? toForm(existing)
//     : emptyForm({ plotNo: plot?.name || '', areaSqft, projectName })));
//   const [saveState, setSaveState] = useState('idle');   // idle|saving|saved|failed
//   const [err, setErr] = useState('');

//   const d = useMemo(() => derive(f), [f]);
//   const dialogRef = useRef(null);

//   // ── Focus trap + Escape-to-close ────────────────────────────────────
//   // A dialog that steals focus visually but not for the keyboard is only
//   // half accessible: without this, Tab walks a keyboard user straight out
//   // of the modal and into the page underneath it.
//   useEffect(() => {
//     const dialog = dialogRef.current;
//     if (!dialog) return undefined;

//     const getFocusable = () => Array.from(
//       dialog.querySelectorAll(
//         'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), '
//         + 'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
//       ),
//     );

//     getFocusable()[0]?.focus();

//     const onKeyDown = (e) => {
//       if (e.key === 'Escape') {
//         onClose();
//         return;
//       }
//       if (e.key !== 'Tab') return;
//       const list = getFocusable();
//       if (list.length === 0) return;
//       const first = list[0];
//       const last = list[list.length - 1];
//       if (e.shiftKey && document.activeElement === first) {
//         e.preventDefault();
//         last.focus();
//       } else if (!e.shiftKey && document.activeElement === last) {
//         e.preventDefault();
//         first.focus();
//       }
//     };

//     dialog.addEventListener('keydown', onKeyDown);
//     return () => dialog.removeEventListener('keydown', onKeyDown);
//   }, [onClose]);

//   const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
//   const setOverride = (k, flag) => (e) => setF((s) => ({
//     ...s, [k]: e.target.value, [flag]: true,
//   }));
//   const release = (flag) => () => setF((s) => ({ ...s, [flag]: false }));

//   const save = async () => {
//     if (!f.customerName.trim() || !f.mobileNumber.trim()) {
//       setErr('Customer name and mobile number are required.');
//       return;
//     }
//     /* A quotation with no author is worse than one that failed to save:
//        it writes cleanly, prints cleanly, and then never appears in any
//        employee's list, because the list filters on createdByUid and an
//        empty string matches nobody. Stop here instead. */
//     if (!userUid(user)) {
//       setErr('Not signed in properly — reload the page and sign in before saving.');
//       return;
//     }
//     setErr('');
//     setSaveState('saving');

//     const data = toDoc(f, d, user);

//     /* On an edit, authorship belongs to whoever created the record. Left
//        alone, toDoc stamps the CURRENT user onto it, so an admin opening
//        an employee's quotation to correct a rate would quietly reassign
//        it — and it would drop out of that employee's list the moment the
//        update landed. Same disappearing act, different cause. */
//     if (existing) {
//       data.createdByUid = existing.createdByUid || data.createdByUid;
//       data.createdByName = existing.createdByName || data.createdByName;
//     }

//     try {
//       const id = existing?.id
//         ? (await updateQuotation(existing.id, data), existing.id)
//         : await createQuotation(data);
//       setSaveState('saved');
//       if (onSaved) onSaved({ ...data, id });
//       setTimeout(() => setSaveState('idle'), 1600);
//     } catch (e) {
//       setSaveState('failed');
//       setErr(e?.message || 'Firestore refused the write.');
//     }
//   };

//   const print = () => {
//     /* Print what is on screen, saved or not — a customer standing at the
//        desk wants the sheet now, and the record can be saved after. */
//     const ok = printQuotation({
//       ...toDoc(f, d, user),
//       id: existing?.id,
//       stampDutyPercent: d.stampDutyPercent,
//     });
//     if (!ok) setErr('The print window was blocked. Allow pop-ups for this site.');
//   };

//   const lines = [
//     ['Total plot amount', d.total],
//     ['Agreement amount (20%)', d.agreement],
//     ['Booking amount', d.booking],
//     ['Down payment', d.down],
//     ['Balance amount', d.balance],
//     [`Stamp duty (${Math.round(d.stampDutyPercent)}%)`, d.stampDuty],
//     ['Registration', d.registration],
//     ['Admin total', d.adminTotal],
//   ];

//   const saveLabel = {
//     idle: existing ? 'Update quotation' : 'Save quotation',
//     saving: 'Saving…', saved: 'Saved', failed: 'Try again',
//   }[saveState];

//   return (
//     <div
//       onClick={onClose}
//       role="presentation"
//       className="qm-overlay"
//     >
//       <div
//         ref={dialogRef}
//         onClick={(e) => e.stopPropagation()}
//         role="dialog"
//         aria-modal="true"
//         aria-label={`Quotation for plot ${f.plotNumber}`}
//         className="qm-dialog"
//         style={{
//           '--qm-accent': ACCENT,
//           '--qm-hair': HAIR,
//           '--qm-panel': PANEL,
//           '--qm-mono': MONO,
//           '--qm-sans': SANS,
//           '--qm-green': GREEN,
//           '--qm-green-dim': GREEN_DIM,
//         }}
//       >
//         <Eyebrow>Quotation</Eyebrow>
//         <div className="qm-title">
//           PLOT {f.plotNumber || '—'}
//           {f.plotSize ? ` · ${Number(f.plotSize).toLocaleString('en-IN')} SQ FT` : ''}
//         </div>

//         {/* the running total, up top where it is read most */}
//         <div className="qm-total">
//           <span className="qm-total-label">Final total</span>
//           <span className="qm-total-value">{inr(d.finalTotal)}</span>
//         </div>

//         <Section title="Customer">
//           <div className="qm-grid">
//             <Field
//               label="Full name"
//               name="customerName"
//               value={f.customerName}
//               onChange={set('customerName')}
//               autoComplete="name"
//             />
//             <Field
//               label="Mobile number"
//               name="mobileNumber"
//               value={f.mobileNumber}
//               onChange={set('mobileNumber')}
//               type="tel"
//               mode="numeric"
//               autoComplete="tel"
//             />
//           </div>
//           <label className="qm-field" style={{ marginTop: 10 }}>
//             <Eyebrow style={{ marginBottom: 5 }}>Address</Eyebrow>
//             <textarea
//               className="qm-input qm-textarea"
//               name="address"
//               autoComplete="street-address"
//               value={f.address}
//               onChange={set('address')}
//             />
//           </label>
//         </Section>

//         <Section title="Project">
//           <div className="qm-grid">
//             <Field
//               label="Project name"
//               name="projectName"
//               value={f.projectName}
//               onChange={set('projectName')}
//             />
//             <Field
//               label="Plot number"
//               name="plotNumber"
//               value={f.plotNumber}
//               onChange={set('plotNumber')}
//               readOnly={!!plot}
//             />
//             <DateField
//               label="Quotation date"
//               name="quotationDate"
//               value={f.quotationDate}
//               onChange={set('quotationDate')}
//             />
//           </div>
//         </Section>

//         <Section title="Plot amount">
//           <div className="qm-grid">
//             <Field
//               label="Plot size (sq ft)"
//               name="plotSize"
//               value={f.plotSize}
//               onChange={set('plotSize')}
//               type="number"
//               mode="decimal"
//               readOnly={!!plot}
//             />
//             <Field
//               label="Rate / sq ft"
//               name="ratePerSqFt"
//               value={f.ratePerSqFt}
//               onChange={set('ratePerSqFt')}
//               type="number"
//               mode="decimal"
//             />
//             <Derived
//               label="Total plot amount"
//               name="totalPlotAmount"
//               active={f.totalEdited}
//               displayValue={f.totalEdited ? f.totalPlotAmount : Math.round(d.total)}
//               onChange={setOverride('totalPlotAmount', 'totalEdited')}
//               onRelease={release('totalEdited')}
//             />
//             <ReadonlyAuto label="Agreement amount (20%)" value={d.agreement} />
//             <Field
//               label="Booking amount"
//               name="bookingAmount"
//               value={f.bookingAmount}
//               onChange={set('bookingAmount')}
//               type="number"
//               mode="decimal"
//             />
//             <label className="qm-field">
//               <Eyebrow style={{ marginBottom: 5 }}>Down payment plan</Eyebrow>
//               <select
//                 className="qm-input"
//                 name="downPaymentOption"
//                 value={f.downPaymentOption}
//                 onChange={(e) => setF((s) => ({
//                   ...s, downPaymentOption: e.target.value, downPaymentEdited: false,
//                 }))}
//               >
//                 <option value="10%">Down payment 10%</option>
//                 <option value="20%">Down payment 20%</option>
//               </select>
//             </label>
//             <Derived
//               label={`Down payment (${f.downPaymentOption} − booking)`}
//               name="downPayment"
//               active={f.downPaymentEdited}
//               displayValue={f.downPaymentEdited ? f.downPayment : Math.round(d.down)}
//               onChange={setOverride('downPayment', 'downPaymentEdited')}
//               onRelease={release('downPaymentEdited')}
//             />
//             <ReadonlyAuto label="Balance amount" value={d.balance} />
//           </div>
//         </Section>

//         <Section title="Payment milestone dates">
//           <div className="qm-grid">
//             <DateField
//               label="Booking date"
//               name="bookingDate"
//               value={f.bookingDate}
//               onChange={set('bookingDate')}
//             />
//             <DateField
//               label="Down payment date"
//               name="downPaymentDate"
//               value={f.downPaymentDate}
//               onChange={set('downPaymentDate')}
//             />
//             <DateField
//               label="Sale deed date"
//               name="saleDeedDate"
//               value={f.saleDeedDate}
//               onChange={set('saleDeedDate')}
//             />
//           </div>
//         </Section>

//         <Section title="Stamp duty & registration">
//           <div className="qm-grid">
//             <Field
//               label="Stamp duty %"
//               name="stampDutyPercent"
//               value={f.stampDutyPercent}
//               onChange={set('stampDutyPercent')}
//               type="number"
//               mode="decimal"
//             />
//             <ReadonlyAuto label="Stamp duty amount" value={d.stampDuty} />
//             <ReadonlyAuto
//               label="Registration (1% ≤ ₹30L, else ₹30,000)"
//               value={d.registration}
//             />
//           </div>
//         </Section>

//         <Section title="Administrative charges">
//           <div className="qm-grid">
//             <Field
//               label="Mutation & 7/12"
//               name="mutation"
//               value={f.mutation}
//               onChange={set('mutation')}
//               type="number"
//               mode="decimal"
//             />
//             <Field
//               label="Maintenance (3 years)"
//               name="societyCharges"
//               value={f.societyCharges}
//               onChange={set('societyCharges')}
//               type="number"
//               mode="decimal"
//             />
//             <Derived
//               label="Admin total"
//               name="adminTotal"
//               active={f.adminEdited}
//               displayValue={f.adminEdited ? f.adminTotal : Math.round(d.adminTotal)}
//               onChange={setOverride('adminTotal', 'adminEdited')}
//               onRelease={release('adminEdited')}
//             />
//           </div>
//         </Section>

//         <div className="qm-lines">
//           {lines.map(([l, v]) => (
//             <div key={l} className="qm-line">
//               <span>{l}</span><span>{inr(v)}</span>
//             </div>
//           ))}
//         </div>

//         {err && (
//           <div className="qm-error" role="alert">
//             {err}
//           </div>
//         )}

//         <div className="qm-actions">
//           <button
//             type="button"
//             onClick={save}
//             disabled={saveState === 'saving'}
//             className={`qm-btn qm-btn--primary${saveState === 'saved' ? ' is-saved' : ''}`}
//           >
//             {saveLabel}
//           </button>
//           <button type="button" onClick={print} className="qm-btn qm-btn--outline">
//             Print / PDF
//           </button>
//           <button type="button" onClick={onClose} className="qm-btn qm-btn--ghost">
//             Close
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }















// import React, {
//   useEffect, useMemo, useRef, useState,
// } from 'react';
// import Eyebrow from '../ui/Eyebrow';
// import { SQFT, inr } from '../../lib/units';
// import { ACCENT, HAIR, MONO, PANEL, SANS } from '../../theme/tokens';
// import {
//   derive, emptyForm, toDoc, toForm, userUid,
// } from '../../lib/Quote';
// import { createQuotation, updateQuotation } from '../../services/Quotationservice';
// import { printQuotation } from '../../lib/quotationHtml';
// import '../../styles/Quotationmodal.css';

// /**
//  * The full quotation, ported from create_quotation_screen.dart.
//  *
//  * The plot search is gone: on the phone you type a plot number because
//  * there is no map in front of you, whereas here the plot arrives from
//  * the layout you just clicked. Plot number and size come in read-only
//  * for that reason — they are facts about the drawing, not opinions.
//  *
//  * Everything computed is shown in green and stays EDITABLE. Overriding
//  * one sets its flag and derive() stops owning it; the ↺ hands it back.
//  * That is the same behaviour as the Flutter screen's
//  * _isDownPaymentManuallyEdited, generalised to the three fields that
//  * need it rather than special-cased for one.
//  */

// const GREEN = '#8CC98F';
// const GREEN_DIM = 'rgba(140,201,143,0.55)';

// // ── Field building blocks ───────────────────────────────────────────────
// // These live OUTSIDE QuotationModal on purpose. Defining a component inside
// // another component's function body means it's re-created — a brand new
// // function identity — on every render. React then treats it as a different
// // component type from one render to the next, unmounts the old DOM node,
// // and mounts a fresh one in its place. For an <input>, that means every
// // keystroke destroys and rebuilds the element that currently has focus, so
// // focus is lost after each character typed. Hoisting these here and passing
// // state down as props (instead of closing over it) keeps their identity
// // stable across renders, so React updates the existing input in place.

// function Field({
//   label, name, value, onChange, type, mode, readOnly, autoComplete,
// }) {
//   return (
//     <label className="qm-field">
//       <Eyebrow style={{ marginBottom: 5 }}>{label}</Eyebrow>
//       <input
//         className={`qm-input${readOnly ? ' qm-input--readonly' : ''}`}
//         name={name}
//         value={value}
//         onChange={onChange}
//         type={type}
//         inputMode={mode}
//         autoComplete={autoComplete}
//         readOnly={readOnly}
//       />
//     </label>
//   );
// }

// /* A computed field the user may take over. The label carries the state
//    so nobody has to guess whether a number is still following the
//    formula. `active` mirrors the form's ...Edited flag; `displayValue` is
//    already resolved by the caller (raw override value, or the rounded
//    live computation) so this component stays a plain, stateless view. */
// function Derived({
//   label, name, active, displayValue, onChange, onRelease,
// }) {
//   return (
//     <label className="qm-field">
//       <span className="qm-field-label-row">
//         <Eyebrow style={{ marginBottom: 0 }}>{label}</Eyebrow>
//         <button
//           type="button"
//           onClick={onRelease}
//           disabled={!active}
//           title="Back to the calculated value"
//           className={`qm-auto-toggle${active ? ' is-active' : ''}`}
//         >
//           {active ? '↺ auto' : 'auto'}
//         </button>
//       </span>
//       <input
//         className="qm-input qm-input--auto"
//         name={name}
//         type="number"
//         inputMode="decimal"
//         value={displayValue}
//         onChange={onChange}
//       />
//     </label>
//   );
// }

// function ReadonlyAuto({ label, value, title }) {
//   return (
//     <label className="qm-field">
//       <Eyebrow style={{ marginBottom: 5 }}>{label}</Eyebrow>
//       <input
//         className="qm-input qm-input--auto qm-input--dim"
//         value={Math.round(value)}
//         readOnly
//         title={title}
//       />
//     </label>
//   );
// }

// function Section({ title, children }) {
//   return (
//     <div className="qm-section">
//       <div className="qm-section-title">{title}</div>
//       {children}
//     </div>
//   );
// }

// function DateField({
//   label, name, value, onChange,
// }) {
//   return (
//     <label className="qm-field">
//       <Eyebrow style={{ marginBottom: 5 }}>{label}</Eyebrow>
//       <input className="qm-input" type="date" name={name} value={value} onChange={onChange} />
//     </label>
//   );
// }

// export default function QuotationModal({
//   plot, user, existing, projectName = '', onClose, onSaved,
// }) {
//   const areaSqft = plot ? Math.round(plot.area * SQFT) : 0;

//   const [f, setF] = useState(() => (existing
//     ? toForm(existing)
//     : emptyForm({ plotNo: plot?.name || '', areaSqft, projectName })));
//   const [saveState, setSaveState] = useState('idle');   // idle|saving|saved|failed
//   const [err, setErr] = useState('');

//   const d = useMemo(() => derive(f), [f]);
//   const dialogRef = useRef(null);

//   // ── Focus trap + Escape-to-close ────────────────────────────────────
//   // A dialog that steals focus visually but not for the keyboard is only
//   // half accessible: without this, Tab walks a keyboard user straight out
//   // of the modal and into the page underneath it.
//   useEffect(() => {
//     const dialog = dialogRef.current;
//     if (!dialog) return undefined;

//     const getFocusable = () => Array.from(
//       dialog.querySelectorAll(
//         'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), '
//         + 'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
//       ),
//     );

//     getFocusable()[0]?.focus();

//     const onKeyDown = (e) => {
//       if (e.key === 'Escape') {
//         onClose();
//         return;
//       }
//       if (e.key !== 'Tab') return;
//       const list = getFocusable();
//       if (list.length === 0) return;
//       const first = list[0];
//       const last = list[list.length - 1];
//       if (e.shiftKey && document.activeElement === first) {
//         e.preventDefault();
//         last.focus();
//       } else if (!e.shiftKey && document.activeElement === last) {
//         e.preventDefault();
//         first.focus();
//       }
//     };

//     dialog.addEventListener('keydown', onKeyDown);
//     return () => dialog.removeEventListener('keydown', onKeyDown);
//   }, [onClose]);

//   const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
//   const setOverride = (k, flag) => (e) => setF((s) => ({
//     ...s, [k]: e.target.value, [flag]: true,
//   }));
//   const release = (flag) => () => setF((s) => ({ ...s, [flag]: false }));

//   const save = async () => {
//     if (!f.customerName.trim() || !f.mobileNumber.trim()) {
//       setErr('Customer name and mobile number are required.');
//       return;
//     }
//     /* A quotation with no author is worse than one that failed to save:
//        it writes cleanly, prints cleanly, and then never appears in any
//        employee's list, because the list filters on createdByUid and an
//        empty string matches nobody. Stop here instead. */
//     if (!userUid(user)) {
//       setErr('Not signed in properly — reload the page and sign in before saving.');
//       return;
//     }
//     setErr('');
//     setSaveState('saving');

//     const data = toDoc(f, d, user);

//     /* On an edit, authorship belongs to whoever created the record. Left
//        alone, toDoc stamps the CURRENT user onto it, so an admin opening
//        an employee's quotation to correct a rate would quietly reassign
//        it — and it would drop out of that employee's list the moment the
//        update landed. Same disappearing act, different cause. */
//     if (existing) {
//       data.createdByUid = existing.createdByUid || data.createdByUid;
//       data.createdByName = existing.createdByName || data.createdByName;
//     }

//     try {
//       const id = existing?.id
//         ? (await updateQuotation(existing.id, data), existing.id)
//         : await createQuotation(data);
//       setSaveState('saved');
//       if (onSaved) onSaved({ ...data, id });
//       setTimeout(() => setSaveState('idle'), 1600);
//     } catch (e) {
//       setSaveState('failed');
//       setErr(e?.message || 'Firestore refused the write.');
//     }
//   };

//   const print = () => {
//     /* Print what is on screen, saved or not — a customer standing at the
//        desk wants the sheet now, and the record can be saved after. */
//     const ok = printQuotation({
//       ...toDoc(f, d, user),
//       id: existing?.id,
//       stampDutyPercent: d.stampDutyPercent,
//     });
//     if (!ok) setErr('The print window was blocked. Allow pop-ups for this site.');
//   };

//   const lines = [
//     ['Total plot amount', d.total],
//     ['Agreement amount (20%)', d.agreement],
//     ['Booking amount', d.booking],
//     ['Down payment', d.down],
//     ['Balance amount', d.balance],
//     [`Stamp duty (${Math.round(d.stampDutyPercent)}%)`, d.stampDuty],
//     ['Registration', d.registration],
//     ['Admin total', d.adminTotal],
//   ];

//   const saveLabel = {
//     idle: existing ? 'Update quotation' : 'Save quotation',
//     saving: 'Saving…', saved: 'Saved', failed: 'Try again',
//   }[saveState];

//   return (
//     <div
//       onClick={onClose}
//       role="presentation"
//       className="qm-overlay"
//     >
//       <div
//         ref={dialogRef}
//         onClick={(e) => e.stopPropagation()}
//         role="dialog"
//         aria-modal="true"
//         aria-label={`Quotation for plot ${f.plotNumber}`}
//         className="qm-dialog"
//         style={{
//           '--qm-accent': ACCENT,
//           '--qm-hair': HAIR,
//           '--qm-panel': PANEL,
//           '--qm-mono': MONO,
//           '--qm-sans': SANS,
//           '--qm-green': GREEN,
//           '--qm-green-dim': GREEN_DIM,
//         }}
//       >
//         <Eyebrow>Quotation</Eyebrow>
//         <div className="qm-title">
//           PLOT {f.plotNumber || '—'}
//           {f.plotSize ? ` · ${Number(f.plotSize).toLocaleString('en-IN')} SQ FT` : ''}
//         </div>

//         {/* the running total, up top where it is read most */}
//         <div className="qm-total">
//           <span className="qm-total-label">Final total</span>
//           <span className="qm-total-value">{inr(d.finalTotal)}</span>
//         </div>

//         <Section title="Customer">
//           <div className="qm-grid">
//             <Field
//               label="Full name"
//               name="customerName"
//               value={f.customerName}
//               onChange={set('customerName')}
//               autoComplete="name"
//             />
//             <Field
//               label="Mobile number"
//               name="mobileNumber"
//               value={f.mobileNumber}
//               onChange={set('mobileNumber')}
//               type="tel"
//               mode="numeric"
//               autoComplete="tel"
//             />
//           </div>
//           <label className="qm-field" style={{ marginTop: 10 }}>
//             <Eyebrow style={{ marginBottom: 5 }}>Address</Eyebrow>
//             <textarea
//               className="qm-input qm-textarea"
//               name="address"
//               autoComplete="street-address"
//               value={f.address}
//               onChange={set('address')}
//             />
//           </label>
//         </Section>

//         <Section title="Project">
//           <div className="qm-grid">
//             <Field
//               label="Project name"
//               name="projectName"
//               value={f.projectName}
//               onChange={set('projectName')}
//             />
//             <Field
//               label="Plot number"
//               name="plotNumber"
//               value={f.plotNumber}
//               onChange={set('plotNumber')}
//               readOnly={!!plot}
//             />
//             <DateField
//               label="Quotation date"
//               name="quotationDate"
//               value={f.quotationDate}
//               onChange={set('quotationDate')}
//             />
//           </div>
//         </Section>

//         <Section title="Plot amount">
//           <div className="qm-grid">
//             <Field
//               label="Plot size (sq ft)"
//               name="plotSize"
//               value={f.plotSize}
//               onChange={set('plotSize')}
//               type="number"
//               mode="decimal"
//               readOnly={!!plot}
//             />
//             <Field
//               label="Rate / sq ft"
//               name="ratePerSqFt"
//               value={f.ratePerSqFt}
//               onChange={set('ratePerSqFt')}
//               type="number"
//               mode="decimal"
//             />
//             <Derived
//               label="Total plot amount"
//               name="totalPlotAmount"
//               active={f.totalEdited}
//               displayValue={f.totalEdited ? f.totalPlotAmount : Math.round(d.total)}
//               onChange={setOverride('totalPlotAmount', 'totalEdited')}
//               onRelease={release('totalEdited')}
//             />
//             <ReadonlyAuto label="Agreement amount (20%)" value={d.agreement} />
//             <Field
//               label="Booking amount"
//               name="bookingAmount"
//               value={f.bookingAmount}
//               onChange={set('bookingAmount')}
//               type="number"
//               mode="decimal"
//             />
//             <label className="qm-field">
//               <Eyebrow style={{ marginBottom: 5 }}>Down payment plan</Eyebrow>
//               <select
//                 className="qm-input"
//                 name="downPaymentOption"
//                 value={f.downPaymentOption}
//                 onChange={(e) => setF((s) => ({
//                   ...s, downPaymentOption: e.target.value, downPaymentEdited: false,
//                 }))}
//               >
//                 <option value="10%">Down payment 10%</option>
//                 <option value="20%">Down payment 20%</option>
//               </select>
//             </label>
//             <Derived
//               label={`Down payment (${f.downPaymentOption} − booking)`}
//               name="downPayment"
//               active={f.downPaymentEdited}
//               displayValue={f.downPaymentEdited ? f.downPayment : Math.round(d.down)}
//               onChange={setOverride('downPayment', 'downPaymentEdited')}
//               onRelease={release('downPaymentEdited')}
//             />
//             <ReadonlyAuto label="Balance amount" value={d.balance} />
//           </div>
//         </Section>

//         <Section title="Payment milestone dates">
//           <div className="qm-grid">
//             <DateField
//               label="Booking date"
//               name="bookingDate"
//               value={f.bookingDate}
//               onChange={set('bookingDate')}
//             />
//             <DateField
//               label="Down payment date"
//               name="downPaymentDate"
//               value={f.downPaymentDate}
//               onChange={set('downPaymentDate')}
//             />
//             <DateField
//               label="Sale deed date"
//               name="saleDeedDate"
//               value={f.saleDeedDate}
//               onChange={set('saleDeedDate')}
//             />
//           </div>
//         </Section>

//         <Section title="Stamp duty & registration">
//           <div className="qm-grid">
//             <Field
//               label="Stamp duty %"
//               name="stampDutyPercent"
//               value={f.stampDutyPercent}
//               onChange={set('stampDutyPercent')}
//               type="number"
//               mode="decimal"
//             />
//             <ReadonlyAuto label="Stamp duty amount" value={d.stampDuty} />
//             <ReadonlyAuto
//               label="Registration (1% ≤ ₹30L, else ₹30,000)"
//               value={d.registration}
//             />
//           </div>
//         </Section>

//         <Section title="Administrative charges">
//           <div className="qm-grid">
//             <Field
//               label="Mutation & 7/12"
//               name="mutation"
//               value={f.mutation}
//               onChange={set('mutation')}
//               type="number"
//               mode="decimal"
//             />
//             <Field
//               label="Maintenance (3 years)"
//               name="societyCharges"
//               value={f.societyCharges}
//               onChange={set('societyCharges')}
//               type="number"
//               mode="decimal"
//             />
//             <Derived
//               label="Admin total"
//               name="adminTotal"
//               active={f.adminEdited}
//               displayValue={f.adminEdited ? f.adminTotal : Math.round(d.adminTotal)}
//               onChange={setOverride('adminTotal', 'adminEdited')}
//               onRelease={release('adminEdited')}
//             />
//           </div>
//         </Section>

//         <div className="qm-lines">
//           {lines.map(([l, v]) => (
//             <div key={l} className="qm-line">
//               <span>{l}</span><span>{inr(v)}</span>
//             </div>
//           ))}
//         </div>

//         {err && (
//           <div className="qm-error" role="alert">
//             {err}
//           </div>
//         )}

//         <div className="qm-actions">
//           <button
//             type="button"
//             onClick={save}
//             disabled={saveState === 'saving'}
//             className={`qm-btn qm-btn--primary${saveState === 'saved' ? ' is-saved' : ''}`}
//           >
//             {saveLabel}
//           </button>
//           <button type="button" onClick={print} className="qm-btn qm-btn--outline">
//             Print / PDF
//           </button>
//           <button type="button" onClick={onClose} className="qm-btn qm-btn--ghost">
//             Close
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }






// import React, {
//   useEffect, useMemo, useRef, useState,
// } from 'react';
// import Eyebrow from '../ui/Eyebrow';
// import { SQFT, inr } from '../../lib/units';
// import { ACCENT, HAIR, MONO, PANEL, SANS } from '../../theme/tokens';
// import {
//   derive, emptyForm, toDoc, toForm, userUid,
// } from '../../lib/Quote';
// import { createQuotation, updateQuotation } from '../../services/Quotationservice';
// import { printQuotation } from '../../lib/quotationHtml';
// import '../../styles/Quotationmodal.css';

// /**
//  * The full quotation, ported from create_quotation_screen.dart.
//  *
//  * The plot search is gone: on the phone you type a plot number because
//  * there is no map in front of you, whereas here the plot arrives from
//  * the layout you just clicked. Plot number and size come in read-only
//  * for that reason — they are facts about the drawing, not opinions.
//  *
//  * Everything computed is shown in green and stays EDITABLE. Overriding
//  * one sets its flag and derive() stops owning it; the ↺ hands it back.
//  * That is the same behaviour as the Flutter screen's
//  * _isDownPaymentManuallyEdited, generalised to the three fields that
//  * need it rather than special-cased for one.
//  */

// const GREEN = '#8CC98F';
// const GREEN_DIM = 'rgba(140,201,143,0.55)';

// // ── Field building blocks ───────────────────────────────────────────────
// // These live OUTSIDE QuotationModal on purpose. Defining a component inside
// // another component's function body means it's re-created — a brand new
// // function identity — on every render. React then treats it as a different
// // component type from one render to the next, unmounts the old DOM node,
// // and mounts a fresh one in its place. For an <input>, that means every
// // keystroke destroys and rebuilds the element that currently has focus, so
// // focus is lost after each character typed. Hoisting these here and passing
// // state down as props (instead of closing over it) keeps their identity
// // stable across renders, so React updates the existing input in place.

// function Field({
//   label, name, value, onChange, type, mode, readOnly, autoComplete,
// }) {
//   return (
//     <label className="qm-field">
//       <Eyebrow style={{ marginBottom: 5 }}>{label}</Eyebrow>
//       <input
//         className={`qm-input${readOnly ? ' qm-input--readonly' : ''}`}
//         name={name}
//         value={value}
//         onChange={onChange}
//         type={type}
//         inputMode={mode}
//         autoComplete={autoComplete}
//         readOnly={readOnly}
//       />
//     </label>
//   );
// }

// /* A computed field the user may take over. The label carries the state
//    so nobody has to guess whether a number is still following the
//    formula. `active` mirrors the form's ...Edited flag; `displayValue` is
//    already resolved by the caller (raw override value, or the rounded
//    live computation) so this component stays a plain, stateless view. */
// function Derived({
//   label, name, active, displayValue, onChange, onRelease,
// }) {
//   return (
//     <label className="qm-field">
//       <span className="qm-field-label-row">
//         <Eyebrow style={{ marginBottom: 0 }}>{label}</Eyebrow>
//         <button
//           type="button"
//           onClick={onRelease}
//           disabled={!active}
//           title="Back to the calculated value"
//           className={`qm-auto-toggle${active ? ' is-active' : ''}`}
//         >
//           {active ? '↺ auto' : 'auto'}
//         </button>
//       </span>
//       <input
//         className="qm-input qm-input--auto"
//         name={name}
//         type="number"
//         inputMode="decimal"
//         value={displayValue}
//         onChange={onChange}
//       />
//     </label>
//   );
// }

// function ReadonlyAuto({ label, value, title }) {
//   return (
//     <label className="qm-field">
//       <Eyebrow style={{ marginBottom: 5 }}>{label}</Eyebrow>
//       <input
//         className="qm-input qm-input--auto qm-input--dim"
//         value={Math.round(value)}
//         readOnly
//         title={title}
//       />
//     </label>
//   );
// }

// function Section({ title, children }) {
//   return (
//     <div className="qm-section">
//       <div className="qm-section-title">{title}</div>
//       {children}
//     </div>
//   );
// }

// function DateField({
//   label, name, value, onChange,
// }) {
//   return (
//     <label className="qm-field">
//       <Eyebrow style={{ marginBottom: 5 }}>{label}</Eyebrow>
//       <input className="qm-input" type="date" name={name} value={value} onChange={onChange} />
//     </label>
//   );
// }

// export default function QuotationModal({
//   plot, user, existing, projectName = '', onClose, onSaved,
// }) {
//   const areaSqft = plot ? Math.round(plot.area * SQFT) : 0;

//   const [f, setF] = useState(() => (existing
//     ? toForm(existing)
//     : emptyForm({ plotNo: plot?.name || '', areaSqft, projectName })));
//   const [saveState, setSaveState] = useState('idle');   // idle|saving|saved|failed
//   const [err, setErr] = useState('');

//   const d = useMemo(() => derive(f), [f]);
//   const dialogRef = useRef(null);

//   // ── Focus trap + Escape-to-close ────────────────────────────────────
//   // A dialog that steals focus visually but not for the keyboard is only
//   // half accessible: without this, Tab walks a keyboard user straight out
//   // of the modal and into the page underneath it.
//   useEffect(() => {
//     const dialog = dialogRef.current;
//     if (!dialog) return undefined;

//     const getFocusable = () => Array.from(
//       dialog.querySelectorAll(
//         'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), '
//         + 'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
//       ),
//     );

//     getFocusable()[0]?.focus();

//     const onKeyDown = (e) => {
//       if (e.key === 'Escape') {
//         onClose();
//         return;
//       }
//       if (e.key !== 'Tab') return;
//       const list = getFocusable();
//       if (list.length === 0) return;
//       const first = list[0];
//       const last = list[list.length - 1];
//       if (e.shiftKey && document.activeElement === first) {
//         e.preventDefault();
//         last.focus();
//       } else if (!e.shiftKey && document.activeElement === last) {
//         e.preventDefault();
//         first.focus();
//       }
//     };

//     dialog.addEventListener('keydown', onKeyDown);
//     return () => dialog.removeEventListener('keydown', onKeyDown);
//   }, [onClose]);

//   const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
//   const setOverride = (k, flag) => (e) => setF((s) => ({
//     ...s, [k]: e.target.value, [flag]: true,
//   }));
//   const release = (flag) => () => setF((s) => ({ ...s, [flag]: false }));

//   const save = async () => {
//     if (!f.customerName.trim() || !f.mobileNumber.trim()) {
//       setErr('Customer name and mobile number are required.');
//       return;
//     }
//     /* A quotation with no author is worse than one that failed to save:
//        it writes cleanly, prints cleanly, and then never appears in any
//        employee's list, because the list filters on createdByUid and an
//        empty string matches nobody. Stop here instead. */
//     if (!userUid(user)) {
//       setErr('Not signed in properly — reload the page and sign in before saving.');
//       return;
//     }
//     setErr('');
//     setSaveState('saving');

//     const data = toDoc(f, d, user);

//     /* On an edit, authorship belongs to whoever created the record. Left
//        alone, toDoc stamps the CURRENT user onto it, so an admin opening
//        an employee's quotation to correct a rate would quietly reassign
//        it — and it would drop out of that employee's list the moment the
//        update landed. Same disappearing act, different cause. */
//     if (existing) {
//       data.createdByUid = existing.createdByUid || data.createdByUid;
//       data.createdByName = existing.createdByName || data.createdByName;
//     }

//     try {
//       const id = existing?.id
//         ? (await updateQuotation(existing.id, data), existing.id)
//         : await createQuotation(data);
//       setSaveState('saved');
//       if (onSaved) onSaved({ ...data, id });
//       setTimeout(() => setSaveState('idle'), 1600);
//     } catch (e) {
//       setSaveState('failed');
//       setErr(e?.message || 'Firestore refused the write.');
//     }
//   };

//   const print = () => {
//     /* Print what is on screen, saved or not — a customer standing at the
//        desk wants the sheet now, and the record can be saved after. */
//     const ok = printQuotation({
//       ...toDoc(f, d, user),
//       id: existing?.id,
//       stampDutyPercent: d.stampDutyPercent,
//     });
//     if (!ok) setErr('The print window was blocked. Allow pop-ups for this site.');
//   };

//   const lines = [
//     ['Total plot amount', d.total],
//     ['Agreement amount (20%)', d.agreement],
//     ['Booking amount', d.booking],
//     ['Down payment', d.down],
//     ['Balance amount', d.balance],
//     [`Stamp duty (${Math.round(d.stampDutyPercent)}%)`, d.stampDuty],
//     ['Registration', d.registration],
//     ['Admin total', d.adminTotal],
//   ];

//   const saveLabel = {
//     idle: existing ? 'Update quotation' : 'Save quotation',
//     saving: 'Saving…', saved: 'Saved', failed: 'Try again',
//   }[saveState];

//   return (
//     <div
//       onClick={onClose}
//       role="presentation"
//       className="qm-overlay"
//     >
//       <div
//         ref={dialogRef}
//         onClick={(e) => e.stopPropagation()}
//         role="dialog"
//         aria-modal="true"
//         aria-label={`Quotation for plot ${f.plotNumber}`}
//         className="qm-dialog"
//         style={{
//           '--qm-accent': ACCENT,
//           '--qm-hair': HAIR,
//           '--qm-panel': PANEL,
//           '--qm-mono': MONO,
//           '--qm-sans': SANS,
//           '--qm-green': GREEN,
//           '--qm-green-dim': GREEN_DIM,
//         }}
//       >
//         <Eyebrow>Quotation</Eyebrow>
//         <div className="qm-title">
//           PLOT {f.plotNumber || '—'}
//           {f.plotSize ? ` · ${Number(f.plotSize).toLocaleString('en-IN')} SQ FT` : ''}
//         </div>

//         {/* the running total, up top where it is read most */}
//         <div className="qm-total">
//           <span className="qm-total-label">Final total</span>
//           <span className="qm-total-value">{inr(d.finalTotal)}</span>
//         </div>

//         <Section title="Customer">
//           <div className="qm-grid">
//             <Field
//               label="Full name"
//               name="customerName"
//               value={f.customerName}
//               onChange={set('customerName')}
//               autoComplete="name"
//             />
//             <Field
//               label="Mobile number"
//               name="mobileNumber"
//               value={f.mobileNumber}
//               onChange={set('mobileNumber')}
//               type="tel"
//               mode="numeric"
//               autoComplete="tel"
//             />
//           </div>
//           <label className="qm-field" style={{ marginTop: 10 }}>
//             <Eyebrow style={{ marginBottom: 5 }}>Address</Eyebrow>
//             <textarea
//               className="qm-input qm-textarea"
//               name="address"
//               autoComplete="street-address"
//               value={f.address}
//               onChange={set('address')}
//             />
//           </label>
//         </Section>

//         <Section title="Project">
//           <div className="qm-grid">
//             <Field
//               label="Project name"
//               name="projectName"
//               value={f.projectName}
//               onChange={set('projectName')}
//             />
//             <Field
//               label="Plot number"
//               name="plotNumber"
//               value={f.plotNumber}
//               onChange={set('plotNumber')}
//               readOnly={!!plot}
//             />
//             <DateField
//               label="Quotation date"
//               name="quotationDate"
//               value={f.quotationDate}
//               onChange={set('quotationDate')}
//             />
//           </div>
//         </Section>

//         <Section title="Plot amount">
//           <div className="qm-grid">
//             <Field
//               label="Plot size (sq ft)"
//               name="plotSize"
//               value={f.plotSize}
//               onChange={set('plotSize')}
//               type="number"
//               mode="decimal"
//               readOnly={!!plot}
//             />
//             <Field
//               label="Rate / sq ft"
//               name="ratePerSqFt"
//               value={f.ratePerSqFt}
//               onChange={set('ratePerSqFt')}
//               type="number"
//               mode="decimal"
//             />
//             <Derived
//               label="Total plot amount"
//               name="totalPlotAmount"
//               active={f.totalEdited}
//               displayValue={f.totalEdited ? f.totalPlotAmount : Math.round(d.total)}
//               onChange={setOverride('totalPlotAmount', 'totalEdited')}
//               onRelease={release('totalEdited')}
//             />
//             <ReadonlyAuto label="Agreement amount (20%)" value={d.agreement} />
//             <Field
//               label="Booking amount"
//               name="bookingAmount"
//               value={f.bookingAmount}
//               onChange={set('bookingAmount')}
//               type="number"
//               mode="decimal"
//             />
//             <label className="qm-field">
//               <Eyebrow style={{ marginBottom: 5 }}>Down payment plan</Eyebrow>
//               <select
//                 className="qm-input"
//                 name="downPaymentOption"
//                 value={f.downPaymentOption}
//                 onChange={(e) => setF((s) => ({
//                   ...s, downPaymentOption: e.target.value, downPaymentEdited: false,
//                 }))}
//               >
//                 <option value="10%">Down payment 10%</option>
//                 <option value="20%">Down payment 20%</option>
//               </select>
//             </label>
//             <Derived
//               label={`Down payment (${f.downPaymentOption} − booking)`}
//               name="downPayment"
//               active={f.downPaymentEdited}
//               displayValue={f.downPaymentEdited ? f.downPayment : Math.round(d.down)}
//               onChange={setOverride('downPayment', 'downPaymentEdited')}
//               onRelease={release('downPaymentEdited')}
//             />
//             <ReadonlyAuto label="Balance amount" value={d.balance} />
//           </div>
//         </Section>

//         <Section title="Payment milestone dates">
//           <div className="qm-grid">
//             <DateField
//               label="Booking date"
//               name="bookingDate"
//               value={f.bookingDate}
//               onChange={set('bookingDate')}
//             />
//             <DateField
//               label="Down payment date"
//               name="downPaymentDate"
//               value={f.downPaymentDate}
//               onChange={set('downPaymentDate')}
//             />
//             <DateField
//               label="Sale deed date"
//               name="saleDeedDate"
//               value={f.saleDeedDate}
//               onChange={set('saleDeedDate')}
//             />
//           </div>
//         </Section>

//         <Section title="Stamp duty & registration">
//           <div className="qm-grid">
//             <Field
//               label="Stamp duty %"
//               name="stampDutyPercent"
//               value={f.stampDutyPercent}
//               onChange={set('stampDutyPercent')}
//               type="number"
//               mode="decimal"
//             />
//             <ReadonlyAuto label="Stamp duty amount" value={d.stampDuty} />
//             <ReadonlyAuto
//               label="Registration (1% ≤ ₹30L, else ₹30,000)"
//               value={d.registration}
//             />
//           </div>
//         </Section>

//         <Section title="Administrative charges">
//           <div className="qm-grid">
//             <Field
//               label="Mutation & 7/12"
//               name="mutation"
//               value={f.mutation}
//               onChange={set('mutation')}
//               type="number"
//               mode="decimal"
//             />
//             <Field
//               label="Maintenance (3 years)"
//               name="societyCharges"
//               value={f.societyCharges}
//               onChange={set('societyCharges')}
//               type="number"
//               mode="decimal"
//             />
//             <Derived
//               label="Admin total"
//               name="adminTotal"
//               active={f.adminEdited}
//               displayValue={f.adminEdited ? f.adminTotal : Math.round(d.adminTotal)}
//               onChange={setOverride('adminTotal', 'adminEdited')}
//               onRelease={release('adminEdited')}
//             />
//           </div>
//         </Section>

//         <div className="qm-lines">
//           {lines.map(([l, v]) => (
//             <div key={l} className="qm-line">
//               <span>{l}</span><span>{inr(v)}</span>
//             </div>
//           ))}
//         </div>

//         {err && (
//           <div className="qm-error" role="alert">
//             {err}
//           </div>
//         )}

//         <div className="qm-actions">
//           <button
//             type="button"
//             onClick={save}
//             disabled={saveState === 'saving'}
//             className={`qm-btn qm-btn--primary${saveState === 'saved' ? ' is-saved' : ''}`}
//           >
//             {saveLabel}
//           </button>
//           <button type="button" onClick={print} className="qm-btn qm-btn--outline">
//             Print / PDF
//           </button>
//           <button type="button" onClick={onClose} className="qm-btn qm-btn--ghost">
//             Close
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }













import React, {
  useEffect, useMemo, useRef, useState,
} from 'react';
import Eyebrow from '../ui/Eyebrow';
import { SQFT, inr } from '../../lib/units';
import { ACCENT, HAIR, MONO, PANEL, SANS } from '../../theme/tokens';
import {
  derive, emptyForm, toDoc, toForm, userUid,
} from '../../lib/Quote';
import { createQuotation, updateQuotation } from '../../services/Quotationservice';
import { printQuotation } from '../../lib/quotationHtml';
import '../../styles/Quotationmodal.css';

/**
 * The full quotation, ported from create_quotation_screen.dart.
 *
 * The plot search is gone: on the phone you type a plot number because
 * there is no map in front of you, whereas here the plot arrives from
 * the layout you just clicked. Plot number and size come in read-only
 * for that reason — they are facts about the drawing, not opinions.
 *
 * Everything computed is shown in green and stays EDITABLE. Overriding
 * one sets its flag and derive() stops owning it; the ↺ hands it back.
 * That is the same behaviour as the Flutter screen's
 * _isDownPaymentManuallyEdited, generalised to the three fields that
 * need it rather than special-cased for one.
 */

const GREEN = '#8CC98F';
const GREEN_DIM = 'rgba(140,201,143,0.55)';

// ── Field building blocks ───────────────────────────────────────────────
// These live OUTSIDE QuotationModal on purpose. Defining a component inside
// another component's function body means it's re-created — a brand new
// function identity — on every render. React then treats it as a different
// component type from one render to the next, unmounts the old DOM node,
// and mounts a fresh one in its place. For an <input>, that means every
// keystroke destroys and rebuilds the element that currently has focus, so
// focus is lost after each character typed. Hoisting these here and passing
// state down as props (instead of closing over it) keeps their identity
// stable across renders, so React updates the existing input in place.

function Field({
  label, name, value, onChange, type, mode, readOnly, autoComplete,
}) {
  return (
    <label className="qm-field">
      <Eyebrow style={{ marginBottom: 5 }}>{label}</Eyebrow>
      <input
        className={`qm-input${readOnly ? ' qm-input--readonly' : ''}`}
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        inputMode={mode}
        autoComplete={autoComplete}
        readOnly={readOnly}
      />
    </label>
  );
}

/* A computed field the user may take over. The label carries the state
   so nobody has to guess whether a number is still following the
   formula. `active` mirrors the form's ...Edited flag; `displayValue` is
   already resolved by the caller (raw override value, or the rounded
   live computation) so this component stays a plain, stateless view. */
function Derived({
  label, name, active, displayValue, onChange, onRelease,
}) {
  return (
    <label className="qm-field">
      <span className="qm-field-label-row">
        <Eyebrow style={{ marginBottom: 0 }}>{label}</Eyebrow>
        <button
          type="button"
          onClick={onRelease}
          disabled={!active}
          title="Back to the calculated value"
          className={`qm-auto-toggle${active ? ' is-active' : ''}`}
        >
          {active ? '↺ auto' : 'auto'}
        </button>
      </span>
      <input
        className="qm-input qm-input--auto"
        name={name}
        type="number"
        inputMode="decimal"
        value={displayValue}
        onChange={onChange}
      />
    </label>
  );
}

function ReadonlyAuto({ label, value, title }) {
  return (
    <label className="qm-field">
      <Eyebrow style={{ marginBottom: 5 }}>{label}</Eyebrow>
      <input
        className="qm-input qm-input--auto qm-input--dim"
        value={Math.round(value)}
        readOnly
        title={title}
      />
    </label>
  );
}

function Section({ title, children }) {
  return (
    <div className="qm-section">
      <div className="qm-section-title">{title}</div>
      {children}
    </div>
  );
}

function DateField({
  label, name, value, onChange,
}) {
  return (
    <label className="qm-field">
      <Eyebrow style={{ marginBottom: 5 }}>{label}</Eyebrow>
      <input className="qm-input" type="date" name={name} value={value} onChange={onChange} />
    </label>
  );
}

export default function QuotationModal({
  plot, user, existing, projectName = '', onClose, onSaved,
}) {
  const areaSqft = plot ? Math.round(plot.area * SQFT) : 0;

  const [f, setF] = useState(() => (existing
    ? toForm(existing)
    : emptyForm({ plotNo: plot?.name || '', areaSqft, projectName })));
  const [saveState, setSaveState] = useState('idle');   // idle|saving|saved|failed
  const [err, setErr] = useState('');

  const d = useMemo(() => derive(f), [f]);
  const dialogRef = useRef(null);

  // ── Focus trap + Escape-to-close ────────────────────────────────────
  // A dialog that steals focus visually but not for the keyboard is only
  // half accessible: without this, Tab walks a keyboard user straight out
  // of the modal and into the page underneath it.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const getFocusable = () => Array.from(
      dialog.querySelectorAll(
        'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), '
        + 'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );

    getFocusable()[0]?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = getFocusable();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener('keydown', onKeyDown);
    return () => dialog.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setOverride = (k, flag) => (e) => setF((s) => ({
    ...s, [k]: e.target.value, [flag]: true,
  }));
  const release = (flag) => () => setF((s) => ({ ...s, [flag]: false }));

  const save = async () => {
    if (!f.customerName.trim() || !f.mobileNumber.trim()) {
      setErr('Customer name and mobile number are required.');
      return;
    }
    /* A quotation with no author is worse than one that failed to save:
       it writes cleanly, prints cleanly, and then never appears in any
       employee's list, because the list filters on createdByUid and an
       empty string matches nobody. Stop here instead. */
    if (!userUid(user)) {
      setErr('Not signed in properly — reload the page and sign in before saving.');
      return;
    }
    setErr('');
    setSaveState('saving');

    const data = toDoc(f, d, user);

    /* On an edit, authorship belongs to whoever created the record. Left
       alone, toDoc stamps the CURRENT user onto it, so an admin opening
       an employee's quotation to correct a rate would quietly reassign
       it — and it would drop out of that employee's list the moment the
       update landed. Same disappearing act, different cause. */
    if (existing) {
      data.createdByUid = existing.createdByUid || data.createdByUid;
      data.createdByName = existing.createdByName || data.createdByName;
    }

    try {
      const id = existing?.id
        ? (await updateQuotation(existing.id, data), existing.id)
        : await createQuotation(data);
      setSaveState('saved');
      if (onSaved) onSaved({ ...data, id });
      setTimeout(() => setSaveState('idle'), 1600);
    } catch (e) {
      setSaveState('failed');
      setErr(e?.message || 'Firestore refused the write.');
    }
  };

  const print = () => {
    /* Print what is on screen, saved or not — a customer standing at the
       desk wants the sheet now, and the record can be saved after. */
    const ok = printQuotation({
      ...toDoc(f, d, user),
      id: existing?.id,
      stampDutyPercent: d.stampDutyPercent,
    });
    if (!ok) setErr('The print window was blocked. Allow pop-ups for this site.');
  };

  const lines = [
    ['Total plot amount', d.total],
    ['Agreement amount (20%)', d.agreement],
    ['Booking amount', d.booking],
    ['Down payment', d.down],
    ['Balance amount', d.balance],
    [`Stamp duty (${Math.round(d.stampDutyPercent)}%)`, d.stampDuty],
    ['Registration', d.registration],
    ['Admin total', d.adminTotal],
  ];

  const saveLabel = {
    idle: existing ? 'Update quotation' : 'Save quotation',
    saving: 'Saving…', saved: 'Saved', failed: 'Try again',
  }[saveState];

  return (
    <div
      onClick={onClose}
      role="presentation"
      className="qm-overlay"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Quotation for plot ${f.plotNumber}`}
        className="qm-dialog"
        style={{
          '--qm-accent': ACCENT,
          '--qm-hair': HAIR,
          '--qm-panel': PANEL,
          '--qm-mono': MONO,
          '--qm-sans': SANS,
          '--qm-green': GREEN,
          '--qm-green-dim': GREEN_DIM,
        }}
      >
        <Eyebrow>Quotation</Eyebrow>
        <div className="qm-title">
          PLOT {f.plotNumber || '—'}
          {f.plotSize ? ` · ${Number(f.plotSize).toLocaleString('en-IN')} SQ FT` : ''}
        </div>

        {/* the running total, up top where it is read most */}
        <div className="qm-total">
          <span className="qm-total-label">Final total</span>
          <span className="qm-total-value">{inr(d.finalTotal)}</span>
        </div>

        <Section title="Customer">
          <div className="qm-grid">
            <Field
              label="Full name"
              name="customerName"
              value={f.customerName}
              onChange={set('customerName')}
              autoComplete="name"
            />
            <Field
              label="Mobile number"
              name="mobileNumber"
              value={f.mobileNumber}
              onChange={set('mobileNumber')}
              type="tel"
              mode="numeric"
              autoComplete="tel"
            />
          </div>
          <label className="qm-field" style={{ marginTop: 10 }}>
            <Eyebrow style={{ marginBottom: 5 }}>Address</Eyebrow>
            <textarea
              className="qm-input qm-textarea"
              name="address"
              autoComplete="street-address"
              value={f.address}
              onChange={set('address')}
            />
          </label>
        </Section>

        <Section title="Project">
          <div className="qm-grid">
            <Field
              label="Project name"
              name="projectName"
              value={f.projectName}
              onChange={set('projectName')}
            />
            <Field
              label="Plot number"
              name="plotNumber"
              value={f.plotNumber}
              onChange={set('plotNumber')}
              readOnly={!!plot}
            />
            <DateField
              label="Quotation date"
              name="quotationDate"
              value={f.quotationDate}
              onChange={set('quotationDate')}
            />
          </div>
        </Section>

        <Section title="Plot amount">
          <div className="qm-grid">
            <Field
              label="Plot size (sq ft)"
              name="plotSize"
              value={f.plotSize}
              onChange={set('plotSize')}
              type="number"
              mode="decimal"
              readOnly={!!plot}
            />
            <Field
              label="Rate / sq ft"
              name="ratePerSqFt"
              value={f.ratePerSqFt}
              onChange={set('ratePerSqFt')}
              type="number"
              mode="decimal"
            />
            <Derived
              label="Total plot amount"
              name="totalPlotAmount"
              active={f.totalEdited}
              displayValue={f.totalEdited ? f.totalPlotAmount : Math.round(d.total)}
              onChange={setOverride('totalPlotAmount', 'totalEdited')}
              onRelease={release('totalEdited')}
            />
            <ReadonlyAuto label="Agreement amount (20%)" value={d.agreement} />
            <Field
              label="Booking amount"
              name="bookingAmount"
              value={f.bookingAmount}
              onChange={set('bookingAmount')}
              type="number"
              mode="decimal"
            />
            <label className="qm-field">
              <Eyebrow style={{ marginBottom: 5 }}>Down payment plan</Eyebrow>
              <select
                className="qm-input"
                name="downPaymentOption"
                value={f.downPaymentOption}
                onChange={(e) => setF((s) => ({
                  ...s, downPaymentOption: e.target.value, downPaymentEdited: false,
                }))}
              >
                <option value="10%">Down payment 10%</option>
                <option value="20%">Down payment 20%</option>
              </select>
            </label>
            <Derived
              label={`Down payment (${f.downPaymentOption} − booking)`}
              name="downPayment"
              active={f.downPaymentEdited}
              displayValue={f.downPaymentEdited ? f.downPayment : Math.round(d.down)}
              onChange={setOverride('downPayment', 'downPaymentEdited')}
              onRelease={release('downPaymentEdited')}
            />
            <ReadonlyAuto label="Balance amount" value={d.balance} />
          </div>
        </Section>

        <Section title="Payment milestone dates">
          <div className="qm-grid">
            <DateField
              label="Booking date"
              name="bookingDate"
              value={f.bookingDate}
              onChange={set('bookingDate')}
            />
            <DateField
              label="Down payment date"
              name="downPaymentDate"
              value={f.downPaymentDate}
              onChange={set('downPaymentDate')}
            />
            <DateField
              label="Sale deed date"
              name="saleDeedDate"
              value={f.saleDeedDate}
              onChange={set('saleDeedDate')}
            />
          </div>
        </Section>

        <Section title="Stamp duty & registration">
          <div className="qm-grid">
            <Field
              label="Stamp duty %"
              name="stampDutyPercent"
              value={f.stampDutyPercent}
              onChange={set('stampDutyPercent')}
              type="number"
              mode="decimal"
            />
            <ReadonlyAuto label="Stamp duty amount" value={d.stampDuty} />
            <ReadonlyAuto
              label="Registration (1% ≤ ₹30L, else ₹30,000)"
              value={d.registration}
            />
          </div>
        </Section>

        <Section title="Administrative charges">
          <div className="qm-grid">
            <Field
              label="Mutation & 7/12"
              name="mutation"
              value={f.mutation}
              onChange={set('mutation')}
              type="number"
              mode="decimal"
            />
            <Field
              label="Maintenance (3 years)"
              name="societyCharges"
              value={f.societyCharges}
              onChange={set('societyCharges')}
              type="number"
              mode="decimal"
            />
            <Derived
              label="Admin total"
              name="adminTotal"
              active={f.adminEdited}
              displayValue={f.adminEdited ? f.adminTotal : Math.round(d.adminTotal)}
              onChange={setOverride('adminTotal', 'adminEdited')}
              onRelease={release('adminEdited')}
            />
          </div>
        </Section>

        <div className="qm-lines">
          {lines.map(([l, v]) => (
            <div key={l} className="qm-line">
              <span>{l}</span><span>{inr(v)}</span>
            </div>
          ))}
        </div>

        {err && (
          <div className="qm-error" role="alert">
            {err}
          </div>
        )}

        <div className="qm-actions">
          <button
            type="button"
            onClick={save}
            disabled={saveState === 'saving'}
            className={`qm-btn qm-btn--primary${saveState === 'saved' ? ' is-saved' : ''}`}
          >
            {saveLabel}
          </button>
          <button type="button" onClick={print} className="qm-btn qm-btn--outline">
            Print / PDF
          </button>
          <button type="button" onClick={onClose} className="qm-btn qm-btn--ghost">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}