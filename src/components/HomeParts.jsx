// // components/HomeParts.jsx — the small shared pieces of the signed-in shell.
// // One file because none of them are big enough to earn their own, and they
// // all belong to the same surface.

// import React from 'react';
// import logo from '../assets/logo.jpeg';

// export const inr = new Intl.NumberFormat('en-IN', {
//   style: 'currency',
//   currency: 'INR',
//   maximumFractionDigits: 0,
// });
// export const plain = new Intl.NumberFormat('en-IN');
// export const shortDate = new Intl.DateTimeFormat('en-IN', {
//   day: '2-digit', month: 'short', year: '2-digit',
// });

// /** The circular initial badge — gradient ring, not a flat fill. */
// export function Avatar({ name }) {
//   const initial = name?.trim() ? name.trim()[0].toUpperCase() : '?';
//   return <div className="avatar">{initial}</div>;
// }

// /** The live-count bar. Shared by the phone header and the desktop strip. */
// export function StatBar({ quotationCount, totalValue, mapCount }) {
//   return (
//     <div className="statbar">
//       <StatSegment label="Quotations" value={String(quotationCount)} />
//       <span className="stat-divider" />
//       <StatSegment label="Total value" value={inr.format(totalValue)} />
//       <span className="stat-divider" />
//       <StatSegment label="Maps" value={String(mapCount)} />
//     </div>
//   );
// }

// function StatSegment({ label, value }) {
//   return (
//     <div className="stat-seg">
//       <strong>{value}</strong>
//       <span>{label}</span>
//     </div>
//   );
// }

// export function FilterChip({ label, value, selected, onSelect }) {
//   const on = selected === value;
//   return (
//     <button
//       type="button"
//       className={`chip${on ? ' chip--on' : ''}`}
//       aria-pressed={on}
//       onClick={() => onSelect(value)}
//     >
//       {label}
//     </button>
//   );
// }

// export function EmptyState({ title, body, searching }) {
//   return (
//     <div className="empty">
//       <div className={`empty-badge${searching ? ' empty-badge--search' : ''}`}>
//         {searching ? '🔍' : '📄'}
//       </div>
//       <h3>{title}</h3>
//       <p>{body}</p>
//     </div>
//   );
// }

// export function SearchBar({ value, onChange, placeholder }) {
//   return (
//     <div className="searchbar">
//       <span className="searchbar-icon" aria-hidden="true">🔍</span>
//       <input
//         type="search"
//         value={value}
//         placeholder={placeholder}
//         onChange={(e) => onChange(e.target.value)}
//       />
//       {value && (
//         <button
//           type="button"
//           className="searchbar-clear"
//           onClick={() => onChange('')}
//           aria-label="Clear search"
//         >
//           ✕
//         </button>
//       )}
//     </div>
//   );
// }

// /**
//  * Desktop nav rail. Carries the phone header's gradient identity and drives
//  * the same tab state the mobile TabBar does — one source of truth, two
//  * pieces of chrome.
//  */
// export function NavRail({ tabs, active, onSelect, userName, onSignOut }) {
//   return (
//     <nav className="rail">
//       <div className="rail-brand">
//         <img src={logo} alt="Saraswati Infra" />
//       </div>

//       <div className="rail-user">
//         <Avatar name={userName} />
//         <div>
//           <span className="rail-user-hint">Welcome back,</span>
//           <strong>{userName}</strong>
//         </div>
//       </div>

//       <hr className="rail-rule" />

//       <ul className="rail-nav">
//         {tabs.map((t, i) => (
//           <li key={t.key}>
//             <button
//               type="button"
//               className={`rail-item${active === i ? ' rail-item--on' : ''}`}
//               aria-current={active === i ? 'page' : undefined}
//               onClick={() => onSelect(i)}
//             >
//               <span aria-hidden="true">{t.icon}</span>
//               {t.label}
//             </button>
//           </li>
//         ))}
//       </ul>

//       <button type="button" className="rail-item rail-signout" onClick={onSignOut}>
//         <span aria-hidden="true">⎋</span>
//         Sign out
//       </button>
//     </nav>
//   );
// }



// components/HomeParts.jsx — the small shared pieces of the signed-in shell.
// One file because none of them are big enough to earn their own, and they
// all belong to the same surface.


