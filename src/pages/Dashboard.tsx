import { useEffect, useState } from "react";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShoppingBag, TrendingUp, CheckCircle2, FileText, MapPin } from "lucide-react";
import { OrderReceipt } from "@/components/OrderReceipt";
import { OrderTracking } from "@/components/OrderTracking";

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  products: {
    name: string;
    image_url: string | null;
    unit: string;
  };
};

type Order = {
  id: string;
  status: string;
  total_price: number;
  created_at: string;
  order_items: OrderItem[];
};

type ProfileData = {
  full_name: string;
  email: string | null;
  phone_number: string | null;
  street_address: string | null;
  city: string | null;
  pincode: string | null;
};

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSummaries, setOpenSummaries] = useState<Record<string, boolean>>({});
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchProfile();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel('dashboard-orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, phone_number, street_address, city, pincode")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (data) {
      setProfile(data);
    }
  };

  const fetchOrders = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          price,
          products (
            name,
            image_url,
            unit
          )
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load orders");
      console.error(error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const activeOrders = orders.filter(
    (o) =>
      o.status === "Pending Approval" ||
      o.status === "Confirmed" ||
      o.status === "Processing"
  );

  const deliveredOrders = orders.filter((o) => o.status === "Delivered");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending Approval":
        return "bg-yellow-500";
      case "Confirmed":
        return "bg-blue-500";
      case "Processing":
        return "bg-purple-500";
      case "Delivered":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
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

  const completedOrders = orders.filter((o) => o.status === "Delivered");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-4xl font-bold">My Dashboard</h1>

        {/* Stat Cards */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="relative overflow-hidden border-none bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium opacity-90">Total Orders</p>
                <h3 className="mt-2 text-4xl font-bold">{orders.length}</h3>
              </div>
              <div className="rounded-full bg-white/20 p-4">
                <ShoppingBag className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium opacity-90">Active Orders</p>
                <h3 className="mt-2 text-4xl font-bold">{activeOrders.length}</h3>
              </div>
              <div className="rounded-full bg-white/20 p-4">
                <TrendingUp className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm font-medium opacity-90">Completed Orders</p>
                <h3 className="mt-2 text-4xl font-bold">{completedOrders.length}</h3>
              </div>
              <div className="rounded-full bg-white/20 p-4">
                <CheckCircle2 className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="orders">My Orders ({activeOrders.length})</TabsTrigger>
            <TabsTrigger value="tracking">
              <MapPin className="mr-1 h-4 w-4" />
              Order Tracking
            </TabsTrigger>
            <TabsTrigger value="delivered">Delivered Orders ({deliveredOrders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            {activeOrders.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No active orders. Start shopping!
                  <div className="mt-4">
                    <Button onClick={() => navigate("/products")}>
                      Browse Products
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              activeOrders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          Order #{order.id.slice(0, 8)}
                        </CardTitle>
                        <CardDescription>
                          {new Date(order.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="flex items-center gap-4 p-2 rounded-lg bg-muted/50">
                            {item.products?.image_url && (
                              <img
                                src={item.products.image_url}
                                alt={item.products?.name || "Product"}
                                className="h-16 w-16 rounded object-cover"
                              />
                            )}
                            <div className="flex-1">
                               <p className="font-medium">{item.products?.name}</p>
                               <p className="text-sm text-muted-foreground">
                                 Quantity: {item.quantity} × ₹{Number(item.price).toFixed(2)}
                               </p>
                            </div>
                          </div>
                        ))}
                       </div>
                       <div className="flex items-center justify-between border-t pt-2">
                          <p className="text-lg font-semibold">
                            Total: ₹{Number(order.total_price).toFixed(2)}
                          </p>
                          {(order.status === "Confirmed" || order.status === "Processing" || order.status === "Delivered") && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setOpenSummaries(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              {openSummaries[order.id] ? "Hide" : "View"} Order Summary
                            </Button>
                          )}
                        </div>
                        {openSummaries[order.id] && (order.status === "Confirmed" || order.status === "Processing" || order.status === "Delivered") && (
                          <div className="mt-4">
                            <OrderReceipt 
                              order={order} 
                              customerName={profile?.full_name || user?.user_metadata?.full_name || "Customer"}
                              customerEmail={profile?.email || user?.email}
                              customerPhone={profile?.phone_number || undefined}
                              deliveryAddress={{
                                street_address: profile?.street_address,
                                city: profile?.city,
                                pincode: profile?.pincode,
                              }}
                            />
                          </div>
                        )}
                      </div>
                   </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4">
            <OrderTracking orders={orders} onOrderUpdate={fetchOrders} />
          </TabsContent>

          <TabsContent value="delivered" className="space-y-4">
            {deliveredOrders.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No delivered orders yet.
                </CardContent>
              </Card>
            ) : (
              deliveredOrders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          Order #{order.id.slice(0, 8)}
                        </CardTitle>
                        <CardDescription>
                          {new Date(order.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="flex items-center gap-4 p-2 rounded-lg bg-muted/50">
                            {item.products?.image_url && (
                              <img
                                src={item.products.image_url}
                                alt={item.products?.name || "Product"}
                                className="h-16 w-16 rounded object-cover"
                              />
                            )}
                             <div className="flex-1">
                               <p className="font-medium">{item.products?.name}</p>
                               <p className="text-sm text-muted-foreground">
                                 Quantity: {item.quantity} × ₹{Number(item.price).toFixed(2)}
                               </p>
                             </div>
                          </div>
                        ))}
                       </div>
                       <div className="flex items-center justify-between border-t pt-2">
                          <p className="text-lg font-semibold">
                            Total: ₹{Number(order.total_price).toFixed(2)}
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setOpenSummaries(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            {openSummaries[order.id] ? "Hide" : "View"} Order Summary
                          </Button>
                        </div>
                        {openSummaries[order.id] && (
                          <div className="mt-4">
                            <OrderReceipt 
                              order={order} 
                              customerName={profile?.full_name || user?.user_metadata?.full_name || "Customer"}
                              customerEmail={profile?.email || user?.email}
                              customerPhone={profile?.phone_number || undefined}
                              deliveryAddress={{
                                street_address: profile?.street_address,
                                city: profile?.city,
                                pincode: profile?.pincode,
                              }}
                            />
                          </div>
                        )}
                      </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;