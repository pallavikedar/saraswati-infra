// // lib/quote.js — the arithmetic behind a quotation, and nothing else.

// /**
//  * The Flutter screen does this with sixteen TextEditingControllers, each
//  * listening to the others, guarded by an _isRecalculating flag to stop
//  * the listeners from re-entering. That guard exists because the inputs
//  * and the outputs live in the same mutable place.
//  *
//  * Here they don't. The form holds only what the user TYPED, and derive()
//  * computes everything else on each render. There is no recalculation
//  * step to guard, no ordering between fields, and no way for a computed
//  * value to drift out of step with the numbers it came from.
//  *
//  * Three fields are both computed AND editable — total, down payment and
//  * admin total. Each carries an "edited" flag: false means derive owns
//  * it, true means the user has taken it over. That is the whole of the
//  * override mechanism, and it's why the reset arrow just sets a flag back
//  * to false.
//  */

// const num = (v, d = 0) => {
//   const n = parseFloat(v);
//   return Number.isFinite(n) ? n : d;
// };

// export const AGREEMENT_PCT = 0.20;
// export const REG_CAP = 3000000;      // ₹30 lakh
// export const REG_PCT = 0.01;
// export const REG_FIXED = 30000;

// export const BOOKING_DEFAULT = 51000;
// export const MUTATION_DEFAULT = 15000;
// export const SOCIETY_DEFAULT = 13500;
// export const STAMP_PCT_DEFAULT = 6;

// /** 1% up to ₹30L, a flat ₹30,000 above it. */
// export const autoRegistration = (total) => (
//   total <= REG_CAP ? total * REG_PCT : REG_FIXED
// );

// /** yyyy-mm-dd for <input type="date">; '' for nothing. */
// export const dateIn = (d) => {
//   if (!d) return '';
//   const x = d.toDate ? d.toDate() : new Date(d);
//   if (Number.isNaN(x.getTime())) return '';
//   const p = (n) => String(n).padStart(2, '0');
//   return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
// };

// export const dateOut = (s) => (s ? new Date(`${s}T00:00:00`) : null);

// export function emptyForm({ plotNo = '', areaSqft = 0, projectName = '' } = {}) {
//   return {
//     customerName: '',
//     mobileNumber: '',
//     address: '',
//     projectName,
//     plotNumber: plotNo,
//     plotSize: areaSqft ? String(Math.round(areaSqft)) : '',
//     ratePerSqFt: '',
//     bookingAmount: String(BOOKING_DEFAULT),
//     downPaymentOption: '20%',
//     downPayment: '',
//     stampDutyPercent: String(STAMP_PCT_DEFAULT),
//     mutation: String(MUTATION_DEFAULT),
//     societyCharges: String(SOCIETY_DEFAULT),
//     totalPlotAmount: '',
//     adminTotal: '',
//     quotationDate: dateIn(new Date()),
//     bookingDate: '',
//     downPaymentDate: '',
//     saleDeedDate: '',
//     totalEdited: false,
//     downPaymentEdited: false,
//     adminEdited: false,
//   };
// }

// /** Everything computed, in one pass, from what the user typed. */
// export function derive(f) {
//   const size = num(f.plotSize);
//   const rate = num(f.ratePerSqFt);
//   const booking = num(f.bookingAmount);
//   const sdPct = num(f.stampDutyPercent, STAMP_PCT_DEFAULT);
//   const mutation = num(f.mutation);
//   const society = num(f.societyCharges);

//   const total = f.totalEdited ? num(f.totalPlotAmount) : size * rate;
//   const agreement = total * AGREEMENT_PCT;

//   const pct = f.downPaymentOption === '10%' ? 0.10 : 0.20;
//   const autoDown = Math.max(0, total * pct - booking);
//   const down = f.downPaymentEdited ? num(f.downPayment) : autoDown;

//   const balance = Math.max(0, total - booking - down);
//   const stampDuty = (total * sdPct) / 100;
//   const registration = autoRegistration(total);

//   const autoAdmin = stampDuty + registration + mutation + society;
//   const adminTotal = f.adminEdited ? num(f.adminTotal) : autoAdmin;

//   return {
//     total,
//     agreement,
//     booking,
//     autoDown,
//     down,
//     balance,
//     stampDutyPercent: sdPct,
//     stampDuty,
//     registration,
//     mutation,
//     society,
//     autoAdmin,
//     adminTotal,
//     finalTotal: total + adminTotal,
//   };
// }

