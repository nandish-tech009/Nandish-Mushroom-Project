import { useState, useEffect } from "react";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Mail, Phone, Lock, Eye, EyeOff, MapPin, Pencil, Save, X } from "lucide-react";

interface ProfileData {
  full_name: string;
  email: string | null;
  phone_number: string | null;
  street_address: string | null;
  city: string | null;
  pincode: string | null;
}

const Profile = () => {
  const { user, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<ProfileData | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, phone_number, street_address, city, pincode")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching profile:", error);
        // Fallback to user metadata
        setProfile({
          full_name: user.user_metadata?.full_name || "Customer",
          email: user.email || null,
          phone_number: user.user_metadata?.phone_number || null,
          street_address: null,
          city: null,
          pincode: null
        });
      } else {
        setProfile(data);
      }
      setLoadingProfile(false);
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  const startEditing = () => {
    setEditForm(profile);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditForm(null);
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!user || !editForm) return;

    if (!editForm.full_name.trim()) {
      toast.error("Full name is required");
      return;
    }

    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editForm.full_name.trim(),
        phone_number: editForm.phone_number?.trim() || null,
        street_address: editForm.street_address?.trim() || null,
        city: editForm.city?.trim() || null,
        pincode: editForm.pincode?.trim() || null,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } else {
      toast.success("Profile updated successfully!");
      setProfile(editForm);
      setIsEditing(false);
      setEditForm(null);
    }
    setSavingProfile(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setUpdatingPassword(true);
    const { error } = await updatePassword(newPassword);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    }
    setUpdatingPassword(false);
  };

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>
        
        {/* Profile Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Profile Details
                </CardTitle>
                <CardDescription>Your account information</CardDescription>
              </div>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={cancelEditing} disabled={savingProfile}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
                    <Save className="h-4 w-4 mr-2" />
                    {savingProfile ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={editForm?.full_name || ""}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email (cannot be changed)</Label>
                  <Input
                    id="email"
                    value={profile?.email || user?.email || ""}
                    disabled
                    className="bg-muted cursor-not-allowed"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Mobile Number</Label>
                  <Input
                    id="phone_number"
                    value={editForm?.phone_number || ""}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, phone_number: e.target.value } : null)}
                    placeholder="Enter your mobile number"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="street_address">Street Address</Label>
                  <Input
                    id="street_address"
                    value={editForm?.street_address || ""}
                    onChange={(e) => setEditForm(prev => prev ? { ...prev, street_address: e.target.value } : null)}
                    placeholder="Enter your street address"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={editForm?.city || ""}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, city: e.target.value } : null)}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      value={editForm?.pincode || ""}
                      onChange={(e) => setEditForm(prev => prev ? { ...prev, pincode: e.target.value } : null)}
                      placeholder="Pincode"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="font-medium">{profile?.full_name || "Not set"}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{profile?.email || user?.email || "Not set"}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Mobile Number</p>
                    <p className="font-medium">{profile?.phone_number || "Not set"}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Delivery Address</p>
                    <p className="font-medium">
                      {profile?.street_address ? (
                        <>
                          {profile.street_address}
                          {profile.city && `, ${profile.city}`}
                          {profile.pincode && ` - ${profile.pincode}`}
                        </>
                      ) : (
                        "Not set (will be asked during checkout)"
                      )}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Change Password
            </CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={updatingPassword}>
                {updatingPassword ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
