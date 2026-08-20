import { env } from '../../config/env.js';

/**
 * Site-wide settings, certifications and export pages.
 *
 * The NAP block below is the fix for the three critical audit findings (§1.2):
 * a real mailto, a dialable number, and one email domain that matches the
 * website domain (D1).
 */

export const settings: Array<{ key: string; value: unknown }> = [
  {
    key: 'nap',
    value: {
      legalName: 'Chimera Biotech Pvt Ltd',
      addressLine1: 'Shed No. 199, DSIIDC, Okhla Industrial Estate',
      addressLine2: 'Okhla Phase I',
      city: 'New Delhi',
      state: 'Delhi',
      postcode: '110020',
      country: 'India',
      /** Landline — international form of the number printed as +011 45830018 on the old site. */
      phoneDisplay: '+91 11 4583 0018',
      phoneDial: '+911145830018',
      mobileDisplay: '+91 80763 43482',
      mobileDial: '+918076343482',
      /** Prefer chimera-biotech.com domain; env may override inboxes. */
      emailGeneral: env.mail.inboxes.info,
      emailSales: env.mail.inboxes.sales,
      emailExports: env.mail.inboxes.exports,
      // Confirmed against the live site (www.chimera-biotech.com): the landline
      // and mobile are published there as "+011 45830018, +91 8076343482", and
      // the registered address matches the page title. GSTIN and CIN are not
      // published anywhere public — they stay flagged, and src/lib/unset.ts in
      // chimera-web suppresses them from the contact band rather than shipping
      // a bracketed placeholder.
      gstin: '[Confirm GSTIN]',
      cin: '[Confirm CIN]',
      mapEmbedUrl: '',
    },
  },
  {
    key: 'businessHours',
    value: {
      weekdays: 'Monday–Saturday, 09:30–18:30 IST',
      closed: 'Sunday and public holidays',
    },
  },
  {
    key: 'whatsapp',
    value: {
      enabled: true,
      number: '911145830018',
      prefilledMessage:
        'Hello Chimera Biotech — I would like to enquire about your diagnostic products.',
    },
  },
  {
    key: 'socials',
    value: {
      linkedin: 'https://www.linkedin.com/company/chimera-biotech/',
      indiamart: '',
      tradeindia: '',
    },
  },
  {
    /**
     * §6.7 rule 06 — every figure links to the page that evidences it.
     * This is what prevents a repeat of "35+ Products" above a catalogue of 5.
     */
    key: 'homeCounters',
    value: {
      note: 'Update these against the live catalogue. Every counter must survive a click.',
      items: [
        { value: '4', label: 'Product categories', href: '/products' },
        { value: '7', label: 'SKUs in catalogue', href: '/products' },
        { value: '11', label: 'Parameters on our widest urine strip', href: '/products/urinalysis/urine-strips-11-parameter' },
        { value: '25', label: 'mIU/mL hCG sensitivity', href: '/products/fertility/hcg-pregnancy-rapid-test' },
      ],
    },
  },
  {
    key: 'banner',
    value: { enabled: false, text: '', href: '', label: '' },
  },
];

export const certifications = [
  {
    name: 'CDSCO Manufacturing Licence',
    issuer: 'Central Drugs Standard Control Organisation (CDSCO)',
    number: '',
    scope: 'Manufacture of in-vitro diagnostic devices',
    order: 1,
    status: 'draft' as const,
  },
  {
    name: 'ISO 13485:2016',
    issuer: '[Certification body — confirm]',
    number: '',
    scope: 'Medical devices — quality management systems',
    order: 2,
    status: 'draft' as const,
  },
  {
    name: 'ISO 9001:2015',
    issuer: '[Certification body — confirm]',
    number: '',
    scope: 'Quality management systems',
    order: 3,
    status: 'draft' as const,
  },
];

