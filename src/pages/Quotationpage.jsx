
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import QuotationDetail from '../components/QuotationDetail';
import { getQuotation } from '../services/Quotationservice';
import { useAuth } from '../context/Authcontext';
import { userUid } from '../lib/Quote';
import { CANVAS, HAIR, MONO } from '../theme/tokens';

/**
 * /quotations/:id
 *
 * The record is fetched fresh rather than handed over in router state.
 * Router state is empty on a hard refresh or a pasted link, and a
 * quotation is exactly the kind of thing that gets pasted into WhatsApp
 * — so the id in the URL has to be enough on its own.
 *
 * Closing goes BACK, not to "/". Arriving here from the map and being
 * dropped on the home screen loses the layout, the selection and the
 * camera; back returns to where the customer was looking.
 *
 * The ownership check exists because this route takes an id from the URL,
 * and the list's filter cannot reach it: paste a colleague's link and you
 * would otherwise read their quotation. Note what this is and isn't —
 * with the current sign-in scheme it stops the accidental case (a shared
 * link, a bookmarked id), not a determined one, since the same record is
 * readable straight from the console. Real enforcement needs the Firebase
 * Auth migration described in firestore.rules.
 */
export default function QuotationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [q, setQ] = useState(null);
  const [state, setState] = useState('loading');   // loading | ready | missing | denied | failed
  const [err, setErr] = useState('');

  useEffect(() => {
    let live = true;
    setState('loading');
    getQuotation(id)
      .then((rec) => {
        if (!live) return;
        if (!rec) { setState('missing'); return; }

        /* Admins can open any record — they answer for the whole office.
           Drop the second clause if even they should be limited to their
           own. */
        const mine = rec.createdByUid === userUid(user);
        if (!mine && user?.role !== 'admin') { setState('denied'); return; }

        setQ(rec);
        setState('ready');
      })
      .catch((e) => {
        if (!live) return;
        setErr(e?.message || 'Could not load this quotation.');
        setState('failed');
      });
    return () => { live = false; };
  }, [id, user]);

  const close = () => {
    /* No history to go back to when the link was opened cold. */
    if (window.history.length > 1) navigate(-1);
    else navigate('/quotations', { replace: true });
  };

  const shell = {
    position: 'fixed', inset: 0, background: CANVAS,
    display: 'grid', placeItems: 'center', padding: 24,
    fontFamily: MONO, fontSize: 13, color: '#8B96A3', textAlign: 'center',
  };

  if (state === 'loading') return <div style={shell}>Loading quotation…</div>;

  if (state !== 'ready') {
    const message = {
      missing: 'That quotation no longer exists.',
      denied: 'This quotation belongs to another employee.',
      failed: err,
    }[state];

    return (
      <div style={shell}>
        <div>
          <div style={{ color: '#E68A72', marginBottom: 14, lineHeight: 1.6 }}>
            {message}
          </div>
          <button
            type="button"
            onClick={() => navigate('/quotations', { replace: true })}
            style={{
              padding: '11px 18px', borderRadius: 8, background: 'transparent',
              border: `1px solid ${HAIR}`, color: '#B7C0CA',
              fontFamily: MONO, fontSize: 13, cursor: 'pointer',
            }}
          >
            My quotations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: CANVAS }}>
      <QuotationDetail
        quotation={q}
        isAdmin={q.createdByUid === userUid(user) || user?.role === 'admin'}
        onClose={close}
        onEdit={() => navigate(`/quotations/${id}/edit`)}
        onDeleted={() => navigate('/quotations', { replace: true })}
      />
    </div>
  );
}