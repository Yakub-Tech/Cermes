import sharp from 'sharp';

const MAXIMALE_BREITE = 1600;

sharp.block({ operation: ['VipsForeignLoad'] });
sharp.unblock({
  operation: ['VipsForeignLoadPngBuffer', 'VipsForeignLoadJpegBuffer', 'VipsForeignLoadWebpBuffer'],
});

async function komprimiereBild(puffer, mimetype) {
  const verkleinert = sharp(puffer).autoOrient().resize({ width: MAXIMALE_BREITE, withoutEnlargement: true });

  if (mimetype === 'image/webp') {
    return { puffer: await verkleinert.webp({ quality: 80 }).toBuffer(), endung: 'webp' };
  }
  if (mimetype === 'image/png') {
    const hatTransparenz = (await sharp(puffer).metadata()).hasAlpha;
    if (hatTransparenz) {
      return {
        puffer: await verkleinert.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer(),
        endung: 'png',
      };
    }
    return { puffer: await verkleinert.jpeg({ quality: 80 }).toBuffer(), endung: 'jpg' };
  }
  return { puffer: await verkleinert.jpeg({ quality: 80 }).toBuffer(), endung: 'jpg' };
}

const LOGO_MAXIMALE_KANTE = 512;

async function verkleinereLogo(puffer) {
  return sharp(puffer)
    .autoOrient()
    .resize({ width: LOGO_MAXIMALE_KANTE, height: LOGO_MAXIMALE_KANTE, fit: 'inside', withoutEnlargement: true })
    .toBuffer();
}

export { komprimiereBild, verkleinereLogo };
