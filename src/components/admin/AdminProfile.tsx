import { useState, useEffect } from "react";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Mail, Phone, Lock, Eye, EyeOff, MapPin, Edit2, Save, X } from "lucide-react";

interface ProfileData {
  full_name: string;
  email: string | null;
  phone_number: string | null;
  street_address: string | null;
  city: string | null;
  pincode: string | null;
}

export const AdminProfile = () => {
  const { user, updatePassword } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<ProfileData | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Password states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, email, phone_number, street_address, city, pincode")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching profile:", error);
      setProfile({
        full_name: user.user_metadata?.full_name || "Admin",
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

  const handleEditClick = () => {
    setEditedProfile(profile);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedProfile(null);
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!user || !editedProfile) return;
    
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editedProfile.full_name,
        phone_number: editedProfile.phone_number,
        street_address: editedProfile.street_address,
        city: editedProfile.city,
        pincode: editedProfile.pincode
      })
      .eq("user_id", user.id);
    
    if (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } else {
      toast.success("Profile updated successfully!");
      setProfile(editedProfile);
      setIsEditing(false);
    }
    setSaving(false);
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

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Details Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Admin Profile
            </CardTitle>
            <CardDescription>Your account information</CardDescription>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={handleEditClick}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Full Name */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <User className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Full Name</p>
              {isEditing ? (
                <Input
                  value={editedProfile?.full_name || ""}
                  onChange={(e) => setEditedProfile(prev => prev ? {...prev, full_name: e.target.value} : null)}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{profile?.full_name || "Not set"}</p>
              )}
            </div>
          </div>
          
          {/* Email - Not editable */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Mail className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Email (cannot be changed)</p>
              <p className="font-medium">{profile?.email || user?.email || "Not set"}</p>
            </div>
          </div>
          
          {/* Phone Number */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Phone className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Mobile Number</p>
              {isEditing ? (
                <Input
                  value={editedProfile?.phone_number || ""}
                  onChange={(e) => setEditedProfile(prev => prev ? {...prev, phone_number: e.target.value} : null)}
                  className="mt-1"
                  placeholder="Enter phone number"
                />
              ) : (
                <p className="font-medium">{profile?.phone_number || "Not set"}</p>
              )}
            </div>
          </div>
          
          {/* Street Address */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Street Address</p>
              {isEditing ? (
                <Input
                  value={editedProfile?.street_address || ""}
                  onChange={(e) => setEditedProfile(prev => prev ? {...prev, street_address: e.target.value} : null)}
                  className="mt-1"
                  placeholder="Enter street address"
                />
              ) : (
                <p className="font-medium">{profile?.street_address || "Not set"}</p>
              )}
            </div>
          </div>
          
          {/* City */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">City</p>
              {isEditing ? (
                <Input
                  value={editedProfile?.city || ""}
                  onChange={(e) => setEditedProfile(prev => prev ? {...prev, city: e.target.value} : null)}
                  className="mt-1"
                  placeholder="Enter city"
                />
              ) : (
                <p className="font-medium">{profile?.city || "Not set"}</p>
              )}
            </div>
          </div>
          
          {/* Pincode */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Pincode</p>
              {isEditing ? (
                <Input
                  value={editedProfile?.pincode || ""}
                  onChange={(e) => setEditedProfile(prev => prev ? {...prev, pincode: e.target.value} : null)}
                  className="mt-1"
                  placeholder="Enter pincode"
                />
              ) : (
                <p className="font-medium">{profile?.pincode || "Not set"}</p>
              )}
            </div>
          </div>
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
  );
};
