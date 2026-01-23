/**
 * XSS protection utilities for sanitizing user input
 */

/**
 * Escape XML/HTML special characters to prevent XSS in SVG
 * This is more comprehensive than the basic escapeXml function
 */
export function escapeXml(text: string): string {
  if (typeof text !== "string") {
    return "";
  }

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Sanitize color value to prevent injection
 * Only allows hex codes and known CSS color names
 */
export function sanitizeColor(color: string, allowedColors: Record<string, string>): string {
  if (!color || typeof color !== "string") {
    return "#999999"; // Default fallback
  }

  const trimmed = color.trim();

  // Check if it's a valid hex color (with or without #)
  const hexPattern = /^#?[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/;
  if (hexPattern.test(trimmed)) {
    return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  }

  // Check if it's a known CSS color name
  const colorNameLower = trimmed.toLowerCase();
  if (allowedColors[colorNameLower]) {
    return allowedColors[colorNameLower];
  }

  // If not valid, return default
  return "#999999";
}

/**
 * Sanitize text input to prevent XSS
 * Removes potentially dangerous characters and limits length
 */
export function sanitizeText(text: string, maxLength: number = 100): string {
  if (typeof text !== "string") {
    return "";
  }

  // Remove control characters and limit length
  return text
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .slice(0, maxLength)
    .trim();
}
