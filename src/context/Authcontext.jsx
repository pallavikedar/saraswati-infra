
// // context/AuthContext.jsx

// import React, {
//   createContext,
//   useCallback,
//   useContext,
//   useEffect,
//   useMemo,
//   useState,
// } from 'react';

// import { useNavigate } from 'react-router-dom';
// import * as auth from '../services/Authservice';

// const AuthContext = createContext(null);

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState(null);
//   const [restoring, setRestoring] = useState(true);

//   const navigate = useNavigate();

//   useEffect(() => {
//     let alive = true;

//     (async () => {
//       try {
//         await auth.ensureAdminExists();

//         const restored = await auth.loadSession();

//         if (alive) {
//           setUser(restored);
//         }
//       } catch (err) {
//         console.error('Session restore failed:', err);
//       } finally {
//         if (alive) {
//           setRestoring(false);
//         }
//       }
//     })();

//     return () => {
//       alive = false;
//     };
//   }, []);

//   const signIn = useCallback(async (email, password) => {
//     const signedIn = await auth.signIn(email, password);

//     setUser(signedIn);

//     return signedIn;
//   }, []);

//   const signOut = useCallback(() => {
//     auth.signOut();
//     setUser(null);

//     // Redirect to login page
//     navigate('/login', { replace: true });
//   }, [navigate]);

//   const value = useMemo(
//     () => ({
//       user,
//       restoring,
//       signIn,
//       signOut,
//     }),
//     [user, restoring, signIn, signOut],
//   );

//   return (
//     <AuthContext.Provider value={value}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   const ctx = useContext(AuthContext);

//   if (!ctx) {
//     throw new Error('useAuth must be used inside <AuthProvider>');
//   }

//   return ctx;
// }


// context/AuthContext.jsx

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';
import * as auth from '../services/Authservice';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [restoring, setRestoring] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        /* The seed gets its own try/catch on purpose.
​
           Sharing one with the restore below meant a failed seed — a
           rules change forbidding the write, a network blip, anything —
           threw past loadSession(), so setUser never ran and a perfectly
           valid localStorage session came back as null. The guard then
           bounced a signed-in user to /login on every reload.
​
           Seeding is idempotent and only matters on a fresh project, so
           it is the one call here that is allowed to fail quietly. */
        try {
          await auth.ensureAdminExists();
        } catch (seedErr) {
          console.warn('Admin seed skipped:', seedErr?.message || seedErr);
        }

        /* loadSession re-reads the user document from Firestore rather
           than trusting localStorage, so a deleted account or a revoked
           isAccessGranted cannot stay signed in on a stale entry. */
        const restored = await auth.loadSession();

        if (alive) {
          setUser(restored);
        }
      } catch (err) {
        /* A failed restore is a signed-out state, not a crash. */
        console.error('Session restore failed:', err);
        if (alive) {
          setUser(null);
        }
      } finally {
        /* Always, on every path. If this is ever skipped, RequireAuth
           sits on "Checking your session…" forever, which reads as a
           broken app rather than a failed sign-in. */
        if (alive) {
          setRestoring(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    /* auth.signIn writes localStorage itself and throws a readable
       message for bad credentials or withheld access. That message is
       already what a person needs to read, so it passes through
       untouched to the login screen. */
    const signedIn = await auth.signIn(email, password);

    setUser(signedIn);

    return signedIn;
  }, []);

  const signOut = useCallback(() => {
    auth.signOut();
    setUser(null);

    // Redirect to login page
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({
      user,
      restoring,
      signIn,
      signOut,
    }),
    [user, restoring, signIn, signOut],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }

  return ctx;
}

export default AuthContext;