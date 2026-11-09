CREATE TABLE IF NOT EXISTS documents (
  path TEXT PRIMARY KEY,
  parent TEXT NOT NULL,
  body TEXT NOT NULL CHECK(json_valid(body)),
  version TEXT NOT NULL,
  purge_at INTEGER
);
CREATE INDEX IF NOT EXISTS documents_parent ON documents(parent, path);
CREATE INDEX IF NOT EXISTS documents_expiry ON documents(purge_at) WHERE purge_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS documents_pending ON documents(parent, json_extract(body, '$.state'), coalesce(json_extract(body, '$.workerAttemptAt'), 0), path);
CREATE TABLE IF NOT EXISTS transaction_checks (path TEXT PRIMARY KEY, expected TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS check_document_version BEFORE INSERT ON transaction_checks
WHEN coalesce((SELECT version FROM documents WHERE path = NEW.path), '') != NEW.expected
BEGIN SELECT RAISE(ABORT, 'transaction-conflict'); END;
