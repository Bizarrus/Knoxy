/**
 * @author  Bizarrus, SeBiTM
 **/
import Proxy from './Core/Network/Proxy.class.js';
import Client from './Core/Client.class.js';
import GenericTree from './Core/Network/Tree.class.js';
import Plugins from './Core/Plugins.class.js';
import LogWindow from './Core/Window/Log.class.js';
import MainWindow from './Core/Window/Main.class.js';
import ConfigWindow from './Core/Window/Config.class.js';
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
				Hostname: 'chat.knuddels.de',
				Port: 2710
			}
		},
		Card: {
			Proxy: {
				Port: 2810
			},
			Endpoint: {
				Hostname: 'chat.knuddels.de',
				Port: 2810
			}
		}
	};

	constructor() {
		this.Plugins = new Plugins();
		this.Client = new Client();

		// Proxies mit neuer API erstellen
		this.ChatProxy = new Proxy(this.Configuration.Chat, {
			plugins: this.Plugins
		});

		this.CardProxy = new Proxy(this.Configuration.Card, {
			parentServer: this.ChatProxy,
			plugins: this.Plugins
		});

		this.ChatTree = new GenericTree('./Data/Generic.tree');
		this.CardTree = new GenericTree('./Data/Generic.tree');
		this.MainWindow = new MainWindow();
		this.LogWindow = new LogWindow();
		this.ConfigWindow = new ConfigWindow();

		this.colorSwap = true;

		this.initializeApp();
		this.setupProxyHandlers();
		this.startProxiesWhenReady();
	}

	initializeApp() {
		app.whenReady().then(() => {
			this.MainWindow.init().then(() => {
				this.MainWindow.send('persistence:config', this.Client.getPersistence().getConfig());
				this.MainWindow.send('persistence:users', this.Client.getPersistence().getUsers());
			});

			this.setupIpcHandlers();
		});
	}

	setupIpcHandlers() {
		ipcMain.on('init', (event, data) => {
			this.MainWindow.send('persistence:config', this.Client.getPersistence().getConfig());
			this.MainWindow.send('persistence:users', this.Client.getPersistence().getUsers());
		});

		ipcMain.on('action', (event, action, value, data) => {
			this.handleAction(event, action, value, data);
		});
	}

	handleAction(event, action, value, data) {
		const webContents = event.sender;

		switch (action) {
			case 'log':
				console.log(action, value, data);
				this.LogWindow.init(this.MainWindow).then(() => {
					this.LogWindow.send('log', data);
				});
				break;

			case 'config':
				this.ConfigWindow.init(this.MainWindow).then(() => {
					this.ConfigWindow.send('client', {
						java: this.Client.getJavaPath(),
						version: this.Client.getUpdateStream()
					});
				});
				break;

			case 'client':
				this.handleClientAction(webContents, value);
				break;

			case 'proxy':
				this.handleProxyAction(webContents, value);
				break;

			case 'dev':
				this.handleDevAction(webContents, value);
				break;

			default:
				console.warn('[Action] Unknown Action:', action, value, data);
				break;
		}
	}

	handleClientAction(webContents, value) {
		let clientState = false;

		switch (value) {
			case 'toggle':
				if (this.Client.isRunning()) {
					this.Client.close();
				} else {
					this.Client.open(this.Configuration.Chat.Proxy.Port);
					clientState = true;
				}
				break;

			case 'start':
				if (this.Client.isRunning()) {
					webContents.send('dialog', 'Client is already running!');
					return;
				}
				this.Client.open(this.Configuration.Chat.Proxy.Port);
				clientState = true;
				break;

			case 'stop':
				if (!this.Client.isRunning()) {
					webContents.send('dialog', 'Client is not running!');
					return;
				}
				this.Client.close();
				break;
		}

		webContents.send('button', {
			action: 'client:toggle',
			state: clientState
		});
	}

	handleProxyAction(webContents, value) {
		switch (value) {
			case 'start':
				this.ChatProxy.start();
				this.CardProxy.start();
				console.log('[Proxy] Started');
				break;

			case 'stop':
				this.ChatProxy.stop();
				this.CardProxy.stop();
				console.log('[Proxy] Stopped');
				break;

			case 'toggle':
				// @ToDo: Track proxy state and toggle
				break;
		}
	}

	handleDevAction(webContents, value) {
		switch (value) {
			case 'toggle':
				if (webContents.isDevToolsOpened()) {
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
	}

	setupProxyHandlers() {
		this.setupChatProxyHandlers();
		this.setupCardProxyHandlers();
	}

	setupChatProxyHandlers() {
		this.ChatProxy.on('connected', (session) => {
			console.log('[Chat] Connected:', session);
		});

		this.ChatProxy.on('sessionType', (session, type) => {
			console.log('[Chat]', session, '[Type]', type);
		});

		this.ChatProxy.on('packet', (session, type, packet) => {
			this.handleChatPacket(session, type, packet);
		});

		this.ChatProxy.on('exception', (session, type, error) => {
			console.error('[Chat Error] on', type, ':', session, error);
		});

		this.ChatProxy.on('HTTP_REQUEST', (type, request) => {
			this.handleHTTPRequest(request, false);
		});

		this.ChatProxy.on('HTTP_RESPONSE', (type, response, originalRequest) => {
			this.handleHTTPResponse(response, originalRequest, false);
		});

		this.ChatProxy.on('HTTPS_REQUEST', (type, request) => {
			this.handleHTTPRequest(request, true);
		});

		this.ChatProxy.on('HTTPS_RESPONSE', (type, response, originalRequest) => {
			this.handleHTTPResponse(response, originalRequest, true);
		});

		this.ChatProxy.on('disconnect', (session, type) => {
			console.log('[Chat] Disconnect:', session, type);
		});
	}

	setupCardProxyHandlers() {
		this.CardProxy.on('connected', (session) => {
			console.log('[Card] Connected:', session);
		});

		this.CardProxy.on('sessionType', (session, type) => {
			console.log('[Card]', session, '[Type]', type);
		});

		this.CardProxy.on('packet', (session, type, buffer) => {
			this.handleCardPacket(session, type, buffer);
		});

		this.CardProxy.on('exception', (session, type, error) => {
			console.error('[Card Error] on', type, ':', session, error);
		});

		this.CardProxy.on('disconnect', (session, type) => {
			console.log('[Card] Disconnect:', session, type);
		});
	}

	handleChatPacket(session, type, packet) {
		const parts = packet.split('\0');
		const opcode = parts[0];
		this.colorSwap = !this.colorSwap;

		const direction = type === 'Server' ? 'Input' : 'Output';
		const definition = Definitions.resolve(direction, opcode, parts, packet);

		let generic = null;
		const genericChatTree = this.ChatTree.get();

		try {
			if (opcode === ':' || opcode === 'q') {
				//console.log('GENERIC RAW', packet);
				//console.log('GENERIC HEX', Buffer.from(packet).toString('hex').match(/.{1,2}/g).join(' '));

				if (genericChatTree !== null) {
					generic = genericChatTree.read(packet, 2);

					if (this.ChatTree.isTreeCheck(generic)) {
						packet = this.ChatTree.modifyTreeCheck(generic);
					}

					this.ChatTree.handleUpdate(genericChatTree, generic);

					// Verify encoding
					const reencoded = opcode + '\0' + genericChatTree.write(generic);
					if (reencoded !== packet) {
					/*	console.log('ENCODING MISMATCH:', generic.getName());
						console.log('Original :', Buffer.from(packet).toString('hex'));
						console.log('Reencoded:', Buffer.from(reencoded).toString('hex'));*/
					}
				}
			}
		} catch (error) {
			console.error('[Chat] Generic processing error:', error);
		}

		// Send to UI
		this.MainWindow.send('log', {
			serverTyp: 'CHAT',
			session: session,
			typ: type,
			packet: packet,
			hex: Buffer.from(packet).toString('hex'),
			definition: definition,
			generic: generic ? generic.toJSON() : undefined
		});

		return packet;
	}

	handleCardPacket(session, type, buffer) {
		const genericCardTree = this.CardTree.get();

		if (genericCardTree === null) {
			console.log('[Card] Tree not loaded yet');
			return buffer;
		}

		try {
			const generic = genericCardTree.read(buffer);
			this.CardTree.handleUpdate(genericCardTree, generic);

			this.MainWindow.send('log', {
				serverTyp: 'CARD',
				session: session,
				typ: type,
				packet: buffer,
				hex: buffer.toString('hex'),
				generic: generic ? generic.toJSON() : undefined
			});

			//console.log('[Card]', type, buffer);
			//console.log(generic.toJSON());
		} catch (error) {
			console.error('[Card] Processing error:', error);
		}

		return buffer;
	}

	handleHTTPRequest(request, secured) {
		this.MainWindow.send('web:request', {
			type: 'request',
			secured: secured,
			requestId: request.getRequestId(),
			timestamp: request.getTimestamp(),
			method: request.getMethod(),
			path: request.getPath(),
			protocol: request.getProtocol(),
			headers: Object.fromEntries(request.getHeaders()),
			query: Object.fromEntries(request.getQueryParams()),
			content: request.getContent()?.toString('utf8')
		});
	}

	handleHTTPResponse(response, originalRequest, secured) {
		// originalRequest ist das Objekt aus pendingRequests.get()
		// mit { request, timestamp, path, method }
		this.MainWindow.send('web:response', {
			type: 'response',
			secured: secured,
			requestId: response.getRequestId(),
			timestamp: response.getTimestamp(),
			statusCode: response.getStatusCode(),
			statusMessage: response.getStatusMessage(),
			protocol: response.getProtocol(),
			headers: Object.fromEntries(response.getHeaders()),
			content: response.getContent()?.toString('utf8'),
			originalRequest: originalRequest ? {
				method: originalRequest.method,
				path: originalRequest.path,
				timestamp: originalRequest.timestamp,
				headers: originalRequest.request ? Object.fromEntries(originalRequest.request.getHeaders()) : {}
			} : null
		});
	}

	startProxiesWhenReady() {
		const watcher = setInterval(() => {
			if (Definitions.isReady()) {
				clearInterval(watcher);
				console.log('[Proxy] Starting proxies...');
				this.ChatProxy.start();
				this.CardProxy.start();
			}
		}, 500);
	}
}

new Main();
