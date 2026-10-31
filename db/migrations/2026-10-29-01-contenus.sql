-- LE MONDE AIME · migration 2026-10-29-01 : les contenus éditoriaux (Bureau éditorial, phase 2) et la médiathèque.
-- Ajout pur : aucune table existante n'est modifiée. Le code fonctionne avant elle : le public garde les textes d'origine,
-- l'administration répond qu'il faut appliquer cette migration.
-- Une version n'est jamais modifiée ni effacée par l'API : publier archive la précédente, restaurer republie une copie.
-- Une seule version publiée par page, garantie par un index unique partiel.
-- Retour arrière : 2026-10-29-01-contenus.retour.sql.
begin;
create table if not exists contenus_versions (
  id bigserial primary key,
  page text not null check (page ~ '^[a-z0-9-]{1,40}$'),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  etat text not null default 'brouillon' check (etat in ('brouillon', 'publie', 'archive')),
  note text not null default '' check (length(note) <= 200),
  auteur text not null,
  cree_le timestamptz not null default now(),
  publie_le timestamptz,
  restaure_de bigint references contenus_versions (id),
  check ((etat = 'brouillon') = (publie_le is null) or etat = 'archive')
);
create unique index if not exists contenus_un_publie on contenus_versions (page) where etat = 'publie';
create index if not exists contenus_par_page on contenus_versions (page, id desc);

create table if not exists contenus_journal (
  id bigserial primary key,
  page text not null,
  action text not null check (action in ('enregistrer', 'publier', 'restaurer', 'media')),
  version_id bigint references contenus_versions (id),
  auteur text not null,
  detail jsonb not null default '{}'::jsonb,
  quand timestamptz not null default now()
);
create index if not exists contenus_journal_page on contenus_journal (page, id desc);

create table if not exists medias (
  id bigserial primary key,
  url text not null unique check (url ~ '^https://[a-z0-9-]+\.public\.blob\.vercel-storage\.com/contenus/'),
  genre text not null check (genre in ('image', 'video', 'affiche')),
  mime text not null,
  poids integer not null check (poids > 0 and poids <= 104857600),
  role text not null default 'principal' check (role in ('principal', 'mobile', 'affiche')),
  parent_id bigint references medias (id),
  largeur integer, hauteur integer,
  alt text not null default '', legende text not null default '',
  licence text not null check (licence in ('domaine-public', 'reconstitution', 'capture', 'autorise')),
  reconstitution boolean not null default false,
  provenance text not null default '', credit text not null default '',
  auteur text not null,
  cree_le timestamptz not null default now(),
  check ((role = 'principal') = (parent_id is null)),
  check (not reconstitution or legende ~* 'reconstitution')
);
commit;
