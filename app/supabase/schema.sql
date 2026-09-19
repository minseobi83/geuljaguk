-- 글자국 DB 스키마 (PRD 10 "데이터 모델"의 축약 버전 - 이번 스프린트 범위만)
-- Supabase 대시보드 > SQL Editor > New query 에 그대로 붙여넣고 실행하세요.
--
-- 이번 스프린트 범위: 보호자 계정 + 자녀 프로필 + 에세이/버전/평가 결과 저장.
-- (관리자·글감·프롬프트버전·플래그 테이블은 관리자 콘솔을 만들 때 추가할 예정 - 지금은 만들지 않음)

create extension if not exists "pgcrypto";

-- 보호자: Supabase Auth의 auth.users를 그대로 계정으로 쓰고,
-- 서비스에서 필요한 추가 정보(개인정보보호법상 법정대리인 동의 시각)만 별도 테이블에 둔다.
create table if not exists public.parents (
  id uuid primary key references auth.users (id) on delete cascade,
  consent_given_at timestamptz, -- 보호자 동의 온보딩을 마치면 채워짐 (PRD 07/11)
  created_at timestamptz not null default now()
);

-- 회원가입 시 auth.users에 새 행이 생기면 parents에도 자동으로 한 행 만든다.
create or replace function public.handle_new_parent()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.parents (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_parent();

-- 자녀 프로필: 실명이 아니라 별명만 저장 (개인정보 최소화 원칙, PRD 11)
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents (id) on delete cascade,
  nickname text not null,
  grade_band text not null check (grade_band in ('4', '5', '6')),
  created_at timestamptz not null default now()
);

-- 에세이 한 편 (같은 글을 여러 번 고쳐 쓴 것을 하나로 묶는 단위)
create table if not exists public.essays (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  writing_type text not null,
  topic_title text, -- 학생이 고른 글감 (관리자 콘솔이 생기면 topics 테이블 참조로 바꿀 예정)
  created_at timestamptz not null default now()
);

-- 이미 위 CREATE TABLE로 처음 만드는 경우엔 topic_title이 바로 포함되지만,
-- 예전 버전으로 이미 테이블을 만들어둔 경우에도 안전하게 추가되도록 보장한다.
alter table public.essays add column if not exists topic_title text;

-- 에세이의 각 시도(버전). 재작성할 때마다 하나씩 늘어난다 (최대 4개: 최초 1 + 재작성 3).
create table if not exists public.essay_versions (
  id uuid primary key default gen_random_uuid(),
  essay_id uuid not null references public.essays (id) on delete cascade,
  version_no int not null,
  student_text text not null,
  created_at timestamptz not null default now(),
  unique (essay_id, version_no)
);

-- AI 평가 결과. lib/types.ts의 EvaluationResult 전체를 JSON으로 그대로 저장한다.
-- (지금 단계에선 세부 지표별 테이블로 정규화하지 않고 jsonb 하나로 - 화면은 항상 전체를 같이 보여주기 때문)
create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  essay_version_id uuid not null references public.essay_versions (id) on delete cascade,
  result jsonb not null,
  confidence text not null check (confidence in ('충분', '판단하기 어려움')),
  rewrote_student_text boolean not null default false,
  created_at timestamptz not null default now()
);

-- Row Level Security: 보호자는 자기 자녀의 데이터만 보고 쓸 수 있다.
alter table public.parents enable row level security;
alter table public.children enable row level security;
alter table public.essays enable row level security;
alter table public.essay_versions enable row level security;
alter table public.evaluations enable row level security;

-- create policy에는 if not exists가 없어서, 이미 만들어진 정책을 다시 만들려고 하면
-- "policy ... already exists" 에러가 난다. drop trigger if exists와 같은 이유로,
-- 이 파일을 스크립트 전체로 다시 실행해도 안전하도록 매번 drop 후 create한다.
drop policy if exists "parents_own_row" on public.parents;
create policy "parents_own_row" on public.parents
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "children_own_rows" on public.children;
create policy "children_own_rows" on public.children
  for all using (auth.uid() = parent_id) with check (auth.uid() = parent_id);

drop policy if exists "essays_own_rows" on public.essays;
create policy "essays_own_rows" on public.essays
  for all using (
    exists (
      select 1 from public.children c
      where c.id = essays.child_id and c.parent_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.children c
      where c.id = essays.child_id and c.parent_id = auth.uid()
    )
  );

