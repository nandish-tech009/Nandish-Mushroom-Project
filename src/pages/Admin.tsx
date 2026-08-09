import { useEffect, useState } from "react";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminOrders } from "@/components/admin/AdminOrders";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminProfile } from "@/components/admin/AdminProfile";
import { AdminSettings } from "@/components/admin/AdminSettings";
import { CustomerSegmentAnalytics } from "@/components/CustomerSegmentAnalytics";
import { toast } from "sonner";
import { ShoppingCart, Clock, Package } from "lucide-react";

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    totalProducts: 0,
  });

  const currentTab = searchParams.get("tab") || "dashboard";

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      checkAdminStatus();
    }
  }, [user, authLoading, navigate]);

  const checkAdminStatus = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (error || !data) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/dashboard");
    } else {
      setIsAdmin(true);
      fetchStats();
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    // Fetch total orders
    const { count: ordersCount } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true });

    // Fetch pending orders
    const { count: pendingCount } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "Pending Approval");

    // Fetch total products
    const { count: productsCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    setStats({
      totalOrders: ordersCount || 0,
      pendingOrders: pendingCount || 0,
      totalProducts: productsCount || 0,
    });
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-4xl font-bold">Admin Panel</h1>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="orders">Order Management</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="users">Customers</TabsTrigger>
            <TabsTrigger value="segments">Customer Segments</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="profile">My Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AdminDashboard />
          </TabsContent>

          <TabsContent value="orders">
            <AdminOrders />
          </TabsContent>

          <TabsContent value="products">
            <AdminProducts />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>

          <TabsContent value="segments">
            <CustomerSegmentAnalytics />
          </TabsContent>

          <TabsContent value="settings">
            <AdminSettings />
          </TabsContent>

          <TabsContent value="profile">
            <AdminProfile />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;