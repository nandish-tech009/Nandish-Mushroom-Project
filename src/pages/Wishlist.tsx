import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";

type Product = Database["public"]["Tables"]["products"]["Row"];

export const WishlistPage = () => {
  const [wishlistItems, setWishlistItems] = useState<
    (Product & { wishlist_id: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch wishlist items
      const { data: wishlistData, error: wishlistError } = await supabase
        .from("wishlists")
        .select("id, product_id")
        .eq("user_id", user.id);

      if (wishlistError) throw wishlistError;

      if (!wishlistData || wishlistData.length === 0) {
        setWishlistItems([]);
        setLoading(false);
        return;
      }

      // Fetch product details
      const productIds = wishlistData.map((item) => item.product_id);
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .in("id", productIds);

      if (productsError) throw productsError;

      // Map wishlist_id to products
      const itemsWithWishlistId = (productsData || []).map((product) => ({
        ...product,
        wishlist_id: wishlistData.find((w) => w.product_id === product.id)?.id || "",
      }));

      setWishlistItems(itemsWithWishlistId);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (wishlistId: string) => {
    try {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("id", wishlistId);

      if (error) throw error;

      setWishlistItems((prev) =>
        prev.filter((item) => item.wishlist_id !== wishlistId)
      );
      toast.success("Removed from wishlist");
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove from wishlist");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading wishlist...</p>
        </div>
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-12 pb-12">
            <Heart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Your Wishlist is Empty
            </h2>
            <p className="text-gray-600 mb-6">
              Start adding products to your wishlist to save them for later!
            </p>
            <Link to="/products">
              <Button className="w-full">Browse Products</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            My Wishlist
          </h1>
          <p className="text-gray-600 mt-2">
            You have {wishlistItems.length} item{wishlistItems.length !== 1 ? "s" : ""} saved
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistItems.map((product) => (
            <Card
              key={product.id}
              className="overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Product Image */}
              <div className="relative w-full h-48 bg-gray-200 overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
              </div>

              <CardContent className="p-4">
                <Link to={`/products?id=${product.id}`}>
                  <h3 className="font-semibold text-gray-900 hover:text-blue-600 truncate">
                    {product.name}
                  </h3>
                </Link>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {product.description}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-gray-900">
                      ${product.price}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-green-600">
                    In Stock
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <Button className="w-full" variant="default">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => removeFromWishlist(product.wishlist_id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
