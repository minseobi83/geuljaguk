-- 글감 난이도 다시 정하기 (2026-09-29)
-- schema.sql 7차분이 학년 평균으로 자동으로 채운 난이도를, 글감이 요구하는 생각의 양 기준으로
-- 다시 맞춘다 (자세한 기준은 lib/topics.ts의 SEED_DIFFICULTY 주석).
--
-- 안전장치: 아직 자동으로 채운 값(auto_value) 그대로인 글감만 바꾼다. 관리자가 글감 관리에서
-- 이미 고친 글감은 건드리지 않으며, 여러 번 실행해도 결과가 같다.
-- schema.sql 7차분을 먼저 실행한 뒤 Supabase SQL 에디터에서 한 번 실행하세요.

update public.topics t
  set difficulty = v.new_value, updated_at = now()
  from (values
  ('pet-day', '보통', '기초'),
  ('leftover-food', '도전', '기초'),
  ('phone-to-school', '기초', '도전'),
  ('phone-time', '보통', '도전'),
  ('way-to-school', '보통', '기초'),
  ('favorite-game-rule', '도전', '기초'),
  ('recycling', '기초', '도전'),
  ('what-is-ai', '보통', '도전'),
  ('memorable-scene', '기초', '보통'),
  ('book-recommend', '보통', '기초'),
  ('like-me-character', '도전', '기초'),
  ('character-choice', '보통', '도전'),
  ('grateful', '기초', '보통'),
  ('proud-moment', '보통', '기초'),
  ('home-vs-school-meal', '보통', '기초'),
  ('pet-compare', '도전', '기초'),
  ('youtube-vs-book', '기초', '도전'),
  ('online-vs-offline-class', '보통', '도전'),
  ('classroom-noise', '보통', '기초'),
  ('friend-conflict', '도전', '보통'),
  ('leftover-food-solution', '기초', '도전'),
  ('street-trash', '보통', '도전'),
  ('one-day-adult', '보통', '기초'),
  ('animal-talks', '도전', '기초'),
  ('future-school', '기초', '도전'),
  ('time-machine', '보통', '도전')
  ) as v(id, new_value, auto_value)
  where t.id = v.id and t.difficulty = v.auto_value;
