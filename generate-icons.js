#!/usr/bin/env node

/**
 * Script de génération d'icônes PNG à partir de SVG
 * Utilise sharp pour la conversion
 * 
 * Usage: node generate-icons.js
 * 
 * Prérequis: npm install sharp
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateIcons() {
  try {
    // Essayer d'importer sharp
    let sharp;
    try {
      sharp = (await import('sharp')).default;
    } catch (err) {
      console.error('❌ sharp n\'est pas installé.');
      console.log('\nPour générer les icônes, veuillez d\'abord installer sharp:');
      console.log('  npm install sharp\n');
      console.log('Alternatives:');
      console.log('1. Convertir manuellement avec ImageMagick:');
      console.log('   convert public/icon-192.svg public/icon-192.png');
      console.log('2. Utiliser un service en ligne comme convertio.co/svg-png');
      process.exit(1);
    }

    const publicDir = path.join(__dirname, 'public');

    console.log('🎨 Génération des icônes PNG...\n');

    // Configuration des icônes
    const icons = [
      { name: 'icon-192', size: 192, background: '#1a1a2e' },
      { name: 'icon-512', size: 512, background: '#1a1a2e' },
      { name: 'icon-192-maskable', size: 192, background: '#1a1a2e', maskable: true },
      { name: 'icon-512-maskable', size: 512, background: '#1a1a2e', maskable: true },
    ];

    for (const icon of icons) {
      const svgPath = path.join(publicDir, `${icon.name.replace('-maskable', '')}.svg`);
      const pngPath = path.join(publicDir, `${icon.name}.png`);

      if (!fs.existsSync(svgPath)) {
        console.warn(`⚠️  Fichier source non trouvé: ${svgPath}`);
        continue;
      }

      try {
        await sharp(svgPath)
          .resize(icon.size, icon.size, {
            fit: 'contain',
            background: { r: 26, g: 26, b: 46, alpha: 1 }
          })
          .png({ quality: 95 })
          .toFile(pngPath);

        console.log(`✅ ${icon.name}.png généré (${icon.size}x${icon.size})`);
      } catch (err) {
        console.error(`❌ Erreur pour ${icon.name}:`, err.message);
      }
    }

    // Générer des icônes de capture d'écran
    console.log('\n📱 Génération des captures d\'écran...\n');

    const screenshots = [
      { name: 'screenshot-192', size: 192 },
      { name: 'screenshot-512', size: 512 },
    ];

    for (const screenshot of screenshots) {
      const svgPath = path.join(publicDir, 'icon-192.svg');
      const pngPath = path.join(publicDir, `${screenshot.name}.png`);

      try {
        await sharp(svgPath)
          .resize(screenshot.size, screenshot.size, {
            fit: 'contain',
            background: { r: 26, g: 26, b: 46, alpha: 1 }
          })
          .png({ quality: 95 })
          .toFile(pngPath);

        console.log(`✅ ${screenshot.name}.png généré (${screenshot.size}x${screenshot.size})`);
      } catch (err) {
        console.error(`❌ Erreur pour ${screenshot.name}:`, err.message);
      }
    }

    console.log('\n✨ Génération des icônes terminée!\n');
    console.log('📝 Note: Vous pouvez maintenant:');
    console.log('  1. Exécuter npm run dev pour tester l\'app');
    console.log('  2. Exécuter npm run build pour créer la production build');
    console.log('  3. Tester l\'installation PWA dans votre navigateur\n');

  } catch (error) {
    console.error('❌ Erreur lors de la génération des icônes:', error);
    process.exit(1);
  }
}

generateIcons();
