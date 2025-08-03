const fs = require('fs');
const path = require('path');

// Create a simple script to generate a basic ICO file
// This is a minimal ICO file header for a 256x256 icon
const icoHeader = Buffer.from([
  0x00, 0x00, // Reserved
  0x01, 0x00, // Type (1 = ICO)
  0x01, 0x00, // Number of images
  0x00, // Width (256, stored as 0)
  0x00, // Height (256, stored as 0)
  0x00, // Color count (0 = no palette)
  0x00, // Reserved
  0x01, 0x00, // Color planes
  0x20, 0x00, // Bits per pixel (32)
  0x00, 0x00, 0x04, 0x00, // Image size (262144 bytes)
  0x16, 0x00, 0x00, 0x00  // Image offset
]);

// Create a simple 256x256 RGBA bitmap (blue square with transparency)
const bitmapData = Buffer.alloc(262144); // 256*256*4 bytes for RGBA
for (let i = 0; i < 262144; i += 4) {
  bitmapData[i] = 174;     // Blue (0xAE)
  bitmapData[i + 1] = 171; // Green (0xAB)
  bitmapData[i + 2] = 118; // Red (0x76) - BGR format
  bitmapData[i + 3] = 255; // Alpha
}

// Combine header and bitmap
const icoFile = Buffer.concat([icoHeader, bitmapData]);

// Write to file
fs.writeFileSync(path.join(__dirname, 'assets', 'icon.ico'), icoFile);
console.log('Created 256x256 icon.ico file');