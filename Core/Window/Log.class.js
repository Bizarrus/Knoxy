import { BrowserWindow } from 'electron';
import Path from 'node:path';
import Process from 'node:process';

export default class LogWindow {
	Window = null;

	init() {
		this.Window = new BrowserWindow({
			width:			800,
			height:			600,
			webPreferences: {
				preload:			Path.join(Process.cwd(), 'UI', 'preload.js'),
				contextIsolation:	true,
				nodeIntegration:	false
			}
		});

		return this.Window.loadFile(Path.join(Process.cwd(), 'UI', 'log.html'));
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