export default class GenericWriter {
    constructor(stringMode = false) {
        this.stringMode = stringMode;

        if (stringMode) {
            this.sb = [];
            this.buffers = null;
        } else {
            this.sb = null;
            this.buffers = [];
        }
    }

    write(value) {
        const b = value & 0xFF;

        if (this.stringMode) {
            this.sb.push(String.fromCharCode(b));
        } else {
            this.buffers.push(Buffer.from([b]));
        }
    }

    writeByte(v) {
        this.write(v);
    }

    writeBoolean(v) {
        this.write(v ? 1 : 0);
    }

    writeBytes(arr) {
        for (const b of arr) this.write(b);
    }

    writeShort(v) {
        this.write((v >>> 8) & 0xFF);
        this.write(v & 0xFF);
    }

    writeInt(v) {
        this.write((v >>> 24) & 0xFF);
        this.write((v >>> 16) & 0xFF);
        this.write((v >>> 8) & 0xFF);
        this.write(v & 0xFF);
    }

    writeLong(v) {
        let x = BigInt(v);
        if (x < 0n) x += 1n << 64n;

        for (let i = 7; i >= 0; i--) {
            this.write(Number((x >> BigInt(i * 8)) & 0xFFn));
        }
    }

    writeFloat(v) {
        const buf = Buffer.allocUnsafe(4);
        buf.writeFloatBE(v, 0);
        this.writeBytes(buf);
    }

    writeDouble(v) {
        const buf = Buffer.allocUnsafe(8);
        buf.writeDoubleBE(v, 0);
        this.writeBytes(buf);
    }

    writeChar(v) {
        if (this.stringMode) {
            this.sb.push(String.fromCharCode(v & 0xFFFF));
        } else {
            this.writeShort(v);
        }
    }

    writeChars(str) {
        if (this.stringMode) {
            for (let i = 0; i < str.length; i++) {
                this.sb.push(str.charAt(i));
            }
        } else {
            for (let i = 0; i < str.length; i++) {
                this.writeChar(str.charCodeAt(i));
            }
        }
    }

    writeUTF(str) {
        let utfLen = 0;

        for (let i = 0; i < str.length; i++) {
            const c = str.charCodeAt(i);
            if (c >= 0x0001 && c <= 0x007F) utfLen++;
            else if (c > 0x07FF) utfLen += 3;
            else utfLen += 2;
        }

        if (utfLen > 65535) {
            throw new Error("encoded string too long: " + utfLen);
        }

        this.writeShort(utfLen);

        for (let i = 0; i < str.length; i++) {
            const c = str.charCodeAt(i);

            if (c >= 0x0001 && c <= 0x007F) {
                this.write(c);
            } else if (c > 0x07FF) {
                this.write(0xE0 | ((c >> 12) & 0x0F));
                this.write(0x80 | ((c >> 6) & 0x3F));
                this.write(0x80 | (c & 0x3F));
            } else {
                this.write(0xC0 | ((c >> 6) & 0x1F));
                this.write(0x80 | (c & 0x3F));
            }
        }
    }


    toString() {
        return this.sb.join('');
    }

    toBuffer() {
        return Buffer.concat(this.buffers);
    }
}
