/**
 * @author  Bizarrus, SeBiTM
 **/
import Proxy from './Core/Network/Proxy.class.js';
import Client from './Core/Client.class.js';
import GenericTree from './Core/Network/Tree.class.js';
import Plugins from './Core/Plugins.class.js';
import LogWindow from './Core/Window/Log.class.js';
import MainWindow from './Core/Window/Main.class.js';
import Definitions from './Core/Network/Protocol/Definitions.class.js';
import Chalk from 'chalk';
import util from 'node:util';
import { app, ipcMain } from 'electron';

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
		}
	};

	constructor() {
		this.Plugins		= new Plugins();
		this.Client			= new Client();
		this.ChatProxy		= new Proxy(this.Configuration.Chat, { plugins: this.Plugins });
		this.CardProxy		= new Proxy(this.Configuration.Card, { parentServer: this.ChatProxy });
		this.ChatTree		= new GenericTree('./Data/GenericChatTree.txt');
		this.CardTree		= new GenericTree('./Data/GenericCardTree.txt');
		this.MainWindow		= new MainWindow();
		this.LogWindow		= new LogWindow();

		app.whenReady().then(() => {
			this.MainWindow.init().then(() => {
				this.MainWindow.send('persistence:config', this.Client.getPersistence().getConfig());
				this.MainWindow.send('persistence:users', this.Client.getPersistence().getUsers());
			})

			ipcMain.on('refresh', (event, data) => {
				this.MainWindow.send('persistence:config', this.Client.getPersistence().getConfig());
				this.MainWindow.send('persistence:users', this.Client.getPersistence().getUsers());
			});

			ipcMain.on('action', (event, action, value, data) => {
				const webContents = event.sender;

				switch(action) {
					case 'log':
						this.LogWindow.init(this.MainWindow).then(() => {
							this.LogWindow.send('log', data);
						});
						break;
					case 'client':
						let clientState = false;

						switch(value) {
							case 'toggle':
								if(this.Client.isRunning()) {
									this.Client.close();
								} else {
									this.Client.open(this.Configuration.Chat.Proxy.Port);
									clientState = true;
								}
								break;
							case 'start':
								if(this.Client.isRunning()) {
									webContents.send('dialog', 'Client is already running!');
									return;
								}

								this.Client.open(this.Configuration.Chat.Proxy.Port);
								clientState = true;
								break;
							case 'stop':
								if(!this.Client.isRunning()) {
									webContents.send('dialog', 'Client is not running!');
									return;
								}

								this.Client.close();
								break;
						}

						webContents.send('button', {
							action:		'client:toggle',
							state:		clientState
						});
						break;
					case 'proxy':
						switch(value) {
							case 'start':
								// @ToDo Start the proxy
								break;
							case 'stop':
								// @ToDo Stop the proxy
								break;
							case 'toggle':
								// @ToDo Start/stop toggle proxy
								break;
						}
						break;
					case 'dev':
						switch(value) {
							case 'toggle':
								if(webContents.isDevToolsOpened()) {
									webContents.closeDevTools();
								} else {
									webContents.openDevTools();
								}
								break;
							case 'open':
								webContents.openDevTools();
								break;
							case 'close':
								webContents.closeDevTools();
								break;
						}
						break;
					default:
						console.warn('[Action] Unknown Action:', action, value, data);
						break;
				}
			});
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

		let color_swap	= true;

		// CardProxy test
		this.CardProxy.on('packet', (session, typ, buffer) => {
			let genericCardTree	= this.CardTree.get();
			let generic			= genericCardTree.read(buffer);

			this.CardTree.handleUpdate(genericCardTree, generic);

			this.MainWindow.send('log', {
				serverTyp:	'CARD',
				session:	session,
				typ:		typ,
				packet:		buffer,
				hex:		buffer.toString('hex'),
				generic:	generic ? generic.toJSON() : undefined
			});

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

			let generic	= null;
			let genericChatTree = this.ChatTree.get();

			try {
				if(opcode === ':' || opcode === 'q') {
					if(genericChatTree !== null) {
						generic = genericChatTree.read(packet, 2);

						console.log(Chalk.hex('#3399FF')('[' + typ + ']'), Chalk.bgHex(color_swap ? '#C0C0C0' : '#808080').hex('#800080')(util.inspect(generic.toJSON(), {
							colors: true,
							depth: null,
							compact: false
						})));

						this.ChatTree.handleUpdate(genericChatTree, generic);

						const p = opcode + '\0' + genericChatTree.write(generic);

						if(p !== packet) {
							console.log('FAIL   ', generic.getName());
							console.log('       ', Buffer.from(packet).toString('hex'));
							console.log('       ', Buffer.from(p).toString('hex'));
						}
					}
				}
			} catch(error) {
				console.error(error);
			}

			// Send Definition to UI
			this.MainWindow.send('log', {
				serverTyp:	'CHAT',
				session:	session,
				typ:		typ,
				packet:		packet,
				hex:		Buffer.from(packet).toString('hex'),
				definition:	definition,
				generic:	generic ? generic.toJSON() : undefined
			});

			return packet;
		});

		this.ChatProxy.on('exception', (type, session, error) => {
			console.error('[Error] on ' + type + ':', session, error);
		});

		// HTTP Request Handler
		this.ChatProxy.on('HTTP_REQUEST', (type, request) => {
			// console.log('[HTTP] Request:', request.getRequestId(), request.getMethod(), request.getPath());

			this.MainWindow.send('web:request', {
				type: 'request',
				secured: false,
				requestId: request.getRequestId(),
				timestamp: request.getTimestamp(),
				method: request.getMethod(),
				path: request.getPath(),
				protocol: request.getProtocol(),
				headers: Object.fromEntries(request.getHeaders()),
				query: Object.fromEntries(request.getQueryParams()),
				content: request.getContent()?.toString('utf8')
			});
		});

		// HTTP Response Handler (mit zugeordnetem Request)
		this.ChatProxy.on('HTTP_RESPONSE', (type, response, originalRequest) => {
			// console.log('[HTTP] Response:', response.getRequestId(), response.getStatusCode());

			this.MainWindow.send('web:response', {
				type: 'response',
				secured: false,
				requestId: response.getRequestId(),
				timestamp: response.getTimestamp(),
				statusCode: response.getStatusCode(),
				statusMessage: response.getStatusMessage(),
				protocol: response.getProtocol(),
				headers: Object.fromEntries(response.getHeaders()),
				content: response.getContent()?.toString('utf8'),
				originalRequest: originalRequest ? {
					method: originalRequest.getMethod(),
					path: originalRequest.getPath(),
					timestamp: originalRequest.getTimestamp(),
					headers: Object.fromEntries(originalRequest.getHeaders())
				} : null
			});
		});

		this.ChatProxy.on('HTTPS_REQUEST', (type, request) => {
			//console.log('[HTTPS] Request:', request.getRequestId(), request.getMethod(), request.getPath());

			this.MainWindow.send('web:request', {
				type: 'request',
				secured: true,
				requestId: request.getRequestId(),
				timestamp: request.getTimestamp(),
				method: request.getMethod(),
				path: request.getPath(),
				protocol: request.getProtocol(),
				headers: Object.fromEntries(request.getHeaders()),
				query: Object.fromEntries(request.getQueryParams()),
				content: request.getContent()?.toString('utf8')
			});
		});

		this.ChatProxy.on('HTTPS_RESPONSE', (type, response, originalRequest) => {
			// console.log('[HTTPS] Response:', response.getRequestId(), response.getStatusCode());

			this.MainWindow.send('web:response', {
				type: 'response',
				secured: true,
				requestId: response.getRequestId(),
				timestamp: response.getTimestamp(),
				statusCode: response.getStatusCode(),
				statusMessage: response.getStatusMessage(),
				protocol: response.getProtocol(),
				headers: Object.fromEntries(response.getHeaders()),
				content: response.getContent()?.toString('utf8'),
				originalRequest: originalRequest ? {
					method: originalRequest.getMethod(),
					path: originalRequest.getPath(),
					timestamp: originalRequest.getTimestamp(),
					headers: Object.fromEntries(originalRequest.getHeaders())
				} : null
			});
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