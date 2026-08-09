import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/integrations/supabase/hooks/useAuth";
import { toast } from "sonner";
import { ShoppingCart, X } from "lucide-react";
import { AverageRating } from "@/components/AverageRating";
import { ReviewSubmission } from "@/components/ReviewSubmission";
import { ReviewsDisplay } from "@/components/ReviewsDisplay";
import { WishlistButton } from "@/components/WishlistButton";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  image_url: string | null;
  average_rating: number;
  review_count: number;
};

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [userHasOrdered, setUserHasOrdered] = useState(false);
  const { addToCart } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct && user) {
      checkUserOrder();
    }
  }, [selectedProduct, user]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Failed to load products");
      console.error(error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const checkUserOrder = async () => {
    if (!user || !selectedProduct) return;

    const { data } = await supabase
      .from("order_items")
      .select("oi:order_id(status)")
      .eq("product_id", selectedProduct.id)
      .eq("order_id.user_id", user.id)
      .eq("order_id.status", "Delivered")
      .limit(1);

    setUserHasOrdered((data?.length ?? 0) > 0);
  };

  const handleAddToCart = (product: Product) => {
    if (!user) {
      toast.error("Please login to add items to cart");
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      unit: product.unit,
      image_url: product.image_url || undefined,
    });
    toast.success(`${product.name} added to cart!`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading products...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-4xl font-bold">Our Products</h1>
        
        {products.length === 0 ? (
          <div className="text-center text-muted-foreground">
            No products available at the moment.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <Card key={product.id} className="flex flex-col transition-shadow hover:shadow-lg">
                <CardHeader>
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="mb-4 h-48 w-full rounded-md object-cover"
                    />
                  )}
                  <CardTitle>{product.name}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                  <div className="mt-2">
                    <AverageRating 
                      rating={product.average_rating || 0} 
                      reviewCount={product.review_count || 0}
                      size="sm"
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-2xl font-bold text-primary">
                    ₹{Number(product.price).toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}/ {product.unit}
                    </span>
                  </p>
                </CardContent>
                <CardFooter className="flex gap-1 flex-wrap">
                  <Button 
                    className="flex-1 min-w-[100px]" 
                    onClick={() => handleAddToCart(product)}
                    disabled={!user}
                    size="sm"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to Cart
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 min-w-[100px]"
                    onClick={() => setSelectedProduct(product)}
                    size="sm"
                  >
                    View Reviews
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-9 w-9"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <WishlistButton productId={product.id} size="sm" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-start justify-between sticky top-0 bg-background border-b">
              <div>
                <CardTitle>{selectedProduct.name}</CardTitle>
                <div className="mt-2">
                  <AverageRating 
                    rating={selectedProduct.average_rating || 0} 
                    reviewCount={selectedProduct.review_count || 0}
                  />
                </div>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {selectedProduct.image_url && (
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
              )}

              <div>
                <p className="text-muted-foreground">{selectedProduct.description}</p>
                <p className="text-2xl font-bold text-primary mt-4">
                  ₹{Number(selectedProduct.price).toFixed(2)} / {selectedProduct.unit}
                </p>
              </div>

              {user && (
                <ReviewSubmission 
                  productId={selectedProduct.id}
                  productName={selectedProduct.name}
                  userHasOrdered={userHasOrdered}
                  onReviewSubmitted={() => {
                    fetchProducts();
                    checkUserOrder();
                  }}
                />
              )}

              <ReviewsDisplay
                productId={selectedProduct.id}
                currentUserId={user?.id}
                isAdmin={false}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Products;