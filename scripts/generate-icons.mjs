import sharp from 'sharp';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, '../public/logo.svg');
const outputDir = join(__dirname, '../build-resources');

async function generateIcons() {
  // Check if SVG file exists
  if (!existsSync(svgPath)) {
    throw new Error(`Logo SVG not found at: ${svgPath}. Please ensure public/logo.svg exists.`);
  }
  
  // Create output directory if it doesn't exist
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  const svgBuffer = readFileSync(svgPath);
  
  // Generate PNG icons in various sizes for electron-builder
  const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
  
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(outputDir, `icon-${size}.png`));
    console.log(`Generated ${size}x${size} PNG`);
  }
  
  // Generate the main icon.png (256x256) that electron-builder uses
  await sharp(svgBuffer)
    .resize(256, 256)
    .png()
    .toFile(join(outputDir, 'icon.png'));
  console.log('Generated icon.png');
  
  console.log('Icon generation complete!');
}

generateIcons().catch(console.error);
