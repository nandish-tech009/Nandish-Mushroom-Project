import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Input } from "../ui/input";
import { Search, CalendarIcon, X, CreditCard, CheckCircle, AlertCircle, Receipt, Wallet, Percent, Ban } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { OrderReceipt } from "../OrderReceipt";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  products?: {
    name: string;
    unit: string;
    image_url: string | null;
  };
};

type Order = {
  id: string;
  user_id: string;
  status: string;
  total_price: number;
  created_at: string;
  utr_number: string | null;
  utr_verified: boolean;
  tax_percentage: number | null;
  profiles?: {
    full_name: string;
    email: string;
    phone_number: string | null;
    street_address: string | null;
    city: string | null;
    pincode: string | null;
  };
  order_items?: OrderItem[];
};

export const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<Order | null>(null);
  const [completedSearchQuery, setCompletedSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [upiId, setUpiId] = useState<string | null>(null);
  const [orderTaxSettings, setOrderTaxSettings] = useState<Record<string, { enabled: boolean; percentage: number }>>({});

  useEffect(() => {
    fetchOrders();
    fetchPaymentSettings();

    const channel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPaymentSettings = async () => {
    const { data } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", ["upi_id"]);
    
    const settings = data?.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {} as Record<string, string | null>) || {};
    
    setUpiId(settings.upi_id || null);
  };

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
            unit,
            image_url
          )
        )
      `)
      .order("created_at", { ascending: false});

    if (error) {
      toast.error("Failed to load orders");
      console.error(error);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(data?.map(o => o.user_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, phone_number, street_address, city, pincode")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    
    const ordersWithProfiles = data?.map(order => ({
      ...order,
      profiles: profileMap.get(order.user_id)
    })) || [];

    setOrders(ordersWithProfiles);
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
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
    }
  };

  const cancelOrder = async (order: Order) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "Cancelled" })
      .eq("id", order.id);

    if (error) {
      toast.error("Failed to cancel order");
      console.error(error);
      return;
    }

    toast.success("Order cancelled successfully!");
    fetchOrders();

    // Send cancellation notification email
    if (order.profiles?.email) {
      try {
        await supabase.functions.invoke("send-order-notification", {
          body: {
            customerEmail: order.profiles.email,
            customerName: order.profiles.full_name || "Customer",
            orderId: order.id,
            orderStatus: "Cancelled",
            totalPrice: Number(order.total_price),
            orderDate: order.created_at,
          },
        });
        toast.success("Cancellation notification sent to customer");
      } catch (emailError) {
        console.error("Failed to send cancellation email:", emailError);
      }
    }
  };

  const verifyUtr = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ utr_verified: true })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to verify UTR");
      console.error(error);
    } else {
      toast.success("UTR verified successfully!");
      fetchOrders();
    }
  };

  const getOrderTaxSetting = (order: Order) => {
    if (orderTaxSettings[order.id]) {
      return orderTaxSettings[order.id];
    }
    // Default: if order has tax_percentage set, use it; otherwise default to 8%
    return {
      enabled: order.tax_percentage !== null && order.tax_percentage > 0,
      percentage: order.tax_percentage ?? 8
    };
  };

  const setTaxEnabled = (orderId: string, enabled: boolean) => {
    const current = orderTaxSettings[orderId] || { enabled: true, percentage: 8 };
    setOrderTaxSettings(prev => ({
      ...prev,
      [orderId]: { ...current, enabled }
    }));
  };

  const setTaxPercentage = (orderId: string, percentage: number) => {
    const current = orderTaxSettings[orderId] || { enabled: true, percentage: 8 };
    setOrderTaxSettings(prev => ({
      ...prev,
      [orderId]: { ...current, percentage }
    }));
  };

  const calculateOrderTotal = (order: Order) => {
    const subtotal = order.order_items?.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0) || 0;
    const taxSetting = getOrderTaxSetting(order);
    const taxAmount = taxSetting.enabled ? subtotal * (taxSetting.percentage / 100) : 0;
    return { subtotal, taxAmount, total: subtotal + taxAmount, taxPercentage: taxSetting.enabled ? taxSetting.percentage : 0 };
  };

  const updateOrderWithTax = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const { subtotal, taxAmount, total, taxPercentage } = calculateOrderTotal(order);
    const taxSetting = getOrderTaxSetting(order);
    
    const { error } = await supabase
      .from("orders")
      .update({ 
        status: newStatus,
        total_price: total,
        tax_percentage: taxSetting.enabled ? taxPercentage : 0
      })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to update order");
      console.error(error);
    } else {
      toast.success("Order approved with tax applied!");
      fetchOrders();
    }
  };

  const filterOrders = (ordersList: Order[]) => {
    if (!searchQuery) return ordersList;
    
    const query = searchQuery.toLowerCase();
    return ordersList.filter((order) => 
      order.id.toLowerCase().includes(query) ||
      order.profiles?.full_name.toLowerCase().includes(query) ||
      order.profiles?.email.toLowerCase().includes(query)
    );
  };

  const filterCompletedOrders = (ordersList: Order[]) => {
    let filtered = ordersList;
    
    if (completedSearchQuery) {
      const query = completedSearchQuery.toLowerCase();
      filtered = filtered.filter((order) => 
        order.id.toLowerCase().includes(query) ||
        order.profiles?.full_name.toLowerCase().includes(query) ||
        order.profiles?.email.toLowerCase().includes(query)
      );
    }
    
    if (selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      filtered = filtered.filter((order) => {
        const orderDate = format(new Date(order.created_at), "yyyy-MM-dd");
        return orderDate === dateStr;
      });
    }
    
    return filtered;
  };

  const clearCompletedFilters = () => {
    setCompletedSearchQuery("");
    setSelectedDate(undefined);
  };

  const pendingOrders = filterOrders(orders.filter((o) => o.status === "Pending Approval"));
  const activeOrders = filterOrders(orders.filter(
    (o) => o.status === "Confirmed" || o.status === "Processing"
  ));
  const allCompletedOrders = orders.filter((o) => o.status === "Delivered");
  const completedOrders = filterCompletedOrders(allCompletedOrders);
  const completedOrderDates = allCompletedOrders.map((o) => new Date(o.created_at));

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
      case "Cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return <div className="text-center">Loading orders...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
          <CardDescription>Manage and update order statuses</CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name, email, or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
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
                        <div className="space-y-1">
                          <CardTitle className="text-base">
                            Order #{order.id.slice(0, 8)}
                          </CardTitle>
                          <CardDescription>
                            <div className="space-y-0.5">
                              <div><strong>Customer:</strong> {order.profiles?.full_name || "Unknown"}</div>
                              <div><strong>Email:</strong> {order.profiles?.email || "N/A"}</div>
                              <div><strong>Phone:</strong> {order.profiles?.phone_number || "N/A"}</div>
                              {order.profiles?.street_address && (
                                <div>
                                  <strong>Delivery Address:</strong> {order.profiles.street_address}
                                  {order.profiles.city && `, ${order.profiles.city}`}
                                  {order.profiles.pincode && ` - ${order.profiles.pincode}`}
                                </div>
                              )}
                              <div><strong>Date:</strong> {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}</div>
                            </div>
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Payment Details Section */}
                      <div className={cn(
                        "p-4 rounded-lg border space-y-3",
                        order.utr_verified 
                          ? "bg-green-500/10 border-green-500/30" 
                          : "bg-yellow-500/10 border-yellow-500/30"
                      )}>
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Payment Details
                          </h4>
                          {order.utr_verified ? (
                            <Badge className="bg-green-500 hover:bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Pending Verification
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Mode of Payment</p>
                            <p className="font-medium">UPI</p>
                          </div>
                          {upiId && (
                            <div>
                              <p className="text-xs text-muted-foreground">UPI ID</p>
                              <p className="font-mono text-sm">{upiId}</p>
                            </div>
                          )}
                          {order.utr_number && (
                            <div className="col-span-2">
                              <p className="text-xs text-muted-foreground">UTR Number</p>
                              <p className={cn("font-mono font-semibold", order.utr_verified ? "text-green-600" : "text-yellow-600")}>
                                {order.utr_number}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 pt-2 border-t border-dashed">
                          {!order.utr_verified && order.utr_number && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-yellow-500 text-yellow-600 hover:bg-yellow-500/10"
                              onClick={() => verifyUtr(order.id)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verify UTR
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedOrderForReceipt(order)}
                          >
                            <Receipt className="h-3 w-3 mr-1" />
                            View Receipt
                          </Button>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Ordered Products</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Quantity</TableHead>
                              <TableHead className="text-right">Price</TableHead>
                              <TableHead className="text-right">Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {order.order_items?.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {item.products?.image_url && (
                                      <img 
                                        src={item.products.image_url} 
                                        alt={item.products.name}
                                        className="h-10 w-10 rounded object-cover"
                                      />
                                    )}
                                    <span>{item.products?.name || "Unknown Product"}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.quantity} {item.products?.unit || "unit"}
                                </TableCell>
                                <TableCell className="text-right">
                                  ₹{Number(item.price).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  ₹{(Number(item.price) * item.quantity).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {/* Tax Settings Section */}
                      <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            Tax Settings
                          </h4>
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-muted-foreground">Add Tax:</label>
                            <input
                              type="checkbox"
                              checked={getOrderTaxSetting(order).enabled}
                              onChange={(e) => setTaxEnabled(order.id, e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </div>
                        </div>
                        
                        {getOrderTaxSetting(order).enabled && (
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-muted-foreground">Tax Percentage:</label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={getOrderTaxSetting(order).percentage}
                              onChange={(e) => setTaxPercentage(order.id, parseFloat(e.target.value) || 0)}
                              className="w-20 h-8"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        )}
                      </div>

                      {/* Order Total Breakdown */}
                      <div className="p-4 rounded-lg border bg-primary/5 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal ({order.order_items?.length || 0} items):</span>
                          <span>₹{calculateOrderTotal(order).subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Tax ({getOrderTaxSetting(order).enabled ? `${getOrderTaxSetting(order).percentage}%` : 'Free'}):
                          </span>
                          <span>₹{calculateOrderTotal(order).taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t font-bold text-lg">
                          <span>Total Amount:</span>
                          <span className="text-primary">₹{calculateOrderTotal(order).total.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <Button
                          variant="destructive"
                          onClick={() => cancelOrder(order)}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Cancel Order
                        </Button>
                        <Button
                          onClick={() => updateOrderWithTax(order.id, "Confirmed")}
                          disabled={order.utr_number && !order.utr_verified}
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
                        <div className="space-y-1">
                          <CardTitle className="text-base">
                            Order #{order.id.slice(0, 8)}
                          </CardTitle>
                          <CardDescription>
                            <div className="space-y-0.5">
                              <div><strong>Customer:</strong> {order.profiles?.full_name || "Unknown"}</div>
                              <div><strong>Email:</strong> {order.profiles?.email || "N/A"}</div>
                              <div><strong>Phone:</strong> {order.profiles?.phone_number || "N/A"}</div>
                              {order.profiles?.street_address && (
                                <div>
                                  <strong>Delivery Address:</strong> {order.profiles.street_address}
                                  {order.profiles.city && `, ${order.profiles.city}`}
                                  {order.profiles.pincode && ` - ${order.profiles.pincode}`}
                                </div>
                              )}
                              <div><strong>Date:</strong> {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}</div>
                            </div>
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Payment Details Section */}
                      <div className="p-4 rounded-lg border bg-green-500/10 border-green-500/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Payment Details
                          </h4>
                          <Badge className="bg-green-500 hover:bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Mode of Payment</p>
                            <p className="font-medium">UPI</p>
                          </div>
                          {upiId && (
                            <div>
                              <p className="text-xs text-muted-foreground">UPI ID</p>
                              <p className="font-mono text-sm">{upiId}</p>
                            </div>
                          )}
                          {order.utr_number && (
                            <div className="col-span-2">
                              <p className="text-xs text-muted-foreground">UTR Number</p>
                              <p className="font-mono font-semibold text-green-600">{order.utr_number}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Ordered Products</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Quantity</TableHead>
                              <TableHead className="text-right">Price</TableHead>
                              <TableHead className="text-right">Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {order.order_items?.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {item.products?.image_url && (
                                      <img 
                                        src={item.products.image_url} 
                                        alt={item.products.name}
                                        className="h-10 w-10 rounded object-cover"
                                      />
                                    )}
                                    <span>{item.products?.name || "Unknown Product"}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.quantity} {item.products?.unit || "unit"}
                                </TableCell>
                                <TableCell className="text-right">
                                  ₹{Number(item.price).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  ₹{(Number(item.price) * item.quantity).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <p className="text-lg font-semibold">
                          Total: ₹{Number(order.total_price).toFixed(2)}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => cancelOrder(order)}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setSelectedOrderForReceipt(order)}
                          >
                            View Receipt
                          </Button>
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
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {/* Search and Calendar Filter */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by order ID, customer name, or email..."
                        value={completedSearchQuery}
                        onChange={(e) => setCompletedSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PP") : "Filter by Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                          className="p-3 pointer-events-auto"
                          modifiers={{
                            hasOrder: completedOrderDates,
                          }}
                          modifiersStyles={{
                            hasOrder: {
                              fontWeight: "bold",
                              backgroundColor: "hsl(var(--primary) / 0.1)",
                              color: "hsl(var(--primary))",
                            },
                          }}
                        />
                      </PopoverContent>
                    </Popover>

                    {(completedSearchQuery || selectedDate) && (
                      <Button variant="ghost" size="icon" onClick={clearCompletedFilters}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Total: {allCompletedOrders.length} completed orders {completedOrders.length !== allCompletedOrders.length && `(showing ${completedOrders.length})`}
                  </p>
                </CardContent>
              </Card>

              {/* Show orders only when search or date filter is applied */}
              {!completedSearchQuery && !selectedDate ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <p className="mb-2">Search by order ID, customer name, email, or select a date to view completed orders.</p>
                    <p className="text-sm">Total completed orders: {allCompletedOrders.length}</p>
                  </CardContent>
                </Card>
              ) : completedOrders.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No orders found matching your filters
                  </CardContent>
                </Card>
              ) : (
                completedOrders.map((order) => (
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base">
                            Order #{order.id.slice(0, 8)}
                          </CardTitle>
                          <CardDescription>
                            <div className="space-y-0.5">
                              <div><strong>Customer:</strong> {order.profiles?.full_name || "Unknown"}</div>
                              <div><strong>Email:</strong> {order.profiles?.email || "N/A"}</div>
                              <div><strong>Phone:</strong> {order.profiles?.phone_number || "N/A"}</div>
                              {order.profiles?.street_address && (
                                <div>
                                  <strong>Delivery Address:</strong> {order.profiles.street_address}
                                  {order.profiles.city && `, ${order.profiles.city}`}
                                  {order.profiles.pincode && ` - ${order.profiles.pincode}`}
                                </div>
                              )}
                              <div><strong>Date:</strong> {new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}</div>
                            </div>
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Payment Details Section */}
                      <div className="p-4 rounded-lg border bg-green-500/10 border-green-500/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Payment Details
                          </h4>
                          <Badge className="bg-green-500 hover:bg-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Mode of Payment</p>
                            <p className="font-medium">UPI</p>
                          </div>
                          {upiId && (
                            <div>
                              <p className="text-xs text-muted-foreground">UPI ID</p>
                              <p className="font-mono text-sm">{upiId}</p>
                            </div>
                          )}
                          {order.utr_number && (
                            <div className="col-span-2">
                              <p className="text-xs text-muted-foreground">UTR Number</p>
                              <p className="font-mono font-semibold text-green-600">{order.utr_number}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Ordered Products</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Quantity</TableHead>
                              <TableHead className="text-right">Price</TableHead>
                              <TableHead className="text-right">Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {order.order_items?.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {item.products?.image_url && (
                                      <img 
                                        src={item.products.image_url} 
                                        alt={item.products.name}
                                        className="h-10 w-10 rounded object-cover"
                                      />
                                    )}
                                    <span>{item.products?.name || "Unknown Product"}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.quantity} {item.products?.unit || "unit"}
                                </TableCell>
                                <TableCell className="text-right">
                                  ₹{Number(item.price).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  ₹{(Number(item.price) * item.quantity).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <p className="text-lg font-semibold">
                          Total: ₹{Number(order.total_price).toFixed(2)}
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedOrderForReceipt(order)}
                        >
                          View Receipt
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedOrderForReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedOrderForReceipt(null)}>
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Order Receipt</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedOrderForReceipt(null)}>
                Close
              </Button>
            </div>
            <div className="p-4">
              <OrderReceipt 
                order={selectedOrderForReceipt}
                customerName={selectedOrderForReceipt.profiles?.full_name}
                customerEmail={selectedOrderForReceipt.profiles?.email}
                customerPhone={selectedOrderForReceipt.profiles?.phone_number || undefined}
                deliveryAddress={{
                  street_address: selectedOrderForReceipt.profiles?.street_address,
                  city: selectedOrderForReceipt.profiles?.city,
                  pincode: selectedOrderForReceipt.profiles?.pincode,
                }}
                showCustomerInfo={true}
                upiId={upiId || undefined}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
