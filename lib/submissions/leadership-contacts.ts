import { normaliseUrl } from "@/lib/submissions/url";
import type { LeadershipContactPayload } from "@/lib/queries/vendor-leadership";

export type LeadershipContactInput = LeadershipContactPayload & {
  vendorMemberId?: number | null;
};

type SubmittingMember = {
  id: number;
  name: string;
  role: string | null;
  linkedinUrl: string | null;
};

function normaliseLinkedInProfileUrl(raw: string | null): string | null {
  if (!raw) return null;

  try {
    const url = new URL(normaliseUrl(raw));
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const pathname = url.pathname.replace(/\/$/, "");

    if (host !== "linkedin.com" || !/^\/in\/[^/]+$/.test(pathname)) {
      return null;
    }

    return `https://linkedin.com${pathname}`;
  } catch {
    return null;
  }
}

function linkedinKey(raw: string): string | null {
  return normaliseLinkedInProfileUrl(raw)?.toLowerCase() ?? null;
}

export function ensureSubmittingMemberLeadershipContact(
  contacts: LeadershipContactPayload[] | null | undefined,
  member: SubmittingMember,
): LeadershipContactInput[] {
  const memberLinkedInUrl = normaliseLinkedInProfileUrl(member.linkedinUrl);
  if (!memberLinkedInUrl || !member.role?.trim()) {
    return (contacts ?? []).slice(0, 4).map((contact, index) =>
      index === 0 ? { ...contact, vendorMemberId: member.id } : contact,
    );
  }

  const memberContact: LeadershipContactInput = {
    name: member.name.trim(),
    title: member.role.trim(),
    linkedinUrl: memberLinkedInUrl,
    vendorMemberId: member.id,
  };

  const seen = new Set<string>();
  const merged: LeadershipContactInput[] = [];

  const add = (contact: LeadershipContactInput) => {
    const key = linkedinKey(contact.linkedinUrl);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(contact);
  };

  add(memberContact);
  for (const contact of contacts ?? []) {
    add(contact);
    if (merged.length >= 4) break;
  }

  return merged.slice(0, 4);
}