/** §10 Phase 4 — six export country pages, as Avecon runs. */
export const countryPages = [
  {
    country: 'Kenya',
    countryCode: 'KE',
    ports: ['Mombasa'],
    intro:
      'Chimera Biotech supplies rapid diagnostic tests, urine reagent strips and viral transport media to importers and laboratory distributors in Kenya.',
    regulatoryNotes:
      'In-vitro diagnostics are regulated by the Pharmacy and Poisons Board. Chimera supplies the product specification, stability summary and Certificate of Analysis needed for the importer to file. Registration is filed locally by the importer or their agent.',
  },
  {
    country: 'Bangladesh',
    countryCode: 'BD',
    ports: ['Chattogram', 'Dhaka ICD'],
    intro:
      'Chimera Biotech supplies diagnostic kits and transport media to importers and distributors in Bangladesh, on FOB Delhi or CIF Chattogram terms.',
    regulatoryNotes:
      'Import of diagnostic reagents is administered by the Directorate General of Drug Administration. Chimera supplies the technical documentation required for the importer to obtain a registration and import permit.',
  },
  {
    country: 'United Arab Emirates',
    countryCode: 'AE',
    ports: ['Jebel Ali'],
    intro:
      'Chimera Biotech supplies rapid tests, urine reagent strips and transport media to distributors and re-exporters in the UAE.',
    regulatoryNotes:
      'Medical device registration is administered by the Ministry of Health and Prevention. Product registration must be held by a locally licensed importer; Chimera supplies the manufacturer documentation for that filing.',
  },
  {
    country: 'Nigeria',
    countryCode: 'NG',
    ports: ['Lagos (Apapa)', 'Tin Can Island'],
    intro:
      'Chimera Biotech supplies diagnostic kits and transport media to importers and laboratory distributors in Nigeria.',
    regulatoryNotes:
      'In-vitro diagnostics require NAFDAC registration prior to importation. Chimera supplies the manufacturer documentation, specification and stability data for the importer to file.',
  },
  {
    country: 'Tanzania',
    countryCode: 'TZ',
    ports: ['Dar es Salaam'],
    intro:
      'Chimera Biotech supplies rapid tests and specimen transport media to importers and distributors in Tanzania.',
    regulatoryNotes:
      'Diagnostics are regulated by the Tanzania Medicines and Medical Devices Authority. Chimera supplies the manufacturer documentation for the importer to register the product locally.',
  },
  {
    country: 'South Africa',
    countryCode: 'ZA',
    ports: ['Durban', 'Cape Town'],
    intro:
      'Chimera Biotech supplies diagnostic kits and transport media to importers and laboratory distributors in South Africa.',
    regulatoryNotes:
      'In-vitro diagnostics are regulated by SAHPRA and require a licensed local establishment. Chimera supplies the manufacturer documentation required by the licence holder.',
  },
];

