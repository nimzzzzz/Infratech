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

export type SubmissionEditPublishedProps = {
  firstName: string;
  /** product_edit edits a published apps row; company_edit edits the
   *  vendor profile. Drives the wording in heading, body, and CTA. */
  kind: "product" | "company";
  /** Product name (for kind=product) or vendor name (for kind=company). */
  name: string;
  /** Where the CTA points — /apps/<slug> or /vendors/<slug>. */
  viewUrl: string;
};

/**
 * "Your changes are live" — sent on admin.approve for company_edit
 * and product_edit submissions. The new-product equivalent
 * (SubmissionPublishedEmail) frames the listing as freshly public;
 * for edits the listing was already public — only the edits got
 * approved. Different copy, same chrome.
 */
export function SubmissionEditPublishedEmail({
  firstName,
  kind,
  name,
  viewUrl,
}: SubmissionEditPublishedProps) {
  const heading =
    kind === "product"
      ? `Your changes to ${name} are live.`
      : "Your company profile changes are live.";
  const preview =
    kind === "product"
      ? `Your changes to ${name} are live on AllInfratech`
      : "Your company profile changes are live on AllInfratech";
  const body =
    kind === "product"
      ? `Good news — your edits to ${name} have been approved and are now public on AllInfratech. Anyone visiting the listing now sees the updated version.`
      : `Good news — your edits to ${name}'s company profile have been approved and are now public on the directory.`;
  const ctaLabel = kind === "product" ? "View updated listing" : "View company profile";

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1Style}>{heading}</Heading>
          <Text style={paragraphStyle}>Hi {firstName},</Text>
          <Text style={paragraphStyle}>{body}</Text>
          <Button href={viewUrl} style={buttonStyle}>
            {ctaLabel}
          </Button>
          <Text style={paragraphStyle}>
            If anything looks off, reply to this email or open your vendor
            dashboard.
          </Text>
          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            — The AllInfratech team
            <br />
            <Link href={viewUrl} style={linkStyle}>
              {viewUrl}
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
const buttonStyle = {
  display: "inline-block" as const,
  backgroundColor: "#D6336C",
  color: "#FFFFFF",
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
