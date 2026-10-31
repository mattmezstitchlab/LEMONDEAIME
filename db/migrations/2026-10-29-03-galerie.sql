-- LE MONDE AIME · migration 2026-10-29-03 : la Galerie des Vivants (lot G1).
-- Ajout pur : aucune table existante n'est modifiée. Sans elle, l'API répond 503 et rien d'autre ne change.
-- Une œuvre exposée est une COPIE figée (jamais l'ouvrage privé) ; autorisations toutes à faux ; auteur ≠ brodeuse (realisations).
-- Une voix par compte et par œuvre (clé primaire) ; un signalement par œuvre et par empreinte (compte, ou adresse IP hachée).
-- Tout part avec le compte (effacerTraces, et cascade). Retour arrière : 2026-10-29-03-galerie.retour.sql.
begin;
create table if not exists oeuvres_exposees (
  id text primary key check (id ~ '^[a-z0-9]{12}$'),
  auteur text not null references "user" (id) on delete cascade,
  pseudo text not null check (length(pseudo) between 1 and 40),
  titre text not null check (length(titre) between 1 and 120),
  description text not null default '' check (length(description) <= 600),
  histoire text not null default '' check (length(histoire) <= 1200),
  w integer not null check (w between 1 and 500),
  h integer not null check (h between 1 and 500),
  fils jsonb not null default '[]' check (jsonb_typeof(fils) = 'array'),
  recette text check (recette is null or length(recette) <= 40),
  apercu text not null default '' check (length(apercu) <= 160000),
  contenu text not null default '' check (length(contenu) <= 1000000),
  autorisations jsonb not null default '{"edition_cartes":false,"tirage":false,"patron_vendu":false,"broderie_commandee":false}',
  realisations jsonb not null default '[]',
  statut text not null default 'visible' check (statut in ('visible', 'retiree', 'masquee')),
  motif_masquage text not null default '' check (length(motif_masquage) <= 200),
  cree_le timestamptz not null default now(),
  retiree_le timestamptz,
  masquee_le timestamptz
);
create index if not exists oeuvres_visibles on oeuvres_exposees (cree_le desc) where statut = 'visible';
create index if not exists oeuvres_auteur on oeuvres_exposees (auteur);
create table if not exists votes_oeuvres (
  oeuvre text not null references oeuvres_exposees (id) on delete cascade,
  compte text not null references "user" (id) on delete cascade,
  quand timestamptz not null default now(),
  primary key (oeuvre, compte)
);
create table if not exists signalements_oeuvres (
  oeuvre text not null references oeuvres_exposees (id) on delete cascade,
  empreinte text not null check (length(empreinte) <= 120),
  raison text not null check (raison in ('droits', 'contenu', 'autre')),
  texte text not null default '' check (length(texte) <= 300),
  quand timestamptz not null default now(),
  primary key (oeuvre, empreinte)
);
commit;
