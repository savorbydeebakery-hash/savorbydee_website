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

export interface OrderConfirmationEmailProps {
  customerName: string;
  humanId: string;
  items: { name: string; quantity: number; lineTotal: string }[];
  total: string;
  fulfillment: "pickup" | "delivery";
  requestedSlot: string;
  pickupAddress?: string;
  paymentStatus: string;
  orderUrl: string;
}

export default function OrderConfirmationEmail({
  customerName,
  humanId,
  items,
  total,
  fulfillment,
  requestedSlot,
  pickupAddress,
  paymentStatus,
  orderUrl,
}: OrderConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your SAVOR order {humanId} is confirmed!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Thank you, {customerName}! 🎂</Heading>
          <Text style={paragraph}>
            Your order <strong>{humanId}</strong> has been received. Here is a
            summary:
          </Text>

          <Section style={box}>
            {items.map((item, i) => (
              <Text key={i} style={itemRow}>
                {item.quantity}× {item.name} — {item.lineTotal}
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
            {fulfillment === "delivery" && pickupAddress && (
              <Text style={paragraph}>
                <strong>Delivery address:</strong> {pickupAddress}
              </Text>
            )}
            <Text style={paragraph}>
              <strong>Payment:</strong> {paymentStatus}
            </Text>
          </Section>

          <Text style={paragraph}>
            Track your order anytime:{" "}
            <a href={orderUrl} style={link}>
              {orderUrl}
            </a>
          </Text>

          <Text style={footer}>
            SAVOR Bakery — handcrafted with love. Questions? Reply to this
            email or WhatsApp us.
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