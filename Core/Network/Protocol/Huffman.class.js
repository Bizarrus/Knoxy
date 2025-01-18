import Tree from '../../../Data/Tree.json' with { type: 'json' };

export default (new class Huffman {
   constructor() {
      this.compressedData        = String.fromCharCode(...[ 92, 92, 92 ]);
      this.buffer                = Tree;
      this.totalBytesProcessed   = 0;
      this.totalBytesWritten     = 0;
      this.finished              = false;
      this.rawData               = undefined;
      this.readIndex             = 0;
      this.writeIndex            = 0;
   }

   decompress(buffer) {
      if (typeof (buffer) === 'undefined' || buffer === null) {
         return null;
      }

      let uncompressed = [];
      this.rawData = buffer;
      this.readIndex = 0;
      this.writeIndex = 0;
      this.finished = false;
      let ast = this.buffer;

      while (true) {
         if (this.finished) {
            let result = uncompressed.join('');
            this.totalBytesWritten += result.length;
            this.totalBytesProcessed += buffer.length;
            return result;
         }

         try {
            ast = ast[this.getBitValue()];

            if (ast[0] == null) {
               if (ast[1] != this.compressedData) {
                  uncompressed.push(ast[1]);
               } else {
                  let code = 0;

                  for (let index = 0; index < 16; index++) {
                     code |= this.getBitValue() << index;
                 }

                  uncompressed.push(String.fromCharCode(code));
               }

               ast = this.buffer; // Reset AST after finding a leaf
            }
         } catch (e) { }
      }
   }

   getBitValue() {
      if (!this.rawData || this.writeIndex >= this.rawData.length) {
         this.finished = true;
         return 0;
      }

      let result = (this.rawData[this.writeIndex] >> this.readIndex) & 1;
      this.readIndex++;

      if (this.readIndex > 7) {
         this.writeIndex++;
         this.readIndex = 0;
         this.finished = (this.writeIndex === this.rawData.length);
      }

      return result;
   }
}());