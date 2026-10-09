/**
 * Figures for the demo logbook, generated as SVG so the repo carries no binary assets.
 * They are illustrative: curves come from a polydisperse sphere model, not from real data.
 */

const toDataUrl = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const FONT = `font-family="Roboto, Helvetica, Arial, sans-serif"`;

/** Orientation-averaged form factor of a sphere with Gaussian size distribution (radius in Å). */
function sphereIntensity(q: number, radius: number, scale: number, background: number): number {
  const spread = 0.14;
  let sum = 0;
  let weights = 0;
  for (let k = -3; k <= 3; k += 0.5) {
    const r = radius * (1 + spread * k);
    const w = Math.exp(-0.5 * k * k);
    const x = q * r;
    const f = (3 * (Math.sin(x) - x * Math.cos(x))) / x ** 3;
    sum += w * f * f * (r / radius) ** 6;
    weights += w;
  }
  return (scale * sum) / weights + background;
}

/** Deterministic pseudo-noise so the figures look measured but never change between runs. */
const wobble = (i: number, amount: number): number =>
  1 + amount * Math.sin(i * 12.9898) * Math.cos(i * 4.1414);

interface Series {
  label: string;
  colour: string;
  radius: number;
  scale: number;
}

export function iqPlot(): string {
  const width = 640;
  const height = 400;
  const m = { left: 76, right: 24, top: 24, bottom: 60 };
  const qMin = 0.005;
  const qMax = 0.5;
  const iMin = 0.05;
  const iMax = 200;
  const x = (q: number) =>
    m.left +
    ((Math.log10(q) - Math.log10(qMin)) / (Math.log10(qMax) - Math.log10(qMin))) *
      (width - m.left - m.right);
  const y = (i: number) =>
    height -
    m.bottom -
    ((Math.log10(i) - Math.log10(iMin)) / (Math.log10(iMax) - Math.log10(iMin))) *
      (height - m.top - m.bottom);

  const series: Series[] = [
    { label: 'SDS 5 wt%, 25 °C', colour: '#1e5fd6', radius: 19.4, scale: 46 },
    { label: 'SDS 5 wt%, 60 °C', colour: '#d9480f', radius: 18.6, scale: 41 },
  ];

  const xTicks = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5];
  const yTicks = [0.1, 1, 10, 100];
  const grid = [
    ...xTicks.map(
      (t) =>
        `<line x1="${x(t)}" y1="${m.top}" x2="${x(t)}" y2="${height - m.bottom}" stroke="#e3e6ec"/>`,
    ),
    ...yTicks.map(
      (t) =>
        `<line x1="${m.left}" y1="${y(t)}" x2="${width - m.right}" y2="${y(t)}" stroke="#e3e6ec"/>`,
    ),
  ].join('');
  const labels = [
    ...xTicks.map(
      (t) =>
        `<text x="${x(t)}" y="${height - m.bottom + 18}" text-anchor="middle" font-size="12" fill="#444" ${FONT}>${t}</text>`,
    ),
    ...yTicks.map(
      (t) =>
        `<text x="${m.left - 8}" y="${y(t) + 4}" text-anchor="end" font-size="12" fill="#444" ${FONT}>${t}</text>`,
    ),
  ].join('');

  const curves = series
    .map((s, si) => {
      const points: string[] = [];
      const markers: string[] = [];
      for (let n = 0; n < 56; n++) {
        const q = qMin * (qMax / qMin) ** (n / 55);
        const i = sphereIntensity(q, s.radius, s.scale, 0.09) * wobble(n + si * 31, 0.05 + q * 0.4);
        points.push(`${x(q).toFixed(1)},${y(i).toFixed(1)}`);
        const err = i * (0.03 + q * 0.5);
        markers.push(
          `<line x1="${x(q).toFixed(1)}" y1="${y(i + err).toFixed(1)}" x2="${x(q).toFixed(1)}" y2="${y(Math.max(i - err, iMin)).toFixed(1)}" stroke="${s.colour}" stroke-opacity="0.45"/>` +
            `<circle cx="${x(q).toFixed(1)}" cy="${y(i).toFixed(1)}" r="2.6" fill="${s.colour}"/>`,
        );
      }
      return `<polyline points="${points.join(' ')}" fill="none" stroke="${s.colour}" stroke-opacity="0.35" stroke-width="1"/>${markers.join('')}`;
    })
    .join('');

  const legend = series
    .map(
      (s, i) =>
        `<circle cx="${width - 190}" cy="${m.top + 22 + i * 20}" r="4" fill="${s.colour}"/>` +
        `<text x="${width - 178}" y="${m.top + 26 + i * 20}" font-size="12" fill="#222" ${FONT}>${s.label}</text>`,
    )
    .join('');

  return toDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
      `<rect width="${width}" height="${height}" fill="#fff"/>${grid}` +
      `<rect x="${m.left}" y="${m.top}" width="${width - m.left - m.right}" height="${height - m.top - m.bottom}" fill="none" stroke="#888"/>` +
      `${labels}${curves}${legend}` +
      `<text x="${(m.left + width - m.right) / 2}" y="${height - 14}" text-anchor="middle" font-size="13" fill="#222" ${FONT}>Q (Å⁻¹)</text>` +
      `<text transform="translate(18 ${(m.top + height - m.bottom) / 2}) rotate(-90)" text-anchor="middle" font-size="13" fill="#222" ${FONT}>I(Q) (cm⁻¹)</text>` +
      `</svg>`,
  );
}

