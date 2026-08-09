import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { DeliveryAddressModal } from "@/components/DeliveryAddressModal";
import { PaymentModal } from "@/components/PaymentModal";

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, clearCart, totalPrice } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState<{
    street_address: string;
    city: string;
    pincode: string;
  } | null>(null);

  const handleCheckoutClick = () => {
    if (!user) {
      toast.error("Please sign in to checkout");
      navigate("/auth");
      return;
    }

    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // Open delivery address modal
    setShowAddressModal(true);
  };

  const handleAddressConfirm = (address: { street_address: string; city: string; pincode: string }) => {
    // Save address and open payment modal
    setDeliveryAddress(address);
    setShowAddressModal(false);
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = async (utrNumber: string) => {
    if (!user || !deliveryAddress) return;

    setLoading(true);

    try {
      // Create order with UTR number
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          status: "Pending Approval",
          total_price: totalPrice,
          utr_number: utrNumber,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success("Order placed successfully! Awaiting admin approval.");
      setShowPaymentModal(false);
      clearCart();
      navigate("/dashboard");
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="mb-2 text-2xl font-bold">Your cart is empty</h2>
            <p className="mb-6 text-muted-foreground">
              Add some delicious mushrooms to get started!
            </p>
            <Button onClick={() => navigate("/products")}>
              Browse Products
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-4xl font-bold">Shopping Cart</h1>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {cart.map((item) => (
                <Card key={item.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-20 w-20 rounded-md object-cover"
                      />
                    )}
                    <div className="flex-grow">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        ₹{item.price.toFixed(2)} / {item.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-12 text-center">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">₹{totalPrice.toFixed(2)}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>₹{totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckoutClick}
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Checkout"}
                </Button>

                {user && (
                  <>
                    <DeliveryAddressModal
                      open={showAddressModal}
                      onOpenChange={setShowAddressModal}
                      userId={user.id}
                      onConfirm={handleAddressConfirm}
                    />
                    <PaymentModal
                      open={showPaymentModal}
                      onOpenChange={setShowPaymentModal}
                      totalAmount={totalPrice}
                      onConfirmPayment={handlePaymentConfirm}
                      loading={loading}
                    />
                  </>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/products")}
                >
                  Continue Shopping
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