// /**
//  * The Firestore shape. Keys match QuotationModel.toMap exactly, including
//  * `saleDeederDate` — the typo is the real field name, so correcting it
//  * here would hide every record the Flutter app has already written.
//  *
//  * Dates go in as JS Date objects; the SDK stores them as Timestamps, the
//  * same type the Flutter client writes.
//  */
// export function toDoc(f, d, user) {
//   return {
//     customerName: f.customerName.trim(),
//     mobileNumber: f.mobileNumber.trim(),
//     address: f.address.trim(),
//     projectName: f.projectName.trim(),
//     plotNumber: f.plotNumber.trim(),
//     plotSize: num(f.plotSize),
//     ratePerSqFt: num(f.ratePerSqFt),
//     totalPlotAmount: d.total,
//     bookingAmount: d.booking,
//     downPayment: d.down,
//     loanAmount: d.balance,
//     stampDutyPercent: d.stampDutyPercent,
//     stampDutyAmount: d.stampDuty,
//     registrationPercent: 0,
//     registrationAmount: d.registration,
//     mutation: d.mutation,
//     societyCharges: d.society,
//     adminTotal: d.adminTotal,
//     finalTotalAmount: d.finalTotal,
//     quotationDate: dateOut(f.quotationDate) || new Date(),
//     bookingDate: dateOut(f.bookingDate),
//     downPaymentDate: dateOut(f.downPaymentDate),
//     saleDeederDate: dateOut(f.saleDeedDate),
//     createdByUid: user?.uid || '',
//     createdByName: user?.name || user?.displayName || '',
//   };
// }

// const asDate = (v) => {
//   if (!v) return null;
//   const x = v.toDate ? v.toDate() : new Date(v);
//   return Number.isNaN(x.getTime()) ? null : x;
// };

// /** Firestore record → the plain object the document renderer wants. */
// export function fromDoc(data, id) {
//   return {
//     id,
//     customerName: data.customerName || '',
//     mobileNumber: data.mobileNumber || '',
//     address: data.address || '',
//     projectName: data.projectName || '',
//     plotNumber: data.plotNumber || '',
//     plotSize: Number(data.plotSize) || 0,
//     ratePerSqFt: Number(data.ratePerSqFt) || 0,
//     totalPlotAmount: Number(data.totalPlotAmount) || 0,
//     bookingAmount: Number(data.bookingAmount) || 0,
//     downPayment: Number(data.downPayment) || 0,
//     loanAmount: Number(data.loanAmount) || 0,
//     stampDutyPercent: Number(data.stampDutyPercent) || 0,
//     stampDutyAmount: Number(data.stampDutyAmount) || 0,
//     registrationAmount: Number(data.registrationAmount) || 0,
//     mutation: Number(data.mutation) || 0,
//     societyCharges: Number(data.societyCharges) || 0,
//     adminTotal: Number(data.adminTotal) || 0,
//     finalTotalAmount: Number(data.finalTotalAmount) || 0,
//     quotationDate: asDate(data.quotationDate) || new Date(),
//     bookingDate: asDate(data.bookingDate),
//     downPaymentDate: asDate(data.downPaymentDate),
//     saleDeederDate: asDate(data.saleDeederDate),
//     // createdByUid is the Flutter field; employeeId is what the older web
//     // records used. Read both so one list can show either.
//     createdByUid: data.createdByUid || data.employeeId || '',
//     createdByName: data.createdByName || '',
//   };
// }

// /** An existing record back into form state, for editing. */
// export function toForm(q) {
//   return {
//     ...emptyForm(),
//     customerName: q.customerName,
//     mobileNumber: q.mobileNumber,
//     address: q.address,
//     projectName: q.projectName,
//     plotNumber: q.plotNumber,
//     plotSize: String(q.plotSize || ''),
//     ratePerSqFt: String(q.ratePerSqFt || ''),
//     bookingAmount: String(q.bookingAmount || 0),
//     downPayment: String(q.downPayment || 0),
//     stampDutyPercent: String(q.stampDutyPercent || STAMP_PCT_DEFAULT),
//     mutation: String(q.mutation || 0),
//     societyCharges: String(q.societyCharges || 0),
//     totalPlotAmount: String(q.totalPlotAmount || 0),
//     adminTotal: String(q.adminTotal || 0),
//     quotationDate: dateIn(q.quotationDate),
//     bookingDate: dateIn(q.bookingDate),
//     downPaymentDate: dateIn(q.downPaymentDate),
//     saleDeedDate: dateIn(q.saleDeederDate),
//     downPaymentOption:
//       q.totalPlotAmount > 0
//       && ((q.downPayment + q.bookingAmount) / q.totalPlotAmount) * 100 <= 12
//         ? '10%' : '20%',
//     /* A saved record's numbers are whatever was saved, not whatever the
//        formula would produce now — so the overrides start ON. Clearing an
//        override hands the field back to derive. */
//     totalEdited: true,
//     downPaymentEdited: true,
//     adminEdited: true,
//   };
// }



// lib/quote.js — the arithmetic behind a quotation, and nothing else.

/**
 * The Flutter screen does this with sixteen TextEditingControllers, each
 * listening to the others, guarded by an _isRecalculating flag to stop
 * the listeners from re-entering. That guard exists because the inputs
 * and the outputs live in the same mutable place.
 *
 * Here they don't. The form holds only what the user TYPED, and derive()
 * computes everything else on each render. There is no recalculation
 * step to guard, no ordering between fields, and no way for a computed
 * value to drift out of step with the numbers it came from.
 *
 * Three fields are both computed AND editable — total, down payment and
 * admin total. Each carries an "edited" flag: false means derive owns
 * it, true means the user has taken it over. That is the whole of the
 * override mechanism, and it's why the reset arrow just sets a flag back
 * to false.
 */

