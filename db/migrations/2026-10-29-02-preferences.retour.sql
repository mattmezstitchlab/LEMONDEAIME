-- Retour arrière de 2026-10-29-02 : retire les préférences du Point rangées dans les comptes.
-- Les préférences restent sur chaque appareil ; seule la copie du compte est perdue.
begin;
drop table if exists preferences_point;
commit;
