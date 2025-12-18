#!/usr/bin/env node

/**
 * Image Compression Script using Sharp
 * Compresses all images in static/images to under 50KB
 * Tracks compressed images to avoid re-processing
 * 
 * Usage: node scripts/compress-images.mjs
 */

import sharp from 'sharp';
import { readdir, stat, mkdir, copyFile, readFile, writeFile, unlink } from 'fs/promises';
import { join, extname } from 'path';
import { createHash } from 'crypto';

const IMAGES_DIR = './static/images';
const BACKUP_DIR = './static/images/originals';
const MANIFEST_FILE = './static/images/.compressed-manifest.json';
const TARGET_SIZE_KB = 50;
const TARGET_SIZE_BYTES = TARGET_SIZE_KB * 1024;

// Supported formats
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Load manifest of already compressed images
async function loadManifest() {
  try {
    const data = await readFile(MANIFEST_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Save manifest
async function saveManifest(manifest) {
  await writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
}

// Get file hash to detect changes
async function getFileHash(filePath) {
  const data = await readFile(filePath);
  return createHash('md5').update(data).digest('hex');
}

async function getImageFiles(dir) {
  const files = await readdir(dir);
  const imageFiles = [];
  
  for (const file of files) {
    // Skip originals folder, temp files, hidden files, and manifest
    if (file === 'originals' || file.startsWith('.') || file.startsWith('_temp_')) continue;
    
    const filePath = join(dir, file);
    const fileStat = await stat(filePath);
    
    if (fileStat.isFile()) {
      const ext = extname(file).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        imageFiles.push({
          path: filePath,
          name: file,
          size: fileStat.size,
          ext
        });
      }
    }
  }
  
  return imageFiles;
}

async function compressImage(imageFile, manifest) {
  const { path, name, size, ext } = imageFile;
  
  // Get current file hash
  const currentHash = await getFileHash(path);
  
  // Check if already compressed (same hash in manifest)
  if (manifest[name] && manifest[name].hash === currentHash) {
    console.log(`✓ ${name} - Already compressed (${(size / 1024).toFixed(1)}KB)`);
    return { skipped: true, name, reason: 'already_compressed' };
  }
  
  // Skip if already under target size and not in manifest (new small file)
  if (size <= TARGET_SIZE_BYTES && !manifest[name]) {
    console.log(`✓ ${name} - Already optimized (${(size / 1024).toFixed(1)}KB)`);
    // Add to manifest so we don't check again
    manifest[name] = { hash: currentHash, size, compressed: false };
    return { skipped: true, name, reason: 'already_small' };
  }
  
  // Skip if in manifest and size matches (already processed)
  if (manifest[name] && size <= TARGET_SIZE_BYTES) {
    console.log(`✓ ${name} - Already compressed (${(size / 1024).toFixed(1)}KB)`);
    return { skipped: true, name, reason: 'already_compressed' };
  }
  
  console.log(`⏳ Compressing ${name} (${(size / 1024).toFixed(1)}KB)...`);
  
  try {
    // Backup original
    await mkdir(BACKUP_DIR, { recursive: true });
    await copyFile(path, join(BACKUP_DIR, name));
    
    const imageData = await readFile(path);
    let image = sharp(imageData);
    const metadata = await image.metadata();
    
    // Calculate initial quality based on compression needed
    const compressionRatio = TARGET_SIZE_BYTES / size;
    let quality = Math.min(85, Math.max(30, Math.floor(compressionRatio * 100)));
    
    let outputBuffer;
    let outputExt = ext;
    let resizeWidth = metadata.width;
    
    // Try compression with decreasing quality and resizing
    for (let attempt = 0; attempt < 8; attempt++) {
      image = sharp(imageData);
      
      // Resize progressively after first attempt
      if (attempt > 0) {
        resizeWidth = Math.max(800, Math.floor(resizeWidth * 0.75));
        image = image.resize(resizeWidth, null, { withoutEnlargement: true });
        console.log(`   Resizing to ${resizeWidth}px width...`);
      }
      
      // Ensure quality stays in valid range (1-100)
      const currentQuality = Math.max(20, Math.min(85, quality - (attempt * 10)));
      
      // Compress based on format
      if (ext === '.png') {
        outputBuffer = await image.webp({ quality: currentQuality, effort: 6 }).toBuffer();
        outputExt = '.webp';
      } else if (ext === '.jpg' || ext === '.jpeg') {
        outputBuffer = await image.jpeg({ quality: currentQuality, progressive: true, mozjpeg: true }).toBuffer();
      } else if (ext === '.webp') {
        outputBuffer = await image.webp({ quality: currentQuality, effort: 6 }).toBuffer();
      }
      
      console.log(`   Attempt ${attempt + 1}: quality=${currentQuality}, size=${(outputBuffer.length / 1024).toFixed(1)}KB`);
      
      if (outputBuffer.length <= TARGET_SIZE_BYTES) {
        break;
      }
    }
    
    // Determine output path
    const outputName = outputExt !== ext ? name.replace(ext, outputExt) : name;
    const outputPath = join(IMAGES_DIR, outputName);
    
    // Write compressed image
    await writeFile(outputPath, outputBuffer);
    
    // Remove original if format changed
    if (outputExt !== ext) {
      try {
        await unlink(path);
        console.log(`   Converted ${ext} → ${outputExt}`);
      } catch (e) {
        console.log(`   Note: Could not remove original (may be locked)`);
      }
    }
    
    const finalSize = outputBuffer.length;
    const savings = ((size - finalSize) / size * 100).toFixed(1);
    
    // Update manifest with new hash
    const newHash = await getFileHash(outputPath);
    manifest[outputName] = { 
      hash: newHash, 
      size: finalSize, 
      compressed: true,
      originalName: name,
      originalSize: size,
      date: new Date().toISOString()
    };
    
    // Remove old entry if name changed
    if (outputName !== name && manifest[name]) {
      delete manifest[name];
    }
    
    console.log(`✓ ${name} → ${outputName} (${(finalSize / 1024).toFixed(1)}KB, -${savings}%)`);
    
    return { 
      success: true, 
      name, 
      outputName,
      originalSize: size, 
      newSize: finalSize,
      savings 
    };
    
  } catch (error) {
    console.error(`✗ ${name} - Error: ${error.message}`);
    return { error: true, name, message: error.message };
  }
}

async function cleanupTempFiles() {
  try {
    const files = await readdir(IMAGES_DIR);
    for (const file of files) {
      if (file.startsWith('_temp_')) {
        await unlink(join(IMAGES_DIR, file)).catch(() => {});
      }
    }
  } catch {}
}

async function main() {
  console.log('🖼️  OpenDots Blog Image Compressor');
  console.log(`   Target: < ${TARGET_SIZE_KB}KB per image\n`);
  
  // Clean up any leftover temp files
  await cleanupTempFiles();
  
  // Load manifest
  const manifest = await loadManifest();
  
  // Get all images
  const images = await getImageFiles(IMAGES_DIR);
  
  if (images.length === 0) {
    console.log('No images found in', IMAGES_DIR);
    return;
  }
  
  console.log(`Found ${images.length} images\n`);
  
  const results = {
    skipped: 0,
    compressed: 0,
    errors: 0,
    totalSaved: 0
  };
  
  // Process images sequentially
  for (const image of images) {
    const result = await compressImage(image, manifest);
    
    if (result.skipped) {
      results.skipped++;
    } else if (result.success) {
      results.compressed++;
      results.totalSaved += result.originalSize - result.newSize;
    } else if (result.error) {
      results.errors++;
    }
  }
  
  // Save updated manifest
  await saveManifest(manifest);
  
  // Clean up temp files again
  await cleanupTempFiles();
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Compressed: ${results.compressed}`);
  console.log(`   Skipped: ${results.skipped}`);
  console.log(`   Errors: ${results.errors}`);
  if (results.totalSaved > 0) {
    console.log(`   Total saved: ${(results.totalSaved / 1024).toFixed(1)}KB`);
  }
  
  if (results.compressed > 0) {
    console.log(`\n💡 Originals backed up to: ${BACKUP_DIR} (git-ignored)`);
  }
}

main().catch(console.error);