/** Isotropic scattering ring pattern on a detector, coloured with a viridis-like scale. */
export function detectorImage(): string {
  const size = 360;
  const centre = size / 2;
  const radiusPx = 170;
  const qEdge = 0.42;
  const palette = ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'].map((hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]);
  const colour = (t: number): string => {
    const pos = Math.min(Math.max(t, 0), 1) * (palette.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(lo + 1, palette.length - 1);
    const f = pos - lo;
    return `rgb(${[0, 1, 2].map((c) => Math.round(palette[lo][c] + (palette[hi][c] - palette[lo][c]) * f)).join(',')})`;
  };
  const stops: string[] = [];
  for (let n = 0; n <= 60; n++) {
    const frac = n / 60;
    const q = Math.max(frac * qEdge, 0.004);
    const i = sphereIntensity(q, 19.4, 46, 0.09);
    const t = (Math.log10(i) - Math.log10(0.1)) / (Math.log10(60) - Math.log10(0.1));
    stops.push(`<stop offset="${frac.toFixed(3)}" stop-color="${colour(t)}"/>`);
  }
  return toDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size + 36}" width="${size}" height="${size + 36}">` +
      `<defs><radialGradient id="g" cx="50%" cy="50%" r="50%">${stops.join('')}</radialGradient></defs>` +
      `<rect width="${size}" height="${size + 36}" fill="#0b1020"/>` +
      `<circle cx="${centre}" cy="${centre}" r="${radiusPx}" fill="url(#g)"/>` +
      `<circle cx="${centre}" cy="${centre}" r="9" fill="#0b1020"/>` +
      `<rect x="${centre - 2}" y="${centre}" width="4" height="${radiusPx}" fill="#0b1020"/>` +
      `<text x="${centre}" y="${size + 22}" text-anchor="middle" font-size="12" fill="#cfd6e6" ${FONT}>Rear bank · run 0043 · SDS 5 wt%, 25 °C · 600 s</text>` +
      `</svg>`,
  );
}

/** Top-down schematic of a Couette (concentric cylinder) shear cell in the beam. */
export function shearCellSchematic(): string {
  const w = 640;
  const hgt = 340;
  const cx = 250;
  const cy = 170;
  const label = (xx: number, yy: number, text: string, anchor = 'start') =>
    `<text x="${xx}" y="${yy}" text-anchor="${anchor}" font-size="13" fill="#222" ${FONT}>${text}</text>`;
  return toDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hgt}" width="${w}" height="${hgt}">` +
      `<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#222"/></marker></defs>` +
      `<rect width="${w}" height="${hgt}" fill="#fff"/>` +
      `<circle cx="${cx}" cy="${cy}" r="130" fill="#dbe7fb" stroke="#1e5fd6" stroke-width="3"/>` +
      `<circle cx="${cx}" cy="${cy}" r="112" fill="#bcd2f6"/>` +
      `<circle cx="${cx}" cy="${cy}" r="100" fill="#8fa1b8" stroke="#44546a" stroke-width="3"/>` +
      `<path d="M ${cx - 62} ${cy - 62} A 88 88 0 0 1 ${cx + 62} ${cy - 62}" fill="none" stroke="#222" stroke-width="2" marker-end="url(#a)"/>` +
      label(cx, cy + 6, 'rotating bob', 'middle') +
      `<line x1="20" y1="${cy - 118}" x2="${cx + 150}" y2="${cy - 118}" stroke="#d9480f" stroke-width="3" marker-end="url(#a)"/>` +
      label(20, cy - 128, 'neutron beam (8 mm)') +
      label(470, 60, 'Stationary outer cup', 'start') +
      `<line x1="468" y1="56" x2="${cx + 92}" y2="${cy - 84}" stroke="#555"/>` +
      label(470, 150, 'Sample gap, 1 mm (SDS in D₂O)') +
      `<line x1="468" y1="146" x2="${cx + 120}" y2="${cy - 20}" stroke="#555"/>` +
      label(470, 240, 'Rotating inner cylinder') +
      `<line x1="468" y1="236" x2="${cx + 60}" y2="${cy + 60}" stroke="#555"/>` +
      label(470, 300, 'Water bath, 10–60 °C') +
      `</svg>`,
  );
}
