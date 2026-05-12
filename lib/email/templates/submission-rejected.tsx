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

export type SubmissionRejectedProps = {
  firstName: string;
  productName: string;
  rejectionReason: string;
  dashboardUrl: string;
};

/**
 * "Submission rejected" — sent on admin.reject. Carries the
 * admin's free-text reason verbatim. Primary CTA points at the
 * vendor's dashboard where they can edit + resubmit.
 */
export function SubmissionRejectedEmail({
  firstName,
  productName,
  rejectionReason,
  dashboardUrl,
}: SubmissionRejectedProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Your AllInfratech submission needs changes — ${productName}`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1Style}>
            Your submission needs changes.
          </Heading>
          <Text style={paragraphStyle}>Hi {firstName},</Text>
          <Text style={paragraphStyle}>
            We weren&rsquo;t able to publish <strong>{productName}</strong> as
            submitted. Here&rsquo;s what we&rsquo;d need addressed before
            re-review:
          </Text>
          <Text style={reasonStyle}>{rejectionReason}</Text>
          <Text style={paragraphStyle}>
            You can edit your submission and resubmit it from your dashboard.
            If anything in our feedback is unclear, just reply to this email.
          </Text>
          <Button href={dashboardUrl} style={buttonStyle}>
            Edit your submission
          </Button>
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
