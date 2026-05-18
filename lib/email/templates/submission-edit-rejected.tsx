import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";

export type SubmissionEditRejectedProps = {
  firstName: string;
  kind: "product" | "company";
  name: string;
  rejectionReason: string;
  /** Where the CTA points — the relevant edit page (which detects
   *  rejected state and pre-fills from the payload). */
  editPageUrl: string;
};

/**
 * "Your changes need revisions" — sent on admin.reject for
 * company_edit and product_edit submissions. Distinguished from
 * the new-submission rejection email by the reassurance line: the
 * vendor's published listing / company profile is STILL LIVE — only
 * the proposed changes weren't approved. CTA points at the edit
 * page (not the wizard's resubmit URL).
 */
export function SubmissionEditRejectedEmail({
  firstName,
  kind,
  name,
  rejectionReason,
  editPageUrl,
}: SubmissionEditRejectedProps) {
  const heading =
    kind === "product"
      ? `Your changes to ${name} need revisions.`
      : "Your company profile changes need revisions.";
  const preview =
    kind === "product"
      ? `Your changes to ${name} need revisions`
      : "Your company profile changes need revisions";
  const lead =
    kind === "product"
      ? `We weren't able to publish your proposed changes to ${name} as submitted. Here's what we'd need addressed before re-review:`
      : `We weren't able to publish your proposed company profile changes as submitted. Here's what we'd need addressed before re-review:`;
  const reassurance =
    kind === "product"
      ? "Your current listing is still live — only the proposed changes weren't approved."
      : "Your current company profile is still live — only the proposed changes weren't approved.";

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1Style}>{heading}</Heading>
          <Text style={paragraphStyle}>Hi {firstName},</Text>
          <Text style={paragraphStyle}>{lead}</Text>
          <Text style={reasonStyle}>{rejectionReason}</Text>
          <Text style={paragraphStyle}>{reassurance}</Text>
          <Text style={paragraphStyle}>
            You can revise and resubmit from the edit page. If anything in our
            feedback is unclear, just reply to this email.
          </Text>
          <Button href={editPageUrl} style={buttonStyle}>
            Revise and resubmit
          </Button>
          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            — The AllInfratech editorial team
            <br />
            <Link href={editPageUrl} style={linkStyle}>
              {editPageUrl}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#FAFAF7",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};
const containerStyle = {
  margin: "0 auto",
  padding: "32px 24px",
  maxWidth: "560px",
};
const h1Style = {
  fontSize: "22px",
  lineHeight: "1.25",
  margin: "0 0 16px",
  color: "#0A0A0A",
};
const paragraphStyle = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#0A0A0A",
  margin: "0 0 16px",
};
const reasonStyle = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#0A0A0A",
  whiteSpace: "pre-wrap" as const,
  backgroundColor: "#FFFFFF",
  border: "1px solid #E6E5E0",
  borderLeft: "3px solid #D6336C",
  padding: "16px 18px",
  margin: "0 0 24px",
};
const buttonStyle = {
  display: "inline-block" as const,
  backgroundColor: "#0A0A0A",
  color: "#FAFAF7",
  padding: "12px 22px",
  fontSize: "13px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.18em",
  textDecoration: "none",
  margin: "8px 0 24px",
};
const hrStyle = {
  border: "none",
  borderTop: "1px solid #E6E5E0",
  margin: "32px 0 16px",
};
const footerStyle = {
  fontSize: "12px",
  color: "#6E6E6E",
  lineHeight: "1.6",
  margin: 0,
};
const linkStyle = {
  color: "#D6336C",
  textDecoration: "underline",
};