// import React from 'react';
// import logo from '../assets/logo.jpeg';

// export const inr = new Intl.NumberFormat('en-IN', {
//   style: 'currency',
//   currency: 'INR',
//   maximumFractionDigits: 0,
// });
// export const plain = new Intl.NumberFormat('en-IN');
// export const shortDate = new Intl.DateTimeFormat('en-IN', {
//   day: '2-digit', month: 'short', year: '2-digit',
// });

// /* Icons, not emoji.
// ​
//    🔍 and ✕ render as a different glyph on every platform — colour on
//    one, monochrome on another, off the baseline on a third — and they
//    take the system's colour rather than the app's. These inherit
//    currentColor, so a chip that dims dims its icon with it, and they sit
//    where they are put. */
// const icon = { width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

// export function SearchIcon(props) {
//   return (
//     <svg viewBox="0 0 24 24" {...icon} {...props} aria-hidden="true">
//       <circle cx="11" cy="11" r="7" />
//       <path d="M20 20l-3.6-3.6" />
//     </svg>
//   );
// }

// export function CloseIcon(props) {
//   return (
//     <svg viewBox="0 0 24 24" {...icon} {...props} aria-hidden="true">
//       <path d="M6 6l12 12M18 6L6 18" />
//     </svg>
//   );
// }

// export function DocIcon(props) {
//   return (
//     <svg viewBox="0 0 24 24" {...icon} {...props} aria-hidden="true">
//       <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
//       <path d="M14 3v5h5M9 13h6M9 17h4" />
//     </svg>
//   );
// }

// export function SignOutIcon(props) {
//   return (
//     <svg viewBox="0 0 24 24" {...icon} {...props} aria-hidden="true">
//       <path d="M15 17v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v2" />
//       <path d="M19 12H9m10 0l-3-3m3 3l-3 3" />
//     </svg>
//   );
// }

// /**
//  * The circular initial badge.
//  *
//  * The ring colour is derived from the name rather than fixed, so two
//  * people in the same list are distinguishable at a glance — and the same
//  * person is the same colour every time, which a random pick would not
//  * give you.
//  */
// export function Avatar({ name, size = 40 }) {
//   const clean = name?.trim() || '';
//   const initial = clean ? clean[0].toUpperCase() : '?';

//   let h = 0;
//   for (let i = 0; i < clean.length; i += 1) h = (h * 31 + clean.charCodeAt(i)) % 360;

//   return (
//     <div
//       className="avatar"
//       style={{
//         width: size,
//         height: size,
//         fontSize: size * 0.42,
//         background: `linear-gradient(135deg, hsl(${h} 55% 42%), hsl(${(h + 40) % 360} 60% 32%))`,
//       }}
//       aria-hidden="true"
//     >
//       {initial}
//     </div>
//   );
// }

// /**
//  * The live-count bar. Shared by the phone header and the desktop strip.
//  *
//  * The dividers are borders on the segments, not empty spans: an element
//  * that exists only to draw a line is one more thing to keep in step with
//  * the layout, and it breaks the moment the bar wraps on a narrow screen.
//  */
// export function StatBar({ quotationCount, totalValue, mapCount }) {
//   return (
//     <div className="statbar">
//       <StatSegment label="Quotations" value={String(quotationCount)} />
//       <StatSegment label="Total value" value={inr.format(totalValue)} />
//       <StatSegment label="Maps" value={String(mapCount)} />
//     </div>
//   );
// }

// function StatSegment({ label, value }) {
//   return (
//     <div className="stat-seg">
//       <strong>{value}</strong>
//       <span>{label}</span>
//     </div>
//   );
// }

// export function FilterChip({ label, value, selected, onSelect, count }) {
//   const on = selected === value;
//   return (
//     <button
//       type="button"
//       className={`chip${on ? ' chip--on' : ''}`}
//       aria-pressed={on}
//       onClick={() => onSelect(value)}
//     >
//       {label}
//       {typeof count === 'number' && <span className="chip-count">{count}</span>}
//     </button>
//   );
// }

// export function EmptyState({ title, body, searching, action }) {
//   return (
//     <div className="empty">
//       <div className={`empty-badge${searching ? ' empty-badge--search' : ''}`}>
//         {searching ? <SearchIcon width={22} height={22} /> : <DocIcon width={22} height={22} />}
//       </div>
//       <h3>{title}</h3>
//       <p>{body}</p>
//       {action}
//     </div>
//   );
// }

