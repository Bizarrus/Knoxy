/*
 * @author SeBiTM
 **/
export default class BitStream {
	constructor(data = null) {
		this.bitBuffer	= [];
		this.bitIndex	= 0;
		this.byteIndex	= 0;

		if(data) {
			for(const byte of data) {
				this.bitBuffer.push(byte & 0xFF);
			}
		}
	}

	isAvailable() {
		return !(this.bitIndex === this.bitBuffer.length && this.byteIndex === 0);
	}

	addBit(bit) {
		if(this.byteIndex === 8) {
			this.byteIndex = 0;
			this.bitIndex++;
		}

		if(this.bitBuffer.length === this.bitIndex) {
			this.bitBuffer.push(0);
		}

		this.bitBuffer[this.bitIndex] = (this.bitBuffer[this.bitIndex] | ((bit & 1) << this.byteIndex)) & 0xFF;
		this.byteIndex++;
	}

	addBits(value, len) {
		value = value | 0; // force int32

		for(let j = 0; j < len; j++) {
			this.addBit((value >>> j) & 1);
		}
	}

	next() {
		const bit = (this.bitBuffer[this.bitIndex] >> this.byteIndex) & 1;

		if(++this.byteIndex === 8) {
			this.byteIndex = 0;
			this.bitIndex++;
		}

		return bit;
	}

	toBuffer() {
		return Buffer.from(this.bitBuffer.map(byte => byte & 0xFF));
	}
}