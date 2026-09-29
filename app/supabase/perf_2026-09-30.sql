-- 성능 개선 패치 (2026-09-30)
-- 이미 만들어진 DB에 한 번 실행한다. 여러 번 실행해도 안전하다(색인은 if not exists,
-- 정책은 지우고 같은 내용으로 다시 만든다). schema.sql에도 같은 내용이 반영돼 있다.
--
-- 1) 색인 3개 추가
-- 2) 권한 규칙(RLS 정책) 34개의 auth.uid()를 (select auth.uid())로 감싸기
--    : 그냥 auth.uid()라고 쓰면 조회하는 행마다 다시 계산하지만, (select ...)로 감싸면 조회 한 번에
--      한 번만 계산한다. 규칙의 내용(누가 무엇을 볼 수 있는지)은 그대로다. Supabase 공식 권장 방식.

-- 자주 찾는 연결 칸에 색인이 없어서, 데이터가 쌓일수록 조회가 전체 훑기로 느려진다.
-- (Postgres는 외래키 칸에 색인을 자동으로 만들지 않는다.)
create index if not exists essays_child_created_idx on public.essays (child_id, created_at desc);
create index if not exists evaluations_essay_version_idx on public.evaluations (essay_version_id);
create index if not exists children_parent_idx on public.children (parent_id);

-- 권한 규칙 다시 만들기 (한 트랜잭션으로 묶어, 중간에 규칙이 비는 순간이 없게 한다)
begin;

drop policy if exists "parents_own_row" on public.parents;
create policy "parents_own_row" on public.parents
  for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "children_own_rows" on public.children;
create policy "children_own_rows" on public.children
  for all using ((select auth.uid()) = parent_id) with check ((select auth.uid()) = parent_id);

