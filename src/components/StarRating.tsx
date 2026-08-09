import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

export const StarRating = ({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onRatingChange,
}: StarRatingProps) => {
  const sizeMap = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div className="flex gap-1">
      {Array.from({ length: maxRating }).map((_, i) => {
        const starRating = i + 1;
        const isFilled = starRating <= Math.round(rating);
        const isHalf = starRating - 0.5 === Math.round(rating * 2) / 2;

        return (
          <button
            key={i}
            disabled={!interactive}
            onClick={() => interactive && onRatingChange?.(starRating)}
            className={cn(
              sizeMap[size],
              "cursor-pointer transition-all hover:scale-110",
              interactive && "hover:opacity-80"
            )}
          >
            <Star
              className={cn(
                "w-full h-full",
                isFilled
                  ? "fill-yellow-400 text-yellow-400"
                  : isHalf
                    ? "fill-yellow-200 text-yellow-400"
                    : "text-gray-300"
              )}
            />
          </button>
        );
      })}
    </div>
  );
};
