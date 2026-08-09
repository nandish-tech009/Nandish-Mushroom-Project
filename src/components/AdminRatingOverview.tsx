import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { StarRating } from "./StarRating";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";

interface RatingStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
  percentages: Record<number, number>;
}

interface AdminRatingOverviewProps {
  productId: string;
  productName: string;
}

export const AdminRatingOverview = ({
  productId,
  productName,
}: AdminRatingOverviewProps) => {
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatingStats();
  }, [productId]);

  const fetchRatingStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("rating")
        .eq("product_id", productId);

      if (error) {
        console.error(error);
      } else if (data) {
        const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let totalRating = 0;

        data.forEach((review) => {
          distribution[review.rating]++;
          totalRating += review.rating;
        });

        const averageRating = data.length > 0 ? totalRating / data.length : 0;
        const percentages: Record<number, number> = {};

        Object.keys(distribution).forEach((key) => {
          const numKey = parseInt(key);
          percentages[numKey] =
            data.length > 0 ? (distribution[numKey] / data.length) * 100 : 0;
        });

        setStats({
          averageRating,
          totalReviews: data.length,
          ratingDistribution: distribution,
          percentages,
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading ratings...</div>;
  }

  if (!stats || stats.totalReviews === 0) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6 text-center text-yellow-800">
          No reviews yet for this product
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardHeader>
        <CardTitle className="text-lg">📊 Overall Rating Analysis</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">{productName}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Average Rating Summary */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-green-200">
          <div>
            <p className="text-sm font-semibold text-gray-600">Average Rating</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {stats.averageRating.toFixed(1)} / 5
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? "s" : ""}
            </p>
          </div>
          <div>
            <StarRating rating={stats.averageRating} size="lg" />
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-3">
          <p className="font-semibold text-sm">Rating Breakdown</p>

          {[5, 4, 3, 2, 1].map((rating) => (
            <div key={rating} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 w-16">
                  <span className="text-sm font-medium">{rating}</span>
                  <span className="text-yellow-500">★</span>
                </div>
                <Progress
                  value={stats.percentages[rating] || 0}
                  className="flex-1 mx-3 h-2"
                />
                <div className="flex items-center gap-2 w-24 justify-end">
                  <span className="text-xs font-semibold">
                    {stats.ratingDistribution[rating] || 0}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {(stats.percentages[rating] || 0).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-white rounded border border-blue-200">
            <p className="text-xs text-muted-foreground">Total Reviews</p>
            <p className="text-lg font-bold text-blue-600">{stats.totalReviews}</p>
          </div>
          <div className="p-3 bg-white rounded border border-green-200">
            <p className="text-xs text-muted-foreground">Most Common</p>
            <p className="text-lg font-bold text-green-600">
              {
                [5, 4, 3, 2, 1].reduce((prev, curr) =>
                  (stats.ratingDistribution[curr] || 0) >
                  (stats.ratingDistribution[prev] || 0)
                    ? curr
                    : prev
                )
              }
              ★
            </p>
          </div>
          <div className="p-3 bg-white rounded border border-purple-200">
            <p className="text-xs text-muted-foreground">Customer Approval</p>
            <p className="text-lg font-bold text-purple-600">
              {(
                (((stats.ratingDistribution[5] || 0) +
                  (stats.ratingDistribution[4] || 0)) /
                  stats.totalReviews) *
                100
              ).toFixed(0)}
              %
            </p>
          </div>
        </div>

        {/* Insights */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs font-semibold text-blue-900">💡 Insight</p>
          <p className="text-xs text-blue-800 mt-1">
            {stats.averageRating >= 4.5
              ? "Excellent product! High customer satisfaction."
              : stats.averageRating >= 4
                ? "Good product with mostly positive feedback."
                : stats.averageRating >= 3
                  ? "Average product with mixed reviews."
                  : "Product needs improvement based on customer feedback."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
