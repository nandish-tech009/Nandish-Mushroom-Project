import { useState, useEffect } from "react";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { Shield } from "lucide-react";

const AdminLogin = () => {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAdminAndRedirect = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .single();

        if (!error && data) {
          navigate("/admin");
        } else {
          toast.error("Access denied. Admin privileges required.");
          navigate("/dashboard");
        }
      }
    };

    checkAdminAndRedirect();
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      setLoading(false);
      return;
    }

    const { error } = await signIn(email, password);
    
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      // The useEffect will handle the redirect after checking admin status
      toast.success("Checking admin credentials...");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-6">
          {/* Admin Credentials Info */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Shield className="h-5 w-5 text-primary" />
                Admin Login Credentials
              </CardTitle>
              <CardDescription>For testing and demonstration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid gap-2 rounded-lg bg-card p-4 font-mono text-sm">
                <div>
                  <span className="font-semibold text-primary">Email:</span> admin@mushroommarket.com
                </div>
                <div>
                  <span className="font-semibold text-primary">Password:</span> Admin@123
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Admin Portal
              </CardTitle>
              <CardDescription>Sign in to access the admin dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Admin Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@mushroommarket.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In as Admin"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