// const num = (v, d = 0) => {
//   const n = parseFloat(v);
//   return Number.isFinite(n) ? n : d;
// };

// export const AGREEMENT_PCT = 0.20;
// export const REG_CAP = 3000000;      // ₹30 lakh
// export const REG_PCT = 0.01;
// export const REG_FIXED = 30000;

// export const BOOKING_DEFAULT = 51000;
// export const MUTATION_DEFAULT = 15000;
// export const SOCIETY_DEFAULT = 13500;
// export const STAMP_PCT_DEFAULT = 6;

// /**
//  * The signed-in user's id, whatever shape the object arrived in.
//  *
//  * Firebase's own User carries .uid; the profile object Authcontext hands
//  * out carries .id and .role. Both reach toDoc depending on the caller.
//  * Resolving in one exported place means a third shape gets fixed here
//  * rather than in every screen that writes a record — and it means the
//  * modal can check for a missing id using exactly the same rule the write
//  * will use, instead of a second guess that can fall out of step.
//  */
// export const userUid = (user) => user?.uid || user?.id || '';

// /** 1% up to ₹30L, a flat ₹30,000 above it. */
// export const autoRegistration = (total) => (
//   total <= REG_CAP ? total * REG_PCT : REG_FIXED
// );

// /** yyyy-mm-dd for <input type="date">; '' for nothing. */
// export const dateIn = (d) => {
//   if (!d) return '';
//   const x = d.toDate ? d.toDate() : new Date(d);
//   if (Number.isNaN(x.getTime())) return '';
//   const p = (n) => String(n).padStart(2, '0');
//   return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
// };

// export const dateOut = (s) => (s ? new Date(`${s}T00:00:00`) : null);

// export function emptyForm({ plotNo = '', areaSqft = 0, projectName = '' } = {}) {
//   return {
//     customerName: '',
//     mobileNumber: '',
//     address: '',
//     projectName,
//     plotNumber: plotNo,
//     plotSize: areaSqft ? String(Math.round(areaSqft)) : '',
//     ratePerSqFt: '',
//     bookingAmount: String(BOOKING_DEFAULT),
//     downPaymentOption: '20%',
//     downPayment: '',
//     stampDutyPercent: String(STAMP_PCT_DEFAULT),
//     mutation: String(MUTATION_DEFAULT),
//     societyCharges: String(SOCIETY_DEFAULT),
//     totalPlotAmount: '',
//     adminTotal: '',
//     quotationDate: dateIn(new Date()),
//     bookingDate: '',
//     downPaymentDate: '',
//     saleDeedDate: '',
//     totalEdited: false,
//     downPaymentEdited: false,
//     adminEdited: false,
//   };
// }

// /** Everything computed, in one pass, from what the user typed. */
// export function derive(f) {
//   const size = num(f.plotSize);
//   const rate = num(f.ratePerSqFt);
//   const booking = num(f.bookingAmount);
//   const sdPct = num(f.stampDutyPercent, STAMP_PCT_DEFAULT);
//   const mutation = num(f.mutation);
//   const society = num(f.societyCharges);

//   const total = f.totalEdited ? num(f.totalPlotAmount) : size * rate;
//   const agreement = total * AGREEMENT_PCT;

//   const pct = f.downPaymentOption === '10%' ? 0.10 : 0.20;
//   const autoDown = Math.max(0, total * pct - booking);
//   const down = f.downPaymentEdited ? num(f.downPayment) : autoDown;

//   const balance = Math.max(0, total - booking - down);
//   const stampDuty = (total * sdPct) / 100;
//   const registration = autoRegistration(total);

//   const autoAdmin = stampDuty + registration + mutation + society;
//   const adminTotal = f.adminEdited ? num(f.adminTotal) : autoAdmin;

//   return {
//     total,
//     agreement,
//     booking,
//     autoDown,
//     down,
//     balance,
//     stampDutyPercent: sdPct,
//     stampDuty,
//     registration,
//     mutation,
//     society,
//     autoAdmin,
//     adminTotal,
//     finalTotal: total + adminTotal,
//   };
// }

