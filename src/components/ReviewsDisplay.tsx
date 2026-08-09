import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { StarRating } from "./StarRating";
import { toast } from "sonner";
import { Trash2, ThumbsUp } from "lucide-react";

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string;
  comment: string;
  helpful_count: number;
  is_verified_purchase: boolean;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface ReviewsDisplayProps {
  productId: string;
  currentUserId?: string;
  isAdmin?: boolean;
}

export const ReviewsDisplay = ({
  productId,
  currentUserId,
  isAdmin = false,
}: ReviewsDisplayProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"recent" | "helpful" | "rating">(
    "recent"
  );

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          id,
          product_id,
          user_id,
          rating,
          title,
          comment,
          helpful_count,
          is_verified_purchase,
          created_at
        `
        )
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to load reviews");
        console.error(error);
      } else if (data) {
        // Fetch user profiles separately
        const userIds = data.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);

        const profileMap: Record<string, string> = {};
        profiles?.forEach(p => {
          profileMap[p.user_id] = p.full_name;
        });

        const reviewsWithProfiles = data.map(review => ({
          ...review,
          profiles: { full_name: profileMap[review.user_id] || "Anonymous" }
        }));

        setReviews(reviewsWithProfiles as Review[]);
      }
    } catch (error) {
      toast.error("An error occurred while loading reviews");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);

      if (error) {
        toast.error("Failed to delete review");
      } else {
        toast.success("Review deleted successfully");
        setReviews(reviews.filter((r) => r.id !== reviewId));
      }
    } catch (error) {
      toast.error("An error occurred while deleting the review");
      console.error(error);
    }
  };

  const handleMarkHelpful = async (reviewId: string, currentHelpfulCount: number) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .update({ helpful_count: currentHelpfulCount + 1 })
        .eq("id", reviewId);

      if (error) {
        toast.error("Failed to update helpful count");
      } else {
        setReviews(
          reviews.map((r) =>
            r.id === reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r
          )
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === "helpful") return b.helpful_count - a.helpful_count;
    if (sortBy === "rating") return b.rating - a.rating;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (loading) {
    return <div className="text-center py-8">Loading reviews...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Customer Reviews ({reviews.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-muted-foreground">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent cursor-pointer"
            >
              <option value="recent">⏰ Most Recent</option>
              <option value="helpful">👍 Most Helpful</option>
              <option value="rating">⭐ Highest Rating</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No reviews yet. Be the first to review this product!
          </p>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {sortedReviews.map((review) => (
                <div
                  key={review.id}
                  className="border-b pb-4 space-y-2 last:border-b-0"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <StarRating rating={review.rating} size="sm" />
                        <span className="font-semibold text-sm">
                          {review.profiles?.full_name || "Anonymous"}
                        </span>
                        {review.is_verified_purchase && (
                          <Badge className="bg-green-500 text-white text-xs">
                            ✓ Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {(currentUserId === review.user_id || isAdmin) && (
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="p-1 hover:bg-red-50 rounded text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="font-semibold text-sm">{review.title}</h4>

                  {/* Comment */}
                  <p className="text-sm text-muted-foreground">{review.comment}</p>

                  {/* Helpful Button */}
                  <button
                    onClick={() =>
                      handleMarkHelpful(review.id, review.helpful_count)
                    }
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-2"
                  >
                    <ThumbsUp className="w-3 h-3" />
                    Helpful ({review.helpful_count})
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
