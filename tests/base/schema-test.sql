-- Schéma de TEST, sans aucune donnée : la réplique des tables que touchent la connexion (Better Auth) et le BurO.
-- Relevé en lecture seule sur la base du site (structure uniquement, jamais de lignes), pour une base PostgreSQL de test isolée.
-- Usage : psql <base de test> -f tests/base/schema-test.sql   (le serveur de test refuse toute base sans la table aime_base_de_test)
create table if not exists aime_base_de_test (nom text not null);
insert into aime_base_de_test (nom) select 'phase-02-mes-projets' where not exists (select 1 from aime_base_de_test);

create table if not exists "user" (id text primary key, name text not null, email text not null unique, "emailVerified" boolean not null, image text,
  "createdAt" timestamptz not null default current_timestamp, "updatedAt" timestamptz not null default current_timestamp);
create table if not exists session (id text primary key, "expiresAt" timestamptz not null, token text not null unique, "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user"(id) on delete cascade);
create index if not exists "session_userId_idx" on session ("userId");
create table if not exists account (id text primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user"(id) on delete cascade,
  "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, scope text, password text,
  "createdAt" timestamptz not null default current_timestamp, "updatedAt" timestamptz not null);
create index if not exists "account_userId_idx" on account ("userId");
create table if not exists verification (id text primary key, identifier text not null, value text not null, "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default current_timestamp, "updatedAt" timestamptz not null default current_timestamp);
create index if not exists verification_identifier_idx on verification (identifier);
create table if not exists passkey (id text primary key, name text, "publicKey" text not null, "userId" text not null references "user"(id) on delete cascade,
  "credentialID" text not null, counter integer not null, "deviceType" text not null, "backedUp" boolean not null, transports text, "createdAt" timestamptz, aaguid text);
create table if not exists quotas (cle text not null check (char_length(cle) <= 120), fenetre timestamptz not null, n integer not null default 0 check (n >= 0), primary key (cle, fenetre));

create table if not exists spaces (id uuid primary key default gen_random_uuid(), kind text not null check (kind in ('evenement', 'projet', 'atelier')), title text not null,
  owner_id text not null, data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index if not exists spaces_origine_unique on spaces (owner_id, (data ->> 'origine')) where (data ? 'origine');
create table if not exists space_members (space_id uuid not null references spaces(id) on delete cascade, user_id text not null,
  role text not null check (role in ('owner', 'editor', 'contributor', 'viewer', 'guest')), added_at timestamptz not null default now(), jusqu_au timestamptz,
  relation text check (relation is null or (char_length(relation) between 1 and 40)), primary key (space_id, user_id));
create index if not exists space_members_user on space_members (user_id);
