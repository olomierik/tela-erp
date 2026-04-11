const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  dbQuery: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params),
  dbRun: (sql: string, params?: any[]) => ipcRenderer.invoke('db:run', sql, params),
  dbAll: (sql: string, params?: any[]) => ipcRenderer.invoke('db:all', sql, params),
  isElectron: true,
});
