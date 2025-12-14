export default class GenericReader {
    constructor(data, position = 0) {
        if (typeof data === 'string') {
            // Java String = UTF-16 char array
            this.stringData = data;
            this.byteData = null;
            this.length = data.length;
        } else if (Buffer.isBuffer(data)) {
            this.byteData = data;
            this.stringData = null;
            this.length = data.length;
        } else {
            throw new Error('Invalid GenericReader input');
        }

        this.position = position;
    }

    /* read() */
    read() {
        return this.position === this.length ? -1 : (this.readByte() & 0xFF);
    }

    readBuffer(buffer, offset = 0, length = buffer.length) {
        for (let i = 0; i < length; i++) {
            buffer[offset + i] = this.readByte();
        }
    }

    readByte() {
        if (this.byteData === null) {
            // Java: (byte) string.charAt()
            return this.stringData.charCodeAt(this.position++) & 0xFF;
        } else {
            return this.byteData[this.position++];
        }
    }

    readBoolean() {
        return this.readByte() > 0;
    }

    readChar() {
        if (this.byteData === null) {
            return this.stringData.charAt(this.position++);
        } else {
            return String.fromCharCode(this.readShort());
        }
    }

    /* readDouble() */
    readDouble() {
        const buf = Buffer.allocUnsafe(8);
        for (let i = 0; i < 8; i++) buf[i] = this.readByte();
        return buf.readDoubleBE(0);
    }

    readFloat() {
        const buf = Buffer.allocUnsafe(4);
        for (let i = 0; i < 4; i++) buf[i] = this.readByte();
        return buf.readFloatBE(0);
    }

    readInt() {
        const b1 = this.readByte() & 0xFF;
        const b2 = this.readByte() & 0xFF;
        const b3 = this.readByte() & 0xFF;
        const b4 = this.readByte() & 0xFF;
        return (b1 << 24) | (b2 << 16) | (b3 << 8) | b4;
    }

    readLong() {
        let result = 0n;
        for (let i = 0; i < 8; i++) {
            result = (result << 8n) | BigInt(this.readByte() & 0xFF);
        }
        return result;
    }

    readShort() {
        return ((this.read() << 8) | this.read()) & 0xFFFF;
    }

    readUnsignedByte() {
        return this.read();
    }

    readUnsignedShort() {
        return this.readShort() & 0xFFFF;
    }

    readUTF() {
        const utfLength = this.readUnsignedShort();
        const byteArray = Buffer.allocUnsafe(utfLength);
        this.readBuffer(byteArray, 0, utfLength);

        let out = '';
        let i = 0;

        while (i < utfLength) {
            const c = byteArray[i] & 0xFF;
            if (c < 0x80) {
                out += String.fromCharCode(c);
                i++;
            } else if ((c >> 4) === 12 || (c >> 4) === 13) {
                const c2 = byteArray[i + 1];
                out += String.fromCharCode(
                    ((c & 0x1F) << 6) | (c2 & 0x3F)
                );
                i += 2;
            } else if ((c >> 4) === 14) {
                const c2 = byteArray[i + 1];
                const c3 = byteArray[i + 2];
                out += String.fromCharCode(
                    ((c & 0x0F) << 12) |
                    ((c2 & 0x3F) << 6) |
                    (c3 & 0x3F)
                );
                i += 3;
            } else {
                throw new Error('Malformed UTF');
            }
        }
        return out;
    }

    skipBytes(n) {
        const old = this.position;
        this.position = Math.min(this.length, this.position + n);
        return this.position - old;
    }
}
