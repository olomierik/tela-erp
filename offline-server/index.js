const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'tela_erp_offline.db');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Initialize SQLite Database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the offline SQLite database.');
    initializeSchema();
  }
});

function initializeSchema() {
  // Simple schema initialization for MVP
  // In a full version, we would parse the SQL migrations
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS myerp_accounts (
      id TEXT PRIMARY KEY,
      code TEXT,
      name TEXT,
      type TEXT,
      balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS myerp_invoices (
      id TEXT PRIMARY KEY,
      number TEXT,
      customer TEXT,
      amount REAL,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS myerp_payments (
      id TEXT PRIMARY KEY,
      reference TEXT,
      amount REAL,
      method TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    console.log('Offline schema initialized.');
  });
}

// Mimic Supabase REST API (PostgREST style)
app.get('/rest/v1/:table', (req, res) => {
  const table = req.params.table;
  db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/rest/v1/:table', (req, res) => {
  const table = req.params.table;
  const data = req.body;
  const columns = Object.keys(data).join(',');
  const placeholders = Object.keys(data).map(() => '?').join(',');
  const values = Object.values(data);

  db.run(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, values, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, ...data });
  });
});

// Auth simulation
app.post('/auth/v1/token', (req, res) => {
  res.json({
    access_token: 'offline-token',
    user: { id: 'offline-user', email: 'offline@telaerp.local' }
  });
});

// Catch-all for React SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`================================================`);
  console.log(`Tela ERP Offline Server running at:`);
  console.log(`http://localhost:${PORT}`);
  console.log(`================================================`);
});
