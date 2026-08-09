import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  productId: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  onWishlistChange?: (isWishlisted: boolean) => void;
}

export const WishlistButton = ({
  productId,
  size = "md",
  showLabel = false,
  onWishlistChange,
}: WishlistButtonProps) => {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkWishlistStatus();
  }, [productId]);

  const checkWishlistStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsWishlisted(false);
        return;
      }

      const { data } = await supabase
        .from("wishlists")
        .select("id")
        .eq("product_id", productId)
        .eq("user_id", user.id)
        .limit(1);

      setIsWishlisted((data?.length ?? 0) > 0);
    } catch (error) {
      console.error(error);
    }
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please login to add to wishlist");
        return;
      }

      setLoading(true);

      if (isWishlisted) {
        // Remove from wishlist
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("product_id", productId)
          .eq("user_id", user.id);

        if (error) {
          toast.error("Failed to remove from wishlist");
        } else {
          toast.success("Removed from wishlist");
          setIsWishlisted(false);
          onWishlistChange?.(false);
        }
      } else {
        // Add to wishlist
        const { error } = await supabase.from("wishlists").insert([
          {
            product_id: productId,
            user_id: user.id,
          },
        ]);

        if (error) {
          if (error.message.includes("duplicate key")) {
            setIsWishlisted(true);
          } else {
            toast.error("Failed to add to wishlist");
          }
        } else {
          toast.success("Added to wishlist");
          setIsWishlisted(true);
          onWishlistChange?.(true);
        }
      }
    } catch (error) {
      toast.error("An error occurred");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const sizeMap = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <button
      onClick={handleWishlistToggle}
      disabled={loading}
      className={cn(
        "transition-all hover:scale-110 flex items-center gap-2",
        isWishlisted && "text-red-500"
      )}
      title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart
        className={cn(
          sizeMap[size],
          isWishlisted && "fill-current"
        )}
      />
      {showLabel && (
        <span className="text-sm font-medium">
          {isWishlisted ? "Wishlisted" : "Wishlist"}
        </span>
      )}
    </button>
  );
};