// export function SearchBar({ value, onChange, placeholder }) {
//   return (
//     <div className="searchbar">
//       <SearchIcon className="searchbar-icon" />
//       <input
//         type="search"
//         value={value}
//         placeholder={placeholder}
//         onChange={(e) => onChange(e.target.value)}
//       />
//       {value && (
//         <button
//           type="button"
//           className="searchbar-clear"
//           onClick={() => onChange('')}
//           aria-label="Clear search"
//         >
//           <CloseIcon width={14} height={14} />
//         </button>
//       )}
//     </div>
//   );
// }

// /**
//  * Desktop nav rail. Carries the phone header's gradient identity and drives
//  * the same tab state the mobile TabBar does — one source of truth, two
//  * pieces of chrome.
//  */
// export function NavRail({ tabs, active, onSelect, userName, onSignOut }) {
//   return (
//     <nav className="rail">
//       <div className="rail-brand">
//         <img src={logo} alt="Saraswati Infra" />
//       </div>

//       <div className="rail-user">
//         <Avatar name={userName} />
//         <div className="rail-user-text">
//           <span className="rail-user-hint">Welcome back,</span>
//           <strong title={userName}>{userName}</strong>
//         </div>
//       </div>

//       <hr className="rail-rule" />

//       <ul className="rail-nav">
//         {tabs.map((t, i) => (
//           <li key={t.key}>
//             <button
//               type="button"
//               className={`rail-item${active === i ? ' rail-item--on' : ''}`}
//               aria-current={active === i ? 'page' : undefined}
//               onClick={() => onSelect(i)}
//             >
//               <span className="rail-item-icon" aria-hidden="true">{t.icon}</span>
//               <span className="rail-item-label">{t.label}</span>
//             </button>
//           </li>
//         ))}
//       </ul>

//       <button type="button" className="rail-item rail-signout" onClick={onSignOut}>
//         <span className="rail-item-icon" aria-hidden="true"><SignOutIcon /></span>
//         <span className="rail-item-label">Sign out</span>
//       </button>
//     </nav>
//   );
// }











// components/HomeParts.jsx — the shared pieces of the signed-in shell.
//
// One file because they all belong to the same surface: the icons, the
// small shared widgets, the desktop rail, and the CSS for all of it.
// Splitting the styles into a stylesheet three folders away would mean
// every change to one of these is a change in two files.
//
// Render <HomePartsStyles /> ONCE, high in the signed-in shell. It is a
// plain <style> tag, so mounting it twice duplicates the rules rather
// than merging them.

import React, { useState } from 'react';
import logo from '../assets/logo.jpeg';

export const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
export const plain = new Intl.NumberFormat('en-IN');
export const shortDate = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit', month: 'short', year: '2-digit',
});

/* ── Icons ──────────────────────────────────────────────────────────
   Not emoji. 🔍 and ✕ render as a different glyph on every platform —
   colour on one, monochrome on another, off the baseline on a third —
   and they take the system's colour rather than the app's. These
   inherit currentColor, so a dimmed row dims its icon with it, and they
   sit where they are put. */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function SearchIcon({ width = 16, height = 16, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={width} height={height} {...stroke} {...rest} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.6-3.6" />
    </svg>
  );
}

