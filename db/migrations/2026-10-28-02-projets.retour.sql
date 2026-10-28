-- Retour arrière de 2026-10-28-02 : retire la table des projets. Le code revient alors aux deux projets d'origine.
-- Attention : les projets ajoutés ou modifiés par l'administration sont perdus (les images envoyées restent dans le stockage).
begin;
drop table if exists projets;
commit;
