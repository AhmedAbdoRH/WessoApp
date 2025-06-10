// src/lib/slugify.ts

// Basic slugify function, you can enhance it as needed
export function slugify(text: string): string {
  if (!text) return ''; // Handle empty input explicitly
  return text
    .toString()
    .toLowerCase() // Note: toLowerCase() might not be ideal for Arabic, but for slugs it's common.
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    // Allow a-z, 0-9, underscore, hyphen, and Arabic letters (Unicode range U+0600 to U+06FF)
    .replace(/[^\w\u0600-\u06FF-]+/g, '') 
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}
