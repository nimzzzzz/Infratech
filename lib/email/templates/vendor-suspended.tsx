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

export type VendorSuspendedProps = {
  firstName: string;
  vendorName: string;
  /** Optional admin-supplied reason. When provided, rendered verbatim
   *  in a rose-bordered reason block (same treatment as the
   *  submission-rejected email). When omitted, a generic body runs
   *  with no reason block. */
  reason?: string;
  supportEmail: string;
};

/**
 * "Your company listing has been suspended." — sent by
 * /api/admin/vendors/:id/suspend. No CTA (no destination to act on);
 * the body directs the vendor to the support email if they think
 * the suspension is an error.
 */
export function VendorSuspendedEmail({
  firstName,
  vendorName,
  reason,
  supportEmail,
}: VendorSuspendedProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Your AllInfratech listing for ${vendorName} has been suspended`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1Style}>
            Your company listing has been suspended.
          </Heading>
          <Text style={paragraphStyle}>Hi {firstName},</Text>
          <Text style={paragraphStyle}>
            Your AllInfratech listing for <strong>{vendorName}</strong> has
            been suspended by our editorial team. While suspended, your
            company profile and all your products are hidden from the public
            directory, and your team can&rsquo;t sign in to the dashboard.
          </Text>
          {reason ? (
            <>
              <Text style={paragraphStyle}>
                Here&rsquo;s what our team noted:
              </Text>
              <Text style={reasonStyle}>{reason}</Text>
            </>
          ) : null}
          <Text style={paragraphStyle}>
            If you believe this was made in error, reply to this email or
            contact{" "}
            <Link href={`mailto:${supportEmail}`} style={linkStyle}>
              {supportEmail}
            </Link>
            .
          </Text>
          <Hr style={hrStyle} />
          <Text style={footerStyle}>— The AllInfratech editorial team</Text>
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
