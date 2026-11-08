-- =====================================================================
-- RUN THIS ONCE on the LIVE site (Supabase > SQL Editor > New query > paste > Run).
-- Needed because courses you saved from the admin replace the built-in defaults.
-- It changes only: the course list/order, the home marquee and the second phone number.
-- Everything else you edited stays as it is.  Safe to run twice.
--
--  * Removes "AI Integrated HR Administration"
--  * Course order: Oil & Gas, Focused Oil & Gas, X-Ray Quality Welding, Fire & Safety,
--                  Logistics, QA/QC Mechanical (NDT / Pipeline Engineering), Hospital Admin
--  * Renames X-Ray Welding -> X-Ray Quality Welding
--  * QA/QC Mechanical now lists NDT Level 2 and Pipeline Engineering as additional certifications
--  * Adds phone number 2: +91 86062 30535
-- =====================================================================
update public.site_content
set data = jsonb_set(jsonb_set(jsonb_set(
  data,
  '{courses}',
  (
    select coalesce(jsonb_agg(
      case
        when c->>'title' ilike 'X-Ray%Welding%' then
          jsonb_set(c, '{title}', to_jsonb('X-Ray Quality Welding (TIG/MIG/ARC)'::text))
        when c->>'title' ilike 'QA/QC Mechanical%' then
          c || jsonb_build_object(
            'title', 'QA/QC Mechanical (NDT / Pipeline Engineering)',
            'short', 'Master quality assurance and control techniques to excel in the mechanical field. Includes NDT Level 2 and Pipeline Engineering as additional certification courses.',
            'modules', jsonb_build_array(
              'QA/QC Welding Inspection',
              'QA/QC Piping Inspection',
              'Basics of Industrial Safety',
              'Additional certification: ASNT-NDT Level 2 (PT, MPT, RT, UT, RTFI, VT)',
              'Additional certification: Piping and Pipeline Engineering'))
        else c
      end
      order by
        case
          when c->>'title' ilike 'Diploma in Oil and Gas%'        then 1
          when c->>'title' ilike 'Focused Oil%'                    then 2
          when c->>'title' ilike 'X-Ray%Welding%'                  then 3
          when c->>'title' ilike 'Diploma in Fire%'                then 4
          when c->>'title' ilike '%Logistics%'                     then 5
          when c->>'title' ilike 'QA/QC Mechanical%'               then 6
          when c->>'title' ilike '%Hospital%'                      then 7
          else 8 + ord
        end
    ), '[]'::jsonb)
    from jsonb_array_elements(coalesce(data->'courses','[]'::jsonb)) with ordinality as t(c, ord)
    where c->>'title' not ilike '%HR Administration%'
  ),
  true),
  '{home,marquee}',
  (
    select coalesce(jsonb_agg(m), '[]'::jsonb)
    from jsonb_array_elements(coalesce(data#>'{home,marquee}','[]'::jsonb)) m
    where m #>> '{}' not ilike 'HR Administration%'
  ),
  true),
  '{site,phone2}', to_jsonb('+91 86062 30535'::text), true)
where id = 1 and data <> '{}'::jsonb;
