export default class BitStream {
    constructor(data = []) {
        this.data		= data;
        this.index		= 0;
        this.bitIndex	= 0;
    }

    addBits(value, length) {
        for(let i = 0; i < length; i++) {
            const bit = (value >> i) & 1;
			
            if(this.bitIndex === 0) {
                this.data.push(0);
            }
			
            this.data[this.data.length - 1]	|= (bit << this.bitIndex);
            this.bitIndex					= (this.bitIndex + 1) % 8;
        }
    }

    nextBit() {
        if(this.index >= this.data.length) {
            throw new Error('No more bits available');
        }
		
        const bit		= (this.data[this.index] >> this.bitIndex) & 1;
        this.bitIndex	= (this.bitIndex + 1) % 8;
		
        if(this.bitIndex === 0) {
            this.index++;
        }
		
        return bit;
    }

    hasNext() {
        return this.index < this.data.length || (this.index === this.data.length - 1 && this.bitIndex < 8);
    }

    toByteArray() {
        return this.data;
    }
}