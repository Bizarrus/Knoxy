export default class Request {
	Headers	= new Map();
	Content			= null;
	Method				= null;
	Path				= null;
	Protocol			= null;
	Query		= new Map();
	StatusCode			= null;
	StatusMessage		= null;
	IsResponse		= false;

	// @ToDo bad name? Request can be also an Response, rename class to HTTPPacket(?)
	constructor(data) {
		if(!Buffer.isBuffer(data)) {
			data = Buffer.from(data);
		}

		const headerEndIndex = data.indexOf('\r\n\r\n');

		if(headerEndIndex === -1) {
			throw new Error('Invalid HTTP message: no header/body separator found');
		}

		const headerSection	= data.slice(0, headerEndIndex).toString('utf8');
		const bodyStart		= headerEndIndex + 4;

		if(bodyStart < data.length) {
			this.Content = data.slice(bodyStart);
		}

		this.parseHeaders(headerSection);
	}

	parseHeaders(headerSection) {
		const lines = headerSection.split('\r\n');

		if(lines.length === 0) {
			throw new Error('Empty request');
		}

		const firstLine = lines[0];

		// HTTP Response: HTTP/1.1 200 OK
		if (firstLine.startsWith('HTTP/')) {
			this.IsResponse		= true;
			const parts			= firstLine.split(' ');
			this.Protocol		= parts[0];
			this.StatusCode		= parts[1] ? parseInt(parts[1]) : null;
			this.StatusMessage	= parts.slice(2).join(' ');

		// HTTP Request: GET /path HTTP/1.1
		} else {
			this.IsResponse		= false;
			const [method, fullPath, protocol] = firstLine.split(' ');

			this.Method			= method;
			this.Protocol		= protocol;

			if(fullPath && fullPath.includes('?')) {
				const [path, queryString] = fullPath.split('?');
				this.Path = path;

				this.parseQueryString(queryString);
			} else {
				this.Path = fullPath;
			}
		}

		for(let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();

			if(!line) {
				continue;
			}

			const colonIndex = line.indexOf(':');

			if(colonIndex === -1) {
				continue;
			}

			const key	= line.substring(0, colonIndex).trim();
			const value	= line.substring(colonIndex + 1).trim();

			this.Headers.set(key.toLowerCase(), value);
		}
	}

	parseQueryString(queryString) {
		const params = queryString.split('&');

		for(const param of params) {
			const [key, value] = param.split('=');

			if(key) {
				this.Query.set(decodeURIComponent(key), value ? decodeURIComponent(value) : '');
			}
		}
	}

	getHeaders() {
		return this.Headers;
	}

	hasHeader(key) {
		return this.Headers.has(key.toLowerCase());
	}

	getHeader(key) {
		return this.Headers.get(key.toLowerCase());
	}

	getContent() {
		return this.Content;
	}

	getMethod() {
		return this.Method;
	}

	getPath() {
		return this.Path;
	}

	getProtocol() {
		return this.Protocol;
	}

	getQueryParams() {
		return this.Query;
	}

	getQueryParam(key) {
		return this.Query.get(key);
	}

	getStatusCode() {
		return this.StatusCode;
	}

	getStatusMessage() {
		return this.StatusMessage;
	}

	isResponse() {
		return this.IsResponse;
	}
}