// The brand script font (Wonderful Branding, Din Studio) is a licensed font, so it is not kept in
// this public repository. Before each build it is downloaded from the project's Vercel Blob store
// (URL in the BRAND_FONT_URL environment variable) into public/fonts, where public/style.css
// expects it. Without the file the script phrases fall back to the system's cursive font.
import fs from 'node:fs';

const target = 'public/fonts/wonderful-branding.woff2';
const url = process.env.BRAND_FONT_URL;

if (fs.existsSync(target)) {
  console.log(`[brand font] ${target} already present`);
} else if (!url) {
  console.warn('[brand font] BRAND_FONT_URL is not set: script phrases will use a fallback font');
} else {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`[brand font] download failed: ${res.status} ${res.statusText}`);
  fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
  console.log(`[brand font] downloaded to ${target}`);
}
