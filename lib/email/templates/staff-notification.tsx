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

export interface StaffNotificationEmailProps {
  humanId: string;
  customerName: string;
  customerPhone: string;
  items: { name: string; quantity: number }[];
  total: string;
  fulfillment: "pickup" | "delivery";
  requestedSlot: string;
  deliveryAddress?: string;
  notes?: string;
  adminUrl: string;
}

export default function StaffNotificationEmail({
  humanId,
  customerName,
  customerPhone,
  items,
  total,
  fulfillment,
  requestedSlot,
  deliveryAddress,
  notes,
  adminUrl,
}: StaffNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>🔔 New order {humanId} — action required</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🔔 New Order: {humanId}</Heading>
          <Text style={paragraph}>
            <strong>{customerName}</strong> ({customerPhone}) placed a new
            order.
          </Text>

          <Section style={box}>
            {items.map((item, i) => (
              <Text key={i} style={itemRow}>
                {item.quantity}× {item.name}
              </Text>
            ))}
            <Hr style={hr} />
            <Text style={totalRow}>
              <strong>Total: {total}</strong>
            </Text>
          </Section>

          <Section style={box}>
            <Text style={paragraph}>
              <strong>Fulfillment:</strong>{" "}
              {fulfillment === "pickup" ? "Pickup" : "Delivery"}
            </Text>
            <Text style={paragraph}>
              <strong>Requested slot:</strong> {requestedSlot}
            </Text>
            {fulfillment === "delivery" && deliveryAddress && (
              <Text style={paragraph}>
                <strong>Delivery address:</strong> {deliveryAddress}
              </Text>
            )}
            {notes && (
              <Text style={paragraph}>
                <strong>Notes:</strong> {notes}
              </Text>
            )}
          </Section>

          <Text style={paragraph}>
            ⚠️ Please acknowledge this order within 30 seconds to silence the
            alarm:{" "}
            <a href={adminUrl} style={link}>
              Open Admin Dashboard
            </a>
          </Text>

          <Text style={footer}>SAVOR Bakery — staff notification</Text>
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

const itemRow = {
  color: "#5a4a45",
  fontSize: "14px",
  margin: "4px 0",
};

const totalRow = {
  color: "#3d2c29",
  fontSize: "16px",
  margin: "8px 0 0",
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