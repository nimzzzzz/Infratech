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
import type { SubmissionType } from "@/lib/db/schema";

export type AdminSubmissionReceivedProps = {
  submissionType: SubmissionType;
  vendorName: string;
  /** Null for company_edit (no product in scope). */
  productName: string | null;
  summary: string;
  reviewUrl: string;
};

const TYPE_LABELS: Record<string, string> = {
  new: "New product submission",
  product_edit: "Product edit",
  company_edit: "Company profile edit",
};

/**
 * Internal admin notification — sent (BCC) to every CLERK_ADMIN_EMAILS
 * address when a vendor creates a submission that needs review. Single
 * primary CTA into the admin review page. Same plain-HTML palette /
 * structure as the vendor-facing templates so it renders consistently
 * in Outlook + Gmail.
 */
export function AdminSubmissionReceivedEmail({
  submissionType,
  vendorName,
  productName,
  summary,
  reviewUrl,
}: AdminSubmissionReceivedProps) {
  const headline = productName ?? `Company profile edit — ${vendorName}`;
  const typeLabel = TYPE_LABELS[submissionType] ?? submissionType;

  return (
    <Html>
      <Head />
      <Preview>{`${typeLabel} from ${vendorName} needs review`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text style={eyebrowStyle}>Submission for review</Text>
          <Heading style={h1Style}>{headline}</Heading>
          <Text style={paragraphStyle}>
            <strong>{typeLabel}</strong> from <strong>{vendorName}</strong>.
          </Text>
          <Text style={paragraphStyle}>{summary}</Text>
          <Button href={reviewUrl} style={buttonStyle}>
            Review submission
          </Button>
          <Text style={paragraphStyle}>
            This submission is sitting in the review queue at{" "}
            <code>pending_review</code> until an admin approves, edits, or
            rejects it.
          </Text>
          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            — AllInfratech admin notifications
            <br />
            <Link href={reviewUrl} style={linkStyle}>
              {reviewUrl}
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
const eyebrowStyle = {
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.18em",
  color: "#D6336C",
  margin: "0 0 8px",
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