// /**
//  * The Firestore shape. Keys match QuotationModel.toMap exactly, including
//  * `saleDeederDate` — the typo is the real field name, so correcting it
//  * here would hide every record the Flutter app has already written.
//  *
//  * Dates go in as JS Date objects; the SDK stores them as Timestamps, the
//  * same type the Flutter client writes.
//  *
//  * createdByUid goes through userUid() rather than user?.uid. The old
//  * `user?.uid || ''` wrote an empty string whenever the caller passed a
//  * profile object instead of a Firebase User, and an empty string is the
//  * one value that cannot fail: the write succeeds, the record prints, and
//  * `where('createdByUid','==',uid)` never matches it again. Callers should
//  * refuse to save when userUid() is empty — see QuotationModal.save.
//  */
// export function toDoc(f, d, user) {
//   return {
//     customerName: f.customerName.trim(),
//     mobileNumber: f.mobileNumber.trim(),
//     address: f.address.trim(),
//     projectName: f.projectName.trim(),
//     plotNumber: f.plotNumber.trim(),
//     plotSize: num(f.plotSize),
//     ratePerSqFt: num(f.ratePerSqFt),
//     totalPlotAmount: d.total,
//     bookingAmount: d.booking,
//     downPayment: d.down,
//     loanAmount: d.balance,
//     stampDutyPercent: d.stampDutyPercent,
//     stampDutyAmount: d.stampDuty,
//     registrationPercent: 0,
//     registrationAmount: d.registration,
//     mutation: d.mutation,
//     societyCharges: d.society,
//     adminTotal: d.adminTotal,
//     finalTotalAmount: d.finalTotal,
//     quotationDate: dateOut(f.quotationDate) || new Date(),
//     bookingDate: dateOut(f.bookingDate),
//     downPaymentDate: dateOut(f.downPaymentDate),
//     saleDeederDate: dateOut(f.saleDeedDate),
//     createdByUid: userUid(user),
//     createdByName: user?.name || user?.displayName || '',
//   };
// }

// const asDate = (v) => {
//   if (!v) return null;
//   const x = v.toDate ? v.toDate() : new Date(v);
//   return Number.isNaN(x.getTime()) ? null : x;
// };

// /** Firestore record → the plain object the document renderer wants. */
// export function fromDoc(data, id) {
//   return {
//     id,
//     customerName: data.customerName || '',
//     mobileNumber: data.mobileNumber || '',
//     address: data.address || '',
//     projectName: data.projectName || '',
//     plotNumber: data.plotNumber || '',
//     plotSize: Number(data.plotSize) || 0,
//     ratePerSqFt: Number(data.ratePerSqFt) || 0,
//     totalPlotAmount: Number(data.totalPlotAmount) || 0,
//     bookingAmount: Number(data.bookingAmount) || 0,
//     downPayment: Number(data.downPayment) || 0,
//     loanAmount: Number(data.loanAmount) || 0,
//     stampDutyPercent: Number(data.stampDutyPercent) || 0,
//     stampDutyAmount: Number(data.stampDutyAmount) || 0,
//     registrationAmount: Number(data.registrationAmount) || 0,
//     mutation: Number(data.mutation) || 0,
//     societyCharges: Number(data.societyCharges) || 0,
//     adminTotal: Number(data.adminTotal) || 0,
//     finalTotalAmount: Number(data.finalTotalAmount) || 0,
//     quotationDate: asDate(data.quotationDate) || new Date(),
//     bookingDate: asDate(data.bookingDate),
//     downPaymentDate: asDate(data.downPaymentDate),
//     saleDeederDate: asDate(data.saleDeederDate),
//     // createdByUid is the Flutter field; employeeId is what the older web
//     // records used. Read both so one list can show either.
//     //
//     // NOTE: this fallback is read-time only. A record whose createdByUid
//     // is empty still cannot be reached by watchEmployeeQuotations, because
//     // the where clause runs on the server against the stored field. Those
//     // records need the backfill script, not this line.
//     createdByUid: data.createdByUid || data.employeeId || '',
//     createdByName: data.createdByName || '',
//   };
// }

// /** An existing record back into form state, for editing. */
// export function toForm(q) {
//   return {
//     ...emptyForm(),
//     customerName: q.customerName,
//     mobileNumber: q.mobileNumber,
//     address: q.address,
//     projectName: q.projectName,
//     plotNumber: q.plotNumber,
//     plotSize: String(q.plotSize || ''),
//     ratePerSqFt: String(q.ratePerSqFt || ''),
//     bookingAmount: String(q.bookingAmount || 0),
//     downPayment: String(q.downPayment || 0),
//     stampDutyPercent: String(q.stampDutyPercent || STAMP_PCT_DEFAULT),
//     mutation: String(q.mutation || 0),
//     societyCharges: String(q.societyCharges || 0),
//     totalPlotAmount: String(q.totalPlotAmount || 0),
//     adminTotal: String(q.adminTotal || 0),
//     quotationDate: dateIn(q.quotationDate),
//     bookingDate: dateIn(q.bookingDate),
//     downPaymentDate: dateIn(q.downPaymentDate),
//     saleDeedDate: dateIn(q.saleDeederDate),
//     downPaymentOption:
//       q.totalPlotAmount > 0
//       && ((q.downPayment + q.bookingAmount) / q.totalPlotAmount) * 100 <= 12
//         ? '10%' : '20%',
//     /* A saved record's numbers are whatever was saved, not whatever the
//        formula would produce now — so the overrides start ON. Clearing an
//        override hands the field back to derive. */
//     totalEdited: true,
//     downPaymentEdited: true,
//     adminEdited: true,
//   };
// }








// // lib/quote.js — the arithmetic behind a quotation, and nothing else.

