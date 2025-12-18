/*
 * @author SeBiTM
 **/
export default class ChunkedInputStream {
	constructor(data = null) {
		if(data === null) {
			this.buffer = Buffer.alloc(0);
			return;
		}

		this.buffer = Buffer.from(data);
	}

	feed(chunk) {
		if(!chunk || chunk.length === 0) {
			return;
		}

		this.buffer = Buffer.concat([ this.buffer, chunk ]);
	}

	readByte() {
		if(this.buffer.length === 0) {
			return -1;
		}

		const byte= this.buffer[0];
		this.buffer		  = this.buffer.slice(1);
		return byte;
	}

	read(length) {
		if(this.buffer.length < length) {
			return null;
		}

		const bytes= this.buffer.slice(0, length);
		this.buffer					= this.buffer.slice(length);
		return bytes;
	}

	available() {
		return this.buffer.length;
	}
}
