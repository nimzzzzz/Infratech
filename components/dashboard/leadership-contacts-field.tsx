"use client";

import type { LeadershipContactPayload } from "@/lib/queries/vendor-leadership";

type Props = {
  contacts: LeadershipContactPayload[];
  error?: string | null;
  idPrefix: string;
  onChange: (contacts: LeadershipContactPayload[]) => void;
};

const inputCls =
  "h-11 w-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-[16px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ink)] focus:outline-none";

function inputClsWithError(error?: string | null): string {
  return error
    ? `${inputCls} border-[var(--color-coral)] focus:border-[var(--color-coral)]`
    : inputCls;
}

export function LeadershipContactsField({
  contacts,
  error,
  idPrefix,
  onChange,
}: Props) {
  const updateContact = (
    index: number,
    key: keyof LeadershipContactPayload,
    value: string,
  ) => {
    onChange(
      contacts.map((contact, i) =>
        i === index ? { ...contact, [key]: value } : contact,
      ),
    );
  };

  return (
    <div className="border-t border-[var(--color-line)] pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink)]">
            Key contacts
          </p>
          <p className="mt-1 max-w-[64ch] text-[16px] leading-relaxed text-[var(--color-ink-3)]">
            Add up to four founders or executives, including you. LinkedIn
            links are only shown to signed-in vendor users.
          </p>
        </div>
        <span className="border border-[var(--color-line-strong)] px-3 py-2 text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-2)]">
          <span className="num">{contacts.length}</span> /{" "}
          <span className="num">4</span> listed
        </span>
      </div>

      {error ? (
        <p role="alert" className="mt-1 text-[14px] text-[var(--color-coral)]">
          {error}
        </p>
      ) : null}

      {contacts.length > 0 ? (
        <div className="mt-5 space-y-4">
          {contacts.map((contact, index) => (
            <div
              key={index}
              className="border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center border border-[var(--color-line-strong)] bg-[var(--color-canvas)]">
                    <span className="font-heading text-[22px] italic leading-none text-[var(--color-ink)]">
                      {contact.name.trim().charAt(0) || "?"}
                    </span>
                  </span>
                  <div>
                    <p className="text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink-3)]">
                      {index === 0 ? "Account contact" : "Founder or executive"}
                    </p>
                    <p className="text-[14px] text-[var(--color-ink-3)]">
                      {index === 0
                        ? "Use the signed-in contact or another public leader."
                        : "Shown only to signed-in members."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChange(contacts.filter((_, i) => i !== index))
                  }
                  className="text-[12px] uppercase tracking-[0.18em] text-[var(--color-ink-3)] underline-offset-4 hover:text-[var(--color-ink)] hover:underline"
                >
                  Remove
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <MiniField
                  label="Name"
                  htmlFor={`${idPrefix}-${index}-name`}
                >
                  <input
                    id={`${idPrefix}-${index}-name`}
                    type="text"
                    value={contact.name}
                    onChange={(e) =>
                      updateContact(index, "name", e.target.value)
                    }
                    className={inputClsWithError(error)}
                  />
                </MiniField>
                <MiniField
                  label="Title"
                  htmlFor={`${idPrefix}-${index}-title`}
                >
                  <input
                    id={`${idPrefix}-${index}-title`}
                    type="text"
                    value={contact.title}
                    onChange={(e) =>
                      updateContact(index, "title", e.target.value)
                    }
                    placeholder="Founder & CEO"
                    className={inputClsWithError(error)}
                  />
                </MiniField>
                <div className="md:col-span-2">
                  <MiniField
                    label="LinkedIn profile URL"
                    htmlFor={`${idPrefix}-${index}-linkedinUrl`}
                    hint="Use a personal LinkedIn profile URL, not a company page."
                  >
                    <input
                      id={`${idPrefix}-${index}-linkedinUrl`}
                      type="text"
                      value={contact.linkedinUrl}
                      onChange={(e) =>
                        updateContact(index, "linkedinUrl", e.target.value)
                      }
                      placeholder="linkedin.com/in/name"
                      className={inputClsWithError(error)}
                    />
                  </MiniField>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 border border-dashed border-[var(--color-line-strong)] bg-[var(--color-canvas-warm)]/35 p-4 text-[15px] leading-relaxed text-[var(--color-ink-3)]">
          No key contacts listed yet.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={contacts.length >= 4}
          onClick={() =>
            onChange([
              ...contacts,
              { name: "", title: "", linkedinUrl: "" },
            ])
          }
          className="inline-flex h-10 items-center border border-[var(--color-line-strong)] px-4 text-[13px] uppercase tracking-[0.18em] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          + Add founder or executive
        </button>
        <p className="max-w-[42ch] text-[13px] leading-relaxed text-[var(--color-ink-3)]">
          Name and title stay manual; we only validate the LinkedIn URL format.
        </p>
      </div>
    </div>
  );
}

function MiniField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink)]"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-[16px] text-[var(--color-ink-3)]">{hint}</p>
      ) : null}
    </div>
  );
}
