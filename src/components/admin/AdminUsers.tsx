import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { toast } from "sonner";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { OrderReceipt } from "../OrderReceipt";

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  created_at: string;
  total_price: number;
  status: string;
  order_items?: OrderItem[];
  cancellation_reason?: string | null;
};

type UserProfile = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
  orders?: Order[];
  totalSpending?: number;
  activeOrdersCount?: number;
  cancelledOrdersCount?: number;
};

export const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Record<string, { name: string; unit: string }>>({});
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDelivered, setShowDelivered] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Reset expand states when a new customer is selected
    if (selectedUser) {
      setShowDelivered(false);
      setShowCancelled(false);
      setSearchQuery("");
      setExpandedOrderId(null);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    // First get all user IDs that have admin role
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);

    const { data: profilesData, error } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, email, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load customers");
      console.error(error);
      setLoading(false);
      return;
    }

    // Filter out admin users - only show customers
    const customerProfiles = profilesData?.filter(
      profile => !adminUserIds.has(profile.user_id)
    ) || [];

    // Fetch products for order item details
    const { data: productsData } = await supabase
      .from("products")
      .select("id, name, unit");
    
    const productsMap: Record<string, { name: string; unit: string }> = {};
    productsData?.forEach((product) => {
      productsMap[product.id] = { name: product.name, unit: product.unit };
    });
    setProducts(productsMap);

    // Fetch orders with order items for each user
    const usersWithOrders = await Promise.all(
      customerProfiles.map(async (profile) => {
        const { data: ordersData } = await supabase
          .from("orders")
          .select(`
            id, 
            created_at, 
            total_price, 
            status,
            cancellation_reason,
            order_items (
              id,
              product_id,
              quantity,
              price
            )
          `)
          .eq("user_id", profile.user_id)
          .order("created_at", { ascending: false });

        const totalSpending = ordersData?.reduce(
          (sum, order) => {
            // Only count delivered orders in total spending
            if (order.status === "Delivered") {
              return sum + Number(order.total_price);
            }
            return sum;
          },
          0
        ) || 0;

        const activeOrdersCount = ordersData?.filter(
          (order) => order.status !== "Delivered" && order.status !== "Cancelled"
        ).length || 0;

        const cancelledOrdersCount = ordersData?.filter(
          (order) => order.status === "Cancelled"
        ).length || 0;

        return {
          ...profile,
          orders: ordersData || [],
          totalSpending,
          activeOrdersCount,
          cancelledOrdersCount,
        };
      })
    );

    setUsers(usersWithOrders);
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center">Loading users...</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending Approval":
        return "bg-yellow-500";
      case "Approved":
        return "bg-blue-500";
      case "Processing":
        return "bg-purple-500";
      case "Shipped":
        return "bg-indigo-500";
      case "Delivered":
        return "bg-green-500";
      case "Cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Customer Management</h2>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Customers List - Left Side */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>All Customers</CardTitle>
              <CardDescription>{users.length} registered customers</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                  {users.map((user) => (
                    <Card
                      key={user.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedUser?.id === user.id ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="font-semibold">{user.full_name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                            <div className="text-xs text-muted-foreground">
                              Joined: {new Date(user.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {user.activeOrdersCount! > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {user.activeOrdersCount} Active
                                </Badge>
                              )}
                              {user.cancelledOrdersCount! > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {user.cancelledOrdersCount} Cancelled
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {user.orders?.length || 0} Total Orders
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-primary">
                              ₹{user.totalSpending?.toFixed(2) || "0.00"}
                            </div>
                            <div className="text-xs text-muted-foreground">spent</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Customer Details - Right Side */}
        <div className="lg:col-span-3">
          {selectedUser ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{selectedUser.full_name}'s Orders</CardTitle>
                  <CardDescription>
                    Total: {selectedUser.orders?.length || 0} orders • Active: {selectedUser.activeOrdersCount || 0} • 
                    Cancelled: {selectedUser.cancelledOrdersCount || 0} •
                    Total Spending: ₹{selectedUser.totalSpending?.toFixed(2) || "0.00"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Search Bar */}
                  <div className="mb-4">
                    <Input
                      placeholder="Search by Order ID or Product name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {/* Two Column Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Delivered Orders Column */}
                    <div>
                      <button
                        onClick={() => setShowDelivered(!showDelivered)}
                        className="flex items-center gap-2 font-semibold mb-3 text-green-700 hover:text-green-800 cursor-pointer w-full p-2 rounded hover:bg-green-50 transition-colors"
                      >
                        <span>{showDelivered ? "▼" : "▶"}</span>
                        <span>✓ Delivered Orders ({selectedUser.orders?.filter(o => o.status === "Delivered").length || 0})</span>
                      </button>
                      {showDelivered && (
                        <ScrollArea className="h-[600px] pr-4">
                          <div className="space-y-3">
                            {selectedUser.orders
                              ?.filter((order) => order.status === "Delivered")
                              .filter((order) => {
                                const searchLower = searchQuery.toLowerCase();
                                const matchesOrderId = order.id.toLowerCase().includes(searchLower);
                                const matchesProduct = order.order_items?.some((item) =>
                                  products[item.product_id]?.name.toLowerCase().includes(searchLower)
                                );
                                return matchesOrderId || matchesProduct;
                              })
                              .map((order) => (
                                <Card key={order.id} className="overflow-hidden border-green-200">
                                  <CardHeader className="bg-green-50 py-2">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <CardTitle className="text-sm">
                                          Order #{order.id.slice(0, 8)}...
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                          {new Date(order.created_at).toLocaleDateString()}
                                        </CardDescription>
                                      </div>
                                      <Badge className="bg-green-500">Delivered</Badge>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="pt-3">
                                    <div className="space-y-3">
                                      {/* Customer Details */}
                                      <div className="border-b pb-2">
                                        <p className="text-xs font-semibold text-gray-700">Customer</p>
                                        <p className="text-xs text-muted-foreground">{selectedUser.full_name}</p>
                                        <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                                      </div>

                                      {/* Products */}
                                      <div>
                                        <p className="text-xs font-semibold text-gray-700 mb-2">Products</p>
                                        <div className="space-y-1">
                                          {order.order_items?.map((item) => (
                                            <div key={item.id} className="text-xs bg-gray-50 p-2 rounded">
                                              <p className="font-medium">
                                                {products[item.product_id]?.name || "Unknown Product"}
                                              </p>
                                              <p className="text-muted-foreground">
                                                Qty: {item.quantity} {products[item.product_id]?.unit || ""} × ₹{Number(item.price).toFixed(2)}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Total Amount */}
                                      <div className="border-t pt-2">
                                        <p className="text-sm font-bold text-green-600">
                                          Total: ₹{Number(order.total_price).toFixed(2)}
                                        </p>
                                      </div>

                                      <Button 
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                        className="w-full"
                                      >
                                        {expandedOrderId === order.id ? "Hide Receipt" : "View Receipt"}
                                      </Button>
                                      {expandedOrderId === order.id && (
                                        <div className="mt-3 pt-3 border-t">
                                          <OrderReceipt 
                                            order={order}
                                            customerName={selectedUser.full_name}
                                            customerEmail={selectedUser.email}
                                            showCustomerInfo={true}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            {selectedUser.orders?.filter((order) => order.status === "Delivered").length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-8">No delivered orders</p>
                            )}
                          </div>
                        </ScrollArea>
                      )}
                    </div>

                    {/* Cancelled Orders Column */}
                    <div>
                      <button
                        onClick={() => setShowCancelled(!showCancelled)}
                        className="flex items-center gap-2 font-semibold mb-3 text-red-700 hover:text-red-800 cursor-pointer w-full p-2 rounded hover:bg-red-50 transition-colors"
                      >
                        <span>{showCancelled ? "▼" : "▶"}</span>
                        <span>✕ Cancelled Orders ({selectedUser.orders?.filter(o => o.status === "Cancelled").length || 0})</span>
                      </button>
                      {showCancelled && (
                        <ScrollArea className="h-[600px] pr-4">
                          <div className="space-y-3">
                            {selectedUser.orders
                              ?.filter((order) => order.status === "Cancelled")
                              .filter((order) => {
                                const searchLower = searchQuery.toLowerCase();
                                const matchesOrderId = order.id.toLowerCase().includes(searchLower);
                                const matchesProduct = order.order_items?.some((item) =>
                                  products[item.product_id]?.name.toLowerCase().includes(searchLower)
                                );
                                return matchesOrderId || matchesProduct;
                              })
                              .map((order) => (
                                <Card key={order.id} className="overflow-hidden border-red-200">
                                  <CardHeader className="bg-red-50 py-2">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <CardTitle className="text-sm">
                                          Order #{order.id.slice(0, 8)}...
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                          {new Date(order.created_at).toLocaleDateString()}
                                        </CardDescription>
                                      </div>
                                      <Badge variant="destructive">Cancelled</Badge>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="pt-3">
                                    <div className="space-y-3">
                                      {/* Customer Details */}
                                      <div className="border-b pb-2">
                                        <p className="text-xs font-semibold text-gray-700">Customer</p>
                                        <p className="text-xs text-muted-foreground">{selectedUser.full_name}</p>
                                        <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                                      </div>

                                      {/* Products */}
                                      <div>
                                        <p className="text-xs font-semibold text-gray-700 mb-2">Products</p>
                                        <div className="space-y-1">
                                          {order.order_items?.map((item) => (
                                            <div key={item.id} className="text-xs bg-gray-50 p-2 rounded">
                                              <p className="font-medium">
                                                {products[item.product_id]?.name || "Unknown Product"}
                                              </p>
                                              <p className="text-muted-foreground">
                                                Qty: {item.quantity} {products[item.product_id]?.unit || ""} × ₹{Number(item.price).toFixed(2)}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Total Amount */}
                                      <div className="border-t pt-2">
                                        <p className="text-sm font-bold line-through text-muted-foreground">
                                          ₹{Number(order.total_price).toFixed(2)}
                                        </p>
                                      </div>

                                      {order.cancellation_reason && (
                                        <div className="text-xs bg-red-50 p-2 rounded border border-red-200">
                                          <p className="font-semibold text-red-700">Cancellation Reason:</p>
                                          <p className="text-red-600">{order.cancellation_reason}</p>
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            {selectedUser.orders?.filter((order) => order.status === "Cancelled").length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-8">No cancelled orders</p>
                            )}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Select a customer to view their order details
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {users.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No customers found
          </CardContent>
        </Card>
      )}
    </div>
  );
};