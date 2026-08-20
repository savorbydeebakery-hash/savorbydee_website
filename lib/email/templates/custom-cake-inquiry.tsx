import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface CustomCakeInquiryEmailProps {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  cakeType: string;
  flavor?: string;
  weight?: string;
  decoration?: string;
  messageOnCake?: string;
  description?: string;
  requestedDate?: string;
  adminUrl: string;
}

export default function CustomCakeInquiryEmail({
  customerName,
  customerPhone,
  customerEmail,
  cakeType,
  flavor,
  weight,
  decoration,
  messageOnCake,
  description,
  requestedDate,
  adminUrl,
}: CustomCakeInquiryEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>🎂 New custom cake inquiry from {customerName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🎂 New Custom Cake Inquiry</Heading>
          <Text style={paragraph}>
            <strong>{customerName}</strong> ({customerPhone}, {customerEmail})
            submitted a custom cake request.
          </Text>

          <Section style={box}>
            <Text style={paragraph}>
              <strong>Type:</strong> {cakeType}
            </Text>
            {flavor && (
              <Text style={paragraph}>
                <strong>Flavor:</strong> {flavor}
              </Text>
            )}
            {weight && (
              <Text style={paragraph}>
                <strong>Weight:</strong> {weight}
              </Text>
            )}
            {decoration && (
              <Text style={paragraph}>
                <strong>Decoration:</strong> {decoration}
              </Text>
            )}
            {messageOnCake && (
              <Text style={paragraph}>
                <strong>Message on cake:</strong> {messageOnCake}
              </Text>
            )}
            {requestedDate && (
              <Text style={paragraph}>
                <strong>Requested date:</strong> {requestedDate}
              </Text>
            )}
            {description && (
              <>
                <Hr style={hr} />
                <Text style={paragraph}>{description}</Text>
              </>
            )}
          </Section>

          <Text style={paragraph}>
            Review and quote this inquiry:{" "}
            <a href={adminUrl} style={link}>
              Open Admin Dashboard
            </a>
          </Text>

          <Text style={footer}>SAVOR Bakery — custom cake inquiries</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#fdf6f0",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  padding: "20px 0",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #f0e6dd",
  borderRadius: "12px",
  margin: "0 auto",
  padding: "32px",
  maxWidth: "560px",
};

const h1 = {
  color: "#3d2c29",
  fontSize: "24px",
  fontWeight: 700,
  margin: "0 0 16px",
};

const paragraph = {
  color: "#5a4a45",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "8px 0",
};

const box = {
  backgroundColor: "#fdf6f0",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
};

const hr = {
  borderColor: "#f0e6dd",
  margin: "12px 0",
};

const link = {
  color: "#e07a5f",
  textDecoration: "underline",
};

const footer = {
  color: "#9a8a85",
  fontSize: "12px",
  marginTop: "24px",
  textAlign: "center" as const,
};