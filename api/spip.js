// api/spip.js
// Pola sama persis dengan api/certificates.js yang sudah ada di repo ini.
// GET    /api/spip          -> array semua unit SPIP
// POST   /api/spip          -> body: {category, name, no_seri_unit, lokasi, tanggal_inspeksi, tanggal_next_inspeksi, status, catatan} -> return row baru
// PUT    /api/spip          -> body: {id, ...field yang diubah} -> return row terupdate
// DELETE /api/spip?id=123   -> hapus 1 row

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const result = await pool.query('SELECT * FROM spip ORDER BY category, name');
      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      const {
        category, name, no_seri_unit, lokasi,
        tanggal_inspeksi, tanggal_next_inspeksi, status, catatan
      } = req.body;

      if (!category || !name) {
        return res.status(400).json({ error: 'category dan name wajib diisi' });
      }

      const result = await pool.query(
        `INSERT INTO spip (category, name, no_seri_unit, lokasi, tanggal_inspeksi, tanggal_next_inspeksi, status, catatan)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          category, name,
          no_seri_unit || null, lokasi || null,
          tanggal_inspeksi || null, tanggal_next_inspeksi || null,
          status || null, catatan || null
        ]
      );
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      const { id, ...fields } = req.body;
      if (!id) return res.status(400).json({ error: 'id wajib diisi' });

      const allowed = ['category', 'name', 'no_seri_unit', 'lokasi', 'tanggal_inspeksi', 'tanggal_next_inspeksi', 'status', 'catatan'];
      const setParts = [];
      const values = [];
      let idx = 1;
      for (const key of allowed) {
        if (key in fields) {
          setParts.push(`${key} = $${idx}`);
          values.push(fields[key] || null);
          idx++;
        }
      }
      if (setParts.length === 0) return res.status(400).json({ error: 'Tidak ada field untuk diupdate' });

      values.push(id);
      const result = await pool.query(
        `UPDATE spip SET ${setParts.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
        values
      );
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id wajib diisi' });
      await pool.query('DELETE FROM spip WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Error /api/spip:', err);
    return res.status(500).json({ error: err.message });
  }
}
