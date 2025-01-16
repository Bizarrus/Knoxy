import Proxy from './Core/Network/Proxy.class.js';
import Packet from './Core/Network/Protocol/Packet.class.js';
import Huffman from './Core/Network/Protocol/Huffman.class.js';

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
		let protocol;
		let auth = false;
		
		this.Proxy.on('packet', (session, typ, buffer) => {
			let packet		= Packet.decode(buffer);
			let protocol	= Huffman.decompress(packet);
			let parts		= protocol.split('\0');
			let opcode		= parts[0];
			
			switch(typ) {
				case 'Server':
					switch(opcode) {
						case '5':
							console.warn('[System Bots]', parts.slice(1));
						break;
						case 't':
							console.warn('[Action]', {
								channel:	parts[2],
								nickname:	parts[1],
								message:	parts[3]
							});
						break;
						case 'r':
							console.warn('[PrivateMessage]', {
								user: {
									sender:			parts[1],
									receiver:		parts[2]
								},
								channel:		parts[3],
								message: {
									to:		parts[4],
									from:	parts[5]
								}
							});
						break;
						case 'cnt':
							console.warn('[Modules]');
						break;
						default:
							console.log('[Packet]', typ, opcode, parts);
						break;
					}
				break;
				case 'Client':
					switch(opcode) {
						case 'n':
							console.warn('[Login]', {
								channel:	parts[1],
								nickname:	parts[2],
								password:	parts[3],
								bool:		parts[4]
							});
						break;
						case 'e':
							console.warn('[PublicMessage]', {
								channel:	parts[1],
								message:	parts[2]
							});
						break;
						case 'h':
							console.warn('[Ping]', parts[1]); // Nick|UnixTimestamp
						break;
						case 'q':
							console.warn('[GenericProtocol]');
						break;
						default:
							//console.log('[Packet]', typ, opcode, parts);
						break;
					}			
				break;
			}
			
			//console.log('[Client] TXT:', ).replace('\0', '\\0'));
			
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
		
		this.Proxy.start();
	}
}

new Main();