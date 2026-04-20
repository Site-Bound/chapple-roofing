const sharp = require('sharp');
const path = require('path');

const INPUT  = path.join(__dirname, 'images', 'gct-logo.png');
const OUTPUT = path.join(__dirname, 'images', 'gct-logo-transparent.png');

async function removeBackground() {
  const { data, info } = await sharp(INPUT)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixels = new Uint8ClampedArray(data);

  for (let i = 0; i < pixels.length; i += channels) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    if (r < 40 && g < 40 && b < 40) {
      pixels[i + 3] = 0; // set alpha to transparent
    }
  }

  await sharp(Buffer.from(pixels), { raw: { width, height, channels } })
    .png()
    .toFile(OUTPUT);

  console.log(`Done — transparent logo saved to: ${OUTPUT}`);
}

removeBackground().catch(err => {
  console.error('Background removal failed:', err.message);
  process.exit(1);
});