drop policy if exists "essay_versions_own_rows" on public.essay_versions;
create policy "essay_versions_own_rows" on public.essay_versions
  for all using (
    exists (
      select 1 from public.essays e
      join public.children c on c.id = e.child_id
      where e.id = essay_versions.essay_id and c.parent_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.essays e
      join public.children c on c.id = e.child_id
      where e.id = essay_versions.essay_id and c.parent_id = auth.uid()
    )
  );

drop policy if exists "evaluations_own_rows" on public.evaluations;
create policy "evaluations_own_rows" on public.evaluations
  for all using (
    exists (
      select 1 from public.essay_versions v
      join public.essays e on e.id = v.essay_id
      join public.children c on c.id = e.child_id
      where v.id = evaluations.essay_version_id and c.parent_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.essay_versions v
      join public.essays e on e.id = v.essay_id
      join public.children c on c.id = e.child_id
      where v.id = evaluations.essay_version_id and c.parent_id = auth.uid()
    )
  );

-- RLS는 "이 행을 볼 수 있냐"만 걸러줄 뿐, 그 이전에 "이 테이블 자체를 만질 수 있냐"는
-- Postgres의 기본 GRANT 권한으로 별도로 허용해줘야 한다. 이게 없으면 RLS 정책이 맞아도
-- "permission denied for table ..." 에러가 난다. 로그인한 보호자(authenticated)에게만 허용.
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.parents,
  public.children,
  public.essays,
  public.essay_versions,
  public.evaluations
  to authenticated;

