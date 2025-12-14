export default class GenericReader {
    constructor(data, position = 0) {
        this.stringData = typeof data === 'string' ? data : null;
        this.byteData   = Buffer.isBuffer(data) ? data : null;
        this.position   = position;
        this.length     = this.stringData ? this.stringData.length : this.byteData.length;
    }

    read() {
        return this.position === this.length ? -1 : (this.readByte() & 0xFF);
    }

    readBytes(buffer, offset = 0, length = buffer.length) {
        for (let i = 0; i < length; i++) {
            buffer[offset + i] = this.readByte();
        }
    }

    readByte() {
        if (this.byteData === null) {
            return this.stringData.charCodeAt(this.position++) & 0xFF;
        }
        return this.byteData[this.position++];
    }

    readBoolean() {
        return this.readByte() > 0;
    }

    readChar() {
        if (this.byteData === null) {
            return this.stringData.charAt(this.position++);
        }
        return String.fromCharCode(this.readShort());
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
        return r;
    }

    readFloat() {
        const buf = Buffer.alloc(4);
        buf.writeInt32BE(this.readInt(), 0);
        return buf.readFloatBE(0);
    }

    readDouble() {
        const buf = Buffer.alloc(8);
        buf.writeBigInt64BE(this.readLong(), 0);
        return buf.readDoubleBE(0);
    }

    readShort() {
        const hi = this.readByte() & 0xFF;
        const lo = this.readByte() & 0xFF;
        const val = (hi << 8) | lo;
        return (val << 16) >> 16; // cast to signed short
    }

    readUnsignedByte() {
        return this.read();
    }

    readUnsignedShort() {
        return this.readShort() & 0xFFFF;
    }

    readUTF() {
        const utfLength = this.readUnsignedShort();
        const bytes = Buffer.alloc(utfLength);
        this.readBytes(bytes, 0, utfLength);
        return bytes.toString('utf8');
    }

    skipBytes(n) {
        this.position = Math.min(this.length, this.position + n);
    }
}
