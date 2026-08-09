import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onConfirmPayment: (utrNumber: string) => void;
  loading?: boolean;
}

export const PaymentModal = ({
  open,
  onOpenChange,
  totalAmount,
  onConfirmPayment,
  loading = false,
}: PaymentModalProps) => {
  const [utrNumber, setUtrNumber] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [upiId, setUpiId] = useState<string>("mushroom.market@upi");

  useEffect(() => {
    if (open) {
      fetchPaymentSettings();
    }
  }, [open]);

  const fetchPaymentSettings = async () => {
    const { data } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["qr_code_url", "upi_id"]);

    if (data) {
      data.forEach((setting) => {
        if (setting.key === "qr_code_url" && setting.value) setQrCodeUrl(setting.value);
        if (setting.key === "upi_id" && setting.value) setUpiId(setting.value);
      });
    }
  };

  const handleConfirm = () => {
    if (utrNumber.trim().length >= 6) {
      onConfirmPayment(utrNumber.trim());
    }
  };

  const isValidUtr = utrNumber.trim().length >= 6;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Complete Payment
          </DialogTitle>
          <DialogDescription>
            Scan the QR code to pay ₹{totalAmount.toFixed(2)} and enter UTR number
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* QR Code Section */}
          <div className="flex flex-col items-center space-y-3">
            <div className="rounded-lg border-2 border-primary/20 bg-white p-4">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="Payment QR Code"
                  className="h-48 w-48 object-contain"
                />
              ) : (
                /* Sample QR Code - Fallback */
                <svg
                  viewBox="0 0 100 100"
                  className="h-48 w-48"
                  fill="currentColor"
                >
                  <rect x="10" y="10" width="20" height="20" />
                  <rect x="70" y="10" width="20" height="20" />
                  <rect x="10" y="70" width="20" height="20" />
                  <rect x="15" y="15" width="10" height="10" fill="white" />
                  <rect x="75" y="15" width="10" height="10" fill="white" />
                  <rect x="15" y="75" width="10" height="10" fill="white" />
                  <rect x="17" y="17" width="6" height="6" />
                  <rect x="77" y="17" width="6" height="6" />
                  <rect x="17" y="77" width="6" height="6" />
                  <rect x="35" y="10" width="5" height="5" />
                  <rect x="45" y="10" width="5" height="5" />
                  <rect x="55" y="10" width="5" height="5" />
                  <rect x="35" y="20" width="5" height="5" />
                  <rect x="50" y="20" width="5" height="5" />
                  <rect x="40" y="40" width="5" height="5" />
                  <rect x="50" y="40" width="5" height="5" />
                  <rect x="60" y="40" width="5" height="5" />
                  <rect x="35" y="50" width="5" height="5" />
                  <rect x="45" y="50" width="5" height="5" />
                  <rect x="55" y="50" width="5" height="5" />
                  <rect x="65" y="50" width="5" height="5" />
                  <rect x="70" y="70" width="20" height="20" />
                  <rect x="75" y="75" width="10" height="10" fill="white" />
                  <rect x="77" y="77" width="6" height="6" />
                </svg>
              )}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              UPI ID: {upiId}
            </p>
            <div className="rounded-md bg-primary/10 px-4 py-2">
              <p className="text-lg font-bold text-primary">₹{totalAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* UTR Input Section */}
          <div className="space-y-2">
            <Label htmlFor="utr">UTR / Transaction Reference Number</Label>
            <Input
              id="utr"
              placeholder="Enter 12-digit UTR number"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              className="text-center text-lg tracking-wider"
              maxLength={22}
            />
            <p className="text-xs text-muted-foreground">
              You can find UTR number in your payment app transaction details
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!isValidUtr || loading}
              className="flex-1"
            >
              {loading ? (
                "Processing..."
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Payment
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
