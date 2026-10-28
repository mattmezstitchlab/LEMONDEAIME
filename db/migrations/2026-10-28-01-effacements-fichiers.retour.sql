-- Retour arrière de 2026-10-28-01 : à n'exécuter qu'avec une file VIDE (sinon des fichiers resteraient sans trace)
-- et après avoir remis en production un code qui n'utilise pas cette table.
begin;
do $$ begin
  if exists (select 1 from effacements_fichiers) then raise exception 'La file effacements_fichiers n''est pas vide : retour arrière refusé.'; end if;
end $$;
drop table effacements_fichiers;
commit;
