/**
 * Placeholder asset generators.
 *
 * The seed needs real bytes so the whole media path — upload, gating, signed
 * link, download counter — is exercisable before a single real IFU exists.
 * Everything produced here is visibly marked as a placeholder so it can never
 * be mistaken for a controlled document.
 */

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** A minimal, valid single-page PDF. No dependencies, no binary fixtures. */
export function makePdf(title: string, lines: string[]): Buffer {
  const content = [
    'BT',
    '/F1 16 Tf',
    '1 0 0 1 56 760 Tm',
    `(${escapePdfText(title)}) Tj`,
    'ET',
    'BT',
    '/F1 10 Tf',
    '1 0 0 1 56 730 Tm',
    '14 TL',
    ...lines.map((line) => `(${escapePdfText(line)}) Tj T*`),
    'ET',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

/**
 * Product placeholder image — a category-aware schematic drawn as a technical
 * line drawing, so a seeded catalogue reads as a set of deliberate diagrams
 * rather than grey boxes with initials.
 *
 * Palette follows the site's paper-lab system: the card's stage is already
 * white, so the drawing has no background of its own — ink outlines, a faint
 * blueprint grid, and one teal moment for the SKU. The only other colour is
 * data: the green control line on a cassette, and the phenol-red wash in the
 * transport tube (VTM is pink because of the phenol red indicator in it).
 *
 * Each kind carries its OWN frame rather than a shared 16:10 one. The card's
 * plate is a wide, short band (~3:1), so a squarer drawing fits by height and
 * leaves half the plate empty. Framing each schematic tightly around what it
 * actually draws lets `object-fit: contain` fill the band. For the same reason
 * the transport tube is drawn lying down — a vertical tube in a 3:1 band can
 * never be more than a sliver, and a catalogue drawing of a tube on its side
 * is entirely conventional.
 */
type SchematicCategory = 'fertility' | 'urinalysis' | 'transport-media' | 'infectious-disease';

/** Ink for outlines — the site's --on-dark at ~62%, flattened for SVG. */
const LINE = '#7c7a77';
const LINE_SOFT = '#b4b1ae';
const LABEL = '#96938f';
const TEAL = '#30acbc';
const CONTROL = '#22c55e';
const MONO = "'IBM Plex Mono', ui-monospace, Menlo, monospace";

function cassetteSchematic(): string {
  // 640 x 214 device, centred in the 700 x 300 draw area: sample well left,
  // result window right, C and T lines called out with leader ticks.
  return `<g transform="translate(56,69)">
    <rect width="640" height="214" rx="18" fill="#ffffff" stroke="${LINE}" stroke-width="3"/>
    <rect x="14" y="14" width="612" height="186" rx="10" fill="none" stroke="${LINE_SOFT}" stroke-width="1.5"/>

    <circle cx="128" cy="107" r="52" fill="none" stroke="${LINE}" stroke-width="3"/>
    <circle cx="128" cy="107" r="30" fill="none" stroke="${LINE_SOFT}" stroke-width="1.5"/>
    <text x="128" y="190" font-family="${MONO}" font-size="19" fill="${LABEL}" text-anchor="middle" letter-spacing="2">S</text>

    <rect x="262" y="56" width="318" height="102" rx="5" fill="none" stroke="${LINE}" stroke-width="3"/>
    <line x1="352" y1="66" x2="352" y2="148" stroke="${CONTROL}" stroke-width="8" stroke-linecap="round"/>
    <line x1="470" y1="66" x2="470" y2="148" stroke="${TEAL}" stroke-width="8" stroke-linecap="round"/>

    <g stroke="${LINE_SOFT}" stroke-width="1.5">
      <line x1="352" y1="56" x2="352" y2="34"/>
      <line x1="470" y1="56" x2="470" y2="34"/>
    </g>
    <g font-family="${MONO}" font-size="19" fill="${LABEL}" text-anchor="middle">
      <text x="352" y="24">C</text>
      <text x="470" y="24">T</text>
    </g>
  </g>`;
}

function stripSchematic(padCount: number): string {
  const padW = 54;
  const gap = 12;
  const inset = 82;
  const width = Math.max(680, inset * 2 + padCount * padW + (padCount - 1) * gap);

  const pads = Array.from({ length: padCount }, (_, index) => {
    const x = inset + index * (padW + gap);
    // Reagent pads read as a graded series, not as random noise.
    const tint = 0.1 + (index % 4) * 0.055;
    return `<rect x="${x}" y="26" width="${padW}" height="72" rx="2" fill="rgba(32,31,29,${tint.toFixed(3)})" stroke="${LINE_SOFT}" stroke-width="1.5"/>`;
  }).join('\n    ');

  return `<g transform="translate(26,50)">
    <rect width="${width}" height="124" rx="6" fill="#ffffff" stroke="${LINE}" stroke-width="3"/>
    ${pads}
    <line x1="${inset - 22}" y1="62" x2="${inset - 8}" y2="62" stroke="${TEAL}" stroke-width="3" stroke-linecap="round"/>
    <text x="${width / 2}" y="${124 + 34}" font-family="${MONO}" font-size="18" fill="${LABEL}" text-anchor="middle" letter-spacing="2.4">${padCount} PADS</text>
  </g>`;
}

function tubeSchematic(): string {
  // Lying down: cap at the left, medium filling toward the closed end.
  return `<g transform="translate(40,40)">
    <rect x="0" y="26" width="54" height="132" rx="7" fill="#ffffff" stroke="${LINE}" stroke-width="3"/>
    <g stroke="${LINE_SOFT}" stroke-width="1.5">
      <line x1="8" y1="52" x2="46" y2="52"/>
      <line x1="8" y1="78" x2="46" y2="78"/>
      <line x1="8" y1="106" x2="46" y2="106"/>
      <line x1="8" y1="132" x2="46" y2="132"/>
    </g>

    <path d="M54 36 v112 h370 a56 56 0 0 0 0 -112 Z" fill="#ffffff" stroke="${LINE}" stroke-width="3"/>
    <path d="M256 40 v104 h168 a52 52 0 0 0 0 -104 Z" fill="rgba(214,62,110,0.28)"/>
    <line x1="256" y1="40" x2="256" y2="144" stroke="${LINE}" stroke-width="2"/>

    <g stroke="${LINE_SOFT}" stroke-width="1.5">
      <line x1="160" y1="148" x2="160" y2="172"/>
      <line x1="256" y1="148" x2="256" y2="180"/>
      <line x1="352" y1="148" x2="352" y2="172"/>
    </g>
    <!-- Volume increases away from the closed (right) end, so the larger
         graduation sits nearer the cap. -->
    <g font-family="${MONO}" font-size="17" fill="${LABEL}" text-anchor="middle">
      <text x="160" y="192">3 mL</text>
      <text x="256" y="200">FILL</text>
      <text x="352" y="192">1 mL</text>
    </g>
  </g>`;
}

export function makeProductImage(name: string, sku: string, category: string = 'fertility'): Buffer {
  const parameterMatch = /(\d+)\s*Parameter/i.exec(name);
  const padCount = Math.min(11, Math.max(3, Number(parameterMatch?.[1] ?? 10)));

  // [content, drawing width, drawing height] — the frame is sized to the
  // drawing, not the other way round. A 24px margin plus a 44px label strip is
  // added below so the SKU and the placeholder notice never sit on the art.
  const stripWidth = Math.max(680, 164 + padCount * 54 + (padCount - 1) * 12);
  const [schematic, drawW, drawH] =
    category === 'urinalysis'
      ? ([stripSchematic(padCount), stripWidth, 220] as const)
      : category === 'transport-media'
        ? ([tubeSchematic(), 520, 250] as const)
        : ([cassetteSchematic(), 700, 300] as const);

  void (category as SchematicCategory);

  const pad = 26;
  const strip = 46;
  const w = drawW + pad * 2;
  const h = drawH + pad + strip;

  // No background fill beyond the blueprint grid: `.sku__plate` is already
  // white, and a painted plate inside it produced a visible second frame. The
  // product name is not drawn either — the card renders it as an <h3> below.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${name} — schematic placeholder">
  <defs>
    <pattern id="g" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M50 0H0V50" fill="none" stroke="rgba(32,31,29,0.05)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  ${schematic}
  <text x="${pad}" y="${h - 14}" font-family="${MONO}" font-size="19" fill="${TEAL}" letter-spacing="1.2">${sku}</text>
  <text x="${w - pad}" y="${h - 14}" font-family="${MONO}" font-size="14" fill="${LABEL}" letter-spacing="1.8" text-anchor="end">AWAITING PHOTOGRAPHY</text>
</svg>`;
  return Buffer.from(svg, 'utf8');
}

/** Certificate placeholder — deliberately stamped PLACEHOLDER. */
export function makeCertificateImage(name: string, issuer: string): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="850" height="1100" viewBox="0 0 850 1100" role="img" aria-label="${name} certificate placeholder">
  <rect width="850" height="1100" fill="#ffffff"/>
  <rect x="40" y="40" width="770" height="1020" fill="none" stroke="${LINE_SOFT}" stroke-width="2"/>
  <text x="80" y="140" font-family="'IBM Plex Sans', sans-serif" font-size="34" font-weight="600" fill="#201f1d">${name}</text>
  <text x="80" y="185" font-family="'IBM Plex Sans', sans-serif" font-size="20" fill="${LABEL}">${issuer}</text>
  <rect x="80" y="240" width="690" height="2" fill="${LINE_SOFT}"/>
  <g transform="rotate(-14 425 620)">
    <rect x="185" y="560" width="480" height="120" fill="none" stroke="${TEAL}" stroke-width="5"/>
    <text x="425" y="640" text-anchor="middle" font-family="${MONO}" font-size="54" fill="${TEAL}" letter-spacing="4">PLACEHOLDER</text>
  </g>
  <text x="80" y="960" font-family="'IBM Plex Sans', sans-serif" font-size="16" fill="${LABEL}">Replace with the scanned certificate before publishing.</text>
  <text x="80" y="990" font-family="'IBM Plex Sans', sans-serif" font-size="16" fill="${LABEL}">See DECISIONS.md — D3.</text>
</svg>`;
  return Buffer.from(svg, 'utf8');
}

export const PLACEHOLDER_NOTICE = [
  'PLACEHOLDER DOCUMENT — NOT A CONTROLLED COPY',
  '',
  'This file was generated by the seed script so the gated-download flow could',
  'be built and tested end to end. It carries no regulatory meaning.',
  '',
  'Replace it in Dashboard → Media before this product is published.',
  '',
];
