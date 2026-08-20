import type { PublishStatus } from '../../models/common.js';

/**
 * Seed pages.
 *
 * Copy discipline follows §6.7 rule 01 — no adjective survives where a number
 * exists. Where a number is not yet known it is written as an explicit gap
 * ("Pending — D3") rather than replaced with an adjective. That is deliberate:
 * the gaps are the Week-1 content task, and they should be visible.
 *
 * Legal pages carry real, usable B2B text but are marked `draft` — they need a
 * lawyer's eye and the registered address before they go live.
 */

export type SeedBlock = { type: string; data: Record<string, unknown> };

export type SeedPage = {
  key: string;
  title: string;
  intro: string;
  blocks: SeedBlock[];
  status: PublishStatus;
  seo: { title: string; description: string };
};

const prose = (markdown: string): SeedBlock => ({ type: 'prose', data: { markdown } });
const callout = (tone: 'info' | 'notice', title: string, body: string): SeedBlock => ({
  type: 'callout',
  data: { tone, title, body },
});
const cta = (title: string, body: string, action: string, label: string): SeedBlock => ({
  type: 'cta',
  data: { title, body, action, label },
});

export const pages: SeedPage[] = [
  {
    key: 'about',
    title: 'About Chimera Biotech',
    intro:
      'Chimera Biotech Pvt Ltd manufactures in-vitro diagnostic rapid tests, urine reagent strips and specimen transport media from its facility in Okhla, New Delhi.',
    status: 'published',
    seo: {
      title: 'About Chimera Biotech | IVD Manufacturer, Okhla, New Delhi',
      description:
        'Chimera Biotech Pvt Ltd manufactures rapid diagnostic tests, urine reagent strips and viral transport media in Okhla, New Delhi. Manufacturing, quality and certifications.',
    },
    blocks: [
      prose(
        `## What we make

Three product lines, manufactured in-house:

- **Fertility rapid tests** — hCG and LH lateral-flow assays in cassette, midstream and strip formats.
- **Urine reagent strips** — 3, 5, 10 and 11 parameter configurations.
- **Specimen transport media** — viral transport medium, with lysis and universal variants in development.

Every product page on this site states the analyte, the method, the sample type, the sensitivity where one applies, the shelf life and the storage condition. If a figure is not yet established, the page says so rather than substituting an adjective.

## How we sell

Chimera supplies laboratories, hospitals and clinics through distributors, manufactures under private label for other brands, and exports. There is no consumer cart on this site — pack sizes and pricing depend on volume, and every enquiry is quoted.`,
      ),
      callout(
        'info',
        'Where the numbers are',
        'Product specifications live on the product pages. Certificate numbers and validity dates live on the certifications page. Nothing on this site claims a figure that is not published somewhere you can check it.',
      ),
      cta(
        'Talk to the team',
        'Quotes, samples and technical questions are answered by a person, not a form auto-reply.',
        '/contact',
        'Contact Chimera',
      ),
    ],
  },
  {
    key: 'about-manufacturing-quality',
    title: 'Manufacturing & Quality',
    intro:
      'How a Chimera batch is made, checked and released — the stage-by-stage controls behind every specification published on this site.',
    status: 'draft',
    seo: {
      title: 'Manufacturing & Quality | Chimera Biotech, Okhla',
      description:
        'Chimera Biotech manufacturing process, in-process quality control, batch traceability and stability testing protocol for rapid tests, urine strips and transport media.',
    },
    blocks: [
      callout(
        'notice',
        'This page needs facility photographs',
        'The copy below describes the intended process. It cannot be published until the facility photographs, the QC stage records and the stability protocol reference are supplied — §8.4 requires this page to show what the About page currently only claims.',
      ),
      prose(
        `## Production stages

| Stage | Control |
|---|---|
| Raw material intake | Certificate of analysis checked against specification; quarantine until released |
| Membrane striping / pad impregnation | In-process check per reel, recorded against the batch number |
| Assembly and cutting | Dimensional check per shift |
| Pouching and desiccation | Seal integrity check; desiccant lot recorded |
| Batch release | Release testing against the product specification; COA generated |

## Batch traceability

Every finished pack carries a batch number that resolves to: raw material lots, the production shift, the in-process records, the release test results and the operator. A Certificate of Analysis can be produced for any released batch on request.

## Stability testing

Real-time stability is run at the stated storage condition for the full claimed shelf life, with accelerated stability used to support the initial claim. Shelf-life figures published on product pages are the figures supported by these studies — pending completion, product pages state "to be established".`,
      ),
    ],
  },
  {
    key: 'about-certifications',
    title: 'Certifications',
    intro:
      'Every certification Chimera holds, with the issuing body, the certificate number and the validity date. Claims without a number and a certificate image are not published here.',
    status: 'draft',
    seo: {
      title: 'Certifications | CDSCO, ISO 13485, ISO 9001 | Chimera Biotech',
      description:
        'Chimera Biotech certifications with issuing body, certificate number and validity date. CDSCO manufacturing licence, ISO 13485 and ISO 9001 records.',
    },
    blocks: [
      callout(
        'notice',
        'Awaiting certificate numbers (D3)',
        'The records on this page are seeded placeholders. A certification cannot be published without a number and a scanned certificate — that rule is enforced by the API, not by review. Until Regulatory supplies them, this page stays in draft.',
      ),
      { type: 'certifications', data: {} },
      prose(
        `### Why this page exists

The previous site claimed ICMR and CDSCO approval in body copy, without a licence number, and misspelled DCGI. To a procurement officer comparing three suppliers, an unverifiable claim is worse than no claim — it is the thing that ends the evaluation.

Every certification listed above carries the number as issued and the scanned certificate. If a certification is not listed, Chimera does not hold it.`,
      ),
    ],
  },
  {
    key: 'about-team',
    title: 'Leadership',
    intro: 'The people accountable for what Chimera manufactures.',
    status: 'draft',
    seo: {
      title: 'Leadership | Chimera Biotech',
      description: 'Leadership team at Chimera Biotech Pvt Ltd, Okhla, New Delhi.',
    },
    blocks: [
      callout(
        'notice',
        'Awaiting named leadership (D7)',
        'This page stays unpublished until the owner supplies names, roles and photographs. A team page with placeholder people is worse than no team page.',
      ),
    ],
  },
  {
    key: 'oem-manufacturing',
    title: 'OEM & Private Label Manufacturing',
    intro:
      'Chimera manufactures rapid tests, urine reagent strips and transport media under other brands — from artwork-only changes through to a custom configuration.',
    status: 'published',
    seo: {
      title: 'OEM & Private Label Diagnostic Kit Manufacturer in India | Chimera Biotech',
      description:
        'Private label and OEM manufacturing of rapid test kits, urine reagent strips and viral transport medium in Delhi. Customisation scope, MOQ and regulatory support.',
    },
    blocks: [
      prose(
        `## What can be customised

| Level | Scope | Typical MOQ |
|---|---|---|
| Artwork only | Your brand on our pack, our IFU rebranded | 10,000 tests |
| Pack configuration | Pack size, cassette vs strip vs midstream, buffer presentation | 25,000 tests |
| Formulation | Sensitivity cut-off, parameter set on a strip, fill volume | Discussed per project |

## Regulatory support

Chimera supplies the technical file inputs a partner needs for their own registration: product specification, stability data, manufacturing process description, and the Certificate of Analysis format. Registration in the destination market remains the partner's responsibility.

## What we need from you

Volume estimate, destination market, the brand artwork, and whether you need a specification change or only a pack change. That is enough to quote.`,
      ),
      cta(
        'Start an OEM conversation',
        'Tell us the volume and the market. We will come back with capacity, lead time and the customisation options that fit.',
        'oem',
        'Enquire about OEM manufacturing',
      ),
    ],
  },
  {
    key: 'become-a-distributor',
    title: 'Become a Distributor',
    intro:
      'Chimera appoints distributors by territory for laboratories, hospitals and clinics across India, and export partners in Africa, the Middle East, Bangladesh and Southeast Asia.',
    status: 'published',
    seo: {
      title: 'Become a Diagnostic Kit Distributor in India | Chimera Biotech',
      description:
        'Apply to distribute Chimera Biotech rapid tests, urine reagent strips and viral transport media. Territory availability, margin structure and MOQ discussed per application.',
    },
    blocks: [
      prose(
        `## What Chimera provides

- Territory appointment, reviewed against existing coverage
- Margin structure agreed at appointment and held for the contract term
- Product training, IFU and Certificate of Analysis access
- Marketing artwork and product photography
- Direct technical support for your laboratory customers

## What we look for

- A current drug licence and GST registration
- Existing diagnostics or laboratory-consumables portfolio
- Coverage of a defined territory, with the field team to service it
- A realistic annual volume estimate

## How the process runs

1. You apply using the form below.
2. We confirm territory availability, usually within three working days.
3. We share the margin structure, MOQ and payment terms.
4. First order, with product training.`,
      ),
      callout(
        'info',
        'Applying does not require a licence number today',
        'If your drug licence is in process, apply anyway and say so. We would rather start the territory conversation early.',
      ),
      cta(
        'Apply for a territory',
        'Ten fields. Reviewed by the channel team, not an auto-responder.',
        'distributor',
        'Apply to distribute',
      ),
    ],
  },
  {
    key: 'exports',
    title: 'Exports',
    intro:
      'Chimera supplies diagnostic kits and transport media to importers and distributors in Africa, the Middle East, Bangladesh and Southeast Asia.',
    status: 'published',
    seo: {
      title: 'Diagnostic Kit Exporter from India | Chimera Biotech',
      description:
        'Export supply of rapid test kits, urine reagent strips and viral transport medium from Delhi. FOB and CIF terms, export documentation and registration support.',
    },
    blocks: [
      prose(
        `## Terms

Quoted FOB Delhi or CIF destination port. Payment terms agreed per order; first orders are typically advance or against an irrevocable LC.

## Documentation supplied

- Commercial invoice and packing list
- Certificate of Origin
- Certificate of Analysis per batch
- Free Sale Certificate, where the destination market requires one
- Product specification and stability summary for registration dossiers

## Registration support

Chimera supplies the technical documentation an importer needs for local registration. The registration itself is filed by the importer or their regulatory agent in the destination market.`,
      ),
      cta(
        'Request an export quotation',
        'Tell us the destination country and the volume. Export enquiries route directly to the export desk.',
        'quote',
        'Request an export quote',
      ),
    ],
  },
  {
    key: 'faq',
    title: 'Frequently Asked Questions',
    intro: 'Questions from laboratory buyers, distributors and OEM partners.',
    status: 'published',
    seo: {
      title: 'FAQ | Chimera Biotech Diagnostic Kits',
      description:
        'Answers on pricing, MOQ, IFU and COA access, lead times, private label manufacturing, export terms and distributor appointment at Chimera Biotech.',
    },
    blocks: [
      {
        type: 'faq',
        data: {
          items: [
            {
              q: 'How do I get pricing?',
              a: 'Request a quote from any product page. Pricing depends on pack size and volume, so it is quoted rather than published. Quotes for Indian addresses are answered by the domestic sales desk; everything else routes to the export desk.',
            },
            {
              q: 'What is the minimum order quantity?',
              a: 'MOQ is stated per pack size on each product page. It ranges from 10 boxes for vial-packed strips to 100 units for single-cassette pouches. OEM MOQs start at 10,000 tests.',
            },
            {
              q: 'Can I get the IFU and Certificate of Analysis before ordering?',
              a: 'Yes. Both are available from the product page — you provide your name, organisation, email and phone, and a download link is emailed to you. The link expires, so request it again if it lapses.',
            },
            {
              q: 'Do you supply samples?',
              a: 'Sample requests are handled through the quote form — select "Product sample" as your intent. Samples go to institutional addresses.',
            },
            {
              q: 'What is the lead time?',
              a: 'Stocked pack sizes usually ship within 3–5 working days of order confirmation. Custom pack configurations and OEM runs are quoted with a lead time per project.',
            },
            {
              q: 'Do you manufacture under our brand?',
              a: 'Yes. See the OEM & private label page for what can be customised at each level, from artwork-only through to a formulation change.',
            },
            {
              q: 'Which certifications does Chimera hold?',
              a: 'Every certification is listed on the certifications page with its issuing body, certificate number and validity date. If a certification is not listed there, Chimera does not hold it.',
            },
            {
              q: 'Do you sell directly to consumers?',
              a: 'No. Chimera is a B2B manufacturer. Small-volume clinic requirements are routed to a distributor in your territory.',
            },
            {
              q: 'Can I become a distributor?',
              a: 'Apply through the distributor page. We confirm territory availability, usually within three working days, then share margin structure and MOQ.',
            },
            {
              q: 'Which export markets do you supply?',
              a: 'Africa, the Middle East, Bangladesh and Southeast Asia, on FOB Delhi or CIF terms. Registration documentation is supplied for the importer to file locally.',
            },
          ],
        },
      },
    ],
  },
  {
    key: 'careers',
    title: 'Careers',
    intro:
      'Chimera hires for production, quality, regulatory and field sales roles at Okhla, New Delhi.',
    status: 'published',
    seo: {
      title: 'Careers at Chimera Biotech | Okhla, New Delhi',
      description:
        'Production, quality control, regulatory affairs and field sales roles at Chimera Biotech Pvt Ltd, Okhla, New Delhi. Send your CV to the team.',
    },
    blocks: [
      prose(
        `## Open roles

We are not advertising a specific vacancy right now. We do keep CVs on file for:

- Production and packing operators — diagnostics or pharmaceutical manufacturing background
- Quality control analysts — IVD release testing
- Regulatory affairs — CDSCO filings and export dossiers
- Field sales — laboratory and hospital channel, Delhi NCR and North India

If one of those describes you, write to us. Tell us which area, and attach a CV.`,
      ),
      cta(
        'Send us your CV',
        'Career enquiries reach the general office inbox.',
        'career',
        'Get in touch about a role',
      ),
    ],
  },
  {
    key: 'events',
    title: 'Events',
    intro: 'Trade fairs and exhibitions where you can meet the Chimera team.',
    status: 'draft',
    seo: {
      title: 'Events & Trade Fairs | Chimera Biotech',
      description:
        'Trade fairs and exhibitions where Chimera Biotech exhibits, including Medical Fair India and regional diagnostics exhibitions.',
    },
    blocks: [
      callout(
        'notice',
        'No confirmed participation yet',
        'This page stays in draft until a stand is booked. Add the event, dates, hall and stand number in Dashboard → Pages, then publish.',
      ),
    ],
  },
  {
    key: 'contact',
    title: 'Contact Chimera Biotech',
    intro:
      'Three ways to reach us, all of them working. Sales enquiries are answered by the desk that handles your territory.',
    status: 'published',
    seo: {
      title: 'Contact Chimera Biotech | Okhla, New Delhi | Phone, Email, WhatsApp',
      description:
        'Contact Chimera Biotech Pvt Ltd, Okhla Industrial Area, New Delhi. Phone, email and WhatsApp, with routed sales, export and general enquiry inboxes.',
    },
    blocks: [
      { type: 'contact', data: {} },
      prose(
        `## Which inbox reaches whom

| Enquiry | Reaches |
|---|---|
| General questions, careers | The office |
| Quotes and samples for an Indian address, distributor applications | Domestic sales |
| Anything outside India, OEM and private label | The export desk |

You do not need to pick — the form routes on the country and enquiry type you select.`,
      ),
    ],
  },

  // ── Legal (§8: "a live cart with zero legal pages is an exposure") ─────────
  {
    key: 'privacy-policy',
    title: 'Privacy Policy',
    intro: 'How Chimera Biotech Pvt Ltd collects, uses and stores personal information submitted through this website.',
    status: 'draft',
    seo: {
      title: 'Privacy Policy | Chimera Biotech',
      description: 'How Chimera Biotech Pvt Ltd handles personal information collected through chimera-biotech.com.',
    },
    blocks: [
      callout(
        'notice',
        'Needs legal review before publishing',
        'This is workable baseline text, not reviewed advice. Confirm the registered address, the grievance officer name, and retention periods with counsel before setting this page live.',
      ),
      prose(
        `## What we collect

When you submit a form on this site we collect the details you enter: name, organisation, email address, telephone number, country, the product or category you asked about, your stated intent, and any message. For distributor applications we additionally collect GSTIN, drug licence number, territory, portfolio and volume information.

We also record technical information with each submission: the page you submitted from, the referring page, campaign parameters if present, your IP address and browser user-agent.

## Why we collect it

To respond to your enquiry, to route it to the correct desk, to send you the documents you requested, and to maintain a record of business correspondence. Distributor and OEM information is used to assess the application.

We do not sell personal information. We do not share it with third parties except service providers acting on our instructions (email delivery and hosting), and where required by law.

## Cookies and analytics

This site sets analytics cookies only after you consent. Rejecting analytics does not affect any functionality. Strictly necessary cookies — those required for the site to work — are set without consent, as permitted.

## How long we keep it

Enquiry records are retained for the duration of the business relationship and for such period afterwards as is required for tax, regulatory and contractual purposes. [Confirm retention period with counsel.]

## Your rights

You may request access to, correction of, or deletion of the personal information we hold about you, and you may withdraw consent to analytics at any time. Write to the address below.

## Contact

Chimera Biotech Pvt Ltd
[Registered address — confirm]
Okhla Industrial Area, New Delhi
Grievance officer: [name and email — confirm]`,
      ),
    ],
  },
  {
    key: 'terms-conditions',
    title: 'Terms & Conditions',
    intro: 'The terms on which Chimera Biotech Pvt Ltd provides this website and quotes for supply.',
    status: 'draft',
    seo: {
      title: 'Terms & Conditions | Chimera Biotech',
      description: 'Terms and conditions for the use of chimera-biotech.com and for quotations issued by Chimera Biotech Pvt Ltd.',
    },
    blocks: [
      callout('notice', 'Needs legal review before publishing', 'Baseline text only. Have counsel confirm before this page goes live.'),
      prose(
        `## This website

The content of this site is provided for information. Product specifications are stated as accurately as we can, and are subject to change as products are revised — the Instructions for Use supplied with the product is the controlling document.

Nothing on this site is an offer to sell. Prices, availability, pack configurations and lead times are quoted per enquiry and are valid only for the period stated in the quotation.

## Quotations and orders

A quotation is valid for the period stated on it, and in any case not longer than 30 days from issue. An order is accepted only when Chimera confirms it in writing. Payment terms are as stated in the quotation.

## Products

All products are for in-vitro diagnostic use by trained personnel unless the product labelling states otherwise. The purchaser is responsible for confirming that a product is registered and permitted for use in the destination market.

## Intellectual property

The Chimera name, product names, artwork and site content are the property of Chimera Biotech Pvt Ltd. Nothing on this site grants a licence to use them.

## Limitation of liability

To the extent permitted by law, Chimera's liability in connection with any product is limited to replacement of the product or refund of the price paid. Chimera is not liable for indirect or consequential loss.

## Governing law

These terms are governed by the laws of India. The courts at New Delhi have exclusive jurisdiction.`,
      ),
    ],
  },
  {
    key: 'refund-cancellation-policy',
    title: 'Refund & Cancellation Policy',
    intro: 'How order cancellations, returns and refunds are handled.',
    status: 'draft',
    seo: {
      title: 'Refund & Cancellation Policy | Chimera Biotech',
      description: 'Order cancellation, return and refund policy for Chimera Biotech Pvt Ltd diagnostic products.',
    },
    blocks: [
      callout(
        'info',
        'This site does not take payment',
        'Chimera supplies on quotation and invoice. There is no online checkout, so nothing here concerns card refunds. This policy covers cancellation of a confirmed order and return of supplied goods.',
      ),
      prose(
        `## Cancellation

A confirmed order may be cancelled without charge before it enters production or picking. Once an order has been picked, packed or produced to a custom configuration, cancellation charges apply as stated in the order confirmation.

Custom pack configurations and OEM production runs cannot be cancelled once production has started.

## Returns

Diagnostic products are temperature- and date-sensitive. Goods may be returned only where:

- the product supplied does not match the order,
- the product is damaged in transit and is reported within 48 hours of delivery with photographs, or
- the product is found to be outside specification on receipt.

Returns must be authorised in advance. Unauthorised returns are not accepted. Products stored outside the labelled storage condition after delivery cannot be returned.

## Refunds

Where a return is accepted, Chimera will replace the goods or issue a credit note against the invoice, at the purchaser's option. Where a refund is due, it is made to the originating account within [confirm] working days of the return being received and inspected.

## Raising a claim

Write to the sales contact on your invoice with the invoice number, batch number and photographs where relevant.`,
      ),
    ],
  },
  {
    key: 'disclaimer',
    title: 'Disclaimer',
    intro: 'The limits of what this website says about Chimera products.',
    status: 'draft',
    seo: {
      title: 'Disclaimer | Chimera Biotech',
      description: 'Disclaimer covering product information, intended use and regulatory status of products described on chimera-biotech.com.',
    },
    blocks: [
      callout('notice', 'Needs legal review before publishing', 'Baseline text only. Have counsel confirm before this page goes live.'),
      prose(
        `## Product information

Specifications published on this site describe the product as currently manufactured and are subject to revision. The Instructions for Use supplied with the product is the controlling document. Where a specification is not yet established, the page says so.

## Intended use

Products described on this site are for in-vitro diagnostic use by trained personnel. They are aids to diagnosis. A result from any rapid test should be interpreted alongside clinical findings and, where indicated, confirmed by a reference method.

Nothing on this site is medical advice.

## Regulatory status

Regulatory status differs by market. A product registered for sale in India is not thereby registered anywhere else. Purchasers and importers are responsible for confirming registration in the destination market before use or resale.

## Products in development

Pages marked as in development describe products that are not released for sale. Specifications on those pages are stated as "to be established" and must not be relied on for procurement or registration purposes.

## External links

Links to third-party sites are provided for convenience. Chimera does not control and is not responsible for their content.`,
      ),
    ],
  },
];
