-- =====================================================================
-- RUN THIS ONCE if you had ALREADY saved content from the admin before this update.
-- (Supabase > SQL Editor > New query > paste > Run.  Safe to run twice.)
--
-- Why: once you save from the admin, your saved lists (courses, etc.) replace the
-- built-in defaults, so new defaults do not appear on their own. This adds:
--   1) the X-Ray Welding course (only if it is not already there)
--   2) the new hero title
--   3) the "Designed & Developed by GROWFERRY INDIA" footer credit
-- Everything else you edited stays exactly as it is.
-- =====================================================================
update public.site_content
set data =
  jsonb_set(
    jsonb_set(
      case
        when exists (select 1 from jsonb_array_elements(coalesce(data->'courses','[]'::jsonb)) c where c->>'title' ilike 'X-Ray Welding%')
        then data
        else jsonb_set(data, '{courses}', coalesce(data->'courses','[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'title','X-Ray Welding (TIG / MIG / ARC)',
          'category','Welding',
          'short','Hands-on TIG, MIG and ARC welding training with X-ray (radiographic) weld inspection for industry-ready welders.',
          'duration','',
          'eligibility','',
          'image','assets/img/course-xray-welding.webp',
          'modules', jsonb_build_array('TIG (GTAW) Welding','MIG (GMAW) Welding','ARC (SMAW) Welding','X-Ray (Radiographic) Weld Inspection','Weld Defects and Quality Standards','Welding Safety and Workshop Practice')
        )), true)
      end,
      '{home,hero,title}', to_jsonb('Best *Professional Course* Institute in Kerala'::text), true),
    '{footer,credit}', to_jsonb('Designed & Developed by GROWFERRY INDIA'::text), true)
where id = 1 and data <> '{}'::jsonb;
