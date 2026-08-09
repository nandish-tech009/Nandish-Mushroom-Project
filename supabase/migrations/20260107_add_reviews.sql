-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  comment TEXT,
  helpful_count INTEGER DEFAULT 0,
  is_verified_purchase BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any review"
  ON public.reviews FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to mark purchase as verified
CREATE OR REPLACE FUNCTION public.mark_review_as_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has purchased this product
  IF EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE oi.product_id = NEW.product_id
    AND o.user_id = NEW.user_id
    AND o.status = 'Delivered'
  ) THEN
    NEW.is_verified_purchase = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER verify_purchase_on_review
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.mark_review_as_verified();

-- Create trigger for reviews updated_at
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Add average_rating column to products table
ALTER TABLE public.products ADD COLUMN average_rating DECIMAL(3, 2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN review_count INTEGER DEFAULT 0;

-- Create function to update product rating
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_avg_rating DECIMAL(3, 2);
  new_review_count INTEGER;
BEGIN
  -- Calculate average rating and count
  SELECT 
    COALESCE(AVG(rating)::DECIMAL(3, 2), 0),
    COUNT(*)
  INTO new_avg_rating, new_review_count
  FROM public.reviews
  WHERE product_id = COALESCE(NEW.product_id, OLD.product_id);

  -- Update product
  UPDATE public.products
  SET average_rating = new_avg_rating,
      review_count = new_review_count
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update rating on review insert/update/delete
CREATE TRIGGER update_rating_on_review_insert
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();

CREATE TRIGGER update_rating_on_review_update
  AFTER UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();

CREATE TRIGGER update_rating_on_review_delete
  AFTER DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();