-- 관리자 (2026-09-16 추가: 관리자 기능 1차분 - 인증 + 이용 현황/안전 경고 검토)
--
-- 서비스 롤 키(RLS 우회)는 쓰지 않는다는 원칙을 관리자 기능에도 그대로 지킨다 - 대신
-- "이 유저 id가 admins 테이블에 있으면 모든 계정 데이터를 읽을 수 있다"는 RLS 정책을
-- 기존 테이블에 추가로 얹는 방식으로 만든다. 관리자를 늘리려면 이 테이블에 직접(SQL로)
-- 행을 추가해야 한다 - 앱 화면에서 self-serve로 관리자를 지정하는 기능은 없음(의도적).
create table if not exists public.admins (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- 본인이 관리자인지 스스로 확인하는 것만 허용 (다른 사람이 관리자인지는 알 수 없음).
drop policy if exists "admins_read_own_membership" on public.admins;
create policy "admins_read_own_membership" on public.admins
  for select using (auth.uid() = id);

grant select on public.admins to authenticated;

-- 기존 "본인 자녀만" 정책은 그대로 두고, admins 테이블에 등록된 유저에게는 추가로
-- 전체 읽기 권한을 얹는다. Postgres RLS는 같은 명령(select)에 대한 여러 정책을 OR로
-- 합치므로, 이 정책들을 더한다고 기존 보호자 권한이 줄어들지 않는다.
drop policy if exists "admins_read_all_parents" on public.parents;
create policy "admins_read_all_parents" on public.parents
  for select using (exists (select 1 from public.admins where admins.id = auth.uid()));

drop policy if exists "admins_read_all_children" on public.children;
create policy "admins_read_all_children" on public.children
  for select using (exists (select 1 from public.admins where admins.id = auth.uid()));

drop policy if exists "admins_read_all_essays" on public.essays;
create policy "admins_read_all_essays" on public.essays
  for select using (exists (select 1 from public.admins where admins.id = auth.uid()));

drop policy if exists "admins_read_all_essay_versions" on public.essay_versions;
create policy "admins_read_all_essay_versions" on public.essay_versions
  for select using (exists (select 1 from public.admins where admins.id = auth.uid()));

drop policy if exists "admins_read_all_evaluations" on public.evaluations;
create policy "admins_read_all_evaluations" on public.evaluations
  for select using (exists (select 1 from public.admins where admins.id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 관리자 기능 2차분 (2026-09-19 추가: 글감 관리 + 평가기준/프롬프트 버전 관리)
-- ---------------------------------------------------------------------------

-- 글감. 지금까지 lib/topics.ts에 하드코딩돼 있던 목록을 옮겨온 것.
-- id는 그 파일에서 쓰던 슬러그를 그대로 쓴다 (essays.topic_title로 저장된 기존 글과
-- 맞춰보기 쉽도록, 그리고 시드를 여러 번 실행해도 중복이 생기지 않도록).
--
-- 주의: 앱은 이 테이블을 읽지 못해도(테이블이 아직 없거나 조회 실패) 코드에 남겨둔
-- 기본 목록으로 폴백한다. 코드를 먼저 배포하고 이 SQL을 나중에 실행해도 글쓰기 화면은
-- 멀쩡히 동작한다.
create table if not exists public.topics (
  id text primary key,
  writing_type text not null,
  title text not null,
  hint text not null,
  grades text[] not null, -- 예: '{4,5}' — 이 글감이 어울리는 학년
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.topics enable row level security;

-- 학생·보호자는 살아있는 글감만 읽을 수 있고, 관리자는 숨긴 것까지 다 본다.
drop policy if exists "topics_read" on public.topics;
create policy "topics_read" on public.topics
  for select using (
    is_active or exists (select 1 from public.admins where admins.id = auth.uid())
  );

-- 쓰기는 관리자만. (insert/update/delete를 한 정책으로 묶되 for all은 select까지 덮으므로
-- 명령별로 나눠서, 위의 읽기 정책이 그대로 살아있게 한다.)
drop policy if exists "topics_admin_insert" on public.topics;
create policy "topics_admin_insert" on public.topics
  for insert with check (exists (select 1 from public.admins where admins.id = auth.uid()));

drop policy if exists "topics_admin_update" on public.topics;
create policy "topics_admin_update" on public.topics
  for update using (exists (select 1 from public.admins where admins.id = auth.uid()))
  with check (exists (select 1 from public.admins where admins.id = auth.uid()));

drop policy if exists "topics_admin_delete" on public.topics;
create policy "topics_admin_delete" on public.topics
  for delete using (exists (select 1 from public.admins where admins.id = auth.uid()));

grant select, insert, update, delete on public.topics to authenticated;

-- 평가기준(채점 척도)이 들어있는 시스템 프롬프트의 버전 관리.
-- 활성 버전이 하나도 없으면 앱은 코드에 있는 기본 프롬프트(lib/prompt.ts)를 쓴다.
create table if not exists public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  label text not null,          -- 예: 'v2 — 근거 배점 상향'
  system_prompt text not null,
  note text,                    -- 무엇을 왜 바꿨는지 메모
  is_active boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- 활성 버전은 언제나 최대 하나. (부분 유니크 인덱스라 is_active=false인 행은 몇 개든 괜찮다)
create unique index if not exists prompt_versions_single_active
  on public.prompt_versions (is_active) where is_active;

alter table public.prompt_versions enable row level security;

-- 채점 API가 로그인한 사용자 권한으로 돌기 때문에, 활성 버전은 로그인한 사람이면 읽을 수
-- 있어야 한다. 지난 버전과 비활성 버전은 관리자만 본다.
drop policy if exists "prompt_versions_read" on public.prompt_versions;
create policy "prompt_versions_read" on public.prompt_versions
  for select using (
    is_active or exists (select 1 from public.admins where admins.id = auth.uid())
  );

drop policy if exists "prompt_versions_admin_insert" on public.prompt_versions;
create policy "prompt_versions_admin_insert" on public.prompt_versions
  for insert with check (exists (select 1 from public.admins where admins.id = auth.uid()));

drop policy if exists "prompt_versions_admin_update" on public.prompt_versions;
create policy "prompt_versions_admin_update" on public.prompt_versions
  for update using (exists (select 1 from public.admins where admins.id = auth.uid()))
  with check (exists (select 1 from public.admins where admins.id = auth.uid()));

drop policy if exists "prompt_versions_admin_delete" on public.prompt_versions;
create policy "prompt_versions_admin_delete" on public.prompt_versions
  for delete using (exists (select 1 from public.admins where admins.id = auth.uid()));

grant select, insert, update, delete on public.prompt_versions to authenticated;

-- 활성 버전을 바꾸는 건 "기존 활성 해제 + 새 버전 활성" 두 단계라, 중간에 유니크 인덱스에
-- 걸리지 않도록 한 트랜잭션으로 처리하는 함수를 둔다. security definer로 만들되 호출자가
-- 관리자인지 함수 안에서 직접 확인한다.
create or replace function public.activate_prompt_version(target_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.admins where admins.id = auth.uid()) then
    raise exception '관리자만 프롬프트 버전을 바꿀 수 있습니다.';
  end if;

  update public.prompt_versions set is_active = false where is_active;
  update public.prompt_versions set is_active = true where id = target_id;
end;
$$;

grant execute on function public.activate_prompt_version(uuid) to authenticated;
