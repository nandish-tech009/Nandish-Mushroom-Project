-- Create wishlists table
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wishlists
CREATE POLICY "Users can view their own wishlist"
  ON public.wishlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own wishlist"
  ON public.wishlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own wishlist"
  ON public.wishlists FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update wishlist count
CREATE OR REPLACE FUNCTION public.update_wishlist_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  -- Count wishlists for the product
  SELECT COUNT(*)
  INTO new_count
  FROM public.wishlists
  WHERE product_id = COALESCE(NEW.product_id, OLD.product_id);

  -- Update product
  UPDATE public.products
  SET wishlist_count = new_count
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update count on wishlist add/remove
CREATE TRIGGER update_wishlist_count_on_add
  AFTER INSERT ON public.wishlists
  FOR EACH ROW EXECUTE FUNCTION public.update_wishlist_count();

CREATE TRIGGER update_wishlist_count_on_remove
  AFTER DELETE ON public.wishlists
  FOR EACH ROW EXECUTE FUNCTION public.update_wishlist_count();
