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

export type SubmissionPublishedProps = {
  firstName: string;
  productName: string;
  productUrl: string;
};

/**
 * "Your product is live" — sent on the published transition,
 * whether the trigger was admin.approve (no edits) or
 * vendor.approve (after admin edits). Single primary CTA: view
 * the live listing. Plain HTML — same palette and table-ish
 * structure as vendor-inquiry.tsx so Outlook + Gmail render the
 * same way.
 */
export function SubmissionPublishedEmail({
  firstName,
  productName,
  productUrl,
}: SubmissionPublishedProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${productName} is live on AllInfratech`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1Style}>
            {productName} is live on AllInfratech.
          </Heading>
          <Text style={paragraphStyle}>Hi {firstName},</Text>
          <Text style={paragraphStyle}>
            Good news — your product is now public on the directory.
            Anyone browsing for project-management and infrastructure
            software can find {productName} and reach out via the
            &ldquo;Contact this vendor&rdquo; form.
          </Text>
          <Button href={productUrl} style={buttonStyle}>
            View your listing
          </Button>
          <Text style={paragraphStyle}>
            If anything looks off, reply to this email or open your
            vendor dashboard. Every change is logged with a timestamp;
            nothing about your listing changes without you knowing.
          </Text>
          <Text style={paragraphStyle}>Thanks for joining the directory.</Text>
          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            — The AllInfratech team
            <br />
            <Link href={productUrl} style={linkStyle}>
              {productUrl}
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
