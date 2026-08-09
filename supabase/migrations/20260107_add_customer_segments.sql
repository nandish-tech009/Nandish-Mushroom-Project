-- Create customer_segments table
CREATE TABLE IF NOT EXISTS public.customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  segment public.customer_segment NOT NULL,
  reason TEXT,
  total_spent DECIMAL(12, 2) DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  last_order_date TIMESTAMPTZ,
  days_since_last_order INTEGER,
  average_order_value DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all customer segments" ON public.customer_segments;
DROP POLICY IF EXISTS "Users can view their own segment" ON public.customer_segments;
DROP POLICY IF EXISTS "Admins can update customer segments" ON public.customer_segments;
DROP POLICY IF EXISTS "Admins can insert customer segments" ON public.customer_segments;

-- RLS Policies for customer_segments
CREATE POLICY "Admins can view all customer segments"
  ON public.customer_segments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can view their own segment"
  ON public.customer_segments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update customer segments"
  ON public.customer_segments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert customer segments"
  ON public.customer_segments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Function to calculate customer segment
CREATE OR REPLACE FUNCTION public.calculate_customer_segment(p_user_id UUID)
RETURNS public.customer_segment AS $$
DECLARE
  v_total_spent DECIMAL;
  v_total_orders INTEGER;
  v_days_since_last_order INTEGER;
  v_segment public.customer_segment;
BEGIN
  -- Get customer spending metrics
  SELECT 
    COALESCE(SUM(total_price), 0),
    COALESCE(COUNT(*), 0),
    EXTRACT(DAY FROM (NOW() - MAX(created_at)))::INTEGER
  INTO v_total_spent, v_total_orders, v_days_since_last_order
  FROM public.orders
  WHERE user_id = p_user_id AND status = 'Delivered';

  -- Determine segment based on metrics
  CASE
    -- High value: spent > 10000 or > 20 orders
    WHEN v_total_spent > 10000 OR v_total_orders > 20 THEN
      v_segment := 'high_value_customer';
    -- VIP: spent > 5000 or > 10 orders
    WHEN v_total_spent > 5000 OR v_total_orders > 10 THEN
      v_segment := 'vip_customer';
    -- At Risk: had orders but inactive for > 90 days
    WHEN v_total_orders > 0 AND v_days_since_last_order > 90 THEN
      v_segment := 'at_risk_customer';
    -- Regular: had 2-9 orders
    WHEN v_total_orders >= 2 AND v_total_orders <= 9 THEN
      v_segment := 'regular_customer';
    -- Inactive: had orders but no recent activity
    WHEN v_total_orders > 0 AND v_days_since_last_order > 30 THEN
      v_segment := 'inactive_customer';
    -- New: just signed up
    ELSE
      v_segment := 'new_customer';
  END CASE;

  RETURN v_segment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update customer segment
CREATE OR REPLACE FUNCTION public.update_customer_segment_status(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_new_segment public.customer_segment;
  v_total_spent DECIMAL;
  v_total_orders INTEGER;
  v_last_order_date TIMESTAMPTZ;
  v_days_since_last INTEGER;
  v_average_order_value DECIMAL;
  v_reason TEXT;
BEGIN
  -- Get customer metrics
  SELECT 
    COALESCE(SUM(total_price), 0),
    COALESCE(COUNT(*), 0),
    MAX(created_at),
    EXTRACT(DAY FROM (NOW() - MAX(created_at)))::INTEGER,
    COALESCE(AVG(total_price), 0)
  INTO v_total_spent, v_total_orders, v_last_order_date, v_days_since_last, v_average_order_value
  FROM public.orders
  WHERE user_id = p_user_id AND status = 'Delivered';

  -- Calculate segment
  v_new_segment := public.calculate_customer_segment(p_user_id);

  -- Determine reason
  CASE v_new_segment
    WHEN 'high_value_customer' THEN
      v_reason := 'High lifetime value: ₹' || v_total_spent || ' spent in ' || v_total_orders || ' orders';
    WHEN 'vip_customer' THEN
      v_reason := 'VIP: ₹' || v_total_spent || ' spent in ' || v_total_orders || ' orders';
    WHEN 'at_risk_customer' THEN
      v_reason := 'No orders in ' || v_days_since_last || ' days (last order: ' || v_last_order_date::DATE || ')';
    WHEN 'inactive_customer' THEN
      v_reason := 'Inactive: ' || v_days_since_last || ' days since last order';
    WHEN 'regular_customer' THEN
      v_reason := 'Regular customer: ' || v_total_orders || ' orders, avg ₹' || v_average_order_value;
    WHEN 'new_customer' THEN
      v_reason := 'New customer';
  END CASE;

  -- Insert or update customer segment
  INSERT INTO public.customer_segments (
    user_id, segment, reason, total_spent, total_orders, 
    last_order_date, days_since_last_order, average_order_value
  ) VALUES (
    p_user_id, v_new_segment, v_reason, v_total_spent, v_total_orders,
    v_last_order_date, v_days_since_last, v_average_order_value
  )
  ON CONFLICT (user_id) DO UPDATE SET
    segment = v_new_segment,
    reason = v_reason,
    total_spent = v_total_spent,
    total_orders = v_total_orders,
    last_order_date = v_last_order_date,
    days_since_last_order = v_days_since_last,
    average_order_value = v_average_order_value,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update segment when order is created/updated
CREATE OR REPLACE FUNCTION public.trigger_update_customer_segment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update segment for the user
  PERFORM public.update_customer_segment_status(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_segment_on_order_change ON public.orders;
CREATE TRIGGER update_segment_on_order_change
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trigger_update_customer_segment();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_customer_segments_segment ON public.customer_segments(segment);
CREATE INDEX IF NOT EXISTS idx_customer_segments_user_id ON public.customer_segments(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_segments_total_spent ON public.customer_segments(total_spent DESC);

-- Populate customer segments for all existing customers
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get all unique users from orders
  FOR v_user_id IN 
    SELECT DISTINCT user_id FROM public.orders WHERE user_id IS NOT NULL
  LOOP
    PERFORM public.update_customer_segment_status(v_user_id);
  END LOOP;
  
  -- Also add new users who haven't made any orders yet
  FOR v_user_id IN 
    SELECT id FROM auth.users 
    WHERE id NOT IN (SELECT DISTINCT user_id FROM public.orders WHERE user_id IS NOT NULL)
  LOOP
    PERFORM public.update_customer_segment_status(v_user_id);
  END LOOP;
END $$;
