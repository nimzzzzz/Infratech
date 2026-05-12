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

export type SubmissionEditedAwaitingApprovalProps = {
  firstName: string;
  productName: string;
  dashboardUrl: string;
};

/**
 * "We've polished your listing — please review." Sent when admin
 * saves edits to a pending_review submission. Vendor needs to
 * approve (or push back with feedback) before the listing goes live.
 *
 * Same React Email pattern as the PR 1 templates — single CTA, no
 * tracking pixels, transactional voice.
 */
export function SubmissionEditedAwaitingApprovalEmail({
  firstName,
  productName,
  dashboardUrl,
}: SubmissionEditedAwaitingApprovalProps) {
  return (
    <Html>
      <Head />
      <Preview>{`AllInfratech edited your ${productName} submission — please review`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1Style}>
            We&rsquo;ve polished your listing.
          </Heading>
          <Text style={paragraphStyle}>Hi {firstName},</Text>
          <Text style={paragraphStyle}>
            Our editorial team made some edits to your submission for{" "}
            <strong>{productName}</strong> — usually small clarity or tone
            changes. We&rsquo;d like your sign-off before publishing.
          </Text>
          <Text style={paragraphStyle}>
            You can see exactly what we changed and approve or request
            further edits from your dashboard.
          </Text>
          <Button href={dashboardUrl} style={buttonStyle}>
            Review the edits
          </Button>
          <Text style={paragraphStyle}>
            This shouldn&rsquo;t take more than a couple of minutes. If we
            don&rsquo;t hear from you in seven days, we&rsquo;ll follow up.
          </Text>
          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            — The AllInfratech editorial team
            <br />
            <Link href={dashboardUrl} style={linkStyle}>
              {dashboardUrl}
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
