import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export interface AckWatchdogEmailProps {
  humanId: string;
  customerName: string;
  customerPhone: string;
  total: string;
  requestedSlot: string;
  minutesUnacknowledged: number;
  adminUrl: string;
}

export default function AckWatchdogEmail({
  humanId,
  customerName,
  customerPhone,
  total,
  requestedSlot,
  minutesUnacknowledged,
  adminUrl,
}: AckWatchdogEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>🚨 UNACKNOWLEDGED order {humanId} — {String(minutesUnacknowledged)} min</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🚨 Unacknowledged Order</Heading>
          <Text style={paragraph}>
            Order <strong>{humanId}</strong> has not been acknowledged for{" "}
            <strong>{minutesUnacknowledged} minutes</strong>. This is the
            fallback alert — the in-app alarm was not silenced.
          </Text>

          <Section style={box}>
            <Text style={paragraph}>
              <strong>Customer:</strong> {customerName} ({customerPhone})
            </Text>
            <Text style={paragraph}>
              <strong>Total:</strong> {total}
            </Text>
            <Text style={paragraph}>
              <strong>Requested slot:</strong> {requestedSlot}
            </Text>
          </Section>

          <Text style={paragraph}>
            Acknowledge immediately:{" "}
            <a href={adminUrl} style={link}>
              Open Admin Dashboard
            </a>
          </Text>

          <Text style={footer}>
            SAVOR Bakery — automated watchdog. If this repeats, check that the
            admin dashboard is open and the alarm is enabled.
          </Text>
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
  color: "#b23a48",
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