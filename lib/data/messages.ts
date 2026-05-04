/**
 * Mocked vendor inbox. In Phase 2 this comes from the `vendor_messages`
 * Postgres table populated by `/api/contact-vendor`.
 *
 * The mock session vendor is "Arctus" (per lib/auth/mock-session.ts), so all
 * messages here are addressed to that vendor. Mock listings (Arctus Field /
 * Arctus Insights) are NOT in the public catalogue — they only appear in the
 * dashboard so the demo has substance.
 */

export type MessageStatus = "unread" | "read" | "archived";

export type VendorMessage = {
  id: string;
  /** vendor account this message belongs to (the recipient) */
  vendorSlug: string;
  /** which tool the visitor was viewing when they sent the message */
  appSlug: string;
  appName: string;
  from: {
    name: string;
    email: string;
    company?: string;
    role?: string;
  };
  subject: string;
  body: string;
  receivedAt: string; // ISO
  status: MessageStatus;
};

export const messages: VendorMessage[] = [
  {
    id: "msg_2026_05_04_001",
    vendorSlug: "arctus",
    appSlug: "arctus-field",
    appName: "Arctus Field",
    from: {
      name: "Hannah Okafor",
      email: "hannah.okafor@bluepointconstructors.com",
      company: "Bluepoint Constructors",
      role: "Director of Construction Tech",
    },
    subject: "Inquiry about Arctus Field — pilot programme fit",
    body:
      "Hi team,\n\nWe're a 600-person GC running 14 active jobsites across the south-east US. Our superintendents are spending 4-6 hours a week chasing permit and inspection paperwork across local jurisdiction portals — exactly the pain point your tagline mentions.\n\nA few questions before we evaluate:\n\n1. Which US state portals do you currently integrate with? Our footprint is heaviest in TX, GA, FL, and TN.\n2. Do you offer a paid pilot on a single project before a portfolio rollout?\n3. What's a typical implementation timeline from kickoff to first jurisdiction online?\n\nHappy to set up a call. Our procurement window for new field products is May–June.\n\nThanks,\nHannah",
    receivedAt: "2026-05-04T14:23:00Z",
    status: "unread",
  },
  {
    id: "msg_2026_05_03_009",
    vendorSlug: "arctus",
    appSlug: "arctus-field",
    appName: "Arctus Field",
    from: {
      name: "Damien Côté",
      email: "dcote@quebecmunicipal.ca",
      company: "Québec Municipal Engineering",
      role: "Senior Project Engineer",
    },
    subject: "Inquiry about Arctus Field",
    body:
      "Bonjour,\n\nWe handle municipal infrastructure projects in the greater Montréal area. Our permit workflow is bilingual (French / English) and we operate under provincial rather than federal jurisdiction codes.\n\nIs Arctus Field deployable for non-US jurisdictions? Specifically interested in whether the platform can ingest provincial permit schemas and surface them in French.\n\nMerci,\nDamien Côté",
    receivedAt: "2026-05-03T09:41:00Z",
    status: "unread",
  },
  {
    id: "msg_2026_05_02_017",
    vendorSlug: "arctus",
    appSlug: "arctus-insights",
    appName: "Arctus Insights",
    from: {
      name: "Priya Krishnamurthy",
      email: "priya@meridian-ic.com",
      company: "Meridian Industrial Construction",
      role: "VP, Project Controls",
    },
    subject: "Demo request — Arctus Insights for portfolio reporting",
    body:
      "Hi,\n\nI saw Arctus Insights on the InfraTechDB directory and the schedule analytics description matches a gap we have. We run 18 active capital projects, all baselined in P6, and our monthly executive readout takes our controls team almost a full week to compile.\n\nCan we schedule a 30-minute demo? I'd like to see:\n- How the nightly P6 ingest works for portfolios\n- What the executive-level rollup looks like\n- Pricing structure for 15-25 active projects\n\nMy team is open mid-May. Best,\nPriya",
    receivedAt: "2026-05-02T16:08:00Z",
    status: "read",
  },
  {
    id: "msg_2026_04_30_022",
    vendorSlug: "arctus",
    appSlug: "arctus-field",
    appName: "Arctus Field",
    from: {
      name: "Marcus Hertzberg",
      email: "marcus@independent-pm.consulting",
      role: "Independent Construction PM",
    },
    subject: "Inquiry about Arctus Field — single-user pricing?",
    body:
      "Hello,\n\nI'm an independent construction PM working across 3-5 projects at a time, mostly mid-rise residential in the Pacific Northwest. Your product looks ideal but the per-project pricing model on similar platforms usually doesn't work for solo operators.\n\nDo you have a single-user / freelance tier, or is the licensing only for organisations?\n\nThanks,\nMarcus",
    receivedAt: "2026-04-30T11:12:00Z",
    status: "read",
  },
  {
    id: "msg_2026_04_28_004",
    vendorSlug: "arctus",
    appSlug: "arctus-insights",
    appName: "Arctus Insights",
    from: {
      name: "Yuki Tanaka",
      email: "yuki.tanaka@kanto-engineering.jp",
      company: "Kantō Engineering Group",
      role: "Manager, Digital Construction",
    },
    subject: "Inquiry about Arctus Insights — Asia-Pacific availability",
    body:
      "Hello,\n\nWe're a Tokyo-based EPC contractor evaluating schedule analytics products for our Asia-Pacific portfolio (mostly Japan, Vietnam, Indonesia).\n\nDoes Arctus Insights have any APAC customers, and is the platform available in our region from a data-residency standpoint? Our procurement team requires confirmation that customer data isn't transferred outside our jurisdiction.\n\nKind regards,\nYuki Tanaka",
    receivedAt: "2026-04-28T08:55:00Z",
    status: "read",
  },
  {
    id: "msg_2026_04_22_011",
    vendorSlug: "arctus",
    appSlug: "arctus-field",
    appName: "Arctus Field",
    from: {
      name: "Thomas Reinholt",
      email: "thomas@nordbau.dk",
      company: "Nordbau A/S",
      role: "Head of Innovation",
    },
    subject: "Integration with our existing field stack",
    body:
      "Hi Arctus team,\n\nWe currently run Procore as our primary field platform but we're losing time on the permit / jurisdiction lookup specifically. Rather than replace Procore, we'd want to integrate Arctus Field as a permit module.\n\nDo you have a Procore App Marketplace integration, or is it API-first only? If API, what's the typical integration effort for an in-house dev team?\n\nBest,\nThomas",
    receivedAt: "2026-04-22T13:30:00Z",
    status: "read",
  },
];

export const messagesForVendor = (vendorSlug: string): VendorMessage[] =>
  messages.filter((m) => m.vendorSlug === vendorSlug);

export const unreadCount = (vendorSlug: string): number =>
  messages.filter((m) => m.vendorSlug === vendorSlug && m.status === "unread")
    .length;

export const messageById = (id: string): VendorMessage | undefined =>
  messages.find((m) => m.id === id);
