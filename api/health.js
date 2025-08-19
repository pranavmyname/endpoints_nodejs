// /api/health.js
import express from "express";
import pg from "pg";

const app = express();
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.get("/", async (req, res) => {
  try {
    await pool.query("select 1");
    res.status(200).json({ status: "ok", db: true });
  } catch (e) {
    res.status(503).json({ status: "degraded", db: false });
  }
});

export default app;
