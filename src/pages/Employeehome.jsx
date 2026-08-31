
// pages/EmployeeHome.jsx — port of employee_home.dart
//
// The Dart file switched shells at 900px: stacked header + bottom TabBar on
// phones, persistent left rail + centred content on desktop. Same split here,
// same single source of truth for the active tab — the rail and the mobile
// tab strip both drive `tab`, so a section never disagrees with its chrome.
//
// StreamBuilder becomes onSnapshot inside a useEffect; the tab that needs
// live data subscribes once at this level rather than per-card.

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/Authcontext';
import { useIsWide } from '../hooks/useMediaQuery';
import { fetchMaps, watchEmployeeQuotations } from '../services/Quotationservice';
import { userUid } from '../lib/Quote';
import { QuotationCard, MapCard } from '../components/Cards';
import {
  Avatar, DocIcon, EmptyState, FilterChip, HomePartsStyles, MapIcon,
  NavRail, SearchBar, SignOutIcon, StatBar,
} from '../components/HomeParts';
import { ACCENT, HAIR, PANEL } from '../theme/tokens';
import '../styles/home.css';

/* Lazy, so the file stays out of the main bundle until the tab is
   actually turned on. It is commented out of TABS for now but is
   coming back, and PANES below is keyed by tab so the two cannot
   drift apart in the meantime. */
const SiteVisitTab = React.lazy(() => import('./SiteVisitTab'));

/* Icons are ELEMENTS, not strings: the rail and the phone tab strip
   both render `t.icon` directly, so they stay identical without either
   knowing what an icon is made of. Emoji were the previous approach and
   render as a different glyph on every platform — colour on one,
   monochrome on another, off the baseline on a third. */
const TABS = [
  { key: 'maps', label: 'Layout maps', icon: <MapIcon /> },
  { key: 'quotations', label: 'Quotations', icon: <DocIcon /> },
  // { key: 'visits', label: 'Site visit', icon: <CameraIcon /> },
];

