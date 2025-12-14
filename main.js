import Proxy from './Core/Network/Proxy.class.js';
import Definitions from './Core/Network/Protocol/Definitions.class.js';
import Bundle from './Core/Network/Protocol/Packet.class.js';
import Huffman from './Core/Network/Protocol/Huffman.class.js';
import Chalk from 'chalk';
import {template} from 'chalk-template';
import GenericProtocol from './Core/Network/Protocol/Generic/GenericProtocol.class.js';
import fs from 'node:fs';

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
				console.log(Chalk.hex('#FF0000')(opcode), protocol.replace(/[\x00-\x1F\x7F-\x9F]/g, (char) => {
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
			
			if (opcode == ':' || opcode == 'q') {
				let generic = genericTree.read(packet, 2);
				console.log('GenericTest', typ, generic.getName(), generic.values);

				if (opcode == ':' && generic.getName() == 'CHANGE_PROTOCOL') {
					genericTree.updateTree(generic.get('PROTOCOL_DATA'));
				}
			}
			// Send Definition to UI

			return packet;
		});
		
		this.Proxy.on('exception', (type, session, error) => {
			//console.error('[Error] on ' + type + ':', session, error);
		});
		
		this.Proxy.on('HTTP', (session, data) => {
			//console.error('[HTTP] Request', session, data);
		});
		this.Proxy.on('HTTPS', (session, data) => {
			//console.error('[HTTPS] Request', session, data);
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