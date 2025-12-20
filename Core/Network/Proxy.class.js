/**
 * @author  Bizarrus, SeBiTM
 **/
import Network from 'node:net';
import Crypto from 'node:crypto';
import * as Events from 'node:events';
import Request from './HTTP/Request.class.js';
import Packet from './Protocol/Packet.class.js';
import Huffman from './Protocol/Compressor/Huffman.class.js';
import ChunkedInputStream from './Protocol/ChunkedInputStream.class.js';
import CryptoSession from './Crypto/CryptoSession.class.js';

export default class Proxy extends Events.EventEmitter {
	Plugins = null;

	constructor(config, { parentServer, plugins }) {
		super();

		this.Plugins		= plugins;
		this.Configuration	= config;

		this.Proxy = Network.createServer((Client) => {
			const CLIENT_IDENTIFIER		= 0x00;
			const CRYPTO_HEADER= Buffer.from([ 0xFE, 0x53, 0xEF, 0x17 ]);
			const Server			= new Network.Socket();
			const ID					= Crypto.randomUUID();
			const cStream	= new ChunkedInputStream();
			const sStream	= new ChunkedInputStream();
			let onlyTunnel			= false;
			let sessionType		= parentServer ? 'Generic' : null; // added type Generic or CardServer
			let cryptoServer			= null;
			let cryptoClient			= null;
			let decodeKey				= null;

			/* Incoming Connection */
			Server.connect(this.Configuration.Endpoint.Port, this.Configuration.Endpoint.Hostname, () => {
				this.emit('connected', ID);
			});

			const handleHuffman = (buffer, typ, decKey = null) => {
				try {
					if(decKey) {
						for(let i = 0; i < buffer.length; i++) {
							buffer[i] ^= (i < decKey.length ? decKey[i] : 0);
						}
					}

					return Huffman.decompress(buffer);
				} catch(e) {
					this.emit('exception', ID, typ, e);
				}

				return null;
			};

			const sendPacket = (socket, crypto, packetString, encodeKey = null) => {
				let packet = packetString;

				if (this.Plugins) {
					if (sessionType === 'Generic') {
						packet = this.Plugins.onGeneric(packetString); // todo GenericProtocol.write | would it be more sensible to use plugins in main.js?
					} else {
						packet = this.Plugins.onPacket(packetString);
					}
				}

				// Plugin has filtered the packet, so we don't send it!
				if(packet === null) {
					return;
				}

				let buffer = sessionType === 'Generic' ? packet : Huffman.compress(packet);

				if(crypto && crypto.hasAesKey()) {
					if(encodeKey) {
						for(let i = 0; i < buffer.length; i++) {
							buffer[i] ^= (i < encodeKey.length ? encodeKey[i] : 0) & 0xFF;
						}
					}

					buffer = crypto.encrypt(buffer);
					buffer = Packet.encode(buffer, null, null);
				} else {
					buffer = Packet.encode(buffer, null, encodeKey);
				}

				socket.write(buffer);
			};

			/* Incoming Data */
			Client.on('data', (data) => {
				// HTTP/S direkt durch
				if(this.isHTTPRequest(Client, data)) {
					onlyTunnel = true;
					return;
				}

				// ===== Client Hello / DH =====
				if(sessionType == null) {
					if(data[0] === CLIENT_IDENTIFIER) {
						cStream.feed(data.slice(1));

						const bundle = Packet.decode(cStream);

						if(!bundle) {
							return;
						}

						if(bundle.subarray(0, 4).equals(CRYPTO_HEADER)) {
							cryptoClient = new CryptoSession();
							cryptoServer = new CryptoSession();

							cryptoClient.computeSharedSecret(bundle.subarray(4));
							const proxyPubKey = cryptoServer.getPublicKey();

							Server.write(Buffer.concat([
								Buffer.from([ CLIENT_IDENTIFIER ]),

								Packet.encode(proxyPubKey, Buffer.from([ 0xFE, 0x53, 0xEF, 0x17 ]))
							]));

							sessionType = 'Crypto';
							this.emit('sessionType', ID, sessionType);
							return;
						} else {
							sessionType = 'Huffman';
							this.emit('sessionType', ID, sessionType);
						}

					// reconnect fallback ohne Crypto
					} else {
						sessionType = 'Huffman';
						Server.write(data);
						return;
					}
				} else {
					cStream.feed(data);
				}

				let bundle;
				while(true) {
					bundle = Packet.decode(cStream);

					if(!bundle) {
						break;
					}

					try {
						if(cryptoClient && cryptoClient.hasAesKey()) {
							bundle = cryptoClient.decrypt(bundle);
						}

						const packet = sessionType === 'Generic' ? bundle : handleHuffman(bundle, 'Client', null);

						this.returnEmit('packet', ID, 'Client', packet);
						sendPacket(Server, cryptoServer, packet, null);
					} catch(e) {
						this.emit('exception', ID, 'Client', e);
					}
				}
			});

			Server.on('data', (data) => {
				// HTTP/S direkt durch
				if(this.isHTTPRequest(Client, data)) {
					onlyTunnel = true;
					return;
				}

				sStream.feed(data);

				if(cryptoServer && !cryptoServer.hasAesKey()) {
					const bundle = Packet.decode(sStream);

					if(!bundle) {
						return;
					}

					cryptoServer.computeSharedSecret(bundle);
					Client.write(Packet.encode(cryptoClient.getPublicKey()));
					return;
				}

				let bundle;

				while(true) {
					const tempStream	= new ChunkedInputStream(sStream.buffer);
					bundle								= Packet.decode(tempStream);

					if(!bundle) {
						break;
					}

					sStream.buffer = tempStream.buffer;

					try {
						if(cryptoServer && cryptoServer.hasAesKey()) {
							bundle = cryptoServer.decrypt(bundle);
						}

						const packet = sessionType === 'Generic' ? bundle : handleHuffman(bundle, 'Server', decodeKey);

						this.returnEmit('packet', ID, 'Server', packet);
						sendPacket(Client, cryptoClient, packet, decodeKey);

						if (typeof packet === 'string') { // precess only Huffman pakets
							const tokens = packet.split('\0');
							// set decode key
							if(tokens[0] === '(') {
								decodeKey = Buffer.from(tokens[3].trim());
							}
						}
					} catch(e) {
						this.emit('exception', ID, 'Server', e);
					}
				}
			});

			/* Disconnects */
			const closeSessions = (source) => {
				decodeKey		= null;
				cryptoClient	= null;
				cryptoServer	= null;
				onlyTunnel		= false;

				Client.destroy();
				Server.destroy();

				this.emit('disconnect', ID, source);
			};

			Client.once('close', () => closeSessions('Client'));
			Server.once('close', () => closeSessions('Server'));

			/* Errors */
			Client.on('error', (e) =>
				this.emit('exception', ID, 'Client', e)
			);

			Server.on('error', (e) =>
				this.emit('exception', ID, 'Server', e)
			);
		});
	}

	start() {
		this.Proxy.listen(this.Configuration.Proxy.Port, () => {
			console.log('started', this.Configuration.Proxy.Port);
		});
	}

	returnEmit(event, ...args) {
		const listeners = this.listeners(event);

		for(const listener of listeners) {
			return listener.apply(this, args);
		}

		return undefined;
	}

	isHTTPRequest(Client, data, onlyTunnel) {
		// @ToDo wo kommen die Reuqests her, hier werden nur responses behandelt
		let http 	= data.toString('utf8').startsWith(Buffer.from('HTTP/'));
		let secured	= (data[0] === 0x16 && data[1] === 0x03 && data[2] >= 0x00 && data[2] <= 0x04);

		if(onlyTunnel || http || secured) {
			this.emit(secured ? 'HTTPS' : 'HTTP', 'Server', new Request(data));

			if (this.Plugins) {
				data = this.Plugins.onRequest(data);
			}

			// Plugin has filtered the packet, so we don't send it!
			if(data === null) {
				return true;
			}

			Client.write(data);
			return true;
		}

		return false;
	}
}