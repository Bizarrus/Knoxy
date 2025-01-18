export default (new class Packet {
	DecodeKey = [ 'K' ];

	decode(buff) {
		let pos		= 0;
		let first	= buff[pos++];
		
		if(first === null) {
			return null;
		}
		
		if(first == -1) {
			return null;
		}
		
		let length		= 0;

		if(first >= 0) {
			length		= first + 1;
		} else {
			length		= (first & 0x1F) + 1;
			let count	= (first & 0x60) >>> 5;

			for(let i = 1; i < count; i++) {
				let nextByte = buff[pos++];

				if(nextByte == -1) {
					throw new IOException("Unexpected end of stream");
				}

				length += nextByte << (i - 1) * 8;
			}
		}
		
		let buffer = Buffer.alloc(length);
		
		for(let i = 0; i < length; i++) {
			let readByte	= buff[pos++];

			if(readByte == -1) {
				throw new IOException("Unexpected end of stream");
			}

			buffer[i] = (readByte ^ (this.DecodeKey != null && i < this.DecodeKey.length ? this.DecodeKey[i] : 0));
		}
		
		//console.log('[Packet]', length, buffer.length);

		return buffer;
	}
	
	encode(message) {
		if(typeof(message) === 'undefined') {
			return null;
		}
		
		const length = message.length - 1;
		let len;

		if(length < 128) {
			len = Buffer.from([ length ]);
		} else {
			let count = 0;
			console.log("ZWO");
			while((32 << ((count + 1) << 3)) <= length) {
			//while(32 << (count + 1 << 3) <= length) {
				count++;
			}

			count++;
			
			len			= Buffer.alloc(count + 1);
			len[0]		= (count << 5) | 0x80 | (length & 0x1F);
			//len[0]	= (count << 5 | 0x80 | length & 0x1F);

			for(let i = 1; i < len.length; i++) {
				len[i]		= (length >>> (8 * (i - 1)) + 5) & 0xFF;
				//len[i]	= (length >>> 8 * (i - 1) + 5);
			}
		}

		return Buffer.concat([ len, message ]);
	}
}());