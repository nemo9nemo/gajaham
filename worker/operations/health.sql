-- Read-only aggregate checks. No email, UID, record body, token or receipt output.
SELECT json_extract(body, '$.state') AS account_state, count(*) AS accounts
FROM documents WHERE parent = 'users' GROUP BY account_state;
SELECT count(*) AS pending_accounts,
       min(json_extract(body, '$.deletionRequestedAt')) AS oldest_request_ms,
       min(coalesce(json_extract(body, '$.workerAttemptAt'), 0)) AS oldest_attempt_ms
FROM documents WHERE parent = 'users' AND json_extract(body, '$.state') = 'deleting';
SELECT count(*) AS expired_metadata_rows FROM documents
WHERE purge_at IS NOT NULL AND purge_at <= CAST(strftime('%s', 'now') AS INTEGER) * 1000;
-- A manual aggregate scan; avoid repeated polling because reads count toward quota.
SELECT count(*) AS expired_trash_records,
       min(json_extract(body, '$.deletedAt')) AS oldest_deleted_ms
FROM documents
WHERE parent LIKE 'users/%/records'
  AND json_extract(body, '$.state') = 'trash'
  AND json_extract(body, '$.deletedAt') <= CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 30 * 86400000;
