import Proxy from './Core/Network/Proxy.class.js';
import Definitions from './Core/Network/Protocol/Definitions.class.js';
import Packet from './Core/Network/Protocol/Packet.class.js';
import Huffman from './Core/Network/Protocol/Huffman.class.js';
import Chalk from 'chalk';
import {template} from 'chalk-template';

class Main {
	Configuration = {
		Proxy: {
			Port: 2710
		},
		Endpoint: {
			Hostname: 	'chat.knuddels.de',
			Port:		2710,
			Huffman:	'Tree_16.01.2025.bin'
		}
	};

	constructor() {
		Huffman.setTree(this.Configuration.Endpoint.Huffman);

		this.Proxy = new Proxy(this.Configuration);
		
		this.Proxy.on('started', (port) => {
			console.log('[Proxy] Proxy started on Port', port);
		});
		
		this.Proxy.on('connected', (session) => {
			//console.log('Connected to the Server:', session);
		});
		
		let color_swap = true;
		
		this.Proxy.on('packet', (session, typ, buffer) => {
			let packet		= Packet.decode(buffer);
			let protocol	= Huffman.decompress(packet);
			let parts		= protocol.split('\0');
			let opcode		= parts[0];
			color_swap		= !color_swap;
			let definition	= Definitions.resolve((typ === 'Server' ? 'Input' : 'Output'), opcode, parts);

			if(definition === null) {
				console.warn(Chalk.hex('#F0FF5E')('[WARN]'),  Chalk.bgHex(color_swap ? '#C0C0C0' : '#808080').hex('#444444')('Unknown Packet:'),  Chalk.bgHex(color_swap ? '#C0C0C0' : '#808080').hex('#FF0000')(opcode));
				return;
			}
			
			// CLI-Mode
			console.log(Chalk.hex('#3399FF')('[' + typ + ']'), Chalk.bgHex(color_swap ? '#C0C0C0' : '#808080').hex('#800080')(definition.toString()));
			
			// Send Definition to UI

			return true;
		});
		
		this.Proxy.on('exception', (type, session, error) => {
			//console.error('[Error] on ' + type + ':', session, error);
		});
		
		this.Proxy.on('HTTP', (session, data) => {
			//console.error('[HTTP] Request', session, data);
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