// /* Palette, type and the physical constants the plan is drawn with.
//    Every size here that touches the drawing is in METRES, not pixels:
//    the whole plan is one printed sheet lying on the ground, so a border,
//    a plot number and a road name keep the same proportion to their plot
//    at any zoom. A screen-constant stroke would make borders swell as you
//    pull back. */

// export const CANVAS = '#15181D';
// export const ACCENT = '#C9A977';
// export const PANEL = 'rgba(17,20,26,0.95)';
// export const HAIR = '#2E353D';
// export const MUTED = '#8B96A3';
// export const SCRIM = 'rgba(9,12,17,0.62)';

// export const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
// export const SANS = "'Barlow Condensed', 'Oswald', 'Inter', -apple-system, sans-serif";
// export const BODY = "'Inter', -apple-system, 'Segoe UI', sans-serif";
// export const MAPFONT = "'Poppins', 'Inter', -apple-system, sans-serif";

// /** Non-plot land uses. */
// export const KIND = {
//   plot: { label: 'Plot', fill: '#D9AC8B', stroke: '#9A6E52', ink: '#43301E' },
//   road: { label: 'Road', fill: '#3B3F44', stroke: '#2B2E33', ink: '#E8E4DA' },
//   open_space: { label: 'Open space', fill: '#6E9B3E', stroke: '#54782F', ink: '#F2F6EC' },
//   amenity: { label: 'Amenity space', fill: '#3E86C4', stroke: '#2F679A', ink: '#EDF4FB' },
//   htl: { label: 'HTL corridor', fill: '#7D8F66', stroke: '#5F6E4D', ink: '#F1F4EB' },
//   utility: { label: 'Utility', fill: '#4E6A8C', stroke: '#3B5169', ink: '#EDF2F8' },
// };

// /** Two warm tones sampled from the reference render, alternated plot by
//     plot so neighbours never share an edge colour. */
// export const PLOT_TONES = ['#DFB694', '#CB9E7F'];
// export const toneOf = (name) => PLOT_TONES[(parseInt(name, 10) || 0) % PLOT_TONES.length];

// /* Selection sits outside the layout's semantic palette on purpose: tan
//    means available, blue token, amber part-paid, green agreed, red sold.
//    A saturated orchid reads as "this one is picked", not as a status. */
// export const SELECTED_FILL = '#9C36B5';
// export const SELECTED_INK = '#FFFFFF';

// export const PLOT_STROKE = 0.30;   // metres
// export const SEL_STROKE = 0.75;    // metres

// /* The raised block. The selected plot stands three metres proud of its
//    own socket. */
// export const LIFT_H = 3.0;
// export const SOCKET_FILL = '#2A1E30';
// export const WALL_FILL = '#6E2680';
// export const WALL_EDGE = '#4E1B5C';

// /* Camera. */
// export const REST_TILT = 0.86;   // radians the view settles at, ~49°
// export const MAX_TILT = 1.0;     // the container is sized to cover this much tilt
// export const SPIN_RATE = 0.006;  // radians per frame on the 360






// export const BRAND = {
//   primary: '#04427B',
//   primaryDark: '#022A4E',
//   primaryLight: '#0B5FA6',
//   accent: '#4C9AFF',
//   accentDark: '#1E5A96',
// };

// /** Login screen — dark glass card over the animated gradient. */
// export const LOGIN = {
//   textPrimary: '#FFFFFF',
//   textSecondary: '#A8B4C7',
//   fieldBg: 'rgba(255,255,255,0.08)',
//   fieldBgFocused: 'rgba(255,255,255,0.12)',
//   fieldBorder: 'rgba(255,255,255,0.15)',
//   cardBg: 'rgba(16,26,44,0.70)',
//   cardBorder: 'rgba(255,255,255,0.15)',
// };

// /** Signed-in shell — elevation by surface tone, not by shadow. */
// export const APP = {
//   bg: '#0A0E16',
//   surface: '#141B26',
//   surfaceAlt: '#1B2431',
//   border: '#283242',
//   textPrimary: '#F3F5F9',
//   textSecondary: '#9AA4B7',
//   textMuted: '#6B7688',
//   accent: '#4C9AFF',
//   accentDim: '#1F3A56',
// };

// export const LAYOUT = {
//   wideBreakpoint: 900,
//   contentMaxWidth: 1160,
//   cardColumnWidth: 380,
// };

// /** Injected once in App.jsx so CSS files can use var(--app-accent) etc. */
// export const cssVars = {
//   '--brand-primary': BRAND.primary,
//   '--brand-primary-dark': BRAND.primaryDark,
//   '--brand-primary-light': BRAND.primaryLight,
//   '--brand-accent': BRAND.accent,
//   '--app-bg': APP.bg,
//   '--app-surface': APP.surface,
//   '--app-surface-alt': APP.surfaceAlt,
//   '--app-border': APP.border,
//   '--app-text': APP.textPrimary,
//   '--app-text-2': APP.textSecondary,
//   '--app-text-3': APP.textMuted,
//   '--app-accent': APP.accent,
//   '--app-accent-dim': APP.accentDim,
//   '--login-card-bg': LOGIN.cardBg,
//   '--login-card-border': LOGIN.cardBorder,
//   '--login-field-bg': LOGIN.fieldBg,
//   '--login-field-bg-focus': LOGIN.fieldBgFocused,
//   '--login-field-border': LOGIN.fieldBorder,
//   '--login-text-2': LOGIN.textSecondary,
// };




/* Palette, type and the physical constants the plan is drawn with.
   Every size here that touches the drawing is in METRES, not pixels:
   the whole plan is one printed sheet lying on the ground, so a border,
   a plot number and a road name keep the same proportion to their plot
   at any zoom. A screen-constant stroke would make borders swell as you
   pull back. */

