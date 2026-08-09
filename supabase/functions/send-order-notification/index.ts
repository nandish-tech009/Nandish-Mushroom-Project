import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderNotificationRequest {
  customerEmail: string;
  customerName: string;
  orderId: string;
  orderStatus: string;
  totalPrice: number;
  orderDate: string;
}

const getEstimatedDelivery = (orderDate: string, status: string): string => {
  const date = new Date(orderDate);
  let daysToAdd = 0;

  switch (status) {
    case "Pending Approval":
      daysToAdd = 5;
      break;
    case "Confirmed":
      daysToAdd = 4;
      break;
    case "Processing":
      daysToAdd = 2;
      break;
    case "Delivered":
      return "Delivered";
    default:
      daysToAdd = 5;
  }

  const estimatedDate = new Date(date);
  estimatedDate.setDate(estimatedDate.getDate() + daysToAdd);
  return estimatedDate.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const getStatusMessage = (status: string): { subject: string; message: string } => {
  switch (status) {
    case "Confirmed":
      return {
        subject: "Order Confirmed - Mushroom Market",
        message: "Great news! Your order has been confirmed and is being prepared for delivery.",
      };
    case "Processing":
      return {
        subject: "Order Processing - Mushroom Market",
        message: "Your order is currently being processed and will be shipped soon.",
      };
    case "Delivered":
      return {
        subject: "Order Delivered - Mushroom Market",
        message: "Your order has been delivered. We hope you enjoy your mushrooms!",
      };
    case "Cancelled":
      return {
        subject: "Order Cancelled - Mushroom Market",
        message: "We regret to inform you that your order has been cancelled. If you have any questions, please contact our support team.",
      };
    default:
      return {
        subject: "Order Status Update - Mushroom Market",
        message: `Your order status has been updated to: ${status}`,
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerEmail, customerName, orderId, orderStatus, totalPrice, orderDate }: OrderNotificationRequest = await req.json();

    console.log("Sending order notification:", { customerEmail, orderId, orderStatus });

    const { subject, message } = getStatusMessage(orderStatus);
    const estimatedDelivery = getEstimatedDelivery(orderDate, orderStatus);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mushroom Market <onboarding@resend.dev>",
        to: [customerEmail],
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2d5016;">🍄 Mushroom Market</h1>
            <h2>Hello ${customerName},</h2>
            <p style="font-size: 16px; line-height: 1.5;">${message}</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2d5016;">Order Details</h3>
              <p><strong>Order ID:</strong> #${orderId.slice(0, 8)}</p>
              <p><strong>Status:</strong> <span style="color: ${orderStatus === 'Delivered' ? '#22c55e' : '#3b82f6'}; font-weight: bold;">${orderStatus}</span></p>
              <p><strong>Total:</strong> ₹${totalPrice.toFixed(2)}</p>
            </div>
            
            ${orderStatus === 'Cancelled' ? `
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <h3 style="margin-top: 0; color: #ef4444;">❌ Order Cancelled</h3>
              <p>Your order has been cancelled. If you made a payment, a refund will be processed within 5-7 business days.</p>
              <p>If you have any questions, please contact our support team.</p>
            </div>
            ` : orderStatus !== 'Delivered' ? `
            <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2d5016;">
              <h3 style="margin-top: 0; color: #2d5016;">📅 Estimated Delivery</h3>
              <p style="font-size: 18px; font-weight: bold; color: #2d5016;">${estimatedDelivery}</p>
            </div>
            ` : `
            <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
              <h3 style="margin-top: 0; color: #22c55e;">✅ Successfully Delivered</h3>
              <p>Thank you for shopping with us!</p>
            </div>
            `}
            
            <p style="color: #666; font-size: 14px;">
              Track your order anytime from your dashboard. If you have any questions, please don't hesitate to contact us.
            </p>
            
            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>The Mushroom Market Team</strong>
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      throw new Error(`Resend API error: ${await emailResponse.text()}`);
    }

    const emailData = await emailResponse.json();

    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify(emailData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-order-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
