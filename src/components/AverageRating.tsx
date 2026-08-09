import { StarRating } from "./StarRating";

interface AverageRatingProps {
  rating: number;
  reviewCount: number;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export const AverageRating = ({
  rating,
  reviewCount,
  size = "md",
  showText = true,
}: AverageRatingProps) => {
  return (
    <div className="flex items-center gap-2">
      <StarRating rating={rating} size={size} />
      {showText && (
        <div className="text-sm">
          <span className="font-semibold">{rating.toFixed(1)}</span>
          <span className="text-muted-foreground"> ({reviewCount})</span>
        </div>
      )}
    </div>
  );
};
