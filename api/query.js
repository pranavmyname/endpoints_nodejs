// /api/query.js
import pg from "pg";

// DB pool (reuse same Neon DB URL)
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  try {
    // Authentication check (same as ingest)
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = authHeader.split(" ")[1];
    if (token !== process.env.AUTHENTICATION_TOKEN) {
      return res.status(403).json({ error: "Invalid authentication token" });
    }

    // Support only GET requests
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const client = await pool.connect();
    try {
      // Query params for filtering
      const { start_date, end_date, category, account_type, type, user, description, limit = NULL } = req.query;

      let sql = `SELECT id, to_char(date, 'DD/MM/YYYY') as date, time, account_type, bank, account_id,
                 "user", description, original_description, amount, type, file_source,
                 user_id, category, is_deleted, created_at, updated_at
                 FROM transactions WHERE is_deleted = false`;
      const params = [];

      if (start_date) {
        params.push(start_date);
        sql += ` AND date >= to_date($${params.length}, 'DD/MM/YYYY')`;
      }

      if (end_date) {
        params.push(end_date);
        sql += ` AND date <= to_date($${params.length}, 'DD/MM/YYYY')`;
      }

      if (category) {
        params.push(category);
        sql += ` AND category = $${params.length}`;
      }

      if (account_type) {
        params.push(account_type);
        sql += ` AND account_type = $${params.length}`;
      }

      if (type) {
        params.push(type);
        sql += ` AND type = $${params.length}`;
      }

      if (user) {
        params.push(user);
        sql += ` AND "user" = $${params.length}`;
      }

      if (original_description) {
        params.push(`%${description}%`);
        sql += ` AND description ILIKE $${params.length}`;
      }

      sql += ` ORDER BY date DESC, time DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await client.query(sql, params);

      return res.json({ ok: true, transactions: result.rows });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error in query API handler:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
