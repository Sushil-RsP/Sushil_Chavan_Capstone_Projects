const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, pixelFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const rgb = pixelFn(x, y, width, height);
      row[1 + x * 3] = rgb[0];
      row[1 + x * 3 + 1] = rgb[1];
      row[1 + x * 3 + 2] = rgb[2];
    }
    rawRows.push(row);
  }
  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData);
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

const outDir = path.resolve(__dirname, '..', 'sample_scans');

// 1. Normal Chest PA
const normalBuf = createPng(256, 256, (x, y, w, h) => {
  const inRightLung = ((x - 80)**2 / (38**2) + (y - 128)**2 / (70**2)) < 1.0;
  const inLeftLung = ((x - 176)**2 / (38**2) + (y - 128)**2 / (70**2)) < 1.0;
  const inHeart = ((x - 128)**2 / (32**2) + (y - 165)**2 / (42**2)) < 1.0;
  const inSpine = Math.abs(x - 128) < 12 && y > 30 && y < 220;

  let val = 180;
  if (inRightLung || inLeftLung) val = 42;
  if (inHeart) val = 160;
  else if (inSpine) val = 145;
  return [val, val, val];
});
fs.writeFileSync(path.join(outDir, 'sample_normal_chest_pa.png'), normalBuf);

// 2. Pneumonia / Consolidation (focal alveolar opacity in right lower lung zone)
const pneumoniaBuf = createPng(256, 256, (x, y, w, h) => {
  const inRightLung = ((x - 80)**2 / (38**2) + (y - 128)**2 / (70**2)) < 1.0;
  const inLeftLung = ((x - 176)**2 / (38**2) + (y - 128)**2 / (70**2)) < 1.0;
  const inHeart = ((x - 128)**2 / (32**2) + (y - 165)**2 / (42**2)) < 1.0;
  const inInfiltrate = ((x - 82)**2 / (22**2) + (y - 142)**2 / (24**2)) < 1.0;

  let val = 180;
  if (inRightLung || inLeftLung) val = 42;
  if (inInfiltrate) val = 145; // dense alveolar opacification
  if (inHeart) val = 160;
  return [val, val, val];
});
fs.writeFileSync(path.join(outDir, 'sample_pneumonia_consolidation.png'), pneumoniaBuf);

// 3. Cardiomegaly (grossly enlarged cardiothoracic ratio > 0.55)
const cardiomegalyBuf = createPng(256, 256, (x, y, w, h) => {
  const inRightLung = ((x - 80)**2 / (38**2) + (y - 128)**2 / (70**2)) < 1.0;
  const inLeftLung = ((x - 176)**2 / (38**2) + (y - 128)**2 / (70**2)) < 1.0;
  const inBigHeart = ((x - 138)**2 / (62**2) + (y - 165)**2 / (48**2)) < 1.0; // prominent left ventricular enlargement

  let val = 180;
  if (inRightLung || inLeftLung) val = 42;
  if (inBigHeart) val = 165;
  return [val, val, val];
});
fs.writeFileSync(path.join(outDir, 'sample_cardiomegaly_enlarged_heart.png'), cardiomegalyBuf);

// 4. Pleural Effusion (costophrenic angle blunting & fluid meniscus at right lung base)
const effusionBuf = createPng(256, 256, (x, y, w, h) => {
  const inRightLung = ((x - 80)**2 / (38**2) + (y - 128)**2 / (70**2)) < 1.0;
  const inLeftLung = ((x - 176)**2 / (38**2) + (y - 128)**2 / (70**2)) < 1.0;
  const inHeart = ((x - 128)**2 / (32**2) + (y - 165)**2 / (42**2)) < 1.0;
  const inFluidMeniscus = (x < 110 && y > 165 && (y - 165) > (110 - x) * 0.7);

  let val = 180;
  if (inRightLung || inLeftLung) val = 42;
  if (inFluidMeniscus) val = 175; // fluid blunting costophrenic sulcus
  if (inHeart) val = 160;
  return [val, val, val];
});
fs.writeFileSync(path.join(outDir, 'sample_pleural_effusion.png'), effusionBuf);

console.log('Successfully generated 4 synthetic medical sample scan images in sample_scans/ directory.');
