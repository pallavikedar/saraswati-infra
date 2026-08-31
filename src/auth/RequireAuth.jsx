import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/Authcontext';
import { CANVAS, MONO, MUTED } from '../theme/tokens';

export default function RequireAuth({ children }) {
  const { user, restoring } = useAuth();
  const location = useLocation();

  /* Rendering the login screen during the restore would flash it at
     someone who is already signed in. */
  if (restoring) {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
        background: CANVAS, color: MUTED, fontFamily: MONO, fontSize: 13,
      }}>
        Checking your session…
      </div>
    );
  }

  /* `from` carries the deep link, so a shared plot URL survives the
     detour through the login screen. */
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}