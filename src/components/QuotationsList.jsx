// import React, { useEffect, useMemo, useState } from 'react';

// import { userUid } from '../lib/Quote';
// import { watchEmployeeQuotations } from '../services/Quotationservice';
// import { ACCENT, HAIR, MONO, PANEL, SANS } from '../theme/tokens';
// import { inr, shortDate } from './HomeParts';

// /**
//  * Every quotation the signed-in user created, and nothing else.
//  *
//  * There is deliberately no scope switch here. watchAllQuotations still
//  * exists in the service for admin tooling, but this screen never calls
//  * it: an employee sees their own work, full stop.
//  *
//  * That said, this component is not what enforces the rule — it is what
//  * DISPLAYS it. The query runs in the browser, so anyone who opens the
//  * console can call watchAllQuotations themselves. The enforcement is in
//  * firestore.rules; see the file next to this one. Treat the two as a
//  * pair: change the rule and this list breaks loudly, change this list
//  * alone and nothing is actually protected.
//  *
//  * It subscribes rather than fetches because two clients share this data:
//  * a quotation saved on the phone lands here without a refresh, and one
//  * deleted from the detail modal leaves on its own.
//  *
//  * Search runs in JS over the rows already in memory. A branch office has
//  * hundreds of quotations, not millions, and every field worth searching
//  * by would otherwise need its own index and its own prefix-match hack.
//  */

// const DIM = '#8B96A3';
// const RED = '#E68A72';

// function Empty({ children }) {
//   return (
//     <div style={{
//       fontFamily: MONO, fontSize: 13, color: DIM, lineHeight: 1.7,
//       padding: '34px 18px', textAlign: 'center',
//     }}>
//       {children}
//     </div>
//   );
// }

// export default function QuotationsList({ user, onOpen }) {
//   const uid = userUid(user);

//   const [rows, setRows] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState('');
//   const [term, setTerm] = useState('');

//   useEffect(() => {
//     if (!uid) {
//       setLoading(false);
//       setErr('Not signed in.');
//       return undefined;
//     }

//     setLoading(true);
//     setErr('');

//     const onChange = (list) => {
//       setRows(list);
//       setLoading(false);
//     };

//     /* Firestore answers a where+orderBy subscription with an error until
//        its composite index exists, and never with data. Swallowing that
//        would make a missing index look exactly like an employee with no
//        quotations — so it goes on screen, and the console carries the
//        one-click link that creates the index.

//        permission-denied here usually means one thing: createdByUid on the
//        stored records is not the same string as request.auth.uid, so the
//        rule cannot match. Check what userUid() is actually returning
//        before you go changing the rule. */
//     const onError = (e) => {
//       setLoading(false);
//       if (e?.code === 'failed-precondition') {
//         setErr('This list needs a Firestore index that does not exist yet. '
//           + 'The browser console has a link that creates it.');
//       } else if (e?.code === 'permission-denied') {
//         setErr('Firestore refused this query. The rule expects createdByUid '
//           + 'to match your signed-in uid.');
//       } else {
//         setErr(e?.message || 'Could not load quotations.');
//       }
//       console.error('[quotations]', e);
//     };

//     return watchEmployeeQuotations(uid, onChange, onError);
//   }, [uid]);

//   const visible = useMemo(() => {
//     const t = term.trim().toLowerCase();
//     if (!t) return rows;
//     return rows.filter((q) => [
//       q.customerName, q.mobileNumber, q.plotNumber, q.projectName,
//     ].some((v) => String(v || '').toLowerCase().includes(t)));
//   }, [rows, term]);

//   const total = useMemo(
//     () => visible.reduce((sum, q) => sum + (q.finalTotalAmount || 0), 0),
//     [visible],
//   );

//   return (
//     <div>
//       <input
//         value={term}
//         onChange={(e) => setTerm(e.target.value)}
//         placeholder="Search customer, mobile, plot"
//         aria-label="Search quotations"
//         style={{
//           width: '100%', boxSizing: 'border-box', padding: '10px 13px',
//           marginBottom: 14, background: '#0D1117',
//           border: `1px solid ${HAIR}`, borderRadius: 9,
//           color: '#EFEAE0', fontFamily: MONO, fontSize: 13, outline: 'none',
//         }}
//       />

