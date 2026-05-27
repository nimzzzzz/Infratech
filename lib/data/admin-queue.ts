import { apps } from "@/lib/data/apps";

export type SubmissionStatus =
  | "pending"
  | "in-review"
  | "changes-requested";

export type Submitter = {
  name: string;
  title: string;
  email: string;
  companyName: string;
  linkedinUrl: string;
};

/** Company-level details bundled with a vendor's first tool submission. */
export type SubmissionCompany = {
  name: string;
  website: string;
  founded: number;
  employeeBand: string;
  headquarters: string;
  description: string;
  galleryCount: number;
};

export type NewAppSubmission = {
  id: string;
  type: "new";
  status: SubmissionStatus;
  submittedAt: string;
  submitter: Submitter;
  /** Present on a vendor's FIRST submission — they're creating their company
   *  profile alongside the tool. Omitted on subsequent tool submissions. */
  company?: SubmissionCompany;
  app: {
    name: string;
    vendor: string;
    url: string;
    tagline: string;
    stages: string[];
    capabilities: string[];
    industries: string[];
    pricingModels: string[];
    customCapabilities: string[];
    customIndustries: string[];
    customPricing: string;
  };
};

export type ClaimSubmission = {
  id: string;
  type: "claim";
  status: SubmissionStatus;
  submittedAt: string;
  submitter: Submitter;
  claimAppSlug: string;
  claimAppName: string;
};

export type Submission = NewAppSubmission | ClaimSubmission;

const submitter = (s: Submitter): Submitter => s;

export const queue: Submission[] = [
  {
    id: "sub_2026_05_02_001",
    type: "new",
    status: "pending",
    submittedAt: "2026-05-02T09:14:00Z",
    submitter: submitter({
      name: "Marina Volkov",
      title: "Co-founder",
      email: "marina@arctus.io",
      companyName: "Arctus",
      linkedinUrl: "https://linkedin.com/in/marinavolkov",
    }),
    company: {
      name: "Arctus",
      website: "https://arctus.io",
      founded: 2022,
      employeeBand: "11-50",
      headquarters: "Austin, Texas, USA",
      description:
        "Arctus builds permit and inspection lookup products for general contractors and owners working across multiple US jurisdictions. The team's previous experience was at Procore and Autodesk.",
      galleryCount: 4,
    },
    app: {
      name: "Arctus Field",
      vendor: "Arctus",
      url: "https://arctus.io",
      tagline:
        "Permit and inspection lookup that pulls from local jurisdiction APIs.",
      stages: ["definition", "delivery"],
      capabilities: ["documents-cde"],
      industries: ["construction"],
      pricingModels: ["per-seat"],
      customCapabilities: ["AI permit lookup"],
      customIndustries: [],
      customPricing: "",
    },
  },
  {
    id: "sub_2026_05_01_044",
    type: "claim",
    status: "in-review",
    submittedAt: "2026-05-01T16:42:00Z",
    submitter: submitter({
      name: "Daniyar Tursunov",
      title: "CEO",
      email: "daniyar@halcyonworks.com",
      companyName: "Halcyon Works",
      linkedinUrl: "https://linkedin.com/in/dtursunov",
    }),
    claimAppSlug: "cognite-data-fusion",
    claimAppName: "Cognite Data Fusion",
  },
  {
    id: "sub_2026_04_30_018",
    type: "new",
    status: "pending",
    submittedAt: "2026-04-30T11:08:00Z",
    submitter: submitter({
      name: "Eitan Friedman",
      title: "Head of Product",
      email: "eitan@bridgeway.dev",
      companyName: "Bridgeway Software",
      linkedinUrl: "https://linkedin.com/in/eitanfriedman",
    }),
    app: {
      name: "Bridgeway Critical Path",
      vendor: "Bridgeway Software",
      url: "https://bridgeway.dev",
      tagline:
        "Schedule comparison engine for owner reps reviewing contractor submittals.",
      stages: ["definition", "delivery"],
      capabilities: ["scheduling-planning", "risk-management"],
      industries: ["infrastructure", "construction"],
      pricingModels: ["per-seat"],
      customCapabilities: [],
      customIndustries: [],
      customPricing: "",
    },
  },
  {
    id: "sub_2026_04_28_022",
    type: "claim",
    status: "pending",
    submittedAt: "2026-04-28T14:21:00Z",
    submitter: submitter({
      name: "Chiara Russo",
      title: "Business development",
      email: "chiara@maxionpro.com",
      companyName: "Maxion Pro Consulting",
      linkedinUrl: "https://linkedin.com/in/chiararusso",
    }),
    claimAppSlug: "maximo",
    claimAppName: "Maximo",
  },
  {
    id: "sub_2026_04_25_009",
    type: "new",
    status: "changes-requested",
    submittedAt: "2026-04-25T08:55:00Z",
    submitter: submitter({
      name: "Léa Fontaine",
      title: "Product manager",
      email: "lea@northstrand.fr",
      companyName: "Northstrand",
      linkedinUrl: "https://linkedin.com/in/leafontaine",
    }),
    app: {
      name: "Northstrand Field",
      vendor: "Northstrand",
      url: "https://northstrand.fr",
      tagline:
        "Mobile site logs and snag tracking for general contractors in Europe.",
      stages: ["delivery"],
      capabilities: ["field-execution", "quality-inspections"],
      industries: ["construction"],
      pricingModels: ["per-seat"],
      customCapabilities: [],
      customIndustries: ["Mining"],
      customPricing: "",
    },
  },
];

export function pendingCount(): number {
  return queue.filter((s) => s.status === "pending").length;
}

export function inReviewCount(): number {
  return queue.filter((s) => s.status === "in-review").length;
}

export function publishedAppsCount(): number {
  return apps.length;
}
