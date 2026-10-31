-- LE MONDE AIME · migration 2026-10-29-02 : les préférences du Point rangées dans le compte (étape 2 des profils).
-- Ajout pur : aucune table existante n'est modifiée. Sans elle, le studio garde tout sur l'appareil, comme avant.
-- Une ligne par compte : le profil, le niveau d'affichage, le menu du Point et le confort de lecture (validés par api/_preferences.mjs).
-- Jamais d'écrasement silencieux : l'API refuse (409) une écriture fondée sur une version plus ancienne que celle du compte.
-- La ligne part avec le compte (effacerTraces) et par cascade.
-- Retour arrière : 2026-10-29-02-preferences.retour.sql.
begin;
create table if not exists preferences_point (
  user_id text primary key references "user" (id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 4000),
  maj bigint not null
);
commit;
