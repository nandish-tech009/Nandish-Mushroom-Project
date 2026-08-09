import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { MapPin } from "lucide-react";

interface DeliveryAddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onConfirm: (address: { street_address: string; city: string; pincode: string }) => void;
}

export const DeliveryAddressModal = ({
  open,
  onOpenChange,
  userId,
  onConfirm,
}: DeliveryAddressModalProps) => {
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const fetchExistingAddress = async () => {
      if (!open || !userId) return;
      
      setLoadingProfile(true);
      const { data } = await supabase
        .from("profiles")
        .select("street_address, city, pincode")
        .eq("user_id", userId)
        .maybeSingle();

      if (data) {
        setStreetAddress(data.street_address || "");
        setCity(data.city || "");
        setPincode(data.pincode || "");
      }
      setLoadingProfile(false);
    };

    fetchExistingAddress();
  }, [open, userId]);

  const handleConfirm = async () => {
    if (!streetAddress.trim() || !city.trim() || !pincode.trim()) {
      return;
    }

    setLoading(true);

    // Update profile with address
    await supabase
      .from("profiles")
      .update({
        street_address: streetAddress.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
      })
      .eq("user_id", userId);

    onConfirm({
      street_address: streetAddress.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
    });
    
    setLoading(false);
  };

  const isFormValid = streetAddress.trim() && city.trim() && pincode.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Delivery Address
          </DialogTitle>
          <DialogDescription>
            Please confirm your delivery address before placing the order.
          </DialogDescription>
        </DialogHeader>

        {loadingProfile ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading address...
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="street-address">Street Address *</Label>
              <Input
                id="street-address"
                placeholder="Enter your street address"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="Enter city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  placeholder="Enter pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isFormValid || loading || loadingProfile}
          >
            {loading ? "Confirming..." : "Confirm & Place Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
