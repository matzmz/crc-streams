const { Readable } = require('stream');
const { CRC32WriteStream, CRC32TransformStream } = require('..');

function streamFromString(str) {
  return new Readable({
    read() {
      this.push(Buffer.from(str));
      this.push(null);
    }
  });
}

// Known CRC32 values (verified against standard implementations)
const HELLO_CRC32 = '3610A686';
const EMPTY_CRC32 = '00000000';

describe('CRC32WriteStream', () => {
  test('computes correct CRC32 for a string', (done) => {
    const ws = new CRC32WriteStream();
    streamFromString('hello').pipe(ws);
    ws.on('finish', () => {
      expect(ws.hex()).toBe(HELLO_CRC32);
      done();
    });
  });

  test('tracks byte size', (done) => {
    const ws = new CRC32WriteStream();
    streamFromString('hello').pipe(ws);
    ws.on('finish', () => {
      expect(ws.size()).toBe(5);
      done();
    });
  });

  test('returns zero checksum with no data', (done) => {
    const ws = new CRC32WriteStream();
    ws.end();
    ws.on('finish', () => {
      expect(ws.hex()).toBe(EMPTY_CRC32);
      expect(ws.size()).toBe(0);
      done();
    });
  });

  test('digest() returns a Buffer without encoding', (done) => {
    const ws = new CRC32WriteStream();
    streamFromString('hello').pipe(ws);
    ws.on('finish', () => {
      const buf = ws.digest();
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBe(4);
      done();
    });
  });

  test('digest(encoding) returns a string', (done) => {
    const ws = new CRC32WriteStream();
    streamFromString('hello').pipe(ws);
    ws.on('finish', () => {
      const hex = ws.digest('hex');
      expect(typeof hex).toBe('string');
      expect(hex).toBe('3610a686');
      done();
    });
  });

  test('handles multiple chunks correctly', (done) => {
    const ws = new CRC32WriteStream();
    ws.write('hel');
    ws.write('lo');
    ws.end();
    ws.on('finish', () => {
      expect(ws.hex()).toBe(HELLO_CRC32);
      expect(ws.size()).toBe(5);
      done();
    });
  });

  test('accepts an initial CRC value', (done) => {
    // Compute CRC of "hel" first
    const ws1 = new CRC32WriteStream();
    ws1.write('hel');
    ws1.end();
    ws1.on('finish', () => {
      // Continue with "lo" using previous checksum
      const ws2 = new CRC32WriteStream(ws1.checksum);
      ws2.write('lo');
      ws2.end();
      ws2.on('finish', () => {
        expect(ws2.hex()).toBe(HELLO_CRC32);
        done();
      });
    });
  });
});

describe('CRC32TransformStream', () => {
  test('computes correct CRC32 for a string', (done) => {
    const ts = new CRC32TransformStream();
    streamFromString('hello').pipe(ts);
    const chunks = [];
    ts.on('data', (chunk) => chunks.push(chunk));
    ts.on('finish', () => {
      expect(ts.hex()).toBe(HELLO_CRC32);
      done();
    });
  });

  test('passes data through unchanged', (done) => {
    const ts = new CRC32TransformStream();
    streamFromString('hello').pipe(ts);
    const chunks = [];
    ts.on('data', (chunk) => chunks.push(chunk));
    ts.on('end', () => {
      const output = Buffer.concat(chunks).toString();
      expect(output).toBe('hello');
      done();
    });
  });

  test('tracks byte size', (done) => {
    const ts = new CRC32TransformStream();
    streamFromString('hello').pipe(ts);
    ts.resume(); // consume output
    ts.on('finish', () => {
      expect(ts.size()).toBe(5);
      done();
    });
  });

  test('returns zero checksum with no data', (done) => {
    const ts = new CRC32TransformStream();
    ts.resume();
    ts.end();
    ts.on('finish', () => {
      expect(ts.hex()).toBe(EMPTY_CRC32);
      expect(ts.size()).toBe(0);
      done();
    });
  });

  test('digest() returns a Buffer without encoding', (done) => {
    const ts = new CRC32TransformStream();
    streamFromString('hello').pipe(ts);
    ts.resume();
    ts.on('finish', () => {
      const buf = ts.digest();
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBe(4);
      done();
    });
  });

  test('handles multiple chunks correctly', (done) => {
    const ts = new CRC32TransformStream();
    ts.resume();
    ts.write('hel');
    ts.write('lo');
    ts.end();
    ts.on('finish', () => {
      expect(ts.hex()).toBe(HELLO_CRC32);
      expect(ts.size()).toBe(5);
      done();
    });
  });

  test('accepts an initial CRC value', (done) => {
    const ts1 = new CRC32TransformStream();
    ts1.resume();
    ts1.write('hel');
    ts1.end();
    ts1.on('finish', () => {
      const ts2 = new CRC32TransformStream(ts1.checksum);
      ts2.resume();
      ts2.write('lo');
      ts2.end();
      ts2.on('finish', () => {
        expect(ts2.hex()).toBe(HELLO_CRC32);
        done();
      });
    });
  });

  test('produces same CRC as WriteStream', (done) => {
    const ws = new CRC32WriteStream();
    const ts = new CRC32TransformStream();
    const data = 'The quick brown fox jumps over the lazy dog';

    streamFromString(data).pipe(ws);
    streamFromString(data).pipe(ts);
    ts.resume();

    let finished = 0;
    const check = () => {
      finished++;
      if (finished === 2) {
        expect(ts.hex()).toBe(ws.hex());
        expect(ts.size()).toBe(ws.size());
        done();
      }
    };
    ws.on('finish', check);
    ts.on('finish', check);
  });
});