//       {!loading && !err && visible.length > 0 && (
//         <div style={{
//           display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
//           gap: 12, marginBottom: 12, fontFamily: MONO, fontSize: 12, color: DIM,
//         }}>
//           <span>
//             {visible.length} quotation{visible.length === 1 ? '' : 's'}
//             {term ? ` of ${rows.length}` : ''}
//           </span>
//           <span>{inr.format(total)}</span>
//         </div>
//       )}

//       {loading && <Empty>Loading quotations…</Empty>}

//       {!loading && err && (
//         <div
//           role="alert"
//           style={{
//             fontFamily: MONO, fontSize: 13, color: RED, lineHeight: 1.7,
//             padding: '18px 16px', border: '1px solid rgba(230,138,114,0.35)',
//             borderRadius: 10, background: 'rgba(230,138,114,0.06)',
//           }}
//         >
//           {err}
//         </div>
//       )}

//       {!loading && !err && rows.length === 0 && (
//         <Empty>
//           No quotations yet.
//           <br />
//           Open a plot on the map and save one.
//         </Empty>
//       )}

//       {!loading && !err && rows.length > 0 && visible.length === 0 && (
//         <Empty>Nothing matches “{term}”.</Empty>
//       )}

//       <div style={{ display: 'grid', gap: 9 }}>
//         {visible.map((q) => (
//           <button
//             key={q.id}
//             type="button"
//             onClick={() => onOpen(q)}
//             style={{
//               display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
//               gap: 14, width: '100%', textAlign: 'left', cursor: 'pointer',
//               padding: '13px 15px', background: PANEL,
//               border: `1px solid ${HAIR}`, borderRadius: 10,
//             }}
//           >
//             <span style={{ minWidth: 0 }}>
//               <span style={{
//                 display: 'block', fontFamily: SANS, fontSize: 15, fontWeight: 700,
//                 color: ACCENT, wordBreak: 'break-word',
//               }}>
//                 {q.customerName || 'Unnamed customer'}
//               </span>
//               <span style={{
//                 display: 'block', fontFamily: MONO, fontSize: 12, color: DIM, marginTop: 3,
//               }}>
//                 Plot {q.plotNumber || '—'} · {shortDate.format(q.quotationDate)}
//               </span>
//             </span>
//             <span style={{
//               fontFamily: MONO, fontSize: 14, color: '#EFEAE0', whiteSpace: 'nowrap',
//             }}>
//               {inr.format(q.finalTotalAmount)}
//             </span>
//           </button>
//         ))}
//       </div>
//     </div>
//   );
// }









import React, { useEffect, useMemo, useState } from 'react';

import { userUid } from '../lib/Quote';
import { watchEmployeeQuotations } from '../services/Quotationservice';
import { ACCENT, HAIR, MONO, PANEL, SANS } from '../theme/tokens';
import { inr, shortDate } from './HomeParts';

/**
 * Every quotation the signed-in user created, and nothing else.
 *
 * There is deliberately no scope switch here. watchAllQuotations still
 * exists in the service for admin tooling, but this screen never calls
 * it: an employee sees their own work, full stop.
 *
 * That said, this component is not what enforces the rule — it is what
 * DISPLAYS it. The query runs in the browser, so anyone who opens the
 * console can call watchAllQuotations themselves. The enforcement is in
 * firestore.rules; see the file next to this one. Treat the two as a
 * pair: change the rule and this list breaks loudly, change this list
 * alone and nothing is actually protected.
 *
 * It subscribes rather than fetches because two clients share this data:
 * a quotation saved on the phone lands here without a refresh, and one
 * deleted from the detail modal leaves on its own.
 *
 * Search runs in JS over the rows already in memory. A branch office has
 * hundreds of quotations, not millions, and every field worth searching
 * by would otherwise need its own index and its own prefix-match hack.
 */

const DIM = '#8B96A3';
const RED = '#E68A72';

function Empty({ children }) {
  return (
    <div style={{
      fontFamily: MONO, fontSize: 13, color: DIM, lineHeight: 1.7,
      padding: '34px 18px', textAlign: 'center',
    }}>
      {children}
    </div>
  );
}

