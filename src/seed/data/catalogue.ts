import type { DocumentKind, ProductStatus, SpecGroup } from '../../models/common.js';

/**
 * Seed catalogue.
 *
 * ── Read this before trusting a number ──────────────────────────────────────
 * Every spec row below is `verified: false`. The values are industry-standard
 * reference figures for the category — correct as a *shape*, not as a claim
 * about Chimera's measured performance. The API refuses to publish a product
 * while any row is unverified, so the seeded catalogue lands entirely as
 * drafts. Replacing a placeholder with a real, evidenced number and ticking
 * "verified" is the content workflow (DECISIONS.md).
 */

export type SeedSpec = {
  label: string;
  value: string;
  unit?: string;
  group: SpecGroup;
  key?: boolean;
};

export type SeedPack = {
  label: string;
  tests?: number;
  sku: string;
  hsn: string;
  moq: number;
};

export type SeedProduct = {
  name: string;
  slug: string;
  categorySlug: string;
  shortDescription: string;
  intendedUse: string;
  analytes: string[];
  sampleTypes: string[];
  method: string;
  format: string;
  specs: SeedSpec[];
  packSizes: SeedPack[];
  documents: DocumentKind[];
  status: ProductStatus;
  featured?: boolean;
  /**
   * Real product photography, as filenames under `assets/product-photos/`.
   * When present the seed uploads these instead of drawing a schematic — the
   * first entry becomes the primary image, the rest the gallery. Omit the
   * field and the product falls back to a generated placeholder, which is
   * what an unphotographed SKU should look like.
   */
  photos?: string[];
  seo: { title: string; description: string };
};

export type SeedCategory = {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  intro: string;
  requiredSpecs: string[];
  order: number;
  seo: { title: string; description: string };
};

export const categories: SeedCategory[] = [
  {
    name: 'Fertility',
    slug: 'fertility',
    tagline: 'hCG and LH rapid tests',
    description:
      'Lateral-flow rapid tests for human chorionic gonadotropin and luteinising hormone, manufactured in Okhla for laboratory, clinic and OEM supply.',
    intro:
      'Both formats are supplied bulk-packed for laboratory use and cassette-packed for clinic use. Sensitivity, read time and shelf life are stated on every product page and repeated in the Instructions for Use.',
    requiredSpecs: ['sensitivity', 'read-time', 'shelf-life', 'storage-temperature'],
    order: 1,
    seo: {
      title: 'Fertility Rapid Test Kit Manufacturer | hCG & LH | Chimera Biotech',
      description:
        'hCG pregnancy and LH ovulation rapid test kits manufactured in Delhi. Full specifications, sensitivity in mIU/mL, IFU download and bulk pack sizes.',
    },
  },
  {
    name: 'Urinalysis',
    slug: 'urinalysis',
    tagline: 'RAPiDVUE reagent strips, 1 to 10 parameters',
    description:
      'Chimera RAPiDVUE urine reagent strips in 1, 2, 4 and 10 parameter configurations, supplied in desiccant-sealed vials for laboratory, clinic and home use.',
    intro:
      'Each configuration lists its parameter set, detection range per pad and read time per pad. Strips require no instrument — dip the reagent end in the sample and read against the chart on the vial. Supplied 50 or 100 per vial with an integrated desiccant cap.',
    requiredSpecs: ['detection-range', 'read-time', 'shelf-life', 'storage-temperature'],
    order: 2,
    seo: {
      title: 'Urine Reagent Strip Manufacturer in India | Chimera Biotech',
      description:
        'Chimera RAPiDVUE urine reagent strips in 1, 2, 4 and 10 parameter configurations. Detection ranges, read times and pack sizes published per SKU. Bulk and OEM supply.',
    },
  },
  {
    name: 'Transport media',
    slug: 'transport-media',
    tagline: 'VTM, VLTM and universal transport media',
    description:
      'Viral transport medium and related collection systems, filled and sealed under controlled conditions with batch-level sterility testing.',
    intro:
      'Every batch is released against an osmolality, pH and 14-day sterility incubation record. Those figures appear on the product page and on the Certificate of Analysis.',
    requiredSpecs: ['ph', 'sterility', 'shelf-life', 'storage-temperature'],
    order: 3,
    seo: {
      title: 'Viral Transport Medium Manufacturer | VTM & UTM | Chimera Biotech',
      description:
        'Viral transport medium manufactured in Delhi. Osmolality, pH, sterility testing and viral stability data published per product, with COA on request.',
    },
  },
  {
    name: 'Infectious disease',
    slug: 'infectious-disease',
    tagline: 'Rapid tests — in development',
    description:
      'Rapid diagnostic tests for dengue, malaria, typhoid and hepatitis B surface antigen. This category is in development; pages are published as roadmap entries.',
    intro:
      'These products are not yet released for sale. Pages are listed so distributors and OEM partners can register interest ahead of launch.',
    requiredSpecs: ['sensitivity', 'specificity', 'read-time', 'shelf-life', 'storage-temperature'],
    order: 4,
    seo: {
      title: 'Infectious Disease Rapid Test Kits | In Development | Chimera Biotech',
      description:
        'Dengue NS1, malaria Pf/Pv, typhoid and HBsAg rapid tests in development at Chimera Biotech. Register distributor or OEM interest ahead of launch.',
    },
  },
];

