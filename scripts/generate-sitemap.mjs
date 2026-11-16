import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://afa-mint-progress.vercel.app';
const outPath = path.join(process.cwd(), 'public', 'sitemap.xml');

const lines = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  `  <url><loc>${SITE}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>`,
];

for (let id = 0; id <= 9999; id += 1) {
  lines.push(`  <url><loc>${SITE}/ape/${id}</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>`);
}

lines.push('</urlset>', '');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Wrote ${outPath} (${lines.length} lines)`);