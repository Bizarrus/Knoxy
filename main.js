import Proxy from './Core/Network/Proxy.class.js';
import Definitions from './Core/Network/Protocol/Definitions.class.js';
import GenericProtocol from './Core/Network/Protocol/Generic/GenericProtocol.class.js';
import Chalk from 'chalk';
import {template} from 'chalk-template';
import fs from 'node:fs';
import util from 'node:util';

import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Main {
	Configuration = {
		Proxy: {
			Port: 2710
		},
		Endpoint: {
			Hostname: 	'chat.knuddels.de',
			Port:		2710
		}
	};

	constructor() {
		this.Proxy = new Proxy(this.Configuration);
		let win;
		app.whenReady().then(() => {
			win = new BrowserWindow({
				width: 800,
				height: 600,
				webPreferences: {
					preload: join(__dirname, "UI", "preload.js"),
					contextIsolation: true,
					nodeIntegration: false
				}
			});
			ipcMain.on('open-log', (e, data) => {
				console.log('OPEN', data);
				const logWin = new BrowserWindow({
					width: 600,
					height: 800,
					webPreferences: {
						preload: join(__dirname, "UI", "preload.js")
					}
				});

				logWin.loadFile(join(__dirname, "UI", "log.html"));
				logWin.webContents.once("did-finish-load", () => {
					logWin.webContents.send("log", data);
				});
			});
			win.loadFile(join(__dirname, "UI", "main.html"));
		});

		this.Proxy.on('started', (port) => {
			console.log('[Proxy] Proxy started on Port', port);
		});
		
		this.Proxy.on('connected', (session) => {
			//console.log('Connected to the Server:', session);
		});
		this.Proxy.on('sessionType', (session, typ) => {
			console.log(session, '[Type]', typ);
		});
		
		let color_swap = true;
		const genericTree = GenericProtocol.parseTree(fs.readFileSync('./Data/GenericTree.txt').toString('utf8'));

		this.Proxy.on('packet', (session, typ, packet) => {
			let parts		= packet.split('\0');
			let opcode		= parts[0];

			color_swap		= !color_swap;
			let definition	= Definitions.resolve((typ === 'Server' ? 'Input' : 'Output'), opcode, parts, packet);

			if(definition === null) {
				console.log(Chalk.hex('#FF0000')(opcode), packet.replace(/[\x00-\x1F\x7F-\x9F]/g, (char) => {
					let hex = char.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase();

					if(hex === '00') {
						return Chalk.hex('#008000')('\\0');
					}

					return Chalk.hex('#FF9000')(`[${hex}=${char.charCodeAt(0)}]`);
				}));
				return true;
			}

			// CLI-Mode
			console.log(Chalk.hex('#3399FF')('[' + typ + ']'), Chalk.bgHex(color_swap ? '#C0C0C0' : '#808080').hex('#800080')(definition.toString()));
			let generic = null;
			if (opcode == ':' || opcode == 'q') {
				generic = genericTree.read(packet, 2);

				console.log(Chalk.hex('#3399FF')('[' + typ + ']'), Chalk.bgHex(color_swap ? '#C0C0C0' : '#808080').hex('#800080')(
					util.inspect(generic.toJSON(), { colors: true, depth: null, compact: false }
				)));
			
				if (opcode == ':' && generic.getName() == 'CHANGE_PROTOCOL') {
					genericTree.updateTree(generic.get('PROTOCOL_DATA').value);
					console.info('Protocol changed', genericTree.hash);
				}
 
				const p = opcode + '\0' + genericTree.write(generic);
				if (p !== packet) {
					console.log('FAIL   ', generic.getName());
					console.log('       ', Buffer.from(packet).toString('hex'))
					console.log('       ', Buffer.from(p).toString('hex'))
				}
			}
			// Send Definition to UI
			if (win) {
				win.webContents.send("log", {
					session: session,
					typ: typ,
					packet: packet,
					hex: Buffer.from(packet).toString('hex'),
					definition: definition,
					generic: generic ? generic.toJSON() : undefined,
				});
			}

			return packet;
		});
		
		this.Proxy.on('exception', (type, session, error) => {
			console.error('[Error] on ' + type + ':', session, error);
		});
		
		this.Proxy.on('HTTP', (session, typ, data) => {
			//console.error('[HTTP] Request', session, typ, data.toString('utf8'));
		});
		this.Proxy.on('HTTPS', (session, typ, data) => {
			//console.error('[HTTPS] Request', session, typ, data);
		});
		
		this.Proxy.on('disconnect', (session, type) => {
			//console.error('[Disconnect] from', session, type);
		});
		
		let _watcher = setInterval(() => {
			if(Definitions.isReady()) {
				clearInterval(_watcher);
				this.Proxy.start();
				return;
			}
		}, 500);
	}
}

new Main();