// /**
//  * The Flutter screen does this with sixteen TextEditingControllers, each
//  * listening to the others, guarded by an _isRecalculating flag to stop
//  * the listeners from re-entering. That guard exists because the inputs
//  * and the outputs live in the same mutable place.
//  *
//  * Here they don't. The form holds only what the user TYPED, and derive()
//  * computes everything else on each render. There is no recalculation
//  * step to guard, no ordering between fields, and no way for a computed
//  * value to drift out of step with the numbers it came from.
//  *
//  * Three fields are both computed AND editable — total, down payment and
//  * admin total. Each carries an "edited" flag: false means derive owns
//  * it, true means the user has taken it over. That is the whole of the
//  * override mechanism, and it's why the reset arrow just sets a flag back
//  * to false.
//  */

// const num = (v, d = 0) => {
//   const n = parseFloat(v);
//   return Number.isFinite(n) ? n : d;
// };

// export const AGREEMENT_PCT = 0.20;
// export const REG_CAP = 3000000;      // ₹30 lakh
// export const REG_PCT = 0.01;
// export const REG_FIXED = 30000;

// export const BOOKING_DEFAULT = 51000;
// export const MUTATION_DEFAULT = 15000;
// export const SOCIETY_DEFAULT = 13500;
// export const STAMP_PCT_DEFAULT = 6;

// /**
//  * The signed-in user's id, whatever shape the object arrived in.
//  *
//  * Firebase's own User carries .uid; the profile object Authcontext hands
//  * out carries .id and .role. Both reach toDoc depending on the caller.
//  * Resolving in one exported place means a third shape gets fixed here
//  * rather than in every screen that writes a record — and it means the
//  * modal can check for a missing id using exactly the same rule the write
//  * will use, instead of a second guess that can fall out of step.
//  */
// export const userUid = (user) => user?.uid || user?.id || '';

// /** 1% up to ₹30L, a flat ₹30,000 above it. */
// export const autoRegistration = (total) => (
//   total <= REG_CAP ? total * REG_PCT : REG_FIXED
// );

// /** yyyy-mm-dd for <input type="date">; '' for nothing. */
// export const dateIn = (d) => {
//   if (!d) return '';
//   const x = d.toDate ? d.toDate() : new Date(d);
//   if (Number.isNaN(x.getTime())) return '';
//   const p = (n) => String(n).padStart(2, '0');
//   return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
// };

// export const dateOut = (s) => (s ? new Date(`${s}T00:00:00`) : null);

// export function emptyForm({ plotNo = '', areaSqft = 0, projectName = '' } = {}) {
//   return {
//     customerName: '',
//     mobileNumber: '',
//     address: '',
//     projectName,
//     plotNumber: plotNo,
//     plotSize: areaSqft ? String(Math.round(areaSqft)) : '',
//     ratePerSqFt: '',
//     bookingAmount: String(BOOKING_DEFAULT),
//     downPaymentOption: '20%',
//     downPayment: '',
//     stampDutyPercent: String(STAMP_PCT_DEFAULT),
//     mutation: String(MUTATION_DEFAULT),
//     societyCharges: String(SOCIETY_DEFAULT),
//     totalPlotAmount: '',
//     adminTotal: '',
//     quotationDate: dateIn(new Date()),
//     bookingDate: '',
//     downPaymentDate: '',
//     saleDeedDate: '',
//     totalEdited: false,
//     downPaymentEdited: false,
//     adminEdited: false,
//   };
// }

// /** Everything computed, in one pass, from what the user typed. */
// export function derive(f) {
//   const size = num(f.plotSize);
//   const rate = num(f.ratePerSqFt);
//   const booking = num(f.bookingAmount);
//   const sdPct = num(f.stampDutyPercent, STAMP_PCT_DEFAULT);
//   const mutation = num(f.mutation);
//   const society = num(f.societyCharges);

//   const total = f.totalEdited ? num(f.totalPlotAmount) : size * rate;
//   const agreement = total * AGREEMENT_PCT;

//   const pct = f.downPaymentOption === '10%' ? 0.10 : 0.20;
//   const autoDown = Math.max(0, total * pct - booking);
//   const down = f.downPaymentEdited ? num(f.downPayment) : autoDown;

//   const balance = Math.max(0, total - booking - down);
//   const stampDuty = (total * sdPct) / 100;
//   const registration = autoRegistration(total);

//   const autoAdmin = stampDuty + registration + mutation + society;
//   const adminTotal = f.adminEdited ? num(f.adminTotal) : autoAdmin;

//   return {
//     total,
//     agreement,
//     booking,
//     autoDown,
//     down,
//     balance,
//     stampDutyPercent: sdPct,
//     stampDuty,
//     registration,
//     mutation,
//     society,
//     autoAdmin,
//     adminTotal,
//     finalTotal: total + adminTotal,
//   };
// }

