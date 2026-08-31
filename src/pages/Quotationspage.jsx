


import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import QuotationsList from '../components/QuotationsList';
import QuotationDetail from '../components/QuotationDetail';
import { useAuth } from '../context/Authcontext';
import { userUid } from '../lib/Quote';
import { ACCENT, CANVAS, HAIR, MONO, SANS } from '../theme/tokens';

/**
 * /quotations — the index, and the entry point for making a new one.
 *
 * Selection is held here and the detail opens as a modal over the list,
 * rather than routing to /quotations/:id. Both are correct; this one
 * keeps the scroll position and the search term, which matters when
 * someone is working down a list checking figures. /quotations/:id stays
 * as it is, for links pasted into WhatsApp and opened cold.
 *
 * Nothing splices a deleted record out of the list: the list is a live
 * subscription, so Firestore removes it as soon as the delete lands.
 * Doing it by hand here would be a second source of truth that could only
 * ever drift from the first.
 *
 * New quotations start here without a plot. Started from the map instead,
 * QuotationFormPage receives the plot in router state and locks the
 * number and area to the drawing — which is the better path, and the one
 * worth pointing staff at.
 */
export default function QuotationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  /* Guests can read the layouts but must not put their name on a
     customer-facing document. */
  const canCreate = user?.role !== 'guest';

  /* Every record on this screen belongs to the person looking at it, so
     delete is theirs. The prop is named isAdmin by QuotationDetail; what
     it gates here is ownership. */
  const owns = !!selected && selected.createdByUid === userUid(user);

  return (
    <div style={{
      minHeight: '100vh', background: CANVAS, padding: '22px 18px 60px',
      boxSizing: 'border-box',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 18,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: SANS, fontSize: 10, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: '#6F7A87',
            }}>
              {user?.name || 'Saraswati Infra'}
            </div>
            <h1 style={{
              fontFamily: SANS, fontSize: 26, fontWeight: 700, color: ACCENT,
              letterSpacing: '0.02em', margin: '2px 0 0',
            }}>
              Quotations
            </h1>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                padding: '10px 15px', borderRadius: 8, background: 'transparent',
                border: `1px solid ${HAIR}`, color: '#B7C0CA',
                fontFamily: MONO, fontSize: 12, cursor: 'pointer',
              }}
            >
              Back
            </button>
            {canCreate && (
              <button
                type="button"
                onClick={() => navigate('/quotations/new')}
                style={{
                  padding: '10px 16px', borderRadius: 8, border: 'none',
                  background: ACCENT, color: '#141820', fontWeight: 700,
                  fontFamily: SANS, fontSize: 12, letterSpacing: '0.08em',
                  textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                New quotation
              </button>
            )}
          </div>
        </div>

        <QuotationsList user={user} onOpen={setSelected} />
      </div>

      {selected && (
        <QuotationDetail
          quotation={selected}
          isAdmin={owns}
          onClose={() => setSelected(null)}
          onEdit={(q) => navigate(`/quotations/${q.id}/edit`)}
          onDeleted={() => setSelected(null)}
        />
      )}
    </div>
  );
}