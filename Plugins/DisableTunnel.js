/**
 * @author  Bizarrus
 **/
import Plugin from '../Core/Plugin.class.js';
import FileSystem from 'node:fs';
import Path from 'node:path';

export default class DownloadImages extends Plugin {
	Requests		= {};

	constructor() {
		super();
		this.enable();
	}

	onRequest(id, request) {
		if(request.Path && request.Path.match(/\/tunnel/i)) {
			return false;
		}

		return true;
	}
}