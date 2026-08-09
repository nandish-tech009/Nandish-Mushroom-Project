import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { StarRating } from "./StarRating";
import { toast } from "sonner";
import { Badge } from "./ui/badge";

interface ReviewSubmissionProps {
  productId: string;
  productName: string;
  onReviewSubmitted?: () => void;
  userHasOrdered?: boolean;
}

export const ReviewSubmission = ({
  productId,
  productName,
  onReviewSubmitted,
  userHasOrdered = false,
}: ReviewSubmissionProps) => {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a review title");
      return;
    }

    if (!comment.trim()) {
      toast.error("Please enter a review comment");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please log in to submit a review");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("reviews").insert([
        {
          product_id: productId,
          user_id: user.id,
          rating,
          title,
          comment,
        },
      ]);

      if (error) {
        if (error.message.includes("duplicate key")) {
          toast.error("You have already reviewed this product");
        } else {
          toast.error("Failed to submit review");
        }
      } else {
        toast.success("Review submitted successfully!");
        setRating(0);
        setTitle("");
        setComment("");
        onReviewSubmitted?.();
      }
    } catch (error) {
      toast.error("An error occurred while submitting your review");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Write a Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {userHasOrdered && (
          <Badge className="bg-green-500 w-fit">✓ Verified Purchase</Badge>
        )}

        {/* Rating */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Rating</label>
          <div className="flex items-center gap-2">
            <StarRating
              rating={rating}
              size="lg"
              interactive={true}
              onRatingChange={setRating}
            />
            {rating > 0 && (
              <span className="text-sm text-muted-foreground">{rating} / 5</span>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-semibold">
            Review Title
          </label>
          <Input
            id="title"
            placeholder="Summarize your review in one sentence"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground">{title.length}/100</p>
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <label htmlFor="comment" className="text-sm font-semibold">
            Your Review
          </label>
          <Textarea
            id="comment"
            placeholder="Share details about your experience with this product..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={5}
          />
          <p className="text-xs text-muted-foreground">{comment.length}/1000</p>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={loading || rating === 0 || !title.trim() || !comment.trim()}
          className="w-full"
        >
          {loading ? "Submitting..." : "Submit Review"}
        </Button>
      </CardContent>
    </Card>
  );
};
