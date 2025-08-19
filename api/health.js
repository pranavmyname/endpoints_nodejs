// /api/health.js
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", db: true });
  } catch (e) {
    console.error('Database connection error:', e);
    res.status(503).json({ status: "degraded", db: false });
  }
}
