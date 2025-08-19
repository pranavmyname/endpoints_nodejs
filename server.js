import express from "express";
import pg from "pg";

const app = express();
app.use(express.json());

// DB pool (replace with your Neon DB URL in env var)
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Ingest endpoint with authentication
app.post("/ingest", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];

    // Check for Bearer <token>
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = authHeader.split(" ")[1];
    if (token !== process.env.AUTHENTICATION_TOKEN) {
      return res.status(403).json({ error: "Invalid authentication token" });
    }

    const { transactions } = req.body;
    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({ error: "Invalid payload. Expected { transactions: [...] }" });
    }

    const client = await pool.connect();

    for (const tx of transactions) {
      await client.query(
        `INSERT INTO transactions
        (id, date, time, account_type, bank, account_id, "user",
         description, original_description, amount, type,
         file_source, user_id, category, is_deleted, created_at, updated_at)
        VALUES
        ($1, to_date($2, 'DD/MM/YYYY'), $3, $4, $5, $6, $7,
         $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          tx.id,
          tx.date,
          tx.time, // keep as string
          tx.account_type,
          tx.bank,
          tx.account_id || null,
          tx.user,
          tx.description,
          tx.original_description,
          tx.amount,
          tx.type,
          tx.file_source,
          tx.user_id,
          tx.category,
          tx.is_deleted,
          tx.created_at,
          tx.updated_at,
        ]
      );
    }

    client.release();
    res.json({ ok: true, inserted: transactions.length });
  } catch (err) {
    console.error("Error inserting transactions:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Ingest service running on port ${PORT}`);
});
