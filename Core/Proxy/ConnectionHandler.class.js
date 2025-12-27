/**
 * @author  Bizarrus, SeBiTM
 **/
import Network from 'node:net';
import ProtocolDetector, { ProtocolType } from './ProtocolDetector.class.js';
import KnuddelsHandler from './KnuddelsHandler.class.js';
import WebHandler from './WebHandler.class.js';
import * as Events from 'node:events';

export default class ConnectionHandler extends Events.EventEmitter {
	constructor({ id, clientSocket, config, plugins, parentServer }) {
		super();

		this.id				= id;
		this.clientSocket	= clientSocket;
		this.serverSocket	= new Network.Socket();
		this.config			= config;
		this.plugins		= plugins;
		this.protocolType	= null; // null, ProtocolType.HTTP, ProtocolType.BINARY
		this.binaryHandler	= null;
		this.httpHandler	= null;

		this.setupConnection();
	}

	setupConnection() {
		let firstPacketReceived = false;

		this.serverSocket.connect( this.config.Endpoint.Port, this.config.Endpoint.Hostname, () => {
			this.emit('connected');
		});

		this.clientSocket.on('data', (data) => {
			if(!firstPacketReceived) {
				firstPacketReceived = true;

				this.detectAndInitializeProtocol(data);
			}
		});

		this.clientSocket.on('error', (error) => this.emit('exception', 'Client', error));
		this.serverSocket.on('error', (error) => this.emit('exception', 'Server', error));
		this.clientSocket.once('close', () => this.handleClose('Client'));
		this.serverSocket.once('close', () => this.handleClose('Server'));
	}

	detectAndInitializeProtocol(firstPacket) {
		this.protocolType = ProtocolDetector.detect(firstPacket);

		if(this.protocolType === ProtocolType.HTTP) {
			this.httpHandler = new WebHandler({
				clientSocket:	this.clientSocket,
				serverSocket:	this.serverSocket,
				plugins:		this.plugins,
				firstPacket
			});

			this.httpHandler.on('request', (request) => this.emit('HTTP_REQUEST', 'Client', request));
			this.httpHandler.on('response', (response, matchedRequest, isHttps) => this.emit(isHttps ? 'HTTPS_RESPONSE' : 'HTTP_RESPONSE', 'Server', response, matchedRequest));
			this.httpHandler.on('exception', (source, error) => this.emit('exception', source, error));
		} else {
			this.binaryHandler = new KnuddelsHandler({
				clientSocket:	this.clientSocket,
				serverSocket:	this.serverSocket,
				plugins:		this.plugins,
				firstPacket
			});

			this.binaryHandler.on('packet', (source, packet) =>	this.emit('packet', source, packet));
			this.binaryHandler.on('sessionType', (type) => this.emit('sessionType', type));
			this.binaryHandler.on('exception', (source, error) => this.emit('exception', source, error));
		}
	}

	handleClose(source) {
		if(this.binaryHandler) {
			this.binaryHandler.cleanup();
		}

		if(this.httpHandler) {
			this.httpHandler.cleanup();
		}

		this.clientSocket.destroy();
		this.serverSocket.destroy();

		this.emit('disconnect', source);
	}

	close() {
		this.handleClose('Proxy');
	}
}