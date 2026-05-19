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

export type ProductUnflaggedProps = {
  firstName: string;
  vendorName: string;
  productName: string;
  productUrl: string;
};

/**
 * "Your product is back in the directory." — sent by
 * /api/admin/apps/:id/unflag. Includes a CTA back to the public
 * product page so the vendor can confirm the listing is live.
 */
export function ProductUnflaggedEmail({
  firstName,
  vendorName,
  productName,
  productUrl,
}: ProductUnflaggedProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Your AllInfratech listing for ${productName} is back online`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1Style}>
            Your product is back in the directory.
          </Heading>
          <Text style={paragraphStyle}>Hi {firstName},</Text>
          <Text style={paragraphStyle}>
            Good news — your AllInfratech listing for{" "}
            <strong>{productName}</strong> (under <strong>{vendorName}</strong>
            ) is visible to visitors again.
          </Text>
          <Button href={productUrl} style={buttonStyle}>
            View listing
          </Button>
          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            — The AllInfratech editorial team
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