export default function EmployeeHome() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isWide = useIsWide();

  const [tab, setTab] = useState(0);

  /* One rule for the id, shared with everything that writes or reads a
     quotation — so an auth-shape change is one edit, not five. */
  const uid = userUid(user);

  // ── Quotations (live) ────────────────────────────────────────────────
  const [quotations, setQuotations] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [quotesError, setQuotesError] = useState(null);
  const [quoteSearch, setQuoteSearch] = useState('');

  useEffect(() => {
    if (!uid) return undefined;
    setQuotesLoading(true);
    return watchEmployeeQuotations(
      uid,
      (list) => { setQuotations(list); setQuotesLoading(false); setQuotesError(null); },
      (err) => {
        console.error('[quotations]', err);
        /* failed-precondition is always the missing composite index on
           (createdByUid asc, quotationDate desc). Firestore's own
           message carries a link that creates it, so the console is
           where the fix is — say so rather than showing a raw code. */
        setQuotesError(
          err?.code === 'failed-precondition'
            ? 'This list needs a Firestore index that does not exist yet. The browser console has a link that creates it.'
            : err?.message || 'Could not load quotations.',
        );
        setQuotesLoading(false);
      },
    );
  }, [uid]);

  // ── Maps (one-shot, with pull-to-refresh equivalent) ─────────────────
  const [maps, setMaps] = useState([]);
  const [mapsLoading, setMapsLoading] = useState(true);
  const [mapSearch, setMapSearch] = useState('');
  const [mapFilter, setMapFilter] = useState('All');

  const loadMaps = async () => {
    setMapsLoading(true);
    try {
      setMaps(await fetchMaps());
    } catch (err) {
      console.error('Error loading maps:', err);
    } finally {
      setMapsLoading(false);
    }
  };

  useEffect(() => { loadMaps(); }, []);

  // ── Derived lists ────────────────────────────────────────────────────
  const filteredQuotes = useMemo(() => {
    const q = quoteSearch.trim().toLowerCase();
    if (!q) return quotations;
    return quotations.filter((x) => (
      x.customerName.toLowerCase().includes(q)
      || x.plotNumber.toLowerCase().includes(q)
      || x.projectName.toLowerCase().includes(q)
    ));
  }, [quotations, quoteSearch]);

  const filteredMaps = useMemo(() => {
    const q = mapSearch.trim().toLowerCase();
    if (!q) return maps;
    return maps.filter((m) => (m.name || '').toLowerCase().includes(q));
  }, [maps, mapSearch]);

  const totalValue = useMemo(
    () => quotations.reduce((acc, q) => acc + q.finalTotalAmount, 0),
    [quotations],
  );

  const openMap = (map) => navigate(`/maps/${map.id}`);
  const openQuotation = (q) => navigate(`/quotations/${q.id}`);

  /* The rail shows a count beside Quotations, so TABS is rebuilt here
     rather than held at module scope — the count is state. */
  const railTabs = useMemo(() => TABS.map((t) => (
    t.key === 'quotations' ? { ...t, count: quotations.length } : t
  )), [quotations.length]);

  const stats = (
    <StatBar
      quotationCount={quotations.length}
      totalValue={totalValue}
      mapCount={maps.length}
    />
  );

  // ── Tab bodies ───────────────────────────────────────────────────────
  const mapsTab = (
    <div className="tabpane">
      <div className="tabpane-controls">
        <SearchBar
          value={mapSearch}
          onChange={setMapSearch}
          placeholder="Search maps"
        />
        <div className="chiprow">
          {['All', 'Recent', 'Large', 'Small'].map((f) => (
            <FilterChip
              key={f}
              label={f}
              value={f}
              selected={mapFilter}
              onSelect={setMapFilter}
            />
          ))}
        </div>
        <div className="tabpane-meta">
          <span>{filteredMaps.length} map{filteredMaps.length === 1 ? '' : 's'}</span>
          <button type="button" className="linkbtn" onClick={loadMaps}>Refresh</button>
        </div>
      </div>

      {mapsLoading ? <Spinner /> : filteredMaps.length === 0 ? (
        <EmptyState
          searching={!!mapSearch}
          title={mapSearch ? 'No maps match that search' : 'No maps yet'}
          body={mapSearch
            ? 'Try a shorter or different term.'
            : 'Maps appear here once an admin publishes them.'}
        />
      ) : (
        <div className="cardgrid">
          {filteredMaps.map((m, i) => (
            <MapCard key={m.id} map={m} index={i} onOpen={() => openMap(m)} />
          ))}
        </div>
      )}
    </div>
  );

  const quotationsTab = (
    <div className="tabpane">
      <div className="tabpane-controls">
        <SearchBar
          value={quoteSearch}
          onChange={setQuoteSearch}
          placeholder="Search by customer, project or plot"
        />
        <div className="tabpane-meta">
          <span>{filteredQuotes.length} quotation{filteredQuotes.length === 1 ? '' : 's'}</span>
          {/* <span className="tabpane-hint">Select one to see the full breakdown</span> */}
        </div>
      </div>

      {quotesError ? (
        <EmptyState
          title="Quotations didn’t load"
          body={quotesError}
        />
      ) : quotesLoading ? <Spinner /> : filteredQuotes.length === 0 ? (
        <EmptyState
          searching={!!quoteSearch}
          title={quoteSearch ? 'No quotations match that search' : 'No quotations yet'}
          body={quoteSearch
            ? 'Try a shorter or different term.'
            : 'Build one from a plot in any layout map.'}
        />
      ) : (
        <div className="cardgrid">
          {filteredQuotes.map((q, i) => (
            <QuotationCard
              key={q.id}
              quotation={q}
              index={i}
              onOpen={() => openQuotation(q)}
            />
          ))}
        </div>
      )}
    </div>
  );

  /* Keyed to TABS, not a positional array. The old version was a
     three-item array against a two-item TABS, so SiteVisitTab was built
     on every render for a tab nobody could reach. This way an
     unreachable pane is never constructed, and uncommenting the tab
     above is the only edit needed to bring it back. */
  const PANES = {
    maps: mapsTab,
    quotations: quotationsTab,
    visits: (
      <React.Suspense fallback={<Spinner />}>
        <SiteVisitTab user={user} />
      </React.Suspense>
    ),
  };

  const pane = PANES[TABS[tab]?.key] || mapsTab;

  /* Theme tokens handed to the CSS in HomePartsStyles, which reads them
     as variables with fallbacks rather than importing them itself. */
  const theme = { '--hp-accent': ACCENT, '--hp-panel': PANEL, '--hp-hair': HAIR };

  // ── Shells ───────────────────────────────────────────────────────────
  if (isWide) {
    return (
      <>
        <HomePartsStyles />
        <div className="shell shell--wide" style={theme}>
          <NavRail
            tabs={railTabs}
            active={tab}
            onSelect={setTab}
            userName={user?.name || ''}
            userRole={user?.role}
            onSignOut={signOut}
          />
          <main className="shell-main">
            <div className="shell-strip">{stats}</div>
            <div className="shell-content">{pane}</div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <HomePartsStyles />
      <div className="shell" style={theme}>
        <motion.header
          className="phone-head"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="phone-head-top">
            <Avatar name={user?.name || ''} />
            <div className="phone-head-who">
              <span>Welcome back,</span>
              <strong>{user?.name}</strong>
            </div>
            <img
              className="phone-head-logo"
              src="/images/saraswati_mark.png"
              alt=""
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <button
              type="button"
              className="iconbtn"
              onClick={signOut}
              aria-label="Sign out"
            >
              <SignOutIcon />
            </button>
          </div>

          {stats}

          <div className="segmented" role="tablist">
            {TABS.map((t, i) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === i}
                className={`segmented-tab${tab === i ? ' is-on' : ''}`}
                onClick={() => setTab(i)}
              >
                <span className="segmented-icon" aria-hidden="true">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </motion.header>

        <main className="shell-content">{pane}</main>
      </div>
    </>
  );
}

function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />;
}