// /**
//  * The Firestore shape. Keys match QuotationModel.toMap exactly, including
//  * `saleDeederDate` — the typo is the real field name, so correcting it
//  * here would hide every record the Flutter app has already written.
//  *
//  * Dates go in as JS Date objects; the SDK stores them as Timestamps, the
//  * same type the Flutter client writes.
//  *
//  * createdByUid goes through userUid() rather than user?.uid. The old
//  * `user?.uid || ''` wrote an empty string whenever the caller passed a
//  * profile object instead of a Firebase User, and an empty string is the
//  * one value that cannot fail: the write succeeds, the record prints, and
//  * `where('createdByUid','==',uid)` never matches it again. Callers should
//  * refuse to save when userUid() is empty — see QuotationModal.save.
//  */
// export function toDoc(f, d, user) {
//   return {
//     customerName: f.customerName.trim(),
//     mobileNumber: f.mobileNumber.trim(),
//     address: f.address.trim(),
//     projectName: f.projectName.trim(),
//     plotNumber: f.plotNumber.trim(),
//     plotSize: num(f.plotSize),
//     ratePerSqFt: num(f.ratePerSqFt),
//     totalPlotAmount: d.total,
//     bookingAmount: d.booking,
//     downPayment: d.down,
//     loanAmount: d.balance,
//     stampDutyPercent: d.stampDutyPercent,
//     stampDutyAmount: d.stampDuty,
//     registrationPercent: 0,
//     registrationAmount: d.registration,
//     mutation: d.mutation,
//     societyCharges: d.society,
//     adminTotal: d.adminTotal,
//     finalTotalAmount: d.finalTotal,
//     quotationDate: dateOut(f.quotationDate) || new Date(),
//     bookingDate: dateOut(f.bookingDate),
//     downPaymentDate: dateOut(f.downPaymentDate),
//     saleDeederDate: dateOut(f.saleDeedDate),
//     createdByUid: userUid(user),
//     createdByName: user?.name || user?.displayName || '',
//   };
// }

// const asDate = (v) => {
//   if (!v) return null;
//   const x = v.toDate ? v.toDate() : new Date(v);
//   return Number.isNaN(x.getTime()) ? null : x;
// };

// /** Firestore record → the plain object the document renderer wants. */
// export function fromDoc(data, id) {
//   return {
//     id,
//     customerName: data.customerName || '',
//     mobileNumber: data.mobileNumber || '',
//     address: data.address || '',
//     projectName: data.projectName || '',
//     plotNumber: data.plotNumber || '',
//     plotSize: Number(data.plotSize) || 0,
//     ratePerSqFt: Number(data.ratePerSqFt) || 0,
//     totalPlotAmount: Number(data.totalPlotAmount) || 0,
//     bookingAmount: Number(data.bookingAmount) || 0,
//     downPayment: Number(data.downPayment) || 0,
//     loanAmount: Number(data.loanAmount) || 0,
//     stampDutyPercent: Number(data.stampDutyPercent) || 0,
//     stampDutyAmount: Number(data.stampDutyAmount) || 0,
//     registrationAmount: Number(data.registrationAmount) || 0,
//     mutation: Number(data.mutation) || 0,
//     societyCharges: Number(data.societyCharges) || 0,
//     adminTotal: Number(data.adminTotal) || 0,
//     finalTotalAmount: Number(data.finalTotalAmount) || 0,
//     quotationDate: asDate(data.quotationDate) || new Date(),
//     bookingDate: asDate(data.bookingDate),
//     downPaymentDate: asDate(data.downPaymentDate),
//     saleDeederDate: asDate(data.saleDeederDate),
//     // createdByUid is the Flutter field; employeeId is what the older web
//     // records used. Read both so one list can show either.
//     //
//     // NOTE: this fallback is read-time only. A record whose createdByUid
//     // is empty still cannot be reached by watchEmployeeQuotations, because
//     // the where clause runs on the server against the stored field. Those
//     // records need the backfill script, not this line.
//     createdByUid: data.createdByUid || data.employeeId || '',
//     createdByName: data.createdByName || '',
//   };
// }

// /** An existing record back into form state, for editing. */
// export function toForm(q) {
//   return {
//     ...emptyForm(),
//     customerName: q.customerName,
//     mobileNumber: q.mobileNumber,
//     address: q.address,
//     projectName: q.projectName,
//     plotNumber: q.plotNumber,
//     plotSize: String(q.plotSize || ''),
//     ratePerSqFt: String(q.ratePerSqFt || ''),
//     bookingAmount: String(q.bookingAmount || 0),
//     downPayment: String(q.downPayment || 0),
//     stampDutyPercent: String(q.stampDutyPercent || STAMP_PCT_DEFAULT),
//     mutation: String(q.mutation || 0),
//     societyCharges: String(q.societyCharges || 0),
//     totalPlotAmount: String(q.totalPlotAmount || 0),
//     adminTotal: String(q.adminTotal || 0),
//     quotationDate: dateIn(q.quotationDate),
//     bookingDate: dateIn(q.bookingDate),
//     downPaymentDate: dateIn(q.downPaymentDate),
//     saleDeedDate: dateIn(q.saleDeederDate),
//     downPaymentOption:
//       q.totalPlotAmount > 0
//       && ((q.downPayment + q.bookingAmount) / q.totalPlotAmount) * 100 <= 12
//         ? '10%' : '20%',
//     /* A saved record's numbers are whatever was saved, not whatever the
//        formula would produce now — so the overrides start ON. Clearing an
//        override hands the field back to derive. */
//     totalEdited: true,
//     downPaymentEdited: true,
//     adminEdited: true,
//   };
// }




