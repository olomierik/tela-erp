'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // Structured CRUD  — table name + operation object
  dbCrud: (args) => ipcRenderer.invoke('db:crud', args),

  // Auth
  authGetSession: ()       => ipcRenderer.invoke('auth:getSession'),
  authSignup:    (args)    => ipcRenderer.invoke('auth:signup', args),
  authSignin:    (args)    => ipcRenderer.invoke('auth:signin', args),
  authSignout:   ()        => ipcRenderer.invoke('auth:signout'),

  // App utilities
  getDataPath: ()          => ipcRenderer.invoke('app:getDataPath'),
  backupDatabase: ()       => ipcRenderer.invoke('app:backup'),
});
