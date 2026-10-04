/* Codifica MP3 in un processo separato, così la pagina resta reattiva anche con file lunghi. */
importScripts('lib/lame.min.js');

onmessage = (e) => {
  const { channels, sampleRate, kbps } = e.data;
  const toInt16 = (f) => {
    const out = new Int16Array(f.length);
    for (let i = 0; i < f.length; i++) {
      const s = Math.max(-1, Math.min(1, f[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  };
  const left = toInt16(channels[0]);
  const right = channels[1] ? toInt16(channels[1]) : null;
  const encoder = new lamejs.Mp3Encoder(right ? 2 : 1, sampleRate, kbps);
  const block = 1152 * 32;
  const parts = [];
  for (let i = 0, step = 0; i < left.length; i += block, step++) {
    const out = right
      ? encoder.encodeBuffer(left.subarray(i, i + block), right.subarray(i, i + block))
      : encoder.encodeBuffer(left.subarray(i, i + block));
    if (out.length) parts.push(new Uint8Array(out.buffer, out.byteOffset, out.length));
    if (step % 20 === 0) postMessage({ progress: i / left.length });
  }
  const end = encoder.flush();
  if (end.length) parts.push(new Uint8Array(end.buffer, end.byteOffset, end.length));
  postMessage({ done: true, blob: new Blob(parts, { type: 'audio/mpeg' }) });
};