// lib/quote.js — the arithmetic behind a quotation, and nothing else.

import { sessionUid, sessionUser } from './Session';

/**
 * The Flutter screen does this with sixteen TextEditingControllers, each
 * listening to the others, guarded by an _isRecalculating flag to stop
 * the listeners from re-entering. That guard exists because the inputs
 * and the outputs live in the same mutable place.
 *
 * Here they don't. The form holds only what the user TYPED, and derive()
 * computes everything else on each render. There is no recalculation
 * step to guard, no ordering between fields, and no way for a computed
 * value to drift out of step with the numbers it came from.
 *
 * Three fields are both computed AND editable — total, down payment and
 * admin total. Each carries an "edited" flag: false means derive owns
 * it, true means the user has taken it over. That is the whole of the
 * override mechanism, and it's why the reset arrow just sets a flag back
 * to false.
 */

const num = (v, d = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
};

export const AGREEMENT_PCT = 0.20;
export const REG_CAP = 3000000;      // ₹30 lakh
export const REG_PCT = 0.01;
export const REG_FIXED = 30000;

export const BOOKING_DEFAULT = 51000;
export const MUTATION_DEFAULT = 15000;
export const SOCIETY_DEFAULT = 13500;
export const STAMP_PCT_DEFAULT = 6;

/**
 * The signed-in user's id, whatever reached this call.
 *
 * Three sources, in order of trust:
 *   1. the object passed in — a screen that has the user should say so;
 *   2. localStorage, via sessionUid();
 *   3. nothing, which callers must treat as "not signed in".
 *
 * The fallback is here because the map opens QuotationModal without a
 * user prop and has no reason to know about auth. Without it every
 * quotation saved from the map went in with createdByUid: '' — a record
 * that writes, prints, and then matches nobody's list query.
 *
 * All three sources produce the same string: the saraswati_user document
 * id, which ensureSeedUser and registerEmployee also write into the
 * document's own `uid` field.
 */
export const userUid = (user) => user?.uid || user?.id || sessionUid();

/** 1% up to ₹30L, a flat ₹30,000 above it. */
export const autoRegistration = (total) => (
  total <= REG_CAP ? total * REG_PCT : REG_FIXED
);

/** yyyy-mm-dd for <input type="date">; '' for nothing. */
export const dateIn = (d) => {
  if (!d) return '';
  const x = d.toDate ? d.toDate() : new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
};

export const dateOut = (s) => (s ? new Date(`${s}T00:00:00`) : null);

export function emptyForm({ plotNo = '', areaSqft = 0, projectName = '' } = {}) {
  return {
    customerName: '',
    mobileNumber: '',
    address: '',
    projectName,
    plotNumber: plotNo,
    plotSize: areaSqft ? String(Math.round(areaSqft)) : '',
    ratePerSqFt: '',
    bookingAmount: String(BOOKING_DEFAULT),
    downPaymentOption: '20%',
    downPayment: '',
    stampDutyPercent: String(STAMP_PCT_DEFAULT),
    mutation: String(MUTATION_DEFAULT),
    societyCharges: String(SOCIETY_DEFAULT),
    totalPlotAmount: '',
    adminTotal: '',
    quotationDate: dateIn(new Date()),
    bookingDate: '',
    downPaymentDate: '',
    saleDeedDate: '',
    totalEdited: false,
    downPaymentEdited: false,
    adminEdited: false,
  };
}

/** Everything computed, in one pass, from what the user typed. */
export function derive(f) {
  const size = num(f.plotSize);
  const rate = num(f.ratePerSqFt);
  const booking = num(f.bookingAmount);
  const sdPct = num(f.stampDutyPercent, STAMP_PCT_DEFAULT);
  const mutation = num(f.mutation);
  const society = num(f.societyCharges);

  const total = f.totalEdited ? num(f.totalPlotAmount) : size * rate;
  const agreement = total * AGREEMENT_PCT;

  const pct = f.downPaymentOption === '10%' ? 0.10 : 0.20;
  const autoDown = Math.max(0, total * pct - booking);
  const down = f.downPaymentEdited ? num(f.downPayment) : autoDown;

  const balance = Math.max(0, total - booking - down);
  const stampDuty = (total * sdPct) / 100;
  const registration = autoRegistration(total);

  const autoAdmin = stampDuty + registration + mutation + society;
  const adminTotal = f.adminEdited ? num(f.adminTotal) : autoAdmin;

  return {
    total,
    agreement,
    booking,
    autoDown,
    down,
    balance,
    stampDutyPercent: sdPct,
    stampDuty,
    registration,
    mutation,
    society,
    autoAdmin,
    adminTotal,
    finalTotal: total + adminTotal,
  };
}

