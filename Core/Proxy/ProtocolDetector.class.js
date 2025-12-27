/**
 * @author  Bizarrus, SeBiTM
 **/
export const ProtocolType = Object.freeze({
	HTTP:	'HTTP',
	BINARY:	'BINARY',
});

export default class ProtocolDetector {
	static detect(buffer) {
		if(this.isHTTPRequest(buffer.toString('utf-8', 0, Math.min(buffer.length, 16)))) {
			return ProtocolType.HTTP;
		}

		return ProtocolType.BINARY;
	}

	static isHTTPRequest(string) {
		return string.startsWith('GET ') || string.startsWith('POST ') || string.startsWith('PUT ') || string.startsWith('DELETE ') || string.startsWith('HEAD ') || string.startsWith('OPTIONS ') || string.startsWith('PATCH ');
	}

	static isHTTPResponse(buffer) {
		return buffer.toString('utf-8', 0, Math.min(buffer.length, 9)).startsWith('HTTP/');
	}

	static isHTTPS(buffer) {
		return buffer[0] === 0x16 && buffer[1] === 0x03 && buffer[2] >= 0x00 && buffer[2] <= 0x04;
	}
}