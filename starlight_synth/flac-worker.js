window.createFlacWorker = () => {
  function workerMain() {
    function crc8(a) {
      let c = 0;
      for (const b of a) {
        c ^= b;
        for (let i = 0; i < 8; i++) c = c & 128 ? (c << 1) ^ 7 : c << 1;
      }
      return c & 255;
    }
    function crc16(a) {
      let c = 0;
      for (const b of a) {
        c ^= b << 8;
        for (let i = 0; i < 8; i++) c = c & 32768 ? (c << 1) ^ 0x8005 : c << 1;
      }
      return c & 65535;
    }
    function utf8num(n) {
      if (n < 128) return [n];
      if (n < 2048) return [192 | (n >> 6), 128 | (n & 63)];
      if (n < 65536)
        return [224 | (n >> 12), 128 | ((n >> 6) & 63), 128 | (n & 63)];
      return [
        240 | (n >> 18),
        128 | ((n >> 12) & 63),
        128 | ((n >> 6) & 63),
        128 | (n & 63),
      ];
    }
    function finishLoop(L, R, sr) {
      const count = L.length,
        fade = sr * 3,
        end = count - fade;
      let peak = 0.001;
      for (let i = 0; i < count; i++)
        peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
      let gain = 0.9 / peak;
      for (let i = 0; i < count; i++) {
        L[i] *= gain;
        R[i] *= gain;
      }
      for (let i = 0; i < fade; i++) {
        let theta = ((i / fade) * Math.PI) / 2,
          out = Math.cos(theta),
          into = Math.sin(theta);
        L[end + i] = L[end + i] * out + L[i] * into;
        R[end + i] = R[end + i] * out + R[i] * into;
      }
      return [L, R];
    }
    function encode(channels, sr) {
      const total = channels[0].length,
        last = total % 4096 || 4096,
        meta = new Uint8Array(42);
      meta.set([102, 76, 97, 67, 128, 0, 0, 34], 0);
      let view = new DataView(meta.buffer);
      view.setUint16(8, Math.min(last, 4096));
      view.setUint16(10, 4096);
      let packed =
        (BigInt(sr) << 44n) | (1n << 41n) | (15n << 36n) | BigInt(total);
      for (let i = 0; i < 8; i++)
        meta[18 + i] = Number((packed >> BigInt((7 - i) * 8)) & 255n);
      let chunks = [meta],
        size = meta.length;
      for (let off = 0; off < total; off += 4096) {
        let block = Math.min(4096, total - off),
          full = block === 4096,
          h = [255, 249, full ? 198 : 118, 24, ...utf8num(off)];
        if (!full) h.push((block - 1) >> 8, (block - 1) & 255);
        h.push(crc8(h));
        let data = new Uint8Array(h.length + 2 * (1 + block * 2) + 2),
          p = 0;
        data.set(h, p);
        p += h.length;
        for (let ch = 0; ch < 2; ch++) {
          data[p++] = 2;
          for (let i = 0; i < block; i++) {
            let sample = Math.max(
              -32768,
              Math.min(32767, Math.round(channels[ch][off + i] * 32767)),
            );
            data[p++] = (sample >> 8) & 255;
            data[p++] = sample & 255;
          }
        }
        let check = crc16(data.subarray(0, p));
        data[p++] = check >> 8;
        data[p++] = check & 255;
        chunks.push(data);
        size += data.length;
      }
      let output = new Uint8Array(size),
        at = 0;
      for (const chunk of chunks) {
        output.set(chunk, at);
        at += chunk.length;
      }
      return output.buffer;
    }
    self.onmessage = (e) => {
      try {
        const sr = e.data.sampleRate || 22050,
          L = new Float32Array(e.data.left),
          R = new Float32Array(e.data.right);
        self.postMessage({ stage: "encoding" });
        const buffer = encode(finishLoop(L, R, sr), sr);
        self.postMessage({ buffer }, [buffer]);
      } catch (error) {
        self.postMessage({ error: error.message || String(error) });
      }
    };
  }
  return new Worker(
    URL.createObjectURL(
      new Blob([`(${workerMain.toString()})()`], { type: "text/javascript" }),
    ),
  );
};
