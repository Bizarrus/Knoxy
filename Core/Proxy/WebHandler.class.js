/**
 * @author  Bizarrus, SeBiTM
 **/
import Request from '../Network/HTTP/Request.class.js';
import ProtocolDetector from './ProtocolDetector.class.js';
import * as Events from 'node:events';

export default class WebHandler extends Events.EventEmitter {
	static REQUEST_TIMEOUT = 30000; // 30 Sekunden, @ToDo einstellbar machen(?)

	constructor({ clientSocket, serverSocket, plugins, firstPacket }) {
		super();

		this.clientSocket		= clientSocket;
		this.serverSocket		= serverSocket;
		this.plugins			= plugins;
		this.clientBuffer		= Buffer.alloc(0);
		this.serverBuffer		= Buffer.alloc(0);
		this.pendingRequests	= new Map();

		this.cleanupTimer = setInterval(
			() => this.cleanupTimedOutRequests(),
			5000
		);

		this.setupHandlers(firstPacket);
	}

	setupHandlers(firstPacket) {
		this.clientSocket.on('data', (data) => this.handleClientData(data));
		this.serverSocket.on('data', (data) => this.handleServerData(data));

		this.handleClientData(firstPacket);
	}

	handleClientData(data) {
		this.clientBuffer = Buffer.concat([this.clientBuffer, data]);

		if(this.isCompleteHTTPMessage(this.clientBuffer)) {
			this.processClientRequest();
		}
	}

	processClientRequest() {
		const request	= new Request(this.clientBuffer);
		const requestId	= request.getRequestId();

		this.pendingRequests.set(requestId, {
			request,
			timestamp:	Date.now(),
			path:		request.getPath(),
			method:		request.getMethod()
		});

		this.emit('request', request);

		// Plugin Filter
		if(this.plugins && !this.plugins.onRequest(requestId, request)) {
			this.clientBuffer = Buffer.alloc(0);
			this.pendingRequests.delete(requestId);
			return;
		}

		this.serverSocket.write(this.clientBuffer);
		this.clientBuffer = Buffer.alloc(0);
	}

	handleServerData(data) {
		this.serverBuffer = Buffer.concat([this.serverBuffer, data]);

		if(this.isCompleteHTTPMessage(this.serverBuffer)) {
			this.processServerResponse();
		}
	}

	processServerResponse() {
		const matchedRequestId	= this.findMatchingRequest();
		const response	= new Request(this.serverBuffer, matchedRequestId);
		let matchedRequest	= null;

		if(matchedRequestId) {
			matchedRequest = this.pendingRequests.get(matchedRequestId);
			this.pendingRequests.delete(matchedRequestId);
		}

		this.emit('response', response, matchedRequest, ProtocolDetector.isHTTPS(this.serverBuffer));

		// Plugin Filter
		if(this.plugins && !this.plugins.onResponse(matchedRequestId, response)) {
			this.serverBuffer = Buffer.alloc(0);
			return;
		}

		this.clientSocket.write(this.serverBuffer);
		this.serverBuffer = Buffer.alloc(0);
	}

	findMatchingRequest() {
		if(this.pendingRequests.size === 0) {
			return null;
		}

		// Ältesten Request finden (FIFO für HTTP/1.1)
		let oldestId			= null;
		let oldestTimestamp	= Infinity;

		for(const [reqId, reqData] of this.pendingRequests.entries()) {
			if(reqData.timestamp < oldestTimestamp) {
				oldestTimestamp	= reqData.timestamp;
				oldestId		= reqId;
			}
		}

		return oldestId;
	}

	cleanupTimedOutRequests() {
		const now = Date.now();

		for(const [reqId, reqData] of this.pendingRequests.entries()) {
			if(now - reqData.timestamp > WebHandler.REQUEST_TIMEOUT) {
				this.pendingRequests.delete(reqId);
				this.emit('exception', 'Timeout', new Error(`Request timeout: ${reqId}`));
			}
		}
	}

	isCompleteHTTPMessage(buffer) {
		const headerEndIndex = buffer.indexOf('\r\n\r\n');

		if(headerEndIndex === -1) {
			return false;
		}

		const headerSection			= buffer.slice(0, headerEndIndex).toString('utf8');
		const contentLengthMatch	= headerSection.match(/Content-Length:\s*(\d+)/i);

		if (contentLengthMatch) {
			const contentLength			= parseInt(contentLengthMatch[1]);
			const bodyStart						= headerEndIndex + 4;
			const receivedBodyLength	= buffer.length - bodyStart;

			return receivedBodyLength >= contentLength;
		}

		return true;
	}

	cleanup() {
		if(this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = null;
		}

		this.pendingRequests.clear();
		this.clientBuffer = null;
		this.serverBuffer = null;
	}
}