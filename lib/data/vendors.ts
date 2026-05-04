export type VendorImage = {
  url: string;
  alt: string;
};

export type Vendor = {
  slug: string;
  name: string;
  shortBlurb: string;
  description: string;
  websiteUrl: string;
  founded: number;
  employeeBand: string;
  headquarters: string;
  /** Optional — falls back to LetterAvatar of the vendor name. */
  logoUrl?: string;
  /** Up to 6. Each requires alt text per CLAUDE.md §3 rule 8. */
  gallery: VendorImage[];
};

// Picsum-backed placeholder images so the gallery section renders visually
// while real uploads to R2 / Blob aren't wired yet.
const mockGallery = (slug: string, count = 4): VendorImage[] =>
  Array.from({ length: count }, (_, i) => ({
    url: `https://picsum.photos/seed/${slug}-${i + 1}/800/600`,
    alt: `Placeholder photo ${i + 1} for ${slug}`,
  }));

export const vendors: Vendor[] = [
  {
    slug: "oracle",
    name: "Oracle",
    shortBlurb:
      "One of the largest enterprise software companies in the world; the parent of Primavera and Aconex.",
    description:
      "Oracle is one of the largest enterprise software companies in the world, with deep roots in databases and a wide-ranging applications portfolio. Their Construction and Engineering business unit, formed largely from the 2008 acquisition of Primavera Systems and the 2017 acquisition of Aconex, serves the controls and document-collaboration needs of major capital programmes globally.\n\nThe directory lists two of their tools: Primavera P6 (the de-facto enterprise scheduling system in EPC, infrastructure, and major programmes) and Aconex (cross-organisation document control on major programmes).",
    websiteUrl: "https://www.oracle.com",
    founded: 1977,
    employeeBand: "100,000+",
    headquarters: "Austin, Texas, USA",
    gallery: mockGallery("oracle"),
  },
  {
    slug: "procore-technologies",
    name: "Procore Technologies",
    shortBlurb:
      "The largest pure-play construction technology company in the world.",
    description:
      "Procore Technologies is the largest pure-play construction technology company in the world. Founded in 2002 in Carpinteria, California by Tooey Courtemanche — after he experienced the document-control pain of building his own home — Procore has grown into a publicly-listed company (NYSE: PCOR) used on hundreds of thousands of projects.\n\nThe company's strategy has been to land general contractors as the system of record on a project, then expand into adjacent buyers (owners, specialty trades, suppliers) over the project lifecycle.",
    websiteUrl: "https://www.procore.com",
    founded: 2002,
    employeeBand: "3,000+",
    headquarters: "Carpinteria, California, USA",
    gallery: mockGallery("procore"),
  },
  {
    slug: "nplan",
    name: "nPlan",
    shortBlurb:
      "London-based applied-AI company building probabilistic schedule risk forecasting for capital projects.",
    description:
      "nPlan is a London-based applied-AI company that built one of the largest known training corpora of completed construction project schedules and used it to produce probabilistic forecasts of delay risk. Founded in 2017 by Dev Amratia and Alan Mosca, the company's customer base spans owners, contractors, and infrastructure programme directors.\n\nMost commonly used as an empirical second opinion on contractor-submitted schedules at gateway approvals and quarterly reviews.",
    websiteUrl: "https://www.nplan.io",
    founded: 2017,
    employeeBand: "51-200",
    headquarters: "London, United Kingdom",
    gallery: mockGallery("nplan"),
  },
  {
    slug: "cognite",
    name: "Cognite",
    shortBlurb:
      "Norwegian industrial software company building DataOps for asset-heavy industries.",
    description:
      "Cognite is a Norwegian industrial software company spun out of Aker ASA in 2016 to commercialise data-platform work originally developed for Aker BP's North Sea operations. The company's product, Cognite Data Fusion, contextualises industrial data into a queryable knowledge graph that operational engineers and developers build applications on top of.\n\nCustomers cluster in upstream and downstream energy, plus power utilities and industrial manufacturing.",
    websiteUrl: "https://www.cognite.com",
    founded: 2016,
    employeeBand: "501-1,000",
    headquarters: "Lysaker, Norway",
    gallery: mockGallery("cognite"),
  },
  {
    slug: "microsoft",
    name: "Microsoft",
    shortBlurb:
      "Default productivity stack across most enterprises; lists Microsoft Project here.",
    description:
      "Microsoft needs little introduction. The company's project management and productivity portfolio — anchored by Microsoft Project, Project for the Web, Microsoft 365, Power BI, and the Power Platform — is the default stack across most enterprises.\n\nThe directory lists Microsoft Project, the long-tenured scheduling tool that remains the most widely-recognised Gantt format in the broader business world.",
    websiteUrl: "https://www.microsoft.com",
    founded: 1975,
    employeeBand: "220,000+",
    headquarters: "Redmond, Washington, USA",
    gallery: mockGallery("microsoft"),
  },
  {
    slug: "bentley-systems",
    name: "Bentley Systems",
    shortBlurb:
      "Pennsylvania-headquartered infrastructure software company; tools used on major rail, road, and energy projects.",
    description:
      "Bentley Systems is a Pennsylvania-headquartered software company specialising in tools for designing, simulating, and operating world infrastructure. Public on NASDAQ since 2020 (BSY), Bentley's portfolio includes MicroStation, OpenRoads, OpenBuildings, ProjectWise, SYNCHRO, and the iTwin Platform — heavily used in major infrastructure programmes.\n\nThe directory lists Synchro 4D, their model-based scheduling tool.",
    websiteUrl: "https://www.bentley.com",
    founded: 1984,
    employeeBand: "5,001-10,000",
    headquarters: "Exton, Pennsylvania, USA",
    gallery: mockGallery("bentley"),
  },
  {
    slug: "ibm",
    name: "IBM",
    shortBlurb:
      "Long-standing enterprise technology company; lists Maximo here as the system-of-record for asset-heavy operators.",
    description:
      "IBM is one of the longest-standing enterprise technology companies. Their Maximo Asset Management product, originally developed by Project Software & Development and acquired by IBM in 2006, is the long-standing system of record for asset-heavy operators in regulated industries — utilities, transit, oil and gas, manufacturing.\n\nNow packaged as Maximo Application Suite within IBM's broader Sustainability portfolio.",
    websiteUrl: "https://www.ibm.com",
    founded: 1911,
    employeeBand: "282,000+",
    headquarters: "Armonk, New York, USA",
    gallery: mockGallery("ibm"),
  },
  {
    slug: "alice-technologies",
    name: "ALICE Technologies",
    shortBlurb:
      "Palo Alto-based AI company; Stanford spinout building generative scheduling for construction.",
    description:
      "ALICE Technologies is a Palo Alto-based AI company spun out of Stanford in 2014, building generative scheduling for construction. The company's product applies search-and-optimisation algorithms to planning problems — exploring millions of valid build sequences against time, cost, and resource constraints in compute time rather than planner-weeks.\n\nCustomers are a mix of EPCs, general contractors, and owner programme teams.",
    websiteUrl: "https://www.alicetechnologies.com",
    founded: 2014,
    employeeBand: "51-200",
    headquarters: "Palo Alto, California, USA",
    gallery: mockGallery("alice"),
  },
  {
    slug: "smartpm-technologies",
    name: "SmartPM Technologies",
    shortBlurb:
      "Atlanta-based construction analytics company applying scoring models to P6 schedules.",
    description:
      "SmartPM Technologies is an Atlanta-based construction analytics company. Their schedule analytics platform ingests the daily P6 schedule on each project and produces nightly scoring across schedule quality, compression, and slip — output most useful at the controls director level on a portfolio.\n\nCustomers include US-based general contractors, design-build contractors, and owner controls teams.",
    websiteUrl: "https://www.smartpmtech.com",
    founded: 2014,
    employeeBand: "11-50",
    headquarters: "Atlanta, Georgia, USA",
    gallery: mockGallery("smartpm"),
  },
  {
    slug: "bimcrone",
    name: "BIMCRONE",
    shortBlurb:
      "Construction tech company building mobile-first 4D BIM tooling for site progress capture.",
    description:
      "BIMCRONE is a construction technology company building mobile-first 4D BIM tooling for site progress capture. Their product lets site teams mark elements complete directly against a federated model from a phone, with installed quantities rolling up to schedule and cost dashboards in near-real time.\n\nMost commonly deployed on MEP-heavy fit-out projects where install rate is the binding constraint.",
    websiteUrl: "https://www.bimcrone.com",
    founded: 2019,
    employeeBand: "11-50",
    headquarters: "London, United Kingdom",
    gallery: mockGallery("bimcrone"),
  },
  {
    slug: "bridge2ai",
    name: "Bridge2AI",
    shortBlurb:
      "AI company automating tendering and proposal workflows for engineering and construction.",
    description:
      "Bridge2AI is a young AI company focused on automating tendering and proposal workflows for the engineering and construction industry. Their tool reads RFP documents and drafts compliant responses with traceable citations back to the source material.",
    websiteUrl: "https://www.bridge2ai.com",
    founded: 2023,
    employeeBand: "1-10",
    headquarters: "Austin, Texas, USA",
    gallery: mockGallery("bridge2ai"),
  },
  {
    slug: "buildroid-robotics",
    name: "Buildroid Robotics",
    shortBlurb:
      "Robotics company building autonomous platforms for material movement on construction sites.",
    description:
      "Buildroid Robotics is a robotics company building autonomous wheeled platforms for material movement on active construction sites. Their fleet model is pay-per-move with a remote-supervisor architecture — one operator overseeing multiple units across a project.",
    websiteUrl: "https://www.buildroid.io",
    founded: 2021,
    employeeBand: "11-50",
    headquarters: "Berlin, Germany",
    gallery: mockGallery("buildroid"),
  },
  {
    slug: "rdash",
    name: "Rdash",
    shortBlurb:
      "UK construction tech company providing operational dashboards for asset maintenance teams.",
    description:
      "Rdash is a UK construction technology company providing operational dashboards for housing and infrastructure asset maintenance teams. Their platform sits on top of works-order systems and contractor scheduling tools, giving asset directors a single pane of glass for SLA risk, contractor performance, and resident-impact metrics.",
    websiteUrl: "https://www.rdash.com",
    founded: 2018,
    employeeBand: "11-50",
    headquarters: "Sheffield, United Kingdom",
    gallery: mockGallery("rdash"),
  },
  {
    slug: "white-helmet-safety",
    name: "White Helmet Safety",
    shortBlurb:
      "Construction tech company building mobile-first HSEQ tooling for site teams.",
    description:
      "White Helmet Safety builds mobile-first health, safety, environment, and quality (HSEQ) tooling for construction site teams. Their platform replaces paper inspections with structured, photo-first observation flows and routable findings, with rollup analytics for HSE leadership.",
    websiteUrl: "https://www.whitehelmet.io",
    founded: 2016,
    employeeBand: "11-50",
    headquarters: "Manchester, United Kingdom",
    gallery: mockGallery("white-helmet"),
  },
];

export const vendorBySlug = (slug: string): Vendor | undefined =>
  vendors.find((v) => v.slug === slug);

export const vendorNameMap = new Map(vendors.map((v) => [v.slug, v.name]));