/*
 * The range as printed on the RAPiDVUE cartons — 1P, 2P, 4P and 10P. The seed
 * previously carried 3/5/10/11-parameter configurations, which were invented
 * (DECISIONS.md D6) before the real packaging was available.
 *
 * The 10P carton prints "Nitrate". Every urine reagent strip in the world
 * assays nitrITE (the bacterial reduction product of dietary nitrate), so the
 * carton has a typo and this file states the analyte correctly. Flagged for
 * the client — the artwork should be corrected at the next print run.
 */
const URINE_PARAMETERS = {
  1: ['Protein'],
  2: ['Protein', 'Glucose'],
  4: ['Protein', 'Glucose', 'pH', 'Specific gravity'],
  10: [
    'Blood',
    'Bilirubin',
    'Urobilinogen',
    'Ketone',
    'Protein',
    'Nitrite',
    'Glucose',
    'pH',
    'Specific gravity',
    'Leukocytes',
  ],
} as const;

/** The Product model caps meta descriptions at 180 characters. */
function clampMeta(text: string, max = 180): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.;:—-]$/, '')}.`;
}

function urineStrip(count: 1 | 2 | 4 | 10, order: number): SeedProduct {
  const parameters = URINE_PARAMETERS[count];
  return {
    name: `Chimera RAPiDVUE Urine Strip ${count}P`,
    slug: `urine-strip-${count}p`,
    categorySlug: 'urinalysis',
    shortDescription:
      count <= 4
        ? `Reagent strip for the semi-quantitative determination of ${parameters
            .join(', ')
            .toLowerCase()} in human urine, read visually against the colour chart.`
        : `Reagent strip for the semi-quantitative determination of ${parameters
            .slice(0, 4)
            .join(', ')
            .toLowerCase()} and ${count - 4} further parameters in human urine, read visually or on a strip reader.`,
    intendedUse: `For the semi-quantitative determination of ${parameters.join(
      ', ',
    )} in human urine. For in vitro diagnostic use by trained laboratory personnel.`,
    analytes: [...parameters],
    sampleTypes: ['Fresh, well-mixed, uncentrifuged urine'],
    method: 'Reagent pad colorimetry — visual comparison or semi-automated strip reader',
    format: `Plastic strip with ${count} reagent ${count === 1 ? 'pad' : 'pads'}, vial-packed with an integrated desiccant cap`,
    // 10P is the only configuration with its own box-and-vial shot. 1P, 2P and
    // 4P currently share the range photograph, which does show all four
    // cartons — per-SKU shots are on the photography list.
    photos:
      count === 10
        ? ['urine-strips-10-parameter-1.jpg', 'urine-strips-range-2.jpg']
        : ['urine-strips-range-1.jpg', 'urine-strips-range-2.jpg'],
    specs: [
      {
        label: 'Parameters',
        value: `${count} — ${parameters.join(', ')}`,
        group: 'performance',
      },
      {
        label: 'Detection range',
        value: 'Per-pad ranges are listed in the IFU colour chart',
        group: 'performance',
        key: true,
      },
      { label: 'Read time', value: '60–120', unit: 's per pad', group: 'performance', key: true },
      { label: 'Reading method', value: 'Visual chart or strip reader', group: 'performance' },
      { label: 'Sample volume', value: 'Full pad immersion, blot excess', group: 'handling' },
      { label: 'Shelf life', value: '24', unit: 'months sealed', group: 'handling', key: true },
      {
        label: 'Shelf life after opening',
        value: '90',
        unit: 'days',
        group: 'handling',
      },
      { label: 'Storage temperature', value: '2–30', unit: '°C', group: 'handling' },
      { label: 'Humidity', value: 'Keep capped; desiccant must remain in the vial', group: 'handling' },
      { label: 'CDSCO licence no.', value: 'Pending — see DECISIONS.md D3', group: 'regulatory' },
      { label: 'HSN code', value: '38220090', group: 'regulatory' },
    ],
    packSizes: [
      {
        label: '50 strips / vial',
        tests: 50,
        sku: `CHM-US${count}P-050`,
        hsn: '38220090',
        moq: 20,
      },
      {
        label: '100 strips / vial',
        tests: 100,
        sku: `CHM-US${count}P-100`,
        hsn: '38220090',
        moq: 20,
      },
    ],
    documents: ['ifu', 'coa', 'msds'],
    status: 'draft',
    featured: count === 10,
    seo: {
      title: `Urine Strip ${count}P — ${count} Parameter Reagent Strips | Chimera`,
      // Capped: the model rejects a meta description over 180 characters, and
      // the parameter names vary enough in length to cross it on some SKUs.
      description: clampMeta(
        `RAPiDVUE Urine Strip ${count}P — semi-quantitative determination of ${parameters
          .slice(0, 4)
          .join(', ')} in urine. Detection ranges, read time and pack sizes published.`,
      ),
    },
  };
}

export const products: SeedProduct[] = [
  {
    name: 'Pregyan — Chimera hCG (Pregnancy) Rapid Test Kit',
    slug: 'hcg-pregnancy-rapid-test',
    categorySlug: 'fertility',
    shortDescription:
      'Rapid chromatographic immunoassay for the qualitative detection of human chorionic gonadotropin in human urine and serum. For professional and home use.',
    intendedUse:
      'For the qualitative detection of human chorionic gonadotropin (hCG) in human urine and serum as an aid in the early detection of pregnancy. Intended for professional use as well as home use. All positive samples should be confirmed by a supplemental assay such as a quantitative beta-hCG blood test. For in vitro diagnostic use.',
    analytes: ['Human chorionic gonadotropin (hCG)'],
    sampleTypes: ['Urine', 'Serum'],
    method: 'Lateral flow sandwich immunoassay, colloidal gold conjugate',
    format: 'Single-use cassette in a foil pouch with desiccant, supplied with a disposable pipette',
    photos: [
      'hcg-pregnancy-rapid-test-1.jpg',
      'hcg-pregnancy-rapid-test-2.jpg',
      'hcg-pregnancy-rapid-test-3.jpg',
      'hcg-pregnancy-rapid-test-4.jpg',
    ],
    specs: [
      { label: 'Sensitivity', value: '25', unit: 'mIU/mL', group: 'performance', key: true },
      { label: 'Relative specificity', value: '≥ 99.5', unit: '%', group: 'performance' },
      { label: 'Relative sensitivity', value: '≥ 99.0', unit: '%', group: 'performance' },
      { label: 'Read time', value: '3–5', unit: 'minutes', group: 'performance', key: true },
      {
        label: 'Cross-reactivity',
        value: 'No interference from LH 300 mIU/mL, FSH 1000 mIU/mL, TSH 1000 µIU/mL',
        group: 'performance',
      },
      { label: 'Sample volume', value: '3 drops (≈ 100 µL)', group: 'handling' },
      { label: 'Shelf life', value: '24', unit: 'months', group: 'handling', key: true },
      { label: 'Storage temperature', value: '2–30', unit: '°C', group: 'handling' },
      { label: 'Operating temperature', value: '15–30', unit: '°C', group: 'handling' },
      { label: 'CDSCO licence no.', value: 'Pending — see DECISIONS.md D3', group: 'regulatory' },
      { label: 'HSN code', value: '38220090', group: 'regulatory' },
    ],
    packSizes: [
      { label: 'Single cassette pouch', tests: 1, sku: 'CHM-HCG-C01', hsn: '38220090', moq: 100 },
      { label: '25 cassettes / box', tests: 25, sku: 'CHM-HCG-C25', hsn: '38220090', moq: 20 },
      { label: '50 strips / bulk pack', tests: 50, sku: 'CHM-HCG-S50', hsn: '38220090', moq: 20 },
    ],
    documents: ['ifu', 'coa', 'msds'],
    status: 'draft',
    featured: true,
    seo: {
      title: 'hCG Pregnancy Test Kit Manufacturer | 25 mIU/mL | Chimera Biotech',
      description:
        'Pregyan hCG pregnancy rapid test — 25 mIU/mL sensitivity, 3–5 minute read, 24-month shelf life. Cassette, midstream and strip formats. Bulk and OEM supply from Delhi.',
    },
  },
  {
    name: 'Chimera LH Ovulation Test Kit',
    slug: 'lh-ovulation-rapid-test',
    categorySlug: 'fertility',
    shortDescription:
      'Chromatographic immunoassay for the qualitative detection of luteinising hormone in human urine, to predict the LH surge associated with ovulation. For professional and home use.',
    intendedUse:
      'For the qualitative detection of luteinising hormone (LH) in human urine, to predict the LH surge associated with ovulation and the best probable time to plan conception. Intended for professional use as well as home use. For in vitro diagnostic use.',
    analytes: ['Luteinising hormone (LH)'],
    sampleTypes: ['Urine'],
    method: 'Lateral flow competitive immunoassay, colloidal gold conjugate',
    format: 'Single-use cassette in a foil pouch with desiccant, supplied with a disposable pipette',
    photos: [
      'lh-ovulation-rapid-test-1.jpg',
      'lh-ovulation-rapid-test-2.jpg',
      'lh-ovulation-rapid-test-3.jpg',
    ],
    specs: [
      { label: 'Sensitivity', value: '25', unit: 'mIU/mL', group: 'performance', key: true },
      { label: 'Relative specificity', value: '≥ 99.0', unit: '%', group: 'performance' },
      { label: 'Read time', value: '5', unit: 'minutes', group: 'performance', key: true },
      {
        label: 'Cross-reactivity',
        value: 'No interference from hCG 1000 mIU/mL, FSH 1000 mIU/mL, TSH 1000 µIU/mL',
        group: 'performance',
      },
      { label: 'Sample volume', value: '3 drops (≈ 100 µL)', group: 'handling' },
      { label: 'Shelf life', value: '24', unit: 'months', group: 'handling', key: true },
      { label: 'Storage temperature', value: '2–30', unit: '°C', group: 'handling' },
      { label: 'CDSCO licence no.', value: 'Pending — see DECISIONS.md D3', group: 'regulatory' },
      { label: 'HSN code', value: '38220090', group: 'regulatory' },
    ],
    packSizes: [
      { label: 'Single cassette pouch', tests: 1, sku: 'CHM-LH-C01', hsn: '38220090', moq: 100 },
      { label: '25 cassettes / box', tests: 25, sku: 'CHM-LH-C25', hsn: '38220090', moq: 20 },
    ],
    documents: ['ifu', 'coa', 'msds'],
    status: 'draft',
    seo: {
      title: 'LH Ovulation Rapid Test Kit Manufacturer | 25 mIU/mL | Chimera Biotech',
      description:
        'LH ovulation rapid test — 25 mIU/mL sensitivity, 5 minute read, 24-month shelf life. Cassette, midstream and strip formats. Bulk and private label supply.',
    },
  },
  urineStrip(1, 3),
  urineStrip(2, 4),
  urineStrip(4, 5),
  urineStrip(10, 6),
  {
    name: 'Chimera Viral Transport Medium (VTM)',
    slug: 'viral-transport-medium',
    categorySlug: 'transport-media',
    shortDescription:
      'Viral transport medium (non-propagating) supplied with nylon flocked nasopharyngeal and oropharyngeal swabs, for the collection and transport of respiratory specimens to the laboratory.',
    intendedUse:
      'For the collection, transport and short-term preservation of clinical specimens containing viruses, chlamydiae, mycoplasmas and ureaplasmas prior to laboratory testing. Supplied to be inoculated with a nasopharyngeal or oropharyngeal swab specimen, transported to the laboratory and analysed with a validated assay. For in vitro diagnostic use.',
    analytes: ['Respiratory viral specimens (SARS-CoV-2, Influenza A/B, RSV)'],
    sampleTypes: ['Nasopharyngeal swab', 'Oropharyngeal swab', 'Nasal swab'],
    method: "Hank's balanced salt solution base with protein stabiliser, antibiotics and phenol red pH indicator",
    format:
      'Kit — 3 mL medium in a 15 mL graduated polypropylene tube with a screw cap, one sterile nasopharyngeal swab and one sterile oropharyngeal swab',
    photos: [
      'viral-transport-medium-1.jpg',
      'viral-transport-medium-2.jpg',
      'viral-transport-medium-3.jpg',
    ],
    specs: [
      { label: 'Fill volume', value: '3', unit: 'mL', group: 'performance' },
      { label: 'pH', value: '7.2–7.4', group: 'performance', key: true },
      { label: 'Osmolality', value: '280–320', unit: 'mOsm/kg', group: 'performance' },
      {
        label: 'Sterility',
        value: 'Pass — 14-day incubation, per batch',
        group: 'performance',
        key: true,
      },
      {
        label: 'Viral stability',
        value: '72 h at 2–8 °C; 48 h at room temperature',
        group: 'performance',
      },
      {
        label: 'Swab type',
        value: 'Nylon flocked, medical-grade microfibres, moulded breakpoint',
        group: 'handling',
      },
      { label: 'Swabs per kit', value: '1 nasopharyngeal + 1 oropharyngeal', group: 'handling' },
      { label: 'Swab sterilisation', value: 'Ethylene oxide (EO)', group: 'regulatory' },
      { label: 'Shelf life', value: '12', unit: 'months', group: 'handling', key: true },
      { label: 'Storage temperature', value: '2–25', unit: '°C, protect from light', group: 'handling' },
      { label: 'CDSCO licence no.', value: 'Pending — see DECISIONS.md D3', group: 'regulatory' },
      { label: 'HSN code', value: '38220090', group: 'regulatory' },
    ],
    packSizes: [
      // The 50-unit kit box is the pack shown on the carton artwork; the single
      // tube and the 100-carton are supplied on request.
      { label: '50 kits / box', tests: 50, sku: 'CHM-VTM-050', hsn: '38220090', moq: 10 },
      { label: 'Single kit', tests: 1, sku: 'CHM-VTM-3ML', hsn: '38220090', moq: 100 },
    ],
    documents: ['ifu', 'coa', 'msds'],
    status: 'draft',
    featured: true,
    seo: {
      title: 'Viral Transport Medium (VTM) Manufacturer in India | Chimera Biotech',
      description:
        'Hanks-based viral transport medium, 3 mL with swab. pH 7.2–7.4, osmolality 280–320 mOsm/kg, 14-day sterility testing per batch, 72 h viral stability. COA on request.',
    },
  },
  // ── Roadmap entries (§8 site map) ─────────────────────────────────────────
  {
    name: 'Viral Lysis Transport Medium (VLTM)',
    slug: 'viral-lysis-transport-medium',
    categorySlug: 'transport-media',
    shortDescription:
      'Inactivating transport medium that lyses viral particles at collection, allowing specimen handling outside a BSL-2 cabinet prior to nucleic acid extraction.',
    intendedUse:
      'For the collection and inactivation of clinical specimens prior to molecular testing. In development — not released for sale.',
    analytes: ['Respiratory viral specimens'],
    sampleTypes: ['Nasopharyngeal swab', 'Oropharyngeal swab'],
    method: 'Guanidinium-based lysis buffer with carrier and pH indicator',
    format: '2 mL medium in a 15 mL polypropylene tube with swab',
    specs: [
      { label: 'Fill volume', value: '2', unit: 'mL', group: 'performance' },
      { label: 'Shelf life', value: 'To be established', group: 'handling', key: true },
      { label: 'Storage temperature', value: 'To be established', group: 'handling' },
    ],
    packSizes: [{ label: 'Single tube with swab', tests: 1, sku: 'CHM-VLTM-2ML', hsn: '38220090', moq: 100 }],
    documents: [],
    status: 'roadmap',
    seo: {
      title: 'Viral Lysis Transport Medium (VLTM) — In Development | Chimera Biotech',
      description:
        'Inactivating viral lysis transport medium in development at Chimera Biotech. Register distributor or OEM interest ahead of launch.',
    },
  },
  {
    name: 'Universal Transport Medium (UTM)',
    slug: 'universal-transport-medium',
    categorySlug: 'transport-media',
    shortDescription:
      'Universal transport medium for viral, chlamydial, mycoplasmal and ureaplasmal specimens, supplied with a choice of flocked or polyester swab.',
    intendedUse:
      'For the collection and transport of clinical specimens for culture and molecular testing. In development — not released for sale.',
    analytes: ['Viral, chlamydial, mycoplasmal and ureaplasmal specimens'],
    sampleTypes: ['Nasopharyngeal swab', 'Throat swab', 'Genital swab'],
    method: 'Buffered salt solution with protein stabiliser and antimicrobials',
    format: '3 mL medium in a 15 mL polypropylene tube with swab',
    specs: [
      { label: 'Fill volume', value: '3', unit: 'mL', group: 'performance' },
      { label: 'Shelf life', value: 'To be established', group: 'handling', key: true },
      { label: 'Storage temperature', value: 'To be established', group: 'handling' },
    ],
    packSizes: [{ label: 'Single tube with swab', tests: 1, sku: 'CHM-UTM-3ML', hsn: '38220090', moq: 100 }],
    documents: [],
    status: 'roadmap',
    seo: {
      title: 'Universal Transport Medium (UTM) — In Development | Chimera Biotech',
      description:
        'Universal transport medium in development at Chimera Biotech. Register distributor or OEM interest ahead of launch.',
    },
  },
  {
    // The generic RAPiDVUE cassette platform, listed on the current Wix site as
    // "Chimera Rapid Test Kit" with no analyte named. It cannot publish in this
    // state and should not: the API's gate requires an analyte, a sample type
    // and a stated sensitivity. It is captured here so the photography and the
    // manufacturer's own intended-use wording are on file, and it stays draft
    // until the client says which assays ship on the platform.
    name: 'Chimera RAPiDVUE Rapid Test Kit',
    slug: 'rapidvue-rapid-test-kit',
    categorySlug: 'infectious-disease',
    shortDescription:
      'The RAPiDVUE lateral-flow cassette platform, supplied as a single-use test in a foil pouch with desiccant. For professional use and initial screening only.',
    intendedUse:
      'Rapid point-of-care test for in vitro diagnostic use. These kits are for professional use and are intended only for initial screening; reactive results require confirmation by a validated laboratory method. Analyte, sample type and performance are stated per assay — see the individual product page.',
    analytes: [],
    sampleTypes: [],
    method: 'Lateral flow immunoassay, colloidal gold conjugate',
    format: 'Single-use cassette in a foil pouch with desiccant, boxed',
    photos: ['rapidvue-cassette-1.jpg', 'rapidvue-cassette-2.jpg'],
    specs: [
      { label: 'Sensitivity', value: 'Stated per assay', group: 'performance', key: true },
      { label: 'Specificity', value: 'Stated per assay', group: 'performance' },
      { label: 'Read time', value: 'Stated per assay', group: 'performance' },
      { label: 'Storage temperature', value: '2–30', unit: '°C', group: 'handling', key: true },
      { label: 'Single use', value: 'Yes — do not reuse', group: 'handling' },
      { label: 'CE marking', value: 'CE marked, IVD', group: 'regulatory' },
      { label: 'HSN code', value: '38220090', group: 'regulatory' },
    ],
    packSizes: [
      { label: '25 cassettes / box', tests: 25, sku: 'CHM-RV-025', hsn: '38220090', moq: 20 },
    ],
    documents: [],
    status: 'draft',
    seo: {
      title: 'RAPiDVUE Rapid Test Kits | Point-of-Care IVD | Chimera Biotech',
      description:
        'The Chimera RAPiDVUE lateral-flow cassette platform for rapid point-of-care screening. Manufactured in Okhla, New Delhi. Assay list and performance data on request.',
    },
  },
  ...(
    [
      ['Dengue NS1 Antigen Rapid Test', 'dengue-ns1', 'Dengue virus NS1 antigen', 'Serum, plasma, whole blood'],
      ['Malaria Pf/Pv Antigen Rapid Test', 'malaria-pf-pv', 'P. falciparum HRP-II and P. vivax pLDH', 'Whole blood'],
      ['Typhoid IgG/IgM Rapid Test', 'typhoid', 'Salmonella typhi IgG and IgM antibodies', 'Serum, plasma, whole blood'],
      ['HBsAg Rapid Test', 'hbsag', 'Hepatitis B surface antigen', 'Serum, plasma, whole blood'],
    ] as const
  ).map(
    ([name, slug, analyte, samples]): SeedProduct => ({
      name,
      slug,
      categorySlug: 'infectious-disease',
      shortDescription: `Lateral flow rapid test for the qualitative detection of ${analyte.toLowerCase()} in ${samples.toLowerCase()}. In development — not released for sale.`,
      intendedUse: `For the qualitative detection of ${analyte} as an aid in diagnosis. In development — not released for sale.`,
      analytes: [analyte],
      sampleTypes: samples.split(', '),
      method: 'Lateral flow immunoassay, colloidal gold conjugate',
      format: 'Cassette with buffer and disposable pipette',
      specs: [
        { label: 'Sensitivity', value: 'To be established', group: 'performance', key: true },
        { label: 'Specificity', value: 'To be established', group: 'performance' },
        { label: 'Read time', value: 'To be established', group: 'performance' },
        { label: 'Shelf life', value: 'To be established', group: 'handling' },
        { label: 'Storage temperature', value: 'To be established', group: 'handling' },
      ],
      packSizes: [
        {
          label: '25 cassettes / box',
          tests: 25,
          sku: `CHM-${slug.toUpperCase().replace(/-/g, '')}-25`.slice(0, 24),
          hsn: '38220090',
          moq: 20,
        },
      ],
      documents: [],
      status: 'roadmap',
      seo: {
        title: `${name} — In Development | Chimera Biotech`,
        description: `${name} in development at Chimera Biotech, Delhi. Register distributor or OEM interest ahead of launch.`,
      },
    }),
  ),
];
