# crc-streams

Node.js stream classes for computing CRC32 checksums on-the-fly.

## Installation

```bash
npm install crc-streams
```

## Usage

### CRC32TransformStream

A [Transform stream](https://nodejs.org/api/stream.html#class-streamtransform) that computes a CRC32 checksum while passing data through to the next stream in the pipeline.

```js
const fs = require('fs');
const { CRC32TransformStream } = require('crc-streams');

const input = fs.createReadStream('file.txt');
const output = fs.createWriteStream('copy.txt');
const crc = new CRC32TransformStream();

input.pipe(crc).pipe(output);

output.on('finish', () => {
  console.log('CRC32:', crc.hex());   // e.g. "3610A686"
  console.log('Size:', crc.size());    // bytes processed
  console.log('Buffer:', crc.digest()); // 4-byte Buffer
});
```

### CRC32WriteStream

A [Writable stream](https://nodejs.org/api/stream.html#class-streamwritable) that computes a CRC32 checksum by consuming data (no passthrough).

```js
const fs = require('fs');
const { CRC32WriteStream } = require('crc-streams');

const input = fs.createReadStream('file.txt');
const crc = new CRC32WriteStream();

input.pipe(crc);

crc.on('finish', () => {
  console.log('CRC32:', crc.hex());
  console.log('Size:', crc.size());
});
```

### API

Both classes share the same interface:

| Method | Description |
|---|---|
| `constructor(initialValue?)` | Optional initial CRC value (Buffer). Defaults to `0`. |
| `digest(encoding?)` | Returns the CRC32 checksum. Without encoding returns a 4-byte `Buffer`; with encoding (e.g. `'hex'`) returns a string. |
| `hex()` | Shorthand for `digest('hex').toUpperCase()`. |
| `size()` | Returns the total number of bytes processed. |

### Incremental CRC

You can pass an initial CRC value to continue a previous computation:

```js
const crc1 = new CRC32TransformStream();
// ... pipe some data through crc1 ...

// Continue with another stream using the previous checksum
const crc2 = new CRC32TransformStream(crc1.checksum);
```

## Debug

Enable debug output with the `DEBUG` environment variable:

```bash
DEBUG=crc32-* node app.js
```

## License

MIT