export default function QuotationsList({ user, onOpen }) {
  const uid = userUid(user);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [term, setTerm] = useState('');

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      setErr('Not signed in.');
      return undefined;
    }

    setLoading(true);
    setErr('');

    const onChange = (list) => {
      setRows(list);
      setLoading(false);
    };

    /* Firestore answers a where+orderBy subscription with an error until
       its composite index exists, and never with data. Swallowing that
       would make a missing index look exactly like an employee with no
       quotations — so it goes on screen, and the console carries the
       one-click link that creates the index.

       permission-denied here usually means one thing: createdByUid on the
       stored records is not the same string as request.auth.uid, so the
       rule cannot match. Check what userUid() is actually returning
       before you go changing the rule. */
    const onError = (e) => {
      setLoading(false);
      if (e?.code === 'failed-precondition') {
        setErr('This list needs a Firestore index that does not exist yet. '
          + 'The browser console has a link that creates it.');
      } else if (e?.code === 'permission-denied') {
        setErr('Firestore refused this query. The rule expects createdByUid '
          + 'to match your signed-in uid.');
      } else {
        setErr(e?.message || 'Could not load quotations.');
      }
      console.error('[quotations]', e);
    };

    return watchEmployeeQuotations(uid, onChange, onError);
  }, [uid]);

  const visible = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((q) => [
      q.customerName, q.mobileNumber, q.plotNumber, q.projectName,
    ].some((v) => String(v || '').toLowerCase().includes(t)));
  }, [rows, term]);

  const total = useMemo(
    () => visible.reduce((sum, q) => sum + (q.finalTotalAmount || 0), 0),
    [visible],
  );

  return (
    <div>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search customer, mobile, plot"
        aria-label="Search quotations"
        style={{
          width: '100%', boxSizing: 'border-box', padding: '10px 13px',
          marginBottom: 14, background: '#0D1117',
          border: `1px solid ${HAIR}`, borderRadius: 9,
          color: '#EFEAE0', fontFamily: MONO, fontSize: 13, outline: 'none',
        }}
      />

      {!loading && !err && visible.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          gap: 12, marginBottom: 12, fontFamily: MONO, fontSize: 12, color: DIM,
        }}>
          <span>
            {visible.length} quotation{visible.length === 1 ? '' : 's'}
            {term ? ` of ${rows.length}` : ''}
          </span>
          <span>{inr.format(total)}</span>
        </div>
      )}

      {loading && <Empty>Loading quotations…</Empty>}

      {!loading && err && (
        <div
          role="alert"
          style={{
            fontFamily: MONO, fontSize: 13, color: RED, lineHeight: 1.7,
            padding: '18px 16px', border: '1px solid rgba(230,138,114,0.35)',
            borderRadius: 10, background: 'rgba(230,138,114,0.06)',
          }}
        >
          {err}
        </div>
      )}

      {!loading && !err && rows.length === 0 && (
        <Empty>
          No quotations yet.
          <br />
          Open a plot on the map and save one.
        </Empty>
      )}

      {!loading && !err && rows.length > 0 && visible.length === 0 && (
        <Empty>Nothing matches “{term}”.</Empty>
      )}

      <div style={{ display: 'grid', gap: 9 }}>
        {visible.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => onOpen(q)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              gap: 14, width: '100%', textAlign: 'left', cursor: 'pointer',
              padding: '13px 15px', background: PANEL,
              border: `1px solid ${HAIR}`, borderRadius: 10,
            }}
          >
            <span style={{ minWidth: 0 }}>
              <span style={{
                display: 'block', fontFamily: SANS, fontSize: 15, fontWeight: 700,
                color: ACCENT, wordBreak: 'break-word',
              }}>
                {q.customerName || 'Unnamed customer'}
              </span>
              <span style={{
                display: 'block', fontFamily: MONO, fontSize: 12, color: DIM, marginTop: 3,
              }}>
                Plot {q.plotNumber || '—'} · {shortDate.format(q.quotationDate)}
              </span>
            </span>
            <span style={{
              fontFamily: MONO, fontSize: 14, color: '#EFEAE0', whiteSpace: 'nowrap',
            }}>
              {inr.format(q.finalTotalAmount)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}