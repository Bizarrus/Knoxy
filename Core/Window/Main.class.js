import { BrowserWindow } from 'electron';
import Path from 'node:path';

export default class MainWindow {
	Window = null;

	init(){
		this.Window = new BrowserWindow({
			width:			800,
			height:			600,
			webPreferences: {
				preload:			Path.join('UI', 'preload.js'),
				contextIsolation:	true,
				nodeIntegration:	false
			}
		});

		this.Window.loadFile(Path.join('UI', 'main.html'));
	}

	send(key, data) {
		this.Window.webContents.send(key, data);
	}

	on(key, callback) {
		switch(key) {
			case 'loaded':
				this.Window.webContents.once('did-finish-load', () => callback(this));
			break;
		}
	}
}