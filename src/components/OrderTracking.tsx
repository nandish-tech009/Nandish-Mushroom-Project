import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, Clock, Package, Home, Search, CalendarIcon, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  order_items?: OrderItem[];
  cancellation_reason?: string | null;
};

type OrderTrackingProps = {
  orders: Order[];
  onOrderUpdate?: () => void;
};

const trackingStages = [
  { status: "Pending Approval", label: "Order Placed", icon: Clock, description: "Waiting for approval" },
  { status: "Confirmed", label: "Confirmed", icon: Check, description: "Order confirmed by admin" },
  { status: "Processing", label: "Processing", icon: Package, description: "Order is being prepared" },
  { status: "Delivered", label: "Delivered", icon: Home, description: "Order delivered" },
];

const getStageIndex = (status: string): number => {
  if (status === "Cancelled") return -1;
  const index = trackingStages.findIndex((s) => s.status === status);
  return index === -1 ? 0 : index;
};

const getEstimatedDelivery = (createdAt: string, status: string): string => {
  if (status === "Cancelled") return "Cancelled";
  
  const orderDate = new Date(createdAt);
  let daysToAdd = 0;

  switch (status) {
    case "Pending Approval":
      daysToAdd = 5;
      break;
    case "Confirmed":
      daysToAdd = 4;
      break;
    case "Processing":
      daysToAdd = 2;
      break;
    case "Delivered":
      return "Delivered";
    default:
      daysToAdd = 5;
  }

  const estimatedDate = new Date(orderDate);
  estimatedDate.setDate(estimatedDate.getDate() + daysToAdd);
  return estimatedDate.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const OrderTrackingCard = ({ 
  order, 
  onCancelOrder 
}: { 
  order: Order; 
  onCancelOrder: (orderId: string) => void;
}) => {
  const isCancelled = order.status === "Cancelled";
  const currentStageIndex = getStageIndex(order.status);
  const estimatedDelivery = getEstimatedDelivery(order.created_at, order.status);

  return (
    <Card className="border-none shadow-md">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Placed on {new Date(order.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm text-muted-foreground">
              {isCancelled ? "Status" : "Estimated Delivery"}
            </p>
            <p className={cn("font-semibold", isCancelled ? "text-destructive" : "text-primary")}>
              {isCancelled ? (
                <span className="text-destructive">Cancelled ✕</span>
              ) : order.status === "Delivered" ? (
                <span className="text-green-600">Delivered ✓</span>
              ) : (
                estimatedDelivery
              )}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="relative mb-8">
          {isCancelled ? (
            // Cancelled order - show red line with cancelled state
            <>
              <div className="absolute left-0 top-4 h-1 w-full bg-muted rounded-full">
                <div className="h-full bg-destructive rounded-full w-full" />
              </div>
              <div className="relative flex justify-between">
                {trackingStages.map((stage, index) => {
                  const Icon = index === 0 ? XCircle : stage.icon;
                  return (
                    <div key={stage.status} className="flex flex-col items-center">
                      <div
                        className={cn(
                          "relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
                          index === 0
                            ? "border-destructive bg-destructive text-destructive-foreground"
                            : "border-muted-foreground/30 bg-background text-muted-foreground/50"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="mt-3 text-center">
                        <p className={cn(
                          "text-xs font-medium",
                          index === 0 ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {index === 0 ? "Cancelled" : stage.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground hidden sm:block">
                          {index === 0 ? "Order was cancelled" : stage.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            // Normal order progress
            <>
              <div className="absolute left-0 top-4 h-1 w-full bg-muted rounded-full">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{
                    width: `${((currentStageIndex + 1) / trackingStages.length) * 100}%`,
                  }}
                />
              </div>

              {/* Stage Icons */}
              <div className="relative flex justify-between">
                {trackingStages.map((stage, index) => {
                  const isCompleted = index <= currentStageIndex;
                  const isCurrent = index === currentStageIndex;
                  const Icon = stage.icon;

                  return (
                    <div key={stage.status} className="flex flex-col items-center">
                      <div
                        className={cn(
                          "relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all",
                          isCompleted
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30 bg-background text-muted-foreground/50",
                          isCurrent && "ring-4 ring-primary/20"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="mt-3 text-center">
                        <p
                          className={cn(
                            "text-xs font-medium",
                            isCompleted ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {stage.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground hidden sm:block">
                          {stage.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Current Status */}
        <div className={cn(
          "rounded-lg p-4",
          isCancelled ? "bg-destructive/10" : "bg-muted/50"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              isCancelled ? "bg-destructive/20" : "bg-primary/10"
            )}>
              {isCancelled ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : (
                (() => {
                  const CurrentIcon = trackingStages[currentStageIndex]?.icon || Clock;
                  return <CurrentIcon className="h-5 w-5 text-primary" />;
                })()
              )}
            </div>
            <div>
              <p className={cn("font-medium", isCancelled && "text-destructive")}>
                {isCancelled ? "Order Cancelled" : trackingStages[currentStageIndex]?.label || "Processing"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isCancelled 
                  ? (order.cancellation_reason || "This order has been cancelled")
                  : trackingStages[currentStageIndex]?.description || "Your order is being processed"
                }
              </p>
            </div>
          </div>
        </div>

        {/* Order Amount */}
        <div className="mt-4 flex justify-between items-center pt-4 border-t">
          <span className="text-muted-foreground">Order Total</span>
          <span className={cn("font-semibold text-lg", isCancelled && "line-through text-muted-foreground")}>
            ₹{Number(order.total_price).toFixed(2)}
          </span>
        </div>

        {/* Cancel Button - only for Pending Approval orders */}
        {order.status === "Pending Approval" && (
          <div className="mt-4 pt-4 border-t">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => onCancelOrder(order.id)}
              className="w-full sm:w-auto"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Order
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const OrderTracking = ({ orders, onOrderUpdate }: OrderTrackingProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  
  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchedOrder(null);
      setNotFound(false);
      return;
    }

    const found = orders.find(
      (order) => order.id.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    if (found) {
      setSearchedOrder(found);
      setNotFound(false);
    } else {
      setSearchedOrder(null);
      setNotFound(true);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const dateStr = format(date, "yyyy-MM-dd");
      const found = orders.find((order) => {
        const orderDate = format(new Date(order.created_at), "yyyy-MM-dd");
        return orderDate === dateStr;
      });

      if (found) {
        setSearchedOrder(found);
        setNotFound(false);
        setSearchQuery(found.id.slice(0, 8));
      } else {
        setSearchedOrder(null);
        setNotFound(true);
      }
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSelectedDate(undefined);
    setSearchedOrder(null);
    setNotFound(false);
  };

  const handleCancelOrder = (orderId: string) => {
    setCancellingOrderId(orderId);
    setCancellationReason("");
    setCancelDialogOpen(true);
  };

  const confirmCancelOrder = async () => {
    if (!cancellingOrderId || !cancellationReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          status: "Cancelled",
          cancellation_reason: cancellationReason.trim()
        })
        .eq("id", cancellingOrderId);

      if (error) throw error;

      toast.success("Order cancelled successfully");
      setCancelDialogOpen(false);
      setCancellingOrderId(null);
      setCancellationReason("");
      
      // Refresh orders
      if (onOrderUpdate) {
        onOrderUpdate();
      }
      
      // Clear searched order if it was the cancelled one
      if (searchedOrder?.id === cancellingOrderId) {
        setSearchedOrder(null);
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("Failed to cancel order");
    } finally {
      setIsCancelling(false);
    }
  };

  // Get dates with orders for calendar highlighting
  const orderDates = orders.map((order) => new Date(order.created_at));

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Track Your Order</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter Order ID (e.g., a1b2c3d4)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PP") : "Select Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className="p-3 pointer-events-auto"
                  modifiers={{
                    hasOrder: orderDates,
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

            <Button onClick={handleSearch} className="w-full sm:w-auto">
              <Search className="mr-2 h-4 w-4" />
              Track Order
            </Button>

            {(searchQuery || selectedDate) && (
              <Button variant="ghost" size="icon" onClick={clearSearch}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-3">
            Search by order ID or select a date from the calendar to track your order.
          </p>
        </CardContent>
      </Card>

      {/* Results Section */}
      {notFound && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive">No order found with the provided ID or date.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please check your order ID and try again.
            </p>
          </CardContent>
        </Card>
      )}

      {searchedOrder && (
        <OrderTrackingCard 
          order={searchedOrder} 
          onCancelOrder={handleCancelOrder}
        />
      )}

      {/* Show all orders if no search */}
      {!searchQuery && !selectedDate && !searchedOrder && orders.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You have {orders.length} order(s). Use the search above to track a specific order.
          </p>
          <div className="grid gap-4 max-h-[400px] overflow-y-auto">
            {orders.slice(0, 3).map((order) => (
              <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
                setSearchQuery(order.id.slice(0, 8));
                setSearchedOrder(order);
              }}>
                <CardContent className="pt-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-medium",
                      order.status === "Delivered" ? "text-green-600" : 
                      order.status === "Cancelled" ? "text-destructive" : "text-primary"
                    )}>
                      {order.status}
                    </p>
                    <p className="text-sm text-muted-foreground">₹{Number(order.total_price).toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {orders.length > 3 && (
              <p className="text-center text-sm text-muted-foreground">
                +{orders.length - 3} more orders. Use search to find specific orders.
              </p>
            )}
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No orders to track yet.
          </CardContent>
        </Card>
      )}

      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this order. This helps us improve our service.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter reason for cancellation (e.g., Changed my mind, Found a better price, etc.)"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCancelDialogOpen(false)}
              disabled={isCancelling}
            >
              Keep Order
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmCancelOrder}
              disabled={isCancelling || !cancellationReason.trim()}
            >
              {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
