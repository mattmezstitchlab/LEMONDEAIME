-- Retour arrière de 2026-10-29-03 : retire la Galerie des Vivants.
-- Attention : les œuvres exposées (des copies), leurs votes et leurs signalements sont perdus ; les ouvrages privés ne sont pas touchés.
-- Faire d'abord une branche de sauvegarde (« sauvegarde-avant-retour-galerie-… »).
begin;
drop table if exists signalements_oeuvres;
drop table if exists votes_oeuvres;
drop table if exists oeuvres_exposees;
commit;
