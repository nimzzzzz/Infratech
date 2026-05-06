import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type VendorInquiryProps = {
  appName: string;
  appSlug: string;
  appUrl: string;
  vendorName: string;
  visitor: {
    name: string;
    email: string;
    company?: string;
    role?: string;
  };
  subject?: string;
  message: string;
};

/**
 * The email that lands in the vendor's inbox. Plain table-ish HTML —
 * Outlook strips most CSS, Gmail strips the rest, so we lean on
 * @react-email/components' table primitives and inline a small
 * palette via the `style` prop.
 *
 * No buttons, no tracking pixels — this is a transactional inquiry, not
 * marketing. The vendor's reply goes to the visitor directly via the
 * Reply-To header set on the resend.emails.send() call.
 */
export function VendorInquiryEmail({
  appName,
  appUrl,
  vendorName,
  visitor,
  subject,
  message,
}: VendorInquiryProps) {
  return (
    <Html>
      <Head />
      <Preview>{`New inquiry about ${appName} from ${visitor.name}`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1Style}>New inquiry from the directory</Heading>
          <Text style={muted}>
            Someone viewing your <strong>{appName}</strong> listing on
            InfraTechDB just sent {vendorName} a message.
          </Text>

          <Section style={cardStyle}>
            <Row label="From" value={visitor.name} />
            <Row label="Email" value={visitor.email} />
            {visitor.company ? <Row label="Company" value={visitor.company} /> : null}
            {visitor.role ? <Row label="Role" value={visitor.role} /> : null}
            {subject ? <Row label="Subject" value={subject} /> : null}
            <Row label="Tool" value={appName} />
          </Section>

          <Heading as="h2" style={h2Style}>
            Their message
          </Heading>
          <Text style={messageStyle}>{message}</Text>

          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            Reply directly to this email — your reply goes straight to{" "}
            <strong>{visitor.email}</strong>; we don&rsquo;t see it.
            <br />
            Listing:{" "}
            <Link href={appUrl} style={linkStyle}>
              {appUrl}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Text style={rowStyle}>
      <strong style={rowLabel}>{label}:</strong> {value}
    </Text>
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
  margin: "0 0 8px",
  color: "#0A0A0A",
};
const h2Style = {
  fontSize: "13px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.18em",
  color: "#6E6E6E",
  margin: "28px 0 12px",
};
const muted = {
  fontSize: "14px",
  color: "#5C5C5C",
  margin: "0 0 24px",
  lineHeight: "1.5",
};
const cardStyle = {
  backgroundColor: "#FFFFFF",
  border: "1px solid #E6E5E0",
  padding: "20px 22px",
  margin: "0 0 8px",
};
const rowStyle = {
  fontSize: "14px",
  color: "#0A0A0A",
  margin: "6px 0",
};
const rowLabel = {
  display: "inline-block" as const,
  minWidth: "72px",
  color: "#6E6E6E",
};
const messageStyle = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#0A0A0A",
  whiteSpace: "pre-wrap" as const,
  backgroundColor: "#FFFFFF",
  border: "1px solid #E6E5E0",
  padding: "16px 18px",
  margin: "0",
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