export const CANVAS = '#15181D';
export const ACCENT = '#C9A977';
export const PANEL = 'rgba(17,20,26,0.95)';
export const HAIR = '#2E353D';
export const MUTED = '#8B96A3';
export const SCRIM = 'rgba(9,12,17,0.62)';

export const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
export const SANS = "'Barlow Condensed', 'Oswald', 'Inter', -apple-system, sans-serif";
export const BODY = "'Inter', -apple-system, 'Segoe UI', sans-serif";
export const MAPFONT = "'Poppins', 'Inter', -apple-system, sans-serif";

/** Non-plot land uses. */
export const KIND = {
  plot: { label: 'Plot', fill: '#D9AC8B', stroke: '#9A6E52', ink: '#43301E' },
  road: { label: 'Road', fill: '#3B3F44', stroke: '#2B2E33', ink: '#E8E4DA' },
  open_space: { label: 'Open space', fill: '#6E9B3E', stroke: '#54782F', ink: '#F2F6EC' },
  amenity: { label: 'Amenity space', fill: '#3E86C4', stroke: '#2F679A', ink: '#EDF4FB' },
  htl: { label: 'HTL corridor', fill: '#7D8F66', stroke: '#5F6E4D', ink: '#F1F4EB' },
  utility: { label: 'Utility', fill: '#4E6A8C', stroke: '#3B5169', ink: '#EDF2F8' },
};

/** Two warm tones sampled from the reference render, alternated plot by
    plot so neighbours never share an edge colour. */
export const PLOT_TONES = ['#DFB694', '#CB9E7F'];
export const toneOf = (name) => PLOT_TONES[(parseInt(name, 10) || 0) % PLOT_TONES.length];

/* Selection sits outside the layout's semantic palette on purpose: tan
   means available, blue token, amber part-paid, green agreed, red sold.
   A saturated orchid reads as "this one is picked", not as a status. */
export const SELECTED_FILL = '#9C36B5';
export const SELECTED_INK = '#FFFFFF';

/* Filtered out, but not gone.

   A plot that fails the filter keeps its own hue at reduced strength
   rather than fading to the canvas: the layout has to stay legible as a
   layout while you narrow it, or you cannot see WHERE the matches sit
   inside it. The fill carries the colour and the edge carries the
   shape, and the edge is held much higher — a fill can go quite faint
   and the plot still reads as long as its boundary holds.

   Judge these with a plot RAISED and a filter on. That is the worst
   case: SCRIM lies over the dimmed plots at 0.62 and takes 0.42 down to
   roughly 0.16 of what is set here. */
export const DIM_FILL = 0.42;
export const DIM_EDGE = 0.75;
export const DIM_INK = 0.45;

export const PLOT_STROKE = 0.30;   // metres
export const SEL_STROKE = 0.75;    // metres

/* The raised block. The selected plot stands three metres proud of its
   own socket. */
export const LIFT_H = 3.0;
export const SOCKET_FILL = '#2A1E30';
export const WALL_FILL = '#6E2680';
export const WALL_EDGE = '#4E1B5C';

/* Camera. */
export const REST_TILT = 0.86;   // radians the view settles at, ~49°
export const MAX_TILT = 1.0;     // the container is sized to cover this much tilt
export const SPIN_RATE = 0.006;  // radians per frame on the 360

export const BRAND = {
  primary: '#04427B',
  primaryDark: '#022A4E',
  primaryLight: '#0B5FA6',
  accent: '#4C9AFF',
  accentDark: '#1E5A96',
};

/** Login screen — dark glass card over the animated gradient. */
export const LOGIN = {
  textPrimary: '#FFFFFF',
  textSecondary: '#A8B4C7',
  fieldBg: 'rgba(255,255,255,0.08)',
  fieldBgFocused: 'rgba(255,255,255,0.12)',
  fieldBorder: 'rgba(255,255,255,0.15)',
  cardBg: 'rgba(16,26,44,0.70)',
  cardBorder: 'rgba(255,255,255,0.15)',
};

/** Signed-in shell — elevation by surface tone, not by shadow. */
export const APP = {
  bg: '#0A0E16',
  surface: '#141B26',
  surfaceAlt: '#1B2431',
  border: '#283242',
  textPrimary: '#F3F5F9',
  textSecondary: '#9AA4B7',
  textMuted: '#6B7688',
  accent: '#4C9AFF',
  accentDim: '#1F3A56',
};

export const LAYOUT = {
  wideBreakpoint: 900,
  contentMaxWidth: 1160,
  cardColumnWidth: 380,
};

/** Injected once in App.jsx so CSS files can use var(--app-accent) etc. */
export const cssVars = {
  '--brand-primary': BRAND.primary,
  '--brand-primary-dark': BRAND.primaryDark,
  '--brand-primary-light': BRAND.primaryLight,
  '--brand-accent': BRAND.accent,
  '--app-bg': APP.bg,
  '--app-surface': APP.surface,
  '--app-surface-alt': APP.surfaceAlt,
  '--app-border': APP.border,
  '--app-text': APP.textPrimary,
  '--app-text-2': APP.textSecondary,
  '--app-text-3': APP.textMuted,
  '--app-accent': APP.accent,
  '--app-accent-dim': APP.accentDim,
  '--login-card-bg': LOGIN.cardBg,
  '--login-card-border': LOGIN.cardBorder,
  '--login-field-bg': LOGIN.fieldBg,
  '--login-field-bg-focus': LOGIN.fieldBgFocused,
  '--login-field-border': LOGIN.fieldBorder,
  '--login-text-2': LOGIN.textSecondary,
};