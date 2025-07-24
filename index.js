require('dotenv').config(); // Load .env file for AUTH_TOKEN
const express = require('express');
const axios = require('axios');
const multer = require('multer');
const sharp = require('sharp');
const bodyParser = require('body-parser');

const app = express();
const upload = multer();

// Load Bearer token from env or fallback
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-default-token';

// Increase payload limits as needed
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Favicon dimensions (px)
const size = 64;

/**
 * Basic Bearer token authentication middleware
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  if (token !== AUTH_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

/**
 * Resolve image input to a Buffer:
 *  - file: multipart upload
 *  - url: remote image
 *  - base64: data URI or raw base64
 */
async function getImageBuffer({ file, url, base64 }) {
  if (file) {
    return file.buffer;
  }
  if (url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'binary');
  }
  if (base64) {
    const match = base64.match(/^data:(.*);base64,(.*)$/);
    const data = match ? match[2] : base64;
    return Buffer.from(data, 'base64');
  }
  throw new Error('No image provided. Send as multipart file (field "image"), JSON url (imageUrl), or JSON base64 (imageBase64).');
}

/**
 * POST /favicon
 * Protected by Bearer token auth
 * Accepts either:
 *  - multipart/form-data with a file field named 'image'
 *  - JSON with fields 'imageUrl' or 'imageBase64'
 * Returns { favicon: <base64-data-uri> }
 */
app.post('/favicon', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { imageUrl, imageBase64 } = req.body;
    const imgBuffer = await getImageBuffer({
      file: req.file,
      url: imageUrl,
      base64: imageBase64,
    });

    const mask = Buffer.from(
      `<svg width="${size}" height="${size}">` +
      `<circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="black"/>` +
      `</svg>`
    );

    const outputBuffer = await sharp(imgBuffer)
      .resize(size, size)
      .png()
      .composite([{ input: mask, blend: 'dest-in' }])
      .toBuffer();

    const favicon = `data:image/png;base64,${outputBuffer.toString('base64')}`;
    res.json({ favicon });
  } catch (err) {
    console.error('Favicon generation error:', err);
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Favicon service running on port ${PORT}`));

