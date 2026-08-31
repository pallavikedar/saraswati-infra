import { SQFT } from '../lib/units';
import { statusKeyOf, statusDocValue, STATUS } from '../theme/status';

/**
 * The web twin of `models/plot_data.dart`. Same field names, same
 * coercions, same colour rules — so a plot written here reads correctly
 * in the Flutter viewer and vice versa.
 */
export class PlotData {
  constructor({
    srNo = '',
    corners = [],
    status = 'Available',
    area = 0,
    areaSqFt,
    dimensions = '',
    center = { lat: 0, lng: 0 },
    labelPosition = null,
    ownerName = '',
    contactPhone = '',
    contactEmail = '',
    createdDate,
    notes = '',
    type = 'plot',
    firestoreId = null,
    plotId = 0,
    plotNo = '',
    title = '',
    facing = 'North',
  } = {}) {
    this.srNo = srNo;
    this.corners = corners;
    this.status = status;
    this.area = area;
    this.areaSqFt = areaSqFt ?? area * SQFT;   // auto-convert sqm to sqft
    this.dimensions = dimensions;
    this.center = center;
    this.labelPosition = labelPosition;
    this.ownerName = ownerName;
    this.contactPhone = contactPhone;
    this.contactEmail = contactEmail;
    this.createdDate = createdDate ?? new Date();
    this.notes = notes;
    this.type = type;
    this.firestoreId = firestoreId;
    this.plotId = plotId;
    this.plotNo = plotNo;
    this.title = title;
    this.facing = facing;
  }

  toMap() {
    return {
      srNo: this.srNo,
      plotId: this.plotId,
      plotNo: this.plotNo,
      title: this.title,
      corners: this.corners.map((c) => ({ lat: c.lat, lng: c.lng })),
      status: this.status,
      area: this.area,
      areaSqFt: this.areaSqFt,
      dimensions: this.dimensions,
      center: { lat: this.center.lat, lng: this.center.lng },
      ...(this.labelPosition
        ? { labelPosition: { lat: this.labelPosition.lat, lng: this.labelPosition.lng } }
        : {}),
      ownerName: this.ownerName,
      contactPhone: this.contactPhone,
      contactEmail: this.contactEmail,
      createdDate: this.createdDate.toISOString(),
      notes: this.notes,
      type: this.type,
      facing: this.facing,
    };
  }

  static fromDoc(data, id) {
    const corners = (data.corners || []).map((e) => ({
      lat: Number(e.lat),
      lng: Number(e.lng),
    }));
    const center = data.center
      ? { lat: Number(data.center.lat), lng: Number(data.center.lng) }
      : { lat: 0, lng: 0 };
    const areaSqM = Number(data.area ?? 0);
    const lp = data.labelPosition;

    return new PlotData({
      srNo: data.srNo ?? '',
      plotId: Number(data.plotId ?? 0),
      plotNo: asPlotNo(data.plotNo),
      title: data.title ?? '',
      corners,
      status: data.status ?? 'Available',
      area: areaSqM,
      areaSqFt: data.areaSqFt != null ? Number(data.areaSqFt) : areaSqM * SQFT,
      dimensions: data.dimensions ?? '',
      center,
      labelPosition: lp ? { lat: Number(lp.lat), lng: Number(lp.lng) } : null,
      ownerName: data.ownerName ?? '',
      contactPhone: data.contactPhone ?? '',
      contactEmail: data.contactEmail ?? '',
      createdDate: data.createdDate ? new Date(data.createdDate) : undefined,
      notes: data.notes ?? '',
      type: data.type ?? 'plot',
      firestoreId: id ?? null,
      facing: data.facing ?? 'North',
    });
  }

  copyWith(patch = {}) {
    return new PlotData({ ...this, ...patch });
  }

  get statusKey() { return statusKeyOf(this.status); }
  get fill() { return STATUS[this.statusKey].fill; }
  get ink() { return STATUS[this.statusKey].ink; }
}

/* ── plotNo coercions, ported one-for-one from the Dart ───────────── */

/** Some legacy/imported plot docs stored plotNo as a List or Map instead
    of a plain String, which used to render as raw toString() garbage
    (e.g. "{[,],plot}"). Coerce anything unexpected into a clean string. */
export function asPlotNo(v) {
  let s;
  if (v == null) s = '';
  else if (typeof v === 'string') s = v;
  else if (typeof v === 'number') s = String(v);
  else if (Array.isArray(v)) {
    s = v
      .filter((e) => e != null && String(e).trim() !== '')
      .map((e) => String(e).trim())
      .join('/');
  } else if (typeof v === 'object') {
    const candidate = v.plotNo ?? v.value ?? v.no;
    s = candidate != null ? String(candidate) : '';
  } else s = String(v);
  return stripPlotPrefix(stripWrappingBrackets(s.trim()));
}

/** Some plot docs have literal wrapping brackets baked into the string,
    e.g. "[88]" instead of "88" (bad data import). Strip one layer. */
export function stripWrappingBrackets(s) {
  if (s.length < 2) return s;
  const pairs = { '[': ']', '{': '}', '(': ')' };
  const closing = pairs[s[0]];
  if (closing && s[s.length - 1] === closing) return s.slice(1, -1).trim();
  return s;
}

const PLOT_PREFIX_RE = /^plot\s*[-:.]?\s*/i;

/** Some docs have "Plot " baked into plotNo (e.g. "Plot 200"). The UI
    adds its own "Plot" label, so keep the stored value bare. */
export function stripPlotPrefix(s) {
  const stripped = s.replace(PLOT_PREFIX_RE, '').trim();
  return stripped !== '' ? stripped : s;
}

/** plotNo → a safe Firestore document id (a coerced "12/A" would
    otherwise open a subcollection path). */
export const plotDocId = (plotNo) =>
  String(plotNo).trim().replace(/[/\\.#$[\]\s]+/g, '-') || 'unnamed';

export { statusKeyOf, statusDocValue };
