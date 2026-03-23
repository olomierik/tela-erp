
-- Make storefront order insert policy more restrictive
DROP POLICY "Anyone can place storefront orders" ON public.storefront_orders;
CREATE POLICY "Anyone can place orders on published stores"
  ON public.storefront_orders FOR INSERT TO anon
  WITH CHECK (
    online_store_id IN (SELECT id FROM public.online_stores WHERE is_published = true)
  );
