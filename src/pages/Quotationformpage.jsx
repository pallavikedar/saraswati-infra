import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import QuotationModal from '../components/modals/QuotationModal';
import { getQuotation } from '../services/Quotationservice';
import { useAuth } from '../context/Authcontext';
import { CANVAS, HAIR, MONO } from '../theme/tokens';

/**
 * /quotations/new  and  /quotations/:id/edit
 *
 * One page for both, because a quotation form with a record loaded and
 * one without differ by a single prop; splitting them would mean keeping
 * two copies of the same wiring in step.
 *
 * A plot can be handed over in router state when this is opened from the
 * map — navigate('/quotations/new', { state: { plot, projectName } }) —
 * which prefills the number and area. That is a convenience only: state
 * is empty on a refresh, and the form stays usable without it, with
 * those two fields simply editable instead of locked.
 */
export default function QuotationFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuth();

  const [existing, setExisting] = useState(null);
  const [phase, setPhase] = useState(id ? 'loading' : 'ready');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!id) return undefined;
    let live = true;
    getQuotation(id)
      .then((rec) => {
        if (!live) return;
        if (!rec) { setErr('That quotation no longer exists.'); setPhase('failed'); return; }
        setExisting(rec);
        setPhase('ready');
      })
      .catch((e) => {
        if (!live) return;
        setErr(e?.message || 'Could not load this quotation.');
        setPhase('failed');
      });
    return () => { live = false; };
  }, [id]);

  const close = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/', { replace: true });
  };

  /* After a save, land on the saved record rather than going back — the
     next thing anyone does with a fresh quotation is print it, and that
     button lives on the detail view. `replace` keeps the form out of the
     history, so back from there doesn't reopen a form for a record that
     has already been written. */
  const saved = (rec) => {
    if (rec?.id) navigate(`/quotations/${rec.id}`, { replace: true });
    else close();
  };

  const shell = {
    position: 'fixed', inset: 0, background: CANVAS,
    display: 'grid', placeItems: 'center', padding: 24,
    fontFamily: MONO, fontSize: 13, color: '#8B96A3', textAlign: 'center',
  };

  if (phase === 'loading') return <div style={shell}>Loading quotation…</div>;

  if (phase === 'failed') {
    return (
      <div style={shell}>
        <div>
          <div style={{ color: '#E68A72', marginBottom: 14 }}>{err}</div>
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            style={{
              padding: '11px 18px', borderRadius: 8, background: 'transparent',
              border: `1px solid ${HAIR}`, color: '#B7C0CA',
              fontFamily: MONO, fontSize: 13, cursor: 'pointer',
            }}
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: CANVAS }}>
      <QuotationModal
        plot={state?.plot}
        projectName={state?.projectName || ''}
        existing={existing}
        user={user}
        onClose={close}
        onSaved={saved}
      />
    </div>
  );
}