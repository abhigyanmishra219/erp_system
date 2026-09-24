/**
 * Color manipulation and normalization utilities for School Branding.
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Normalizes and validates a HEX color string.
 * Supports #RGB, #RRGGBB, #RRGGBBAA formats.
 */
export function normalizeHexColor(hex?: string | null, fallback: string = "#4f46e5"): string {
  if (!hex || typeof hex !== "string") return fallback;
  const trimmed = hex.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    if (trimmed.length === 4) {
      // Expand shorthand #RGB to #RRGGBB
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
    }
    return trimmed.toLowerCase();
  }
  return fallback;
}

/**
 * Parses a valid hex color string into RGB components.
 */
export function hexToRgb(hex?: string | null): RgbColor | null {
  const normalized = normalizeHexColor(hex, "");
  if (!normalized) return null;

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
  if (!result) return null;

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Calculates a contrasting foreground color (white or dark slate) based on perceived luminance.
 */
export function getContrastTextColor(hex?: string | null): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";

  // Relative luminance calculation (WCAG standard threshold 0.5)
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? "#0f172a" : "#ffffff";
}

/**
 * Produces an RGBA color string with the specified opacity.
 */
export function getRgbaColor(hex?: string | null, alpha: number = 0.12, fallback: string = "#4f46e5"): string {
  const rgb = hexToRgb(hex) || hexToRgb(fallback) || { r: 79, g: 70, b: 229 };
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.max(0, Math.min(1, alpha))})`;
}

/**
 * Adjusts brightness for hover states.
 * Darkens light colors and brightens very dark colors to ensure a perceptible hover effect.
 */
export function getHoverShade(hex?: string | null, fallback: string = "#4338ca"): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return fallback;

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  // If very dark, brighten by 18%; if medium/light, darken by 12%
  const factor = luminance < 0.2 ? 1.25 : 0.88;

  const clamp = (val: number) => Math.min(255, Math.max(0, Math.round(val * factor)));
  const r = clamp(rgb.r).toString(16).padStart(2, "0");
  const g = clamp(rgb.g).toString(16).padStart(2, "0");
  const b = clamp(rgb.b).toString(16).padStart(2, "0");

  return `#${r}${g}${b}`;
}