export function CloseIcon({ width = 16, height = 16, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={width} height={height} {...stroke} {...rest} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function DocIcon({ width = 16, height = 16, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={width} height={height} {...stroke} {...rest} aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}

export function MapIcon({ width = 16, height = 16, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={width} height={height} {...stroke} {...rest} aria-hidden="true">
      <path d="M9 4L3 6.5v13L9 17l6 2.5 6-2.5v-13L15 7 9 4z" />
      <path d="M9 4v13M15 7v12.5" />
    </svg>
  );
}

/* Kept for the site-visit tab, which is commented out of TABS for now
   but is coming back. */
export function CameraIcon({ width = 16, height = 16, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={width} height={height} {...stroke} {...rest} aria-hidden="true">
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.7l1.2-2h6.2l1.2 2h1.7A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  );
}

export function SignOutIcon({ width = 16, height = 16, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={width} height={height} {...stroke} {...rest} aria-hidden="true">
      <path d="M15 17v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v2" />
      <path d="M19 12H9m10 0l-3-3m3 3l-3 3" />
    </svg>
  );
}

/* Drawn once and rotated, so the two directions cannot fall out of
   visual step with each other. */
function Chevron({ open }) {
  return (
    <svg
      viewBox="0 0 24 24" width={16} height={16}
      fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}
      className="hp-chev"
      aria-hidden="true"
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

/**
 * The circular initial badge.
 *
 * The colour is derived from the name rather than fixed, so two people
 * in one list are distinguishable at a glance — and the same person is
 * the same colour every time, which a random pick would not give you.
 */
export function Avatar({ name, size = 40 }) {
  const clean = name?.trim() || '';
  const initial = clean ? clean[0].toUpperCase() : '?';

  let h = 0;
  for (let i = 0; i < clean.length; i += 1) h = (h * 31 + clean.charCodeAt(i)) % 360;

  return (
    <div
      className="hp-avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, hsl(${h} 55% 42%), hsl(${(h + 40) % 360} 60% 32%))`,
      }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

/**
 * The live-count bar. Shared by the phone header and the desktop strip.
 *
 * The dividers are borders on the segments, not empty spans: an element
 * that exists only to draw a line is one more thing to keep in step with
 * the layout, and it lands in the wrong place the moment the bar wraps.
 */
export function StatBar({ quotationCount, totalValue, mapCount }) {
  return (
    // <div className="hp-statbar">
    //   {/* <StatSegment label="Quotations" value={String(quotationCount)} />
    //   <StatSegment label="Total value" value={inr.format(totalValue)} />
    //   <StatSegment label="Maps" value={String(mapCount)} /> */}
    // </div>
    <></>
  );
}

function StatSegment({ label, value }) {
  return (
    <div className="hp-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function FilterChip({
  label, value, selected, onSelect, count,
}) {
  const on = selected === value;
  return (
    <button
      type="button"
      className={`hp-chip${on ? ' is-on' : ''}`}
      aria-pressed={on}
      onClick={() => onSelect(value)}
    >
      {label}
      {typeof count === 'number' && <span className="hp-chip-count">{count}</span>}
    </button>
  );
}

export function EmptyState({
  title, body, searching, action,
}) {
  return (
    <div className="hp-empty">
      <div className={`hp-empty-badge${searching ? ' is-search' : ''}`}>
        {searching ? <SearchIcon width={22} height={22} /> : <DocIcon width={22} height={22} />}
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="hp-search">
      <SearchIcon className="hp-search-icon" />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          className="hp-search-clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <CloseIcon width={14} height={14} />
        </button>
      )}
    </div>
  );
}

/**
 * Desktop nav rail.
 *
 * Three zones, in the order a person reads them: who you are at the top,
 * where you can go in the middle, and leaving at the bottom. Sign-out
 * sits apart from the navigation rather than as another item in the same
 * list — it is not a place you go, and grouping it with the tabs invites
 * the mis-click.
 *
 * The rail COLLAPSES to icons. On a 1280px laptop a 248px rail is a
 * fifth of the width spent on two words, and the layout maps are what
 * people came to look at. Collapsed still shows the active indicator and
 * the avatar, so nothing about the current state is hidden — only the
 * labels go, and they come back on hover as a title.
 *
 * The collapsed flag is deliberately NOT persisted. A rail that
 * remembers being collapsed three weeks ago is a rail whose labels
 * someone has to go find again; the default should be the legible one.
 * Lift it to a prop if the client asks for it to stick.
 *
 * It drives the same tab state the mobile strip does — one source of
 * truth, two pieces of chrome.
 */
export function NavRail({
  tabs, active, onSelect, userName, userRole, onSignOut,
}) {
  const [open, setOpen] = useState(true);

  return (
    <nav className={`hp-rail${open ? '' : ' is-collapsed'}`} aria-label="Main">
      <div className="hp-rail-head">
        <div className="hp-rail-brand">
          <img src={logo} alt="Saraswati Infra" />
        </div>
        <button
          type="button"
          className="hp-rail-collapse"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          title={open ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <Chevron open={open} />
        </button>
      </div>

      <div className="hp-rail-user">
        <Avatar name={userName} size={open ? 40 : 34} />
        <div className="hp-rail-user-text">
          <strong title={userName}>{userName}</strong>
          {userRole && <span className="hp-rail-role">{userRole}</span>}
        </div>
      </div>

      <ul className="hp-rail-nav">
        {tabs.map((t, i) => {
          const on = active === i;
          return (
            <li key={t.key}>
              <button
                type="button"
                className={`hp-rail-item${on ? ' is-on' : ''}`}
                aria-current={on ? 'page' : undefined}
                onClick={() => onSelect(i)}
                title={open ? undefined : t.label}
              >
                {/* The bar, not a background tint alone: at a glance the
                    eye finds an edge faster than a fill, and it survives
                    the collapse. */}
                <span className="hp-rail-mark" aria-hidden="true" />
                <span className="hp-rail-icon" aria-hidden="true">{t.icon}</span>
                <span className="hp-rail-label">{t.label}</span>
                {typeof t.count === 'number' && (
                  <span className="hp-rail-count">{t.count}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="hp-rail-foot">
        <button
          type="button"
          className="hp-rail-item hp-rail-signout"
          onClick={onSignOut}
          title={open ? undefined : 'Sign out'}
        >
          <span className="hp-rail-mark" aria-hidden="true" />
          <span className="hp-rail-icon" aria-hidden="true"><SignOutIcon /></span>
          <span className="hp-rail-label">Sign out</span>
        </button>
      </div>
    </nav>
  );
}

/**
 * Every style the pieces above need. Render once, near the root of the
 * signed-in shell.
 *
 * Colours read CSS variables with fallbacks, so the shell can hand down
 * theme tokens without this file importing them:
 *   <div style={{ '--hp-accent': ACCENT, '--hp-panel': PANEL }}>
 */
export function HomePartsStyles() {
  return (
    <style>{`
      /* ── Avatar ───────────────────────────────────────────────── */
      .hp-avatar {
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        border-radius: 50%;
        color: #FFFFFF;
        font-weight: 700;
        letter-spacing: 0.02em;
        box-shadow:
          0 2px 8px rgba(0, 0, 0, 0.3),
          inset 0 0 0 1px rgba(255, 255, 255, 0.12);
      }

      /* ── Stat bar ─────────────────────────────────────────────── */
      .hp-statbar {
        display: flex;
        flex-wrap: wrap;
        align-items: stretch;
        padding: 14px 4px;
        background: var(--hp-panel, rgba(255, 255, 255, 0.03));
        border: 1px solid var(--hp-hair, rgba(255, 255, 255, 0.09));
        border-radius: 14px;
      }

      .hp-stat {
        flex: 1 1 0;
        min-width: 96px;
        padding: 0 16px;
        text-align: center;
      }

      /* A border on the segment, not a separate divider element: a
         wrapped bar would otherwise start its second row with a stray
         line hanging in space. */
      .hp-stat + .hp-stat {
        border-left: 1px solid var(--hp-hair, rgba(255, 255, 255, 0.09));
      }

      .hp-stat strong {
        display: block;
        font-size: 19px;
        font-weight: 700;
        color: var(--hp-accent, #E0B15C);
        /* so the counts don't jitter as they tick up */
        font-variant-numeric: tabular-nums;
      }

      .hp-stat span {
        display: block;
        margin-top: 3px;
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #8B96A3;
      }

      @media (max-width: 600px) {
        .hp-stat { padding: 0 10px; }
        .hp-stat strong { font-size: 16px; }
      }

      /* ── Chips ────────────────────────────────────────────────── */
      .hp-chip {
        display: inline-flex;
        align-items: center;
        min-height: 36px;
        padding: 0 15px;
        border: 1px solid var(--hp-hair, rgba(255, 255, 255, 0.12));
        border-radius: 999px;
        background: transparent;
        color: #9AA3AD;
        font: 500 13px/1 inherit;
        cursor: pointer;
        white-space: nowrap;
        touch-action: manipulation;
        transition: color 160ms ease, background 160ms ease, border-color 160ms ease;
      }

      .hp-chip.is-on {
        color: var(--hp-accent, #E0B15C);
        background: rgba(224, 177, 92, 0.12);
        border-color: var(--hp-accent, #E0B15C);
      }

      .hp-chip-count {
        margin-left: 7px;
        opacity: 0.65;
        font-variant-numeric: tabular-nums;
      }

      @media (hover: hover) {
        .hp-chip:hover { color: #E7E1D5; border-color: rgba(255, 255, 255, 0.24); }
      }

      /* ── Search ───────────────────────────────────────────────── */
      .hp-search {
        position: relative;
        display: flex;
        align-items: center;
      }

      .hp-search-icon {
        position: absolute;
        left: 13px;
        color: #7C8794;
        pointer-events: none;
      }

      .hp-search input {
        width: 100%;
        box-sizing: border-box;
        min-height: 44px;
        padding: 0 40px;
        border: 1px solid var(--hp-hair, rgba(255, 255, 255, 0.1));
        border-radius: 11px;
        background: var(--hp-sunken, #0D1117);
        color: #EFEAE0;
        font-size: 14px;
        outline: none;
        transition: border-color 160ms ease;
      }

      .hp-search input::placeholder { color: #6F7A87; }
      .hp-search input:focus { border-color: var(--hp-accent, #E0B15C); }

      /* Safari draws its own clear button on type=search, right next to
         ours. */
      .hp-search input::-webkit-search-decoration,
      .hp-search input::-webkit-search-cancel-button {
        -webkit-appearance: none;
        appearance: none;
      }

      .hp-search-clear {
        position: absolute;
        right: 8px;
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: #8B96A3;
        cursor: pointer;
      }

      .hp-search-clear:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #E7E1D5;
      }

      /* ── Empty state ──────────────────────────────────────────── */
      .hp-empty {
        display: grid;
        justify-items: center;
        gap: 6px;
        padding: 46px 22px;
        text-align: center;
      }

      .hp-empty-badge {
        display: grid;
        place-items: center;
        width: 52px;
        height: 52px;
        margin-bottom: 6px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--hp-hair, rgba(255, 255, 255, 0.09));
        color: #8B96A3;
      }

      .hp-empty-badge.is-search {
        color: var(--hp-accent, #E0B15C);
        background: rgba(224, 177, 92, 0.1);
        border-color: rgba(224, 177, 92, 0.3);
      }

      .hp-empty h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: #E7E1D5;
      }

      .hp-empty p {
        margin: 0;
        max-width: 34ch;
        font-size: 13px;
        line-height: 1.65;
        color: #8B96A3;
      }

      /* ── Nav rail ─────────────────────────────────────────────── */
      .hp-rail {
        --rail-w: 248px;
        --rail-w-collapsed: 76px;
        --rail-pad: 14px;

        position: sticky;
        top: 0;
        display: flex;
        flex-direction: column;
        flex: 0 0 var(--rail-w);
        width: var(--rail-w);
        height: 100vh;
        padding: 18px var(--rail-pad) 14px;
        box-sizing: border-box;
        background: var(--hp-panel, #15181D);
        border-right: 1px solid var(--hp-hair, rgba(255, 255, 255, 0.08));
        transition: flex-basis 240ms cubic-bezier(0.2, 0, 0, 1),
                    width 240ms cubic-bezier(0.2, 0, 0, 1);
      }

      .hp-rail.is-collapsed {
        flex-basis: var(--rail-w-collapsed);
        width: var(--rail-w-collapsed);
        --rail-pad: 10px;
      }

      /* Everything that is only a label hides together, so the collapse
         is one decision rather than five. */
      .hp-rail.is-collapsed .hp-rail-label,
      .hp-rail.is-collapsed .hp-rail-user-text,
      .hp-rail.is-collapsed .hp-rail-count,
      .hp-rail.is-collapsed .hp-rail-brand {
        display: none;
      }

      .hp-rail-head {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 40px;
      }

      .hp-rail.is-collapsed .hp-rail-head { justify-content: center; }

      .hp-rail-brand { flex: 1; min-width: 0; }

      .hp-rail-brand img {
        display: block;
        width: 100%;
        max-width: 150px;
        height: auto;
        border-radius: 7px;
      }

      .hp-rail-collapse {
        display: grid;
        place-items: center;
        flex: 0 0 30px;
        width: 30px;
        height: 30px;
        border: 1px solid var(--hp-hair, rgba(255, 255, 255, 0.09));
        border-radius: 8px;
        background: transparent;
        color: #8B96A3;
        cursor: pointer;
        transition: color 160ms ease, background 160ms ease;
      }

      .hp-rail-collapse:hover {
        color: #E7E1D5;
        background: rgba(255, 255, 255, 0.06);
      }

      .hp-chev { transition: transform 220ms cubic-bezier(0.2, 0, 0, 1); }

      .hp-rail-user {
        display: flex;
        align-items: center;
        gap: 11px;
        min-width: 0;
        margin: 18px 0;
        padding-bottom: 18px;
        border-bottom: 1px solid var(--hp-hair, rgba(255, 255, 255, 0.08));
      }

      .hp-rail.is-collapsed .hp-rail-user { justify-content: center; }

      /* min-width:0 on the flex child is what lets the ellipsis below
         actually engage — without it a long name forces the rail wider. */
      .hp-rail-user-text { min-width: 0; }

      .hp-rail-user-text strong {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: #E7E1D5;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .hp-rail-role {
        display: block;
        margin-top: 2px;
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #6F7A87;
      }

      .hp-rail-nav {
        flex: 1;
        margin: 0;
        padding: 0;
        list-style: none;
        overflow-y: auto;
        overflow-x: hidden;
      }

      .hp-rail-nav li + li { margin-top: 2px; }

      .hp-rail-item {
        position: relative;
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        min-height: 44px;
        padding: 0 12px;
        box-sizing: border-box;
        border: none;
        border-radius: 10px;
        background: transparent;
        color: #9AA3AD;
        font: 500 14px/1 inherit;
        text-align: left;
        cursor: pointer;
        touch-action: manipulation;
        transition: color 160ms ease, background 160ms ease;
      }

      .hp-rail.is-collapsed .hp-rail-item {
        justify-content: center;
        padding: 0;
      }

      .hp-rail-item:hover {
        color: #E7E1D5;
        background: rgba(255, 255, 255, 0.05);
      }

      .hp-rail-item:focus-visible {
        outline: 2px solid var(--hp-accent, #E0B15C);
        outline-offset: -2px;
      }

      .hp-rail-item.is-on {
        color: var(--hp-accent, #E0B15C);
        background: rgba(224, 177, 92, 0.11);
      }

      /* The active bar. Scaled rather than shown and hidden, so it grows
         out of the edge instead of blinking into place. */
      .hp-rail-mark {
        position: absolute;
        left: 0;
        top: 50%;
        width: 3px;
        height: 20px;
        margin-top: -10px;
        border-radius: 0 3px 3px 0;
        background: var(--hp-accent, #E0B15C);
        transform: scaleY(0);
        transform-origin: center;
        transition: transform 200ms cubic-bezier(0.2, 0, 0, 1);
      }

      .hp-rail-item.is-on .hp-rail-mark { transform: scaleY(1); }

      /* Fixed width so the labels line up whatever each icon's own
         drawing happens to measure. */
      .hp-rail-icon {
        display: grid;
        place-items: center;
        flex: 0 0 20px;
        width: 20px;
      }

      .hp-rail-label {
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .hp-rail-count {
        margin-left: auto;
        padding: 2px 7px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        font-size: 11px;
        font-variant-numeric: tabular-nums;
        color: #9AA3AD;
      }

      .hp-rail-item.is-on .hp-rail-count {
        background: rgba(224, 177, 92, 0.18);
        color: var(--hp-accent, #E0B15C);
      }

      .hp-rail-foot {
        padding-top: 12px;
        border-top: 1px solid var(--hp-hair, rgba(255, 255, 255, 0.08));
      }

      .hp-rail-signout { color: #8B96A3; }

      .hp-rail-signout:hover {
        color: #E68A72;
        background: rgba(230, 138, 114, 0.09);
      }

      /* The rail is desktop chrome; the phone shell has its own tab
         strip, and EmployeeHome only renders this above 900px anyway. */
      @media (max-width: 900px) {
        .hp-rail { display: none; }
      }

      @media (prefers-reduced-motion: reduce) {
        .hp-rail, .hp-rail-mark, .hp-chev { transition: none; }
      }
    `}</style>
  );
}