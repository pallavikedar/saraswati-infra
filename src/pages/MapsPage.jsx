import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';

import { db } from '../firebase/config';
import { useAuth } from '../context/Authcontext';
import { ACCENT, BODY, CANVAS, HAIR, MONO, MUTED, SANS } from '../theme/tokens';

export default function MapsPage() {
  const { user, signOut } = useAuth();
  const [maps, setMaps] = useState([]);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const snap = await getDocs(query(
          collection(db, 'maps'),
          where('isEnabled', '==', true),
        ));
        let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // a user doc may restrict which layouts they can open
        if (user.maps) list = list.filter((m) => user.maps.includes(m.id));
        if (alive) { setMaps(list); setState('ready'); }
      } catch (err) {
        console.error(err);
        if (alive) setState('error');
      }
    })();
    return () => { alive = false; };
  }, [user]);

  return (
    <div style={{
      minHeight: '100dvh', background: CANVAS, color: '#E7E1D5', fontFamily: BODY,
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
        borderBottom: `1px solid ${HAIR}`,
      }}>
        <span style={{
          fontFamily: SANS, fontSize: 14, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: ACCENT,
        }}>
          Layouts
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 12, color: MUTED }}>
          {user.name || user.email}
        </span>
        <button
          type="button" onClick={signOut}
          style={{
            background: 'none', border: `1px solid ${HAIR}`, borderRadius: 8,
            padding: '7px 12px', color: MUTED, fontFamily: SANS, fontSize: 11,
            fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </header>

      <main style={{ padding: 20 }}>
        {state === 'loading' && (
          <p style={{ fontFamily: MONO, fontSize: 13, color: MUTED }}>Reading layouts…</p>
        )}
        {state === 'error' && (
          <p style={{ fontFamily: MONO, fontSize: 13, color: '#E0A33C' }}>
            Couldn’t read the layouts. Check your connection and reload.
          </p>
        )}
        {state === 'ready' && maps.length === 0 && (
          <p style={{ fontFamily: MONO, fontSize: 13, color: MUTED, lineHeight: 1.7 }}>
            No layouts are shared with this account yet.
            <br />An administrator can enable one for you.
          </p>
        )}

        <div style={{
          display: 'grid', gap: 14,
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        }}>
          {maps.map((m) => (
            <Link
              key={m.id}
              to={`/maps/${m.id}`}
              style={{
                display: 'block', padding: 18, borderRadius: 14,
                border: `1px solid ${HAIR}`, background: 'rgba(255,255,255,0.03)',
                color: 'inherit', textDecoration: 'none',
              }}
            >
              <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 600 }}>
                {m.name || m.id}
              </div>
              <div style={{
                marginTop: 6, fontFamily: MONO, fontSize: 11, color: MUTED,
              }}>
                {m.location || m.id}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}