/**
 * The Firestore shape. Keys match QuotationModel.toMap exactly, including
 * `saleDeederDate` — the typo is the real field name, so correcting it
 * here would hide every record the Flutter app has already written.
 *
 * Dates go in as JS Date objects; the SDK stores them as Timestamps, the
 * same type the Flutter client writes.
 *
 * createdByUid is the whole basis of "my quotations": it is written here,
 * filtered on by watchEmployeeQuotations, and compared against in the
 * detail pages. If it is ever blank, the record is invisible everywhere.
 * Callers must refuse to save when userUid() comes back empty — see
 * QuotationModal.save.
 */
export function toDoc(f, d, user) {
  const stored = sessionUser();
  return {
    customerName: f.customerName.trim(),
    mobileNumber: f.mobileNumber.trim(),
    address: f.address.trim(),
    projectName: f.projectName.trim(),
    plotNumber: f.plotNumber.trim(),
    plotSize: num(f.plotSize),
    ratePerSqFt: num(f.ratePerSqFt),
    totalPlotAmount: d.total,
    bookingAmount: d.booking,
    downPayment: d.down,
    loanAmount: d.balance,
    stampDutyPercent: d.stampDutyPercent,
    stampDutyAmount: d.stampDuty,
    registrationPercent: 0,
    registrationAmount: d.registration,
    mutation: d.mutation,
    societyCharges: d.society,
    adminTotal: d.adminTotal,
    finalTotalAmount: d.finalTotal,
    quotationDate: dateOut(f.quotationDate) || new Date(),
    bookingDate: dateOut(f.bookingDate),
    downPaymentDate: dateOut(f.downPaymentDate),
    saleDeederDate: dateOut(f.saleDeedDate),
    createdByUid: userUid(user),
    createdByName: user?.name || user?.displayName || stored?.name || '',
  };
}

const asDate = (v) => {
  if (!v) return null;
  const x = v.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(x.getTime()) ? null : x;
};

/** Firestore record → the plain object the document renderer wants. */
export function fromDoc(data, id) {
  return {
    id,
    customerName: data.customerName || '',
    mobileNumber: data.mobileNumber || '',
    address: data.address || '',
    projectName: data.projectName || '',
    plotNumber: data.plotNumber || '',
    plotSize: Number(data.plotSize) || 0,
    ratePerSqFt: Number(data.ratePerSqFt) || 0,
    totalPlotAmount: Number(data.totalPlotAmount) || 0,
    bookingAmount: Number(data.bookingAmount) || 0,
    downPayment: Number(data.downPayment) || 0,
    loanAmount: Number(data.loanAmount) || 0,
    stampDutyPercent: Number(data.stampDutyPercent) || 0,
    stampDutyAmount: Number(data.stampDutyAmount) || 0,
    registrationAmount: Number(data.registrationAmount) || 0,
    mutation: Number(data.mutation) || 0,
    societyCharges: Number(data.societyCharges) || 0,
    adminTotal: Number(data.adminTotal) || 0,
    finalTotalAmount: Number(data.finalTotalAmount) || 0,
    quotationDate: asDate(data.quotationDate) || new Date(),
    bookingDate: asDate(data.bookingDate),
    downPaymentDate: asDate(data.downPaymentDate),
    saleDeederDate: asDate(data.saleDeederDate),
    // createdByUid is the Flutter field; employeeId is what the older web
    // records used. Read both so one list can show either.
    //
    // NOTE: this fallback is read-time only. A record whose stored
    // createdByUid is empty still cannot be reached by
    // watchEmployeeQuotations, because the where clause runs on the
    // server against the stored field.
    createdByUid: data.createdByUid || data.employeeId || '',
    createdByName: data.createdByName || '',
  };
}

/** An existing record back into form state, for editing. */
export function toForm(q) {
  return {
    ...emptyForm(),
    customerName: q.customerName,
    mobileNumber: q.mobileNumber,
    address: q.address,
    projectName: q.projectName,
    plotNumber: q.plotNumber,
    plotSize: String(q.plotSize || ''),
    ratePerSqFt: String(q.ratePerSqFt || ''),
    bookingAmount: String(q.bookingAmount || 0),
    downPayment: String(q.downPayment || 0),
    stampDutyPercent: String(q.stampDutyPercent || STAMP_PCT_DEFAULT),
    mutation: String(q.mutation || 0),
    societyCharges: String(q.societyCharges || 0),
    totalPlotAmount: String(q.totalPlotAmount || 0),
    adminTotal: String(q.adminTotal || 0),
    quotationDate: dateIn(q.quotationDate),
    bookingDate: dateIn(q.bookingDate),
    downPaymentDate: dateIn(q.downPaymentDate),
    saleDeedDate: dateIn(q.saleDeederDate),
    downPaymentOption:
      q.totalPlotAmount > 0
      && ((q.downPayment + q.bookingAmount) / q.totalPlotAmount) * 100 <= 12
        ? '10%' : '20%',
    /* A saved record's numbers are whatever was saved, not whatever the
       formula would produce now — so the overrides start ON. Clearing an
       override hands the field back to derive. */
    totalEdited: true,
    downPaymentEdited: true,
    adminEdited: true,
  };
}