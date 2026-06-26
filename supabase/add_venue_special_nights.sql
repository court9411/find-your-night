-- Day-specific recurring nights for curated venues (e.g. "Wednesday is
-- live blues at Revel"). Only populated where a venue has a genuinely
-- distinguishing themed night — most curated venues are just "busier on
-- weekends" like everywhere else, which isn't worth a dynamic callout.
alter table public.venues
  add column if not exists special_nights jsonb;

update public.venues set special_nights =
  '[{"day":"Thursday","note":"R&B Happy Hour"}]'::jsonb
  where place_id = 'ChIJJw7PdRyzQYgRfHTs9yVuKUc'; -- Nostalgia Wine & Jazz Lounge

update public.venues set special_nights =
  '[{"day":"Wednesday","note":"Live blues, half-off wine"},{"day":"Saturday","note":"DJ Zap"}]'::jsonb
  where place_id = 'curated-revel-urban-winery';

update public.venues set special_nights =
  '[{"day":"Thursday","note":"R&B karaoke night"},{"day":"Friday","note":"DJ night"}]'::jsonb
  where place_id = 'curated-vybez-hookah-bar-lounge';

update public.venues set special_nights =
  '[{"day":"Sunday","note":"Live music artist showcases"}]'::jsonb
  where place_id = 'curated-out-the-way-bar-grill';
