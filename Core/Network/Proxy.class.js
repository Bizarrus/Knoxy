/**
 * @author  Bizarrus, SeBiTM
 **/
import Network from 'node:net';
import Crypto from 'node:crypto';
import * as Events from 'node:events';
import ConnectionHandler from '../Proxy/ConnectionHandler.class.js';

export default class Proxy extends Events.EventEmitter {
	constructor(config, { parentServer, plugins }) {
		super();

		this.config			= config;
		this.plugins		= plugins;
		this.parentServer	= parentServer;
		this.connections	= new Map();

		this.server = Network.createServer((clientSocket) => {
			this.handleNewConnection(clientSocket);
		});
	}

	handleNewConnection(clientSocket) {
		const id						= Crypto.randomUUID();
		const connection	= new ConnectionHandler({
			id,
			clientSocket,
			config:			this.config,
			plugins:		this.plugins,
			parentServer:	this.parentServer
		});

		connection.on('disconnect', (source) => {
			this.connections.delete(id);

			this.emit('disconnect', id, source);
		});

		connection.on('connected', () => this.emit('connected', id));
		connection.on('packet', (source, packet) => this.emit('packet', id, source, packet));
		connection.on('exception', (source, error) => this.emit('exception', id, source, error));
		connection.on('sessionType', (type) => this.emit('sessionType', id, type));
		connection.on('HTTP_REQUEST', (source, request) => this.emit('HTTP_REQUEST', source, request));
		connection.on('HTTP_RESPONSE', (source, response, matchedRequest) => this.emit('HTTP_RESPONSE', source, response, matchedRequest));
		connection.on('HTTPS_RESPONSE', (source, response, matchedRequest) => this.emit('HTTPS_RESPONSE', source, response, matchedRequest));

		this.connections.set(id, connection);
	}

	start() {
		this.server.listen(this.config.Proxy.Port, () => {
			console.log('Proxy started on port', this.config.Proxy.Port);
		});
	}

	stop() {
		for(const connection of this.connections.values()) {
			connection.close();
		}

		this.server.close();
	}
}