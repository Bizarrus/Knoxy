/**
 * @author  Bizarrus
 **/
import Plugin from '../Core/Plugin.class.js';
import FileSystem from 'node:fs';
import Path from 'node:path';

export default class DownloadImages extends Plugin {
	Destination	= './Cache/Images/';
	Requests		= {};

	constructor() {
		super();
		this.enable();
	}

	onInit() {
		if(!FileSystem.existsSync(this.Destination)) {
			FileSystem.mkdirSync(this.Destination, { recursive: true });
		}
	}

	onRequest(id, request) {
		if(request.Path && request.Path.match(/\.(gif|jpg|jpeg|png|webp|bmp|svg)$/i)) {
			this.Requests[id] = {
				path:		request.Path,
				timestamp:	request.Timestamp
			};
		}

		return true;
	}

	onResponse(id, response) {
		if (response.hasHeader('Content-Type')) {
			let contentType		= response.getHeader('Content-Type');
			let extension	= null;

			if(contentType.indexOf('/') !== -1) {
				const [type, ext] = contentType.split('/', 2);

				if(type === 'image') {
					extension = ext;
				} else {
					console.warn('Unknown Image Type:', type);
					return true;
				}
			}

			if(!response.Content || response.Content.length === 0) {
				return true;
			}

			let relativePath	= '';
			let filename		= `${id}.${extension}`;

			if(this.Requests[id] && this.Requests[id].path) {
				relativePath = this.Requests[id].path;

				if(relativePath.startsWith('/')) {
					relativePath = relativePath.substring(1);
				}

				filename = relativePath;
			}

			const filepath	= Path.join(this.Destination, filename);
			const directory	= Path.dirname(filepath);

			if(!FileSystem.existsSync(directory)) {
				FileSystem.mkdirSync(directory, { recursive: true });
			}

			try {
				FileSystem.writeFileSync(filepath, response.Content);
				delete this.Requests[id];
			} catch (error) {
				console.error(error);
			}
		}

		return true;
	}
}