/** Two comparison posts — §10 Phase 4: product-anchored, never generic explainers. */
export const posts = [
  {
    title: 'VTM vs VLTM: which transport medium should your lab stock?',
    slug: 'vtm-vs-vltm-which-transport-medium',
    excerpt:
      'Viral transport medium keeps the virus intact for culture and molecular work. Viral lysis medium kills it at collection. The choice is about what happens after the swab, not about the swab.',
    tags: ['transport media', 'comparison'],
    body: `Both tubes look the same on the bench. They do opposite things to the specimen inside.

## What each one does

**Viral transport medium (VTM)** preserves the virus. A Hanks-based salt solution holds pH and osmolality steady, protein stabiliser protects the viral envelope, and antibiotics suppress bacterial and fungal overgrowth so the specimen survives the trip to the laboratory intact. The specimen that arrives is still infectious — which is exactly what you need if you intend to culture it, and what dictates how it must be handled.

**Viral lysis transport medium (VLTM)** destroys the virus at the point of collection. A guanidinium-based buffer disrupts the envelope and denatures nucleases in the same step, releasing nucleic acid and protecting it. Nothing viable arrives at the laboratory.

## Which one your workflow needs

| If your laboratory… | Stock |
|---|---|
| Runs viral culture, or may need to | VTM |
| Runs RT-PCR only, and wants to reduce handling risk | VLTM |
| Sends specimens to a reference laboratory by road | VLTM, where the receiving laboratory accepts it |
| Handles specimens without a Class II cabinet | VLTM |
| Needs one medium for a mixed workload | VTM |

## The practical differences

**Cold chain.** VTM asks for 2–8 °C transport to hold viral stability at the stated figure. VLTM tolerates ambient transport better, because there is nothing left alive to degrade.

**Handling.** A VTM tube arriving at the laboratory is a live specimen and is treated as one. A VLTM tube is not, which is why laboratories running high volumes without cabinet capacity move to it.

**Downstream compatibility.** This is the one that catches people out. A lysis buffer is a specific chemistry, and not every extraction platform tolerates every formulation. Confirm compatibility with your extraction kit before switching a whole site.

**pH indicator.** VTM is pink because of phenol red. A tube that has shifted yellow or deep purple has drifted out of its pH window and should not be used. VLTM formulations are usually clear, so you lose that at-a-glance check.

## What to ask a supplier

Not "is it good quality". Ask for the numbers:

- Fill volume, and the tube size it sits in
- pH range and osmolality range, and whether they are checked per batch
- The sterility test protocol and its duration
- Stated viral stability, with the temperature it applies to
- Swab material and shaft breakpoint
- Shelf life, and the storage condition it assumes

If a supplier cannot give you those from a datasheet, you are being asked to take the medium on trust.`,
    seo: {
      title: 'VTM vs VLTM: Which Viral Transport Medium Should Your Lab Stock?',
      description:
        'Viral transport medium preserves the virus; viral lysis medium inactivates it at collection. Compare cold chain, handling, extraction compatibility and the specs to ask a supplier for.',
    },
    relatedSlugs: ['viral-transport-medium', 'viral-lysis-transport-medium'],
  },
  {
    title: 'How to read a 10-parameter urine strip without second-guessing it',
    slug: 'how-to-read-a-10-parameter-urine-strip',
    excerpt:
      'Ten pads, ten read times, and a handful of interferences that produce most of the wrong answers. A practical guide for laboratory and clinic staff.',
    tags: ['urinalysis', 'how-to'],
    body: `A 10-parameter strip gives you ten results from one dip. It also gives you ten chances to read a pad at the wrong moment.

## Before the strip

Use fresh, well-mixed, uncentrifuged urine at room temperature. A refrigerated sample read cold will under-read enzymatic pads; let it come up first. A sample standing more than two hours drifts — bacteria consume glucose and split urea, which pushes pH up and can produce a false nitrite.

Keep the desiccant in the vial and cap it immediately. Reagent pads pick up moisture from room air, and a vial left open across a shift is the most common cause of a whole batch reading oddly.

## The dip

Immerse every pad briefly — under a second — then draw the edge of the strip along the rim of the container to shed excess. Blot the edge on absorbent paper. Do not lay the face of the strip down: reagent running between pads is what produces impossible combinations, like a strongly positive glucose next to a strongly positive ketone in someone who has neither.

Hold the strip horizontally to read. Held vertically, it runs.

## Timing

Each pad has its own window, printed on the vial label. Most sit between 30 and 120 seconds. Two matter more than the rest:

- **Leukocyte esterase** is the slowest, usually 60–120 seconds. Read it early and you will miss a genuine positive.
- **Glucose and ketone** drift if read late.

Read against the chart on the vial you took the strip from, in good light, and not against a chart from a different lot.

## Interferences worth knowing

**Ascorbic acid** is the big one. High vitamin C suppresses the glucose and blood pads, and can flatten nitrite. A patient on supplements can produce a clean strip over a genuinely abnormal sample. This is precisely why an 11-parameter configuration adds an ascorbic acid pad — not for its own sake, but as a flag telling you the other pads may be under-reading.

**Highly coloured urine** — beetroot, rifampicin, phenazopyridine — makes visual reading unreliable. Report what you can and confirm by another method.

**Specific gravity** shifts with pH. Strips with a pH-compensated SG pad state it; if yours does not, subtract accordingly at high pH.

**Detergent residue** in a reused container produces false protein.

## When to stop trusting the strip

A strip is a screen. Confirm by microscopy or a quantitative method when the result changes management, when the strip contradicts the clinical picture, or when two pads disagree in a way that is physiologically unlikely. Nitrite negative does not exclude infection — several common organisms do not reduce nitrate.

## Choosing a configuration

Three parameters is enough for a focused screen. Ten covers routine work. Eleven adds the ascorbic acid flag, which is worth it if you screen populations likely to be supplementing.

Whichever you stock, buy against a published detection range per pad and a stated read time. If a supplier's datasheet does not carry those, you cannot validate the result you are reporting.`,
    seo: {
      title: 'How to Read a 10-Parameter Urine Strip Correctly | Chimera Biotech',
      description:
        'Read times per pad, sample handling, ascorbic acid and colour interferences, and when to confirm by another method. A practical guide for laboratory and clinic staff.',
    },
    relatedSlugs: ['urine-strips-10-parameter', 'urine-strips-11-parameter'],
  },
];
