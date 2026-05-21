import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../dist');
const extensionDir = path.join(__dirname, '../extension');

// Create extension directory if it doesn't exist
if (!fs.existsSync(extensionDir)) {
  fs.mkdirSync(extensionDir);
}

// Copy manifest.json to extension directory
fs.copyFileSync(
  path.join(__dirname, '../manifest.json'),
  path.join(extensionDir, 'manifest.json')
);

// Copy background.js to extension directory
fs.copyFileSync(
  path.join(__dirname, '../background.js'),
  path.join(extensionDir, 'background.js')
);

// Copy content.js to extension directory
fs.copyFileSync(
  path.join(__dirname, '../content.js'),
  path.join(extensionDir, 'content.js')
);

// Copy popup.html to extension directory
fs.copyFileSync(
  path.join(__dirname, '../popup.html'),
  path.join(extensionDir, 'popup.html')
);

// Copy popup.js to extension directory
fs.copyFileSync(
  path.join(__dirname, '../popup.js'),
  path.join(extensionDir, 'popup.js')
);

// Copy dashboard.html to extension directory
fs.copyFileSync(
  path.join(__dirname, '../dashboard.html'),
  path.join(extensionDir, 'dashboard.html')
);

// Create assets directory
const assetsDir = path.join(extensionDir, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

// Copy dashboard.css to assets directory
fs.copyFileSync(
  path.join(__dirname, '../assets/dashboard.css'),
  path.join(assetsDir, 'dashboard.css')
);

// Copy dashboard.js to assets directory
fs.copyFileSync(
  path.join(__dirname, '../assets/dashboard.js'),
  path.join(assetsDir, 'dashboard.js')
);

// Download tailwind.min.css
const tailwindCssUrl = 'https://cdn.jsdelivr.net/npm/tailwindcss@3.3.6/dist/tailwind.min.css';
const tailwindCssPath = path.join(assetsDir, 'tailwind.min.css');

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
        console.log(`Downloaded ${url} to ${dest}`);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // Delete the file on error
      reject(err);
    });
  });
};

// Create icons directory
const iconsDir = path.join(extensionDir, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

// Copy icon files
const iconSizes = [16, 32, 48, 128];
iconSizes.forEach(size => {
  try {
    fs.copyFileSync(
      path.join(__dirname, `../public/icon${size}.png`),
      path.join(iconsDir, `icon${size}.png`)
    );
  } catch (error) {
    console.error(`Error copying icon${size}.png:`, error);
    // If icon doesn't exist, copy the available one
    try {
      fs.copyFileSync(
        path.join(__dirname, '../public/icon16.png'),
        path.join(iconsDir, `icon${size}.png`)
      );
    } catch (fallbackError) {
      console.error(`Error copying fallback icon for ${size}:`, fallbackError);
    }
  }
});

// Download Tailwind CSS
downloadFile(tailwindCssUrl, tailwindCssPath)
  .then(() => {
    console.log('Extension files prepared successfully!');
  })
  .catch(error => {
    console.error('Error preparing extension files:', error);
  });