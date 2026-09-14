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

create policy "parents_own_row" on public.parents
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "children_own_rows" on public.children
  for all using (auth.uid() = parent_id) with check (auth.uid() = parent_id);

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
