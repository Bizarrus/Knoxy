export default (new class Packet {

    decode(stream, decodeKey) {
        let rawFirst = stream.readByte();
        if (rawFirst === -1) 
            return null;

        let first = (rawFirst & 0x80) ? rawFirst - 256 : rawFirst;

        let length;
        if (first >= 0) {
            length = first + 1;
        } else {
            length = (rawFirst & 0x1F) + 1;
            let count = (rawFirst & 0x60) >> 5;
            let needed = count;
            if (stream.available() < needed) return null;

            for (let i = 0; i < count; i++) {
                let b = stream.readByte();
                if (b === -1) return null;
                b &= 0xFF;
                length += b << ((i << 3) + 5);
            }
        }

        if (stream.available() < length)
            return null;

        let buffer = Buffer.alloc(length);
        for (let i = 0; i < length; i++) {
            let b = stream.readByte();
            if (b === -1) return null;

            buffer[i] = (b ^ ((decodeKey && i < decodeKey.length) ? decodeKey[i] : 0)) & 0xFF;
        }

        return buffer;
    }

    encode(message, extraData = null, encodeKey = null) {
        if (typeof message === 'undefined') {
            return null;
        }

        if (encodeKey && encodeKey.length) {
            for (let i = 0; i < message.length; i++) {
				if (i < encodeKey.length) {
					message[i] = (message[i] ^ encodeKey[i]);
				}
			}
		}
        
        const length    = ((extraData && extraData.length ? extraData.length : 0) + message.length) - 1;
        let len;

        if (length < 128) {
            len = Buffer.from([ length ]);
        } else {
            let count = 0;
            while ((32 << ((count + 1) << 3)) <= length) {
                count++;
            }
            count++;

            len   = Buffer.alloc(count + 1);
            len[0]= (count << 5) | 0x80 | (length & 0x1F);

            for (let i = 1; i < len.length; i++) {
                len[i] = (length >>> ((8 * (i - 1)) + 5)) & 0xFF;
            }
        }

        return extraData
            ? Buffer.concat([len, extraData, message])
            : Buffer.concat([len, message]);
    }

}());