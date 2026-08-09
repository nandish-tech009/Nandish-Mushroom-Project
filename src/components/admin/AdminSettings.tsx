import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { QrCode, Upload, Trash2, Image, CreditCard } from "lucide-react";

export const AdminSettings = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["qr_code_url", "upi_id"]);

    if (!error && data) {
      data.forEach((setting) => {
        if (setting.key === "qr_code_url") setQrCodeUrl(setting.value);
        if (setting.key === "upi_id") setUpiId(setting.value || "");
      });
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `qr-code-${Date.now()}.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("qr-codes")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast.error("Failed to upload QR code");
      console.error(uploadError);
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("qr-codes")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Save URL to settings
    const { error: settingsError } = await supabase
      .from("admin_settings")
      .upsert({ key: "qr_code_url", value: publicUrl }, { onConflict: "key" });

    if (settingsError) {
      toast.error("Failed to save QR code URL");
      console.error(settingsError);
    } else {
      setQrCodeUrl(publicUrl);
      toast.success("QR code uploaded successfully!");
    }
    setUploading(false);
  };

  const handleRemoveQrCode = async () => {
    const { error } = await supabase
      .from("admin_settings")
      .delete()
      .eq("key", "qr_code_url");

    if (error) {
      toast.error("Failed to remove QR code");
    } else {
      setQrCodeUrl(null);
      toast.success("QR code removed");
    }
  };

  const handleSaveUpiId = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("admin_settings")
      .upsert({ key: "upi_id", value: upiId }, { onConflict: "key" });

    if (error) {
      toast.error("Failed to save UPI ID");
    } else {
      toast.success("UPI ID saved successfully!");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-center">Loading settings...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* QR Code Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Payment QR Code
          </CardTitle>
          <CardDescription>
            Upload your UPI QR code for customer payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {qrCodeUrl ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-lg border-2 border-primary/20 bg-white p-4">
                <img
                  src={qrCodeUrl}
                  alt="Payment QR Code"
                  className="h-48 w-48 object-contain"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Replace QR Code
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRemoveQrCode}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 py-8">
              <div className="rounded-full bg-muted p-4">
                <Image className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-center">
                No QR code uploaded yet. Upload your UPI QR code to enable customer payments.
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Uploading..." : "Upload QR Code"}
              </Button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* UPI ID Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            UPI ID
          </CardTitle>
          <CardDescription>
            Enter your UPI ID to display to customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="upi-id">UPI ID</Label>
            <Input
              id="upi-id"
              placeholder="yourname@upi"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
          </div>
          <Button onClick={handleSaveUpiId} disabled={saving}>
            {saving ? "Saving..." : "Save UPI ID"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
