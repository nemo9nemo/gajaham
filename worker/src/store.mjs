// D1 batch is atomic. Read versions are checked inside that same SQL transaction.
// Random versions also prevent delete/recreate (ABA) from accepting a stale read.
export function createStore(binding) {
  const statement = (sql, ...args) => binding.prepare(sql).bind(...args);
  const snapshot = (ref, row) => ({ ref, id: ref.id, exists: Boolean(row), data: () => row ? JSON.parse(row.body) : undefined, version: row?.version ?? '' });
  const valid = path => { if (typeof path !== 'string' || !path || path.split('/').some(x => !x || x === '.' || x === '..')) throw new Error('Invalid internal path'); return path; };
  const query = (parent, cursor = '', cap = 200) => ({
    orderBy() { return this; }, limit(value) { return query(parent, cursor, value); }, startAfter(value) { return query(parent, value, cap); },
    async get() {
      const result = await statement('SELECT path, body, version FROM documents WHERE parent = ? AND path > ? ORDER BY path LIMIT ?', parent, cursor ? `${parent}/${cursor}` : '', cap).all();
      const docs = result.results.map(row => snapshot(doc(row.path), row)); return { docs, size: docs.length };
    },
    doc(id) { if (typeof id !== 'string' || !id || id.includes('/')) throw new Error('Invalid internal ID'); return doc(`${parent}/${id}`); }
  });
  const doc = path => {
    valid(path); const segments = path.split('/');
    return { path, id: segments.at(-1), parent: segments.slice(0, -1).join('/'),
      collection(name) { return query(`${path}/${valid(name)}`); },
      async get() { return snapshot(this, await statement('SELECT body, version FROM documents WHERE path = ?', path).first()); },
      async set(value) { return runTransaction(async tx => { await tx.get(this); tx.set(this, value); }); },
      async update(value) { return runTransaction(async tx => { await tx.get(this); tx.update(this, value); }); },
      async delete() { await statement('DELETE FROM documents WHERE path = ?', path).run(); }
    };
  };
  async function runTransaction(callback) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const reads = new Map(); const writes = new Map();
      const tx = {
        async get(ref) { if (writes.size) throw new Error('Reads must precede writes'); if (!reads.has(ref.path)) reads.set(ref.path, ref.get()); return reads.get(ref.path); },
        set(ref, value) { writes.set(ref.path, { ref, value, mode: 'set' }); },
        create(ref, value) { writes.set(ref.path, { ref, value, mode: 'create' }); },
        update(ref, value) { writes.set(ref.path, { ref, value, mode: 'update' }); },
        delete(ref) { writes.set(ref.path, { ref, mode: 'delete' }); }
      };
      const result = await callback(tx); if (!writes.size) return result;
      const observed = new Map(await Promise.all([...reads].map(async ([path, promise]) => [path, await promise])));
      const batch = [...observed].map(([path, row]) => statement('INSERT INTO transaction_checks(path, expected) VALUES (?, ?)', path, row.version));
      for (const { ref, value, mode } of writes.values()) {
        if (mode === 'delete') { batch.push(statement('DELETE FROM documents WHERE path = ?', ref.path)); continue; }
        if (mode === 'update' && !observed.get(ref.path)?.exists) throw new Error('Missing internal document');
        const data = mode === 'update' ? { ...observed.get(ref.path).data(), ...value } : value;
        const params = [ref.path, ref.parent, JSON.stringify(data), crypto.randomUUID(), data.purgeAt ?? null];
        const sql = 'INSERT INTO documents(path, parent, body, version, purge_at) VALUES (?, ?, ?, ?, ?)' + (mode === 'create' ? '' : ' ON CONFLICT(path) DO UPDATE SET parent=excluded.parent, body=excluded.body, version=excluded.version, purge_at=excluded.purge_at');
        batch.push(statement(sql, ...params));
      }
      batch.push(statement('DELETE FROM transaction_checks'));
      try { await binding.batch(batch); return result; }
      catch (error) { if (!String(error.message).includes('transaction-conflict') || attempt === 7) throw error; }
    }
  }
  return {
    doc, collection: name => query(valid(name)), runTransaction,
    async recursiveDelete(collection) {
      const prefix = `${collection.doc('placeholder').parent}/`;
      // Bound each attempt. Quota failure leaves the pending job and remaining rows.
      for (let i = 0; i < 2; i++) {
        await statement('DELETE FROM documents WHERE path IN (SELECT path FROM documents WHERE path >= ? AND path < ? LIMIT 200)', prefix, prefix + '\uffff').run();
        if (!await statement('SELECT 1 FROM documents WHERE path >= ? AND path < ? LIMIT 1', prefix, prefix + '\uffff').first()) return;
      }
      throw new Error('Deletion remains pending');
    },
    async expired(time) { await statement('DELETE FROM documents WHERE path IN (SELECT path FROM documents WHERE purge_at <= ? LIMIT 200)', time).run(); },
    async pending(limit = 2) { const rows = await statement("SELECT path FROM documents WHERE parent = 'users' AND json_extract(body, '$.state') = 'deleting' ORDER BY coalesce(json_extract(body, '$.workerAttemptAt'), 0), path LIMIT ?", limit).all(); return rows.results.map(row => row.path.slice(6)); },
    async markAttempt(uid) { const ref = doc(`users/${uid}`); await runTransaction(async tx => { const snap = await tx.get(ref); if (snap.data()?.state === 'deleting') tx.update(ref, { workerAttemptAt: Date.now() }); }); }
  };
}
