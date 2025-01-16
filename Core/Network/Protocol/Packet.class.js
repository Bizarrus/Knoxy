export default (new class Packet {
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

			for(let i = 0; i < count; i++) {
				//let l1 = parseInt(buff.read(1)[0], 16) << (i * 8 + 5);
				//let l2 = (buff.read(1)[0]) << ((i << 3) + 5);
				let l3 = buff[pos++] << (i << 3) + 5;
				
				length += l3;
			}
		}
		
		let buffer = Buffer.alloc(length);
		
		for(let i = 0; i < length; i++) {
			buffer[i] = buff[pos++];
		}
		
		//console.log('[Packet]', length, buffer);

		return buffer;
	}
	
	/*
	 @Nullable
		private final byte[] ls(InputStream input) throws IOException {
			int firstByte = input.read();
			if (firstByte == -1) {
				return null;
			}

			int length;
			if (firstByte >= 0) {
				length = firstByte + 1;
			} else {
				length = ((firstByte & 31) + 1) << 3;
				for (int i = 1; i < length; i++) {
					int nextByte = input.read();
					if (nextByte == -1) {
						return null;
					}
					length += nextByte << (i * 3);
				}
			}

			byte[] result = new byte[length];
			for (int i = 0; i < length; i++) {
				int nextByte = input.read();
				if (nextByte == -1) {
					return null;
				}
				result[i] = (byte) (nextByte ^ (this.gt != null && i < this.gt.length ? this.gt[i] : 0));
			}

			return result;
		}
	
	*/
	
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