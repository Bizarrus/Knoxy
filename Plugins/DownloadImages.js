/**
 * @author  Bizarrus
 **/
import Plugin from '../Core/Plugin.class.js';
import FileSystem from 'node:fs';
import Path from 'node:path';
import Crypto from 'node:crypto';

export default class DownloadImages extends Plugin {
	Destination = './Cache/Images/';

	constructor() {
		super();

		this.enable();
	}

	onInit() {
		if(!FileSystem.existsSync(this.Destination)) {
			FileSystem.mkdirSync(this.Destination, { recursive: true });
		}
	}

	onRequest(request) {
		if(request.hasHeader('Content-Type')) {
			let extension = null;

			switch(request.getHeader('Content-Type')) {
				case 'image/png':
					extension = 'png';
				break;
				case 'image/jpg':
					extension = 'jpg';
				break;
				case 'image/jpeg':
					extension = 'jpeg';
				break;
				case 'image/gif':
					extension = 'gif';
				break;
				default:
					console.warn('Unknown Image Type:', request);
				break;
			}

			if(extension !== null) {
				const content		= request.getContent();
				const hash	= Crypto.createHash('md5').update(content).digest('hex');

				FileSystem.writeFileSync(Path.join(this.Destination, `${hash}.${extension}`), content);
			}
		}

		return true;
	}
}