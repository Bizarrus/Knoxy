/**
 * @author  Bizarrus, SeBiTM
 **/
import Proxy from './Core/Network/Proxy.class.js';
import Plugins from './Core/Plugins.class.js';
import Definitions from './Core/Network/Protocol/Definitions.class.js';
import GenericProtocol from './Core/Network/Protocol/Generic/GenericProtocol.class.js';
import Chalk from 'chalk';
import fs from 'node:fs';
import util from 'node:util';
import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename	= fileURLToPath(import.meta.url);
const __dirname	= dirname(__filename);

class Main {
	Configuration = {
		Chat: {
			Proxy: {
				Port: 2710
			},
			Endpoint: {
				Hostname:	'chat.knuddels.de',
				Port:		2710
			}
		},
		Card: {
			Proxy: {
				Port: 2810
			},
			Endpoint: {
				Hostname:	'chat.knuddels.de',
				Port:		2810
			}
		},
	};

	constructor() {
		this.Plugins	= new Plugins();
		this.ChatProxy	= new Proxy(this.Configuration.Chat, { plugins: this.Plugins });
		this.CardProxy	= new Proxy(this.Configuration.Card, { parentServer: this.ChatProxy });

		let win;

		app.whenReady().then(() => {
			win = new BrowserWindow({
				width:	800,
				height: 600,
				webPreferences: {
					preload:			join(__dirname, 'UI', 'preload.js'),
					contextIsolation:	true,
					nodeIntegration:	false
				}
			});

			ipcMain.on('open-log', (e, data) => {
				console.log('OPEN', data);

				const logWin = new BrowserWindow({
					width:	600,
					height: 800,
					webPreferences: {
						preload: join(__dirname, "UI", "preload.js")
					}
				});

				logWin.loadFile(join(__dirname, 'UI', 'log.html'));

				logWin.webContents.once('did-finish-load', () => {
					logWin.webContents.send('log', data);
				});
			});

			win.loadFile(join(__dirname, 'UI', 'main.html'));
		});

		this.ChatProxy.on('started', (port) => {
			console.log('[Proxy] Proxy started on Port', port);
		});

		this.ChatProxy.on('connected', (session) => {
			//console.log('Connected to the Server:', session);
		});

		this.ChatProxy.on('sessionType', (session, typ) => {
			console.log(session, '[Type]', typ);
		});

		let color_swap			= true;
		const genericChatTree = GenericProtocol.parseTree(fs.readFileSync('./Data/GenericChatTree.txt').toString('utf8'));
		const genericCardTree = GenericProtocol.parseTree(fs.readFileSync('./Data/GenericCardTree.txt').toString('utf8'));

		const handleTreeUpdate = (tree, generic) => {
			if (generic.getName() === 'CONFIRM_PROTOCOL_HASH') {
				if (this.latestUpdatedTree) { // reuse latest stored GenericTree (after reconnect)
					tree.updateTree(this.latestUpdatedTree);
				}
			} else if(generic.getName() === 'CHANGE_PROTOCOL') {
				this.latestUpdatedTree = generic.get('PROTOCOL_DATA').value; // store latest GenericTree
				tree.updateTree(this.latestUpdatedTree);

				console.info('Protocol changed', tree.hash);
			}
		};

		// CardProxy test
		this.CardProxy.on('packet', (session, typ, buffer) => {
			let generic = genericCardTree.read(buffer);

			handleTreeUpdate(genericCardTree, generic);

			if(win) {
				win.webContents.send('log', {
					serverTyp:	'CARD',
					session:	session,
					typ:		typ,
					packet:		buffer,
					hex:		buffer.toString('hex'),
					generic:	generic ? generic.toJSON() : undefined
				});
			}
			console.log(typ, buffer);
			console.log(generic.toJSON());
			return buffer;
		});
		this.CardProxy.on('exception', (type, session, error) => {
			console.error('[Error] on ' + type + ':', session, error);
		});

		this.ChatProxy.on('packet', (session, typ, packet) => {
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

			if(opcode === ':' || opcode === 'q') {
				generic = genericChatTree.read(packet, 2);

				console.log(Chalk.hex('#3399FF')('[' + typ + ']'), Chalk.bgHex(color_swap ? '#C0C0C0' : '#808080').hex('#800080')(util.inspect(generic.toJSON(), { colors: true, depth: null, compact: false })));

				handleTreeUpdate(genericChatTree, generic);
				
				const p = opcode + '\0' + genericChatTree.write(generic);

				if(p !== packet) {
					console.log('FAIL   ', generic.getName());
					console.log('       ', Buffer.from(packet).toString('hex'));
					console.log('       ', Buffer.from(p).toString('hex'));
				}
			}

			// Send Definition to UI
			if(win) {
				win.webContents.send('log', {
					serverTyp:	'CHAT',
					session:	session,
					typ:		typ,
					packet:		packet,
					hex:		Buffer.from(packet).toString('hex'),
					definition:	definition,
					generic:	generic ? generic.toJSON() : undefined
				});
			}

			return packet;
		});

		this.ChatProxy.on('exception', (type, session, error) => {
			console.error('[Error] on ' + type + ':', session, error);
		});

		this.ChatProxy.on('HTTP', (session, typ, data) => {
			//console.error('[HTTP] Request', session, typ, data.toString('utf8'));
		});
		this.ChatProxy.on('HTTPS', (session, typ, data) => {
			//console.error('[HTTPS] Request', session, typ, data);
		});

		this.ChatProxy.on('disconnect', (session, type) => {
			//console.error('[Disconnect] from', session, type);
		});

		let _watcher = setInterval(() => {
			if(Definitions.isReady()) {
				clearInterval(_watcher);
				this.ChatProxy.start();
				this.CardProxy.start();
			}
		}, 500);
	}
}

new Main();