import type { ImageMetadata } from 'astro';

// Keystatic stores image fields as "/src/assets/…" paths. Importing them through Vite lets
// astro:assets resize and convert them at build time.
const images = import.meta.glob<{ default: ImageMetadata }>('/src/assets/**/*.{jpg,jpeg,png,webp,avif,gif}', { eager: true });

export function getImage(path: string | null | undefined) {
  if (!path) return undefined;
  return images[path]?.default;
}
