-- Step 1: Verify table structure and primary key
SELECT
  c.table_name,
  c.column_name,
  c.data_type,
  tc.constraint_type
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage kcu
  ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
LEFT JOIN information_schema.table_constraints tc
  ON kcu.constraint_name = tc.constraint_name
WHERE c.table_schema = 'public' AND c.table_name = 'ai_messages' AND c.column_name = 'id';
