const { Pool } = require('pg');

const candidates = [
  'STORAGE_DATABASE_URL','STORAGE_POSTGRES_URL','STORAGE_URL','STORAGE_POSTGRES_URL_NON_POOLING',
  'DATABASE_URL','POSTGRES_URL','POSTGRES_PRISMA_URL'
];
let connectionString;
let usedVar;
for(const name of candidates){
  if(process.env[name]){ connectionString = process.env[name]; usedVar = name; break; }
}

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

module.exports = async (req, res) => {
  if(!connectionString){
    res.status(500).json({ error: 'Env var koneksi database tidak ditemukan. Tersedia: ' + Object.keys(process.env).filter(k=>k.toUpperCase().includes('STORAGE')||k.toUpperCase().includes('POSTGRES')||k.toUpperCase().includes('DATABASE')).join(', ') });
    return;
  }
  const db = getPool();
  try {
    if (req.method === 'GET') {
      const { rows } = await db.query('select * from sertifikat order by created_at asc');
      res.status(200).json(rows);
      return;
    }

    if (req.method === 'POST') {
      const { category, file_name, holder, tanggal_terbit } = req.body || {};
      const { rows } = await db.query(
        'insert into sertifikat (category, file_name, holder, tanggal_terbit) values ($1,$2,$3,$4) returning *',
        [category, file_name || '', holder || '', tanggal_terbit || '']
      );
      res.status(200).json(rows[0]);
      return;
    }

    if (req.method === 'PUT') {
      const { id, holder, tanggal_terbit } = req.body || {};
      const { rows } = await db.query(
        'update sertifikat set holder = coalesce($2, holder), tanggal_terbit = coalesce($3, tanggal_terbit) where id = $1 returning *',
        [id, holder, tanggal_terbit]
      );
      res.status(200).json(rows[0]);
      return;
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || (req.body && req.body.id);
      await db.query('delete from sertifikat where id = $1', [id]);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
