// @ts-check
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let db: any = null;

function getDb() {
  if (db) return db;
  const Database = require('better-sqlite3');
  const dbPath = path.join(app.getPath('userData'), 'data.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

function runSchema() {
  const database = getDb();
  let schemaPath: string;
  if (app.isPackaged) {
    schemaPath = path.join(process.resourcesPath, 'schema.sql');
  } else {
    schemaPath = path.join(__dirname, 'schema.sql');
  }
  if (fs.existsSync(schemaPath)) {
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    database.exec(sql);
  } else {
    console.warn('schema.sql not found at', schemaPath);
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'TELA ERP',
    icon: path.join(__dirname, '..', 'public', 'favicon.png'),
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '..', 'dist-desktop', 'index.html'));
  } else {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  }
}

// IPC handlers
ipcMain.handle('db:query', (_event: any, sql: string, params: any[]) => {
  try {
    const stmt = getDb().prepare(sql);
    const result = stmt.get(...(params || []));
    return { data: result ?? null, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
});

ipcMain.handle('db:run', (_event: any, sql: string, params: any[]) => {
  try {
    const stmt = getDb().prepare(sql);
    const result = stmt.run(...(params || []));
    return { data: result, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
});

ipcMain.handle('db:all', (_event: any, sql: string, params: any[]) => {
  try {
    const stmt = getDb().prepare(sql);
    const rows = stmt.all(...(params || []));
    return { data: rows, error: null };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
});

app.whenReady().then(() => {
  runSchema();
  createWindow();

  app.on('activate', () => {
    const { BrowserWindow } = require('electron');
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
