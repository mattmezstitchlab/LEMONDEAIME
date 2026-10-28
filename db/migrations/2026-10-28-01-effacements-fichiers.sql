-- LE MONDE AIME · migration 2026-10-28-01 : la file des fichiers à effacer (sécurité S1).
-- Quand un compte est supprimé, ses fichiers (Vercel Blob) y sont inscrits dans la même transaction que l'effacement
-- de ses données ; ils en sortent une fois effacés. Un échec y reste, avec son erreur, et est repris chaque jour.
-- Ajout pur : aucune table existante n'est modifiée. À appliquer AVANT de déployer le code qui l'utilise :
-- sans elle, la suppression de compte est refusée (rien n'est effacé à moitié).
-- Retour arrière : 2026-10-28-01-effacements-fichiers.retour.sql (seulement quand la file est vide).
begin;
create table if not exists effacements_fichiers (
  id bigserial primary key,
  genre text not null check (genre in ('url', 'prefixe')),
  cible text not null check (char_length(cible) between 1 and 1000),
  essais integer not null default 0,
  erreur text not null default '',
  cree_le timestamptz not null default now(),
  essai_le timestamptz
);
-- une même cible n'est inscrite qu'une fois : inscrire deux fois ne crée pas de doublon (idempotence)
create unique index if not exists effacements_fichiers_cible on effacements_fichiers (genre, cible);
commit;
