import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Printer } from "lucide-react";
import { useRef } from "react";

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  products?: {
    name: string;
    unit?: string;
  };
};

type OrderReceiptProps = {
  order: {
    id: string;
    created_at: string;
    total_price: number;
    status: string;
    order_items?: OrderItem[];
    utr_number?: string | null;
    utr_verified?: boolean | null;
    tax_percentage?: number | null;
  };
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  deliveryAddress?: {
    street_address?: string | null;
    city?: string | null;
    pincode?: string | null;
  };
  showCustomerInfo?: boolean;
  upiId?: string;
  paymentMode?: string;
};

export const OrderReceipt = ({ order, customerName, customerEmail, customerPhone, deliveryAddress, showCustomerInfo = false, upiId, paymentMode = "UPI" }: OrderReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const subtotal = order.order_items?.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0) || 0;
  const taxPercentage = order.tax_percentage ?? 8; // Use saved tax or default 8%
  const taxAmount = subtotal * (taxPercentage / 100);
  const total = Number(order.total_price);

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order Receipt - #${order.id.slice(0, 8).toUpperCase()}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              max-width: 400px; 
              margin: 0 auto;
              color: #333;
            }
            .receipt { padding: 20px; border: 1px solid #ddd; }
            .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px dashed #ccc; }
            .header h1 { font-size: 24px; margin-bottom: 5px; }
            .header p { font-size: 12px; color: #666; }
            .section { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #eee; }
            .section-title { font-weight: bold; margin-bottom: 8px; font-size: 14px; }
            .section p { font-size: 13px; color: #555; margin: 3px 0; }
            .item { display: flex; justify-content: space-between; margin: 8px 0; font-size: 13px; }
            .item-details { color: #666; font-size: 11px; }
            .totals { margin-top: 15px; }
            .totals .row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 13px; }
            .totals .total { font-size: 16px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 2px dashed #ccc; }
            .footer p { font-size: 12px; color: #666; }
            .status { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
            @media print { body { padding: 0; } .receipt { border: none; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>Mushroom Market</h1>
              <p>Farm Fresh Mushrooms</p>
              <p style="margin-top: 10px;">Order #${order.id.slice(0, 8).toUpperCase()}</p>
              <p>Date: ${new Date(order.created_at).toLocaleDateString()} at ${new Date(order.created_at).toLocaleTimeString()}</p>
              <p style="margin-top: 8px;"><span class="status">✓ ${order.status}</span></p>
            </div>
            
            ${customerName || customerEmail || customerPhone ? `
            <div class="section">
              <p class="section-title">Customer Details:</p>
              ${customerName ? `<p>Name: ${customerName}</p>` : ''}
              ${customerEmail ? `<p>Email: ${customerEmail}</p>` : ''}
              ${customerPhone ? `<p>Phone: ${customerPhone}</p>` : ''}
            </div>
            ` : ''}
            
            ${deliveryAddress && (deliveryAddress.street_address || deliveryAddress.city || deliveryAddress.pincode) ? `
            <div class="section">
              <p class="section-title">Delivery Address:</p>
              <p>${deliveryAddress.street_address || ''}${deliveryAddress.city ? `, ${deliveryAddress.city}` : ''}${deliveryAddress.pincode ? ` - ${deliveryAddress.pincode}` : ''}</p>
            </div>
            ` : ''}
            
            <div class="section">
              <p class="section-title">Payment Details:</p>
              <p>Mode of Payment: ${paymentMode}</p>
              ${upiId ? `<p>UPI ID: ${upiId}</p>` : ''}
              ${order.utr_number ? `<p>UTR Number: ${order.utr_number}</p>` : ''}
              <p>Status: ${order.utr_verified || order.status === "Delivered" ? '✓ Verified' : 'Pending'}</p>
            </div>
            
            <div class="section">
              <p class="section-title">Items:</p>
              ${order.order_items?.map(item => `
                <div class="item">
                  <div>
                    <div>${item.products?.name || 'Product'}</div>
                    <div class="item-details">${item.quantity} ${item.products?.unit || 'unit'} × ₹${Number(item.price).toFixed(2)}</div>
                  </div>
                  <div>₹${(Number(item.price) * item.quantity).toFixed(2)}</div>
                </div>
              `).join('') || ''}
            </div>
            
            <div class="totals">
              <div class="row"><span>Subtotal:</span><span>₹${subtotal.toFixed(2)}</span></div>
              <div class="row"><span>Tax (${taxPercentage}%):</span><span>₹${taxAmount.toFixed(2)}</span></div>
              <div class="row total"><span>Total Amount:</span><span>₹${total.toFixed(2)}</span></div>
            </div>
            
            <div class="footer">
              <p>✓ Payment Confirmed</p>
              <p style="margin-top: 5px;">Thank you for your purchase!</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Card ref={receiptRef} className="border-2 border-primary/20">
      <CardHeader className="bg-primary/5">
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <span>Payment Receipt</span>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500">
              {order.status}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {/* Receipt Header */}
        <div className="text-center space-y-1 pb-4 border-b">
          <h3 className="text-xl font-bold">Mushroom Market</h3>
          <p className="text-sm text-muted-foreground">Farm Fresh Mushrooms</p>
          <p className="text-xs text-muted-foreground">Order #{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-xs text-muted-foreground">
            Date: {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}
          </p>
        </div>

        {/* Customer Info */}
        {(customerName || customerEmail || customerPhone) && (
          <div className="space-y-1 pb-4 border-b">
            <p className="text-sm font-semibold">Customer Details:</p>
            {customerName && <p className="text-sm text-muted-foreground">Name: {customerName}</p>}
            {customerEmail && <p className="text-sm text-muted-foreground">Email: {customerEmail}</p>}
            {customerPhone && <p className="text-sm text-muted-foreground">Phone: {customerPhone}</p>}
          </div>
        )}

        {/* Delivery Address */}
        {deliveryAddress && (deliveryAddress.street_address || deliveryAddress.city || deliveryAddress.pincode) && (
          <div className="space-y-1 pb-4 border-b">
            <p className="text-sm font-semibold">Delivery Address:</p>
            <p className="text-sm text-muted-foreground">
              {deliveryAddress.street_address && <span>{deliveryAddress.street_address}</span>}
              {deliveryAddress.city && <span>, {deliveryAddress.city}</span>}
              {deliveryAddress.pincode && <span> - {deliveryAddress.pincode}</span>}
            </p>
          </div>
        )}

        {/* Payment Details */}
        <div className="space-y-1 pb-4 border-b">
          <p className="text-sm font-semibold">Payment Details:</p>
          <p className="text-sm text-muted-foreground">Mode of Payment: {paymentMode}</p>
          {upiId && <p className="text-sm text-muted-foreground">UPI ID: {upiId}</p>}
          {order.utr_number && <p className="text-sm text-muted-foreground">UTR Number: {order.utr_number}</p>}
          <p className="text-sm text-muted-foreground">
            Status: {order.utr_verified || order.status === "Delivered" ? (
              <span className="text-green-600 font-medium">✓ Verified</span>
            ) : (
              <span className="text-yellow-600 font-medium">Pending</span>
            )}
          </p>
        </div>

        {/* Order Items */}
        <div className="space-y-3">
          <p className="text-sm font-semibold">Items:</p>
          {order.order_items?.map((item) => (
            <div key={item.id} className="flex justify-between items-start text-sm">
              <div className="flex-1">
                <p className="font-medium">{item.products?.name || "Product"}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity} {item.products?.unit || "unit"} × ₹{Number(item.price).toFixed(2)}
                </p>
              </div>
              <p className="font-medium">₹{(Number(item.price) * item.quantity).toFixed(2)}</p>
            </div>
          ))}
        </div>

        <Separator />

        {/* Price Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax ({taxPercentage}%):</span>
            <span>₹{taxAmount.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total Amount:</span>
            <span className="text-primary">₹{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Status */}
        <div className="pt-4 border-t text-center">
          <p className="text-sm font-semibold text-green-600">✓ Payment Confirmed</p>
          <p className="text-xs text-muted-foreground mt-1">
            Thank you for your purchase!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
