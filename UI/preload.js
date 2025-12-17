const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    onLog: (callback) => ipcRenderer.on("log", (_, data) => callback(data)),
     openLog: (data) => ipcRenderer.send("open-log", data)
});