-- 002_course_image.sql
-- Adds optional course cover image URL / data URI storage for Learn courses.

ALTER TABLE courses ADD COLUMN image_url TEXT DEFAULT '';
