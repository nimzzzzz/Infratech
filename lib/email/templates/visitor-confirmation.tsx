import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";

export type VisitorConfirmationProps = {
  appName: string;
  appUrl: string;
  vendorName: string;
  visitorName: string;
  siteUrl: string;
};

/**
 * Receipt sent to the visitor confirming their inquiry went through.
 * Same minimal styling philosophy as vendor-inquiry.tsx — readable in
 * any client, no tracking, no marketing surface.
 */
export function VisitorConfirmationEmail({
  appName,
  appUrl,
  vendorName,
  visitorName,
  siteUrl,
}: VisitorConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Your message to ${vendorName} was sent`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1Style}>Your message was sent.</Heading>
          <Text style={paragraph}>
            Hi {visitorName} — we&rsquo;ve forwarded your inquiry about{" "}
            <strong>{appName}</strong> to the {vendorName} team. They&rsquo;ll
            reply directly to the email address you sent from, usually within
            a few business days.
          </Text>
          <Text style={paragraph}>
            We don&rsquo;t see their reply — the conversation lives entirely
            between you and the vendor from here.
          </Text>

          <Hr style={hrStyle} />

          <Text style={small}>
            <Link href={appUrl} style={linkStyle}>
              View {appName} on AllInfratech
            </Link>
            <br />
            <Link href={siteUrl} style={linkStyle}>
              Browse the directory
            </Link>
          </Text>

          <Hr style={hrStyle} />

          <Text style={footnote}>
            AllInfratech is an independent reference of project management and
            infrastructure software, maintained by the Digital &amp; AI
            Practice at Resolute Management Consultancy. Inclusion is not an
            endorsement.
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
  fontSize: "24px",
  lineHeight: "1.25",
  margin: "0 0 16px",
  color: "#0A0A0A",
};
const paragraph = {
  fontSize: "15px",
  color: "#0A0A0A",
  lineHeight: "1.6",
  margin: "0 0 16px",
};
const small = {
  fontSize: "13px",
  color: "#0A0A0A",
  lineHeight: "1.8",
  margin: 0,
};
const footnote = {
  fontSize: "11px",
  color: "#6E6E6E",
  lineHeight: "1.5",
  margin: 0,
};
const hrStyle = {
  border: "none",
  borderTop: "1px solid #E6E5E0",
  margin: "24px 0",
};
const linkStyle = {
  color: "#D6336C",
  textDecoration: "underline",
};
