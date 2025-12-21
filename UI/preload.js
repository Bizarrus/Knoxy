const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
	onPersistenceConfig:	(callback) => ipcRenderer.on('persistence:config', (_, data) => callback(data)),
	onPersistenceUsers:		(callback) => ipcRenderer.on('persistence:users', (_, data) => callback(data)),
	onWebRequest:			(callback) => ipcRenderer.on('web:request', (_, data) => callback(data)),
	onLog:					(callback) => ipcRenderer.on('log', (_, data) => callback(data)),
	onDialog:				(callback) => ipcRenderer.on('dialog', (_, data) => callback(data)),
	action:					(action, value) => ipcRenderer.send('action', action, value)
});