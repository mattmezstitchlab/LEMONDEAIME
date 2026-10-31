-- Retour arrière de 2026-10-29-01 : retire les contenus éditoriaux et la médiathèque. La landing revient aux textes d'origine.
-- Attention : les versions, leur journal et les descriptions des médias sont perdus (les fichiers envoyés restent dans le stockage).
-- Faire d'abord une branche de sauvegarde (« sauvegarde-avant-retour-contenus-… »).
begin;
drop table if exists contenus_journal;
drop table if exists contenus_versions;
drop table if exists medias;
commit;
