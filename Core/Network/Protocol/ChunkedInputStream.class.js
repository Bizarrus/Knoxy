export default class ChunkedInputStream {
    constructor(data = null) {
        this.buffer = data == null ? Buffer.alloc(0) : Buffer.from(data);
    }

    feed(chunk) {
        if (!chunk || chunk.length === 0) return;
        this.buffer = Buffer.concat([this.buffer, chunk]);
    }

    readByte() {
        if (this.buffer.length === 0) return -1;

        const b = this.buffer[0];
        this.buffer = this.buffer.slice(1);
        return b;
    }

    read(n) {
        if (this.buffer.length < n) return null;

        const out = this.buffer.slice(0, n);
        this.buffer = this.buffer.slice(n);
        return out;
    }

    available() {
        return this.buffer.length;
    }
}
