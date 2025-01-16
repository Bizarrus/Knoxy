import Network from 'node:net';
import Crypto from 'node:crypto';
import * as Events from 'node:events';
import { Readable } from 'node:stream';

export default class Proxy extends Events.EventEmitter {
	Configuration	= null;
	Proxy			= null;
	
	constructor(config) {
		super();
		
		this.Configuration	= config;
		this.Proxy			= Network.createServer((Client) => {
			let Server		= new Network.Socket();
			let ID			= Crypto.randomUUID();

			/* Incoming Connection */
			Server.connect(this.Configuration.Endpoint.Port, this.Configuration.Endpoint.Hostname, () => {
				this.emit('connected', ID);
			});
			
			/* Incoming Data */
			Client.on('data', (data) => {
				if(data.toString('utf-8').indexOf('HTTP/') > -1) {
					this.emit('HTTP', ID, data);
					Server.write(data);
					return;
				}
				
				const result = this.returnEmit('packet', ID, 'Client', data);
				
				if(typeof(result) === 'undefined' || result === true) {
					Server.write(data);
				}
			});

			Server.on('data', (data) => {
				if(data.toString('utf-8').indexOf('HTTP/') > -1) {
					this.emit('HTTP', ID, data);
					Client.write(data);
					return;
				}
				
				const result = this.returnEmit('packet', ID, 'Server', data);
				
				if(typeof(result) === 'undefined' || result === true) {
					Client.write(data);
				}
			});
			
			/* Disconnects */
			Client.on('end', () => {
				this.emit('disconnect', ID, 'Client');
				Server.end();
			});

			Server.on('end', () => {
				this.emit('disconnect', ID, 'Server');
				Client.end();
			});
			
			/* Errors */
			Client.on('error', (error) => {
				this.emit('exception', ID, 'Client', error);
			});
			
			Server.on('error', (error) => {
				this.emit('exception', ID, 'Server', error);
			});
		});
	}
	
	start() {
		this.Proxy.listen(this.Configuration.Proxy.Port, () => {
			this.emit('started', this.Configuration.Proxy.Port);
		});		
	}
	
	returnEmit(event, ...args) {
		const listeners = this.listeners(event);
		
		for(const listener of listeners) {
			return listener.apply(this, args);
		}
		
		return undefined;
	}
}