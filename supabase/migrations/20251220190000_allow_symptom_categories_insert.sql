-- Allow authenticated users to read/insert symptom categories
ALTER TABLE public.symptom_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view symptom categories" ON public.symptom_categories;
DROP POLICY IF EXISTS "Authenticated can insert symptom categories" ON public.symptom_categories;

CREATE POLICY "Anyone can view symptom categories"
ON public.symptom_categories
FOR SELECT
USING (true);

CREATE POLICY "Authenticated can insert symptom categories"
ON public.symptom_categories
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