drop policy if exists "essays_own_rows" on public.essays;
create policy "essays_own_rows" on public.essays
  for all using (
    exists (
      select 1 from public.children c
      where c.id = essays.child_id and c.parent_id = (select auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.children c
      where c.id = essays.child_id and c.parent_id = (select auth.uid())
    )
  );

drop policy if exists "essay_versions_own_rows" on public.essay_versions;
create policy "essay_versions_own_rows" on public.essay_versions
  for all using (
    exists (
      select 1 from public.essays e
      join public.children c on c.id = e.child_id
      where e.id = essay_versions.essay_id and c.parent_id = (select auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.essays e
      join public.children c on c.id = e.child_id
      where e.id = essay_versions.essay_id and c.parent_id = (select auth.uid())
    )
  );

drop policy if exists "evaluations_own_rows" on public.evaluations;
create policy "evaluations_own_rows" on public.evaluations
  for all using (
    exists (
      select 1 from public.essay_versions v
      join public.essays e on e.id = v.essay_id
      join public.children c on c.id = e.child_id
      where v.id = evaluations.essay_version_id and c.parent_id = (select auth.uid())
    )
  ) with check (
    exists (
      select 1 from public.essay_versions v
      join public.essays e on e.id = v.essay_id
      join public.children c on c.id = e.child_id
      where v.id = evaluations.essay_version_id and c.parent_id = (select auth.uid())
    )
  );

drop policy if exists "admins_read_own_membership" on public.admins;
create policy "admins_read_own_membership" on public.admins
  for select using ((select auth.uid()) = id);

drop policy if exists "admins_read_all_parents" on public.parents;
create policy "admins_read_all_parents" on public.parents
  for select using (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "admins_read_all_children" on public.children;
create policy "admins_read_all_children" on public.children
  for select using (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "admins_read_all_essays" on public.essays;
create policy "admins_read_all_essays" on public.essays
  for select using (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "admins_read_all_essay_versions" on public.essay_versions;
create policy "admins_read_all_essay_versions" on public.essay_versions
  for select using (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "admins_read_all_evaluations" on public.evaluations;
create policy "admins_read_all_evaluations" on public.evaluations
  for select using (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "topics_read" on public.topics;
create policy "topics_read" on public.topics
  for select using (
    is_active or exists (select 1 from public.admins where admins.id = (select auth.uid()))
  );

drop policy if exists "topics_admin_insert" on public.topics;
create policy "topics_admin_insert" on public.topics
  for insert with check (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "topics_admin_update" on public.topics;
create policy "topics_admin_update" on public.topics
  for update using (exists (select 1 from public.admins where admins.id = (select auth.uid())))
  with check (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "topics_admin_delete" on public.topics;
create policy "topics_admin_delete" on public.topics
  for delete using (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "prompt_versions_read" on public.prompt_versions;
create policy "prompt_versions_read" on public.prompt_versions
  for select using (
    is_active or exists (select 1 from public.admins where admins.id = (select auth.uid()))
  );

drop policy if exists "prompt_versions_admin_insert" on public.prompt_versions;
create policy "prompt_versions_admin_insert" on public.prompt_versions
  for insert with check (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "prompt_versions_admin_update" on public.prompt_versions;
create policy "prompt_versions_admin_update" on public.prompt_versions
  for update using (exists (select 1 from public.admins where admins.id = (select auth.uid())))
  with check (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "prompt_versions_admin_delete" on public.prompt_versions;
create policy "prompt_versions_admin_delete" on public.prompt_versions
  for delete using (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "evaluation_reviews_admin_select" on public.evaluation_reviews;
create policy "evaluation_reviews_admin_select" on public.evaluation_reviews
  for select using (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "evaluation_reviews_admin_insert" on public.evaluation_reviews;
create policy "evaluation_reviews_admin_insert" on public.evaluation_reviews
  for insert with check (
    reviewer_id = (select auth.uid())
    and exists (select 1 from public.admins where admins.id = (select auth.uid()))
  );

drop policy if exists "evaluation_reviews_admin_update" on public.evaluation_reviews;
create policy "evaluation_reviews_admin_update" on public.evaluation_reviews
  for update using (
    reviewer_id = (select auth.uid())
    and exists (select 1 from public.admins where admins.id = (select auth.uid()))
  )
  with check (reviewer_id = (select auth.uid()));

drop policy if exists "app_errors_insert_own" on public.app_errors;
create policy "app_errors_insert_own" on public.app_errors
  for insert with check (user_id = (select auth.uid()));

drop policy if exists "app_errors_admin_select" on public.app_errors;
create policy "app_errors_admin_select" on public.app_errors
  for select using (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "app_errors_admin_update" on public.app_errors;
create policy "app_errors_admin_update" on public.app_errors
  for update using (exists (select 1 from public.admins where admins.id = (select auth.uid())))
  with check (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "content_flag_actions_admin_select" on public.content_flag_actions;
create policy "content_flag_actions_admin_select" on public.content_flag_actions
  for select using (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "content_flag_actions_admin_insert" on public.content_flag_actions;
create policy "content_flag_actions_admin_insert" on public.content_flag_actions
  for insert with check (
    actor_id = (select auth.uid())
    and exists (select 1 from public.admins where admins.id = (select auth.uid()))
  );

drop policy if exists "admins_update_children" on public.children;
create policy "admins_update_children" on public.children
  for update using (exists (select 1 from public.admins where admins.id = (select auth.uid())))
  with check (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "admins_delete_children" on public.children;
create policy "admins_delete_children" on public.children
  for delete using (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "admins_delete_essays" on public.essays;
create policy "admins_delete_essays" on public.essays
  for delete using (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "admin_audit_log_admin_select" on public.admin_audit_log;
create policy "admin_audit_log_admin_select" on public.admin_audit_log
  for select using (exists (select 1 from public.admins where admins.id = (select auth.uid())));

drop policy if exists "admin_audit_log_admin_insert" on public.admin_audit_log;
create policy "admin_audit_log_admin_insert" on public.admin_audit_log
  for insert with check (
    actor_id = (select auth.uid())
    and exists (select 1 from public.admins where admins.id = (select auth.uid()))
  );

drop policy if exists "api_calls_insert_own" on public.api_calls;
create policy "api_calls_insert_own" on public.api_calls
  for insert with check (user_id = (select auth.uid()));

drop policy if exists "api_calls_admin_select" on public.api_calls;
create policy "api_calls_admin_select" on public.api_calls
  for select using (exists (select 1 from public.admins where admins.id = (select auth.uid())));

commit;
