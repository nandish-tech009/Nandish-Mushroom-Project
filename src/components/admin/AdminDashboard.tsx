import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { ShoppingCart, Clock, Package, CheckCircle2, TrendingUp, DollarSign } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  products: {
    name: string;
    image_url: string | null;
  };
};

type Order = {
  id: string;
  user_id: string;
  status: string;
  total_price: number;
  created_at: string;
  order_items: OrderItem[];
  profiles?: {
    full_name: string;
  };
};

export const AdminDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    deliveredOrders: 0,
  });
  const [salesData, setSalesData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [popularProducts, setPopularProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchOrders();
    fetchAnalytics();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin-dashboard-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchOrders();
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
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
            image_url
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load orders");
      console.error(error);
      setLoading(false);
      return;
    }

    // Fetch profiles separately
    const userIds = [...new Set(data?.map(o => o.user_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    
    const ordersWithProfiles = data?.map(order => ({
      ...order,
      profiles: profileMap.get(order.user_id)
    })) || [];

    setOrders(ordersWithProfiles);
    
    // Calculate stats
    setStats({
      totalOrders: ordersWithProfiles.length,
      pendingOrders: ordersWithProfiles.filter(o => o.status === "Pending Approval").length,
      processingOrders: ordersWithProfiles.filter(o => o.status === "Confirmed" || o.status === "Processing").length,
      deliveredOrders: ordersWithProfiles.filter(o => o.status === "Delivered").length,
    });
    
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to update order status");
      console.error(error);
    } else {
      toast.success("Order status updated!");
      fetchOrders();
      
      // Send email notification
      if (order) {
        try {
          const { data: authData } = await supabase.auth.admin.getUserById(order.user_id);
          
          if (authData.user?.email) {
            await supabase.functions.invoke("send-order-notification", {
              body: {
                customerEmail: authData.user.email,
                customerName: order.profiles?.full_name || "Customer",
                orderId: orderId,
                orderStatus: newStatus,
                totalPrice: order.total_price,
                orderDate: order.created_at,
              },
            });
            console.log("Email notification sent");
          }
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
        }
      }
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Fetch daily sales for the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: ordersData } = await supabase
        .from("orders")
        .select("created_at, total_price, status")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      // Process sales data by day
      const salesByDay: Record<string, { date: string; sales: number; revenue: number }> = {};
      ordersData?.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString();
        if (!salesByDay[date]) {
          salesByDay[date] = { date, sales: 0, revenue: 0 };
        }
        salesByDay[date].sales += 1;
        if (order.status !== "Pending Approval") {
          salesByDay[date].revenue += Number(order.total_price);
        }
      });

      setSalesData(Object.values(salesByDay));
      setRevenueData(Object.values(salesByDay));

      // Fetch popular products
      const { data: orderItems } = await supabase
        .from("order_items")
        .select(`
          product_id,
          quantity,
          products (name)
        `);

      const productSales: Record<string, { name: string; sales: number }> = {};
      orderItems?.forEach((item: any) => {
        const productName = item.products?.name || "Unknown";
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = { name: productName, sales: 0 };
        }
        productSales[item.product_id].sales += item.quantity;
      });

      const sortedProducts = Object.values(productSales)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

      setPopularProducts(sortedProducts);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const pendingOrders = orders.filter((o) => o.status === "Pending Approval");
  const activeOrders = orders.filter(
    (o) => o.status === "Confirmed" || o.status === "Processing"
  );
  const completedOrders = orders.filter((o) => o.status === "Delivered");

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

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#8dd1e1'];

  if (loading) {
    return <div className="text-center">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium opacity-90">Total Orders</p>
              <h3 className="mt-2 text-4xl font-bold">{stats.totalOrders}</h3>
            </div>
            <div className="rounded-full bg-white/20 p-4">
              <ShoppingCart className="h-8 w-8" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium opacity-90">Pending Approval</p>
              <h3 className="mt-2 text-4xl font-bold">{stats.pendingOrders}</h3>
            </div>
            <div className="rounded-full bg-white/20 p-4">
              <Clock className="h-8 w-8" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium opacity-90">Processing</p>
              <h3 className="mt-2 text-4xl font-bold">{stats.processingOrders}</h3>
            </div>
            <div className="rounded-full bg-white/20 p-4">
              <Package className="h-8 w-8" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium opacity-90">Delivered</p>
              <h3 className="mt-2 text-4xl font-bold">{stats.deliveredOrders}</h3>
            </div>
            <div className="rounded-full bg-white/20 p-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Sales Trends (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#8884d8" name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#82ca9d" name="Revenue ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Popular Products</CardTitle>
          <CardDescription>Top 5 best-selling products</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={popularProducts}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => entry.name}
                outerRadius={80}
                fill="#8884d8"
                dataKey="sales"
              >
                {popularProducts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Orders Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Approval ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active Orders ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No pending orders
              </CardContent>
            </Card>
          ) : (
            pendingOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Order #{order.id.slice(0, 8)}
                      </CardTitle>
                      <CardDescription>
                        Customer: {order.profiles?.full_name || "Unknown"}
                        <br />
                        Date: {new Date(order.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
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
                            Quantity: {item.quantity} × ${Number(item.price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t pt-4">
                    <p className="text-lg font-semibold">
                      Total: ${Number(order.total_price).toFixed(2)}
                    </p>
                    <Button
                      onClick={() => updateOrderStatus(order.id, "Confirmed")}
                    >
                      Approve Order
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No active orders
              </CardContent>
            </Card>
          ) : (
            activeOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Order #{order.id.slice(0, 8)}
                      </CardTitle>
                      <CardDescription>
                        Customer: {order.profiles?.full_name || "Unknown"}
                        <br />
                        Date: {new Date(order.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
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
                            Quantity: {item.quantity} × ${Number(item.price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t pt-4">
                    <p className="text-lg font-semibold">
                      Total: ${Number(order.total_price).toFixed(2)}
                    </p>
                    <Select
                      onValueChange={(value) => updateOrderStatus(order.id, value)}
                      defaultValue={order.status}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Change status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Confirmed">Confirmed</SelectItem>
                        <SelectItem value="Processing">Processing</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No completed orders
              </CardContent>
            </Card>
          ) : (
            completedOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Order #{order.id.slice(0, 8)}
                      </CardTitle>
                      <CardDescription>
                        Customer: {order.profiles?.full_name || "Unknown"}
                        <br />
                        Date: {new Date(order.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
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
                            Quantity: {item.quantity} × ${Number(item.price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-lg font-semibold border-t pt-4">
                    Total: ${Number(order.total_price).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
