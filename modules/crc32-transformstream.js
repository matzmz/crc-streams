const debug = require('debug')('crc32-transform-streamer');
const stream = require('stream');
const crc32 = require('crc').crc32;


class CRC32TransformStream extends stream.Transform {
    constructor(initialValue) {
        super();
        this.rawSize = 0;

        if (intialValue) {
            this.checksum = initialValue;
        }
        else {
            this.checksum = Buffer.allocUnsafe(4);
            this.checksum.writeInt32BE(0, 0);
        }

        debug(`initialized value:${initialValue}`);
    }

    _transform(chunk, enc, done) {
        this.checksum = crc32(chunk, this.checksum);
        this.rawSize += chunk.length;
        debug(`read ${chunk.length} bytes - checksum ${this.hex()}`);
        done(null, chunk);
    }

    digest(encoding) {
        const checksum = Buffer.allocUnsafe(4);
        checksum.writeUInt32BE(this.checksum >>> 0, 0);
        return encoding ? checksum.toString(encoding) : checksum;
    }

    hex() {
        return this.digest('hex').toUpperCase();
    }

    size() {
        return this.rawSize;
    }

}

module.exports = CRC32TransformStream;
