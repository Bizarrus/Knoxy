const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
	onPersistenceConfig:	(callback) => ipcRenderer.on('persistence:config', (_, data) => callback(data)),
	onPersistenceUsers:		(callback) => ipcRenderer.on('persistence:users', (_, data) => callback(data)),
	onWebRequest:			(callback) => ipcRenderer.on('web:request', (_, data) => callback(data)),
	onWebResponse:			(callback) => ipcRenderer.on('web:response', (_, data) => callback(data)),
	onLog:					(callback) => ipcRenderer.on('log', (_, data) => callback(data)),
	onDialog:				(callback) => ipcRenderer.on('dialog', (_, data) => callback(data)),
	onClientConfig:			(callback) => ipcRenderer.on('client', (_, data) => callback(data)),
	onButtonChange:			(callback) => ipcRenderer.on('button', (_, data) => callback(data)),
	onInit:					() => ipcRenderer.send('init'),
	action:					(action, value, data) => ipcRenderer.send('action', action, value, data)
});