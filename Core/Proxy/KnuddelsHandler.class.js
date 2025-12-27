/**
 * @author  Bizarrus, SeBiTM
 **/
import ChunkedInputStream from '../Network/Protocol/ChunkedInputStream.class.js';
import CryptoSession from '../Network/Crypto/CryptoSession.class.js';
import Packet from '../Network/Protocol/Packet.class.js';
import Huffman from '../Network/Protocol/Compressor/Huffman.class.js';
import Definitions from '../Network/Protocol/Definitions.class.js';
import * as Events from 'node:events';

export const SessionType = Object.freeze({
	HUFFMAN:	'Huffman',
	CRYPTO:		'Crypto',
	GENERIC:	'Generic'
});

export default class KnuddelsHandler extends Events.EventEmitter {
	static CLIENT_IDENTIFIER		= 0x00;
	static CRYPTO_HEADER	= Buffer.from([0xFE, 0x53, 0xEF, 0x17]);

	constructor({ clientSocket, serverSocket, plugins, firstPacket }) {
		super();

		this.clientSocket	= clientSocket;
		this.serverSocket	= serverSocket;
		this.plugins		= plugins;
		this.clientStream	= new ChunkedInputStream();
		this.serverStream	= new ChunkedInputStream();
		this.sessionType	= null; // null, SessionType.HUFFMAN, SessionType.CRYPTO, SessionType.GENERIC
		this.cryptoClient	= null;
		this.cryptoServer	= null;
		this.decodeKey		= null;

		this.setupHandlers(firstPacket);
	}

	setupHandlers(firstPacket) {
		this.clientSocket.on('data', (data) => this.handleClientData(data));
		this.serverSocket.on('data', (data) => this.handleServerData(data));

		this.handleClientData(firstPacket);
	}

	handleClientData(data) {
		if(this.sessionType === null) {
			this.detectSessionType(data);
			return;
		}

		this.clientStream.feed(data);
		this.processClientPackets();
	}

	detectSessionType(data) {
		if(data[0] === KnuddelsHandler.CLIENT_IDENTIFIER) {
			this.clientStream.feed(data.slice(1));

			const bundle = Packet.decode(this.clientStream);

			if(!bundle) {
				return;
			}

			if(bundle.subarray(0, 4).equals(KnuddelsHandler.CRYPTO_HEADER)) {
				this.initializeCryptoSession(bundle);
			} else {
				this.sessionType = SessionType.HUFFMAN;
				this.emit('sessionType', this.sessionType);
			}
		} else {
			this.sessionType = SessionType.HUFFMAN;
			this.serverSocket.write(data);
		}
	}

	initializeCryptoSession(bundle) {
		this.cryptoClient = new CryptoSession();
		this.cryptoServer = new CryptoSession();

		this.cryptoClient.computeSharedSecret(bundle.subarray(4));
		const proxyPubKey = this.cryptoServer.getPublicKey();

		this.serverSocket.write(Buffer.concat([
			Buffer.from([KnuddelsHandler.CLIENT_IDENTIFIER]),
			Packet.encode(proxyPubKey, Buffer.from([0xFE, 0x53, 0xEF, 0x17]))
		]));

		this.sessionType = SessionType.CRYPTO;
		this.emit('sessionType', this.sessionType);
	}

	processClientPackets() {
		let bundle;

		while((bundle = Packet.decode(this.clientStream)) !== null) {
			try {
				if(this.cryptoClient && this.cryptoClient.hasAesKey()) {
					bundle = this.cryptoClient.decrypt(bundle);
				}

				let packet = bundle;

				if(this.sessionType !== SessionType.GENERIC) {
					packet = this.decompressHuffman(packet, 'Client');
				}

				this.emit('packet', 'Client', packet);
				this.sendPacket('Output', this.serverSocket, this.cryptoServer, packet, null);
			} catch (e) {
				this.emit('exception', 'Client', e);
			}
		}
	}

	handleServerData(data) {
		this.serverStream.feed(data);

		if(this.cryptoServer && !this.cryptoServer.hasAesKey()) {
			const bundle = Packet.decode(this.serverStream);

			if(!bundle) {
				return;
			}

			this.cryptoServer.computeSharedSecret(bundle);
			this.clientSocket.write(Packet.encode(this.cryptoClient.getPublicKey()));
			return;
		}

		this.processServerPackets();
	}

	processServerPackets() {
		let bundle;

		while(true) {
			const tempStream	= new ChunkedInputStream(this.serverStream.buffer);
			bundle								= Packet.decode(tempStream);

			if(!bundle) {
				break;
			}

			this.serverStream.buffer = tempStream.buffer;

			try {
				if(this.cryptoServer && this.cryptoServer.hasAesKey()) {
					bundle = this.cryptoServer.decrypt(bundle);
				}

				let packet = bundle;

				if(this.sessionType !== SessionType.GENERIC) {
					packet = this.decompressHuffman(packet, 'Server');
				}

				this.emit('packet', 'Server', packet);
				this.sendPacket('Input', this.clientSocket, this.cryptoClient, packet, this.decodeKey);

				// Decode-Key aus Packet extrahieren
				if(typeof(packet) === 'string') {
					const tokens = packet.split('\0');

					if(tokens[0] === '(') {
						this.decodeKey = Buffer.from(tokens[3].trim());
					}
				}
			} catch(error) {
				this.emit('exception', 'Server', error);
			}
		}
	}

	decompressHuffman(buffer, source) {
		try {
			if(this.decodeKey && source === 'Server') {
				for(let i = 0; i < buffer.length; i++) {
					buffer[i] ^= (i < this.decodeKey.length ? this.decodeKey[i] : 0);
				}
			}

			return Huffman.decompress(buffer);
		} catch(error) {
			this.emit('exception', source, error);
			return null;
		}
	}

	sendPacket(type, socket, crypto, packetString, encodeKey) {
		let packet = packetString;

		// Plugin Processing
		if(this.plugins) {
			const parts			= packet.split('\0');
			const opcode		= parts[0];
			const definition	= Definitions.resolve(type, opcode, parts, packet);

			try {
				if(this.sessionType === SessionType.GENERIC) {
					packet = this.plugins.onGeneric(packetString, definition)
				} else {
					packet = this.plugins.onPacket(packetString, definition);
				}
			} catch (e) {
				this.emit('exception', 'Plugin', e);
			}
		}

		// Plugin hat Packet gefiltert
		if(packet === null) {
			return;
		}

		let buffer = packet;

		// Kompression
		if(this.sessionType !== SessionType.GENERIC) {
			buffer = Huffman.compress(buffer);
		}

		// "Verschlüsselung"
		if(crypto && crypto.hasAesKey()) {
			if(encodeKey) {
				for (let i = 0; i < buffer.length; i++) {
					buffer[i] ^= (i < encodeKey.length ? encodeKey[i] : 0) & 0xFF;
				}
			}

			buffer = crypto.encrypt(buffer);
			buffer = Packet.encode(buffer, null, null);
		} else {
			buffer = Packet.encode(buffer, null, encodeKey);
		}

		socket.write(buffer);
	}

	cleanup() {
		this.decodeKey		= null;
		this.cryptoClient	= null;
		this.cryptoServer	= null;
		this.clientStream	= null;
		this.serverStream	= null;
	}
}