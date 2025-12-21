import { BrowserWindow } from 'electron';
import Path from 'node:path';
import Process from 'node:process';

export default class MainWindow {
	Window = null;

	init() {
		this.Window = new BrowserWindow({
			width:				800,
			height:				600,
			icon:				Path.join(Process.cwd(), 'UI', 'Assets', 'Icon.png'),
			autoHideMenuBar:	true,
			webPreferences: {
				preload:			Path.join(Process.cwd(), 'UI', 'preload.js'),
				contextIsolation:	true,
				nodeIntegration:	false
			}
		});

		return this.Window.loadFile(Path.join(Process.cwd(), 'UI', 'main.html'));
	}

	getWindow() {
		return this.Window;
	}

	send(key, data) {
		this.Window.webContents.send(key, data);
	}
}