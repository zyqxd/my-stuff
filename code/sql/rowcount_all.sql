CREATE FUNCTION rowcount_all(schema_name text default 'public')
  RETURNS table(table_name text, cnt bigint) as
$$
declare
 table_name text;
begin
  for table_name in SELECT c.relname FROM pg_class c
    JOIN pg_namespace s ON (c.relnamespace=s.oid)
    WHERE c.relkind = 'r' AND s.nspname=schema_name
  LOOP
    RETURN QUERY EXECUTE format('select cast(%L as text),count(*) from %I.%I',
       table_name, schema_name, table_name);
  END LOOP;
end
$$ language plpgsql;