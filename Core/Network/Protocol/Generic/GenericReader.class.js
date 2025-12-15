export default class GenericReader {
    constructor(data, position = 0) {
        if (typeof data === 'string') {
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

    read() {
        return this.position === this.length ? -1 : (this.readByte() & 0xFF);
    }

    readBuffer(buffer, offset = 0, length = buffer.length) {
        for (let i = 0; i < length; i++) {
            buffer[offset + i] = this.readByte() & 0xFF;
        }
    }

    readByte() {
        if (this.byteData === null) {
            const c = this.stringData.charCodeAt(this.position++);
            return (c << 24) >> 24;
        } else {
            return (this.byteData[this.position++] << 24) >> 24;
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

    readInt() {
        const b1 = this.readByte() & 0xFF;
        const b2 = this.readByte() & 0xFF;
        const b3 = this.readByte() & 0xFF;
        const b4 = this.readByte() & 0xFF;
        return (b1 << 24) | (b2 << 16) | (b3 << 8) | b4;
    }

    readLong() {
        let r = 0n;
        for (let i = 0; i < 8; i++) {
            r = (r << 8n) | BigInt(this.readByte() & 0xFF);
        }
        if (r & (1n << 63n)) r -= 1n << 64n;
        return r;
    }

    readFloat() {
        const v = this.readInt();
        const buf = Buffer.allocUnsafe(4);
        buf.writeInt32BE(v, 0);
        return buf.readFloatBE(0);
    }

    readDouble() {
        let v = this.readLong();
        if (v < 0) v += 1n << 64n;
        const buf = Buffer.allocUnsafe(8);
        buf.writeBigUInt64BE(v, 0);
        return buf.readDoubleBE(0);
    }

    readShort() {
        let v = (this.read() << 8) | this.read();
        if (v & 0x8000) v -= 0x10000;
        return v;
    }

    readUnsignedByte() {
        return this.read();
    }

    readUnsignedShort() {
        return this.readShort() & 0xFFFF;
    }

    readBuffer(buffer, offset = 0, length = buffer.length) {
        for (let i = 0; i < length; i++) {
            buffer[offset + i] = this.readByte() & 0xFF;
        }
    }

    readUTF() {
        const utfLength = this.readUnsignedShort();

        const byteArray = Buffer.allocUnsafe(utfLength);
        this.readBuffer(byteArray, 0, utfLength);

        // Java: char[] charArray = new char[utfLength];
        const charArray = new Array(utfLength).fill('\u0000');

        let count = 0;
        let chararrCount = 0;

        // while (count < utfLength) { c = byteArray[count] & 0xff; if (c > 127) break; ... }
        while (count < utfLength) {
            const c = byteArray[count] & 0xFF;
            if (c > 127) break;
            count++;
            charArray[chararrCount++] = String.fromCharCode(c);
        }

        while (count < utfLength) {
            const c = byteArray[count] & 0xFF;

            switch (c >> 4) {
            case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7: {
                count++;
                charArray[chararrCount++] = String.fromCharCode(c);
                break;
            }

            case 12:
            case 13: {
                count += 2;
                if (count > utfLength) throw new Error("[Error] malformed input: partial character at end");
                const char2 = byteArray[count - 1];
                if ((char2 & 0xC0) !== 0x80) throw new Error("[Error] malformed input around byte " + count);
                charArray[chararrCount++] = String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                break;
            }

            case 14: {
                count += 3;
                if (count > utfLength) throw new Error("[Error] malformed input: partial character at end");
                const char2 = byteArray[count - 2];
                const char3 = byteArray[count - 1];
                if (((char2 & 0xC0) !== 0x80) || ((char3 & 0xC0) !== 0x80)) {
                throw new Error("[Error] malformed input around byte " + (count - 1));
                }
                charArray[chararrCount++] = String.fromCharCode(
                ((c & 0x0F) << 12) |
                ((char2 & 0x3F) << 6) |
                ((char3 & 0x3F) << 0)
                );
                break;
            }

            default:
                throw new Error("[Error] malformed input around byte " + count);
            }
        }
        return charArray.join('');
    }

    skipBytes(n) {
        const old = this.position;
        this.position = Math.min(this.length, this.position + n);
        return this.position - old;
    }
}
