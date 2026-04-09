// Loan Color Utility - Unique colors for mirror loan pairs

/**
 * Predefined color palette for mirror loan pairs
 * These colors are distinct and visually appealing
 * Colors are designed to NOT repeat - each pair gets a unique color
 */
const LOAN_COLOR_PALETTE = [
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Teal
  '#45B7D1', // Sky Blue
  '#96CEB4', // Sage Green
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Light Blue
  '#F8B500', // Amber
  '#00CED1', // Dark Turquoise
  '#FF7F50', // Coral Orange
  '#9FE2BF', // Sea Green
  '#DE3163', // Cerise
  '#40E0D0', // Turquoise
  '#E0AED0', // Mauve
  '#ACDDDE', // Light Cyan
  '#FFB6C1', // Light Pink
  '#AFEEEE', // Pale Turquoise
  '#DB7093', // Pale Violet Red
  '#20B2AA', // Light Sea Green
  '#778899', // Light Slate Gray
  '#B0C4DE', // Light Steel Blue
  '#FFDAB9', // Peach Puff
  '#F0E68C', // Khaki
  '#98FB98', // Pale Green
  '#DDA0DD', // Medium Orchid
  '#BC8F8F', // Rosy Brown
  '#CD853F', // Peru
  '#DAA520', // Goldenrod
];

// Track used colors to ensure non-repetition
let usedColorIndices: Set<number> = new Set();

/**
 * Get the next unique color from the palette
 * This ensures colors don't repeat until all colors are used
 * Colors are assigned in order to prevent repetition
 */
export function getNextUniqueColor(): string {
  // Find the next unused color index
  let nextIndex = -1;
  
  for (let i = 0; i < LOAN_COLOR_PALETTE.length; i++) {
    if (!usedColorIndices.has(i)) {
      nextIndex = i;
      break;
    }
  }
  
  // If all colors are used, reset and start over
  if (nextIndex === -1) {
    usedColorIndices.clear();
    nextIndex = 0;
  }
  
  // Mark this color as used
  usedColorIndices.add(nextIndex);
  
  return LOAN_COLOR_PALETTE[nextIndex];
}

/**
 * Reset the color tracking (useful for testing)
 */
export function resetColorTracking(): void {
  usedColorIndices.clear();
}

/**
 * Generate a unique color based on the mirror mapping ID
 * This ensures the same color is used for both original and mirror loans
 * Uses a deterministic approach based on the ID
 */
export function getColorForMirrorPair(mappingId: string): string {
  // Use the mapping ID to generate a consistent index
  let hash = 0;
  for (let i = 0; i < mappingId.length; i++) {
    const char = mappingId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use absolute value and modulo to get a valid index
  const index = Math.abs(hash) % LOAN_COLOR_PALETTE.length;
  return LOAN_COLOR_PALETTE[index];
}

/**
 * Get a lighter version of a color for backgrounds
 */
export function getLighterColor(hexColor: string, opacity: number = 0.2): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Get a darker version of a color for borders
 */
export function getDarkerColor(hexColor: string, factor: number = 0.8): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse RGB values
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Darken
  r = Math.floor(r * factor);
  g = Math.floor(g * factor);
  b = Math.floor(b * factor);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Check if a color is light or dark
 */
export function isLightColor(hexColor: string): boolean {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5;
}

/**
 * Get contrasting text color (black or white) for a background color
 */
export function getContrastingTextColor(hexColor: string): string {
  return isLightColor(hexColor) ? '#1F2937' : '#FFFFFF';
}

// ============================================
// EMI Due Date Blinking Alert Utilities
// ============================================

export type BlinkAlertType = 'OVERDUE' | 'ONE_DAY' | 'TWO_DAYS' | 'THREE_DAYS' | 'NORMAL';

export interface BlinkAlertConfig {
  color: string;
  bgColor: string;
  borderColor: string;
  animation: string;
  label: string;
}

/**
 * Determine the blink alert type based on EMI due date
 */
export function getBlinkAlertType(dueDate: Date | string, isPaid: boolean = false): BlinkAlertType {
  if (isPaid) return 'NORMAL';

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Overdue (due date passed)
  if (diffDays < 0) {
    return 'OVERDUE';
  }

  // Due today or 1 day
  if (diffDays <= 1) {
    return 'ONE_DAY';
  }

  // 2 days
  if (diffDays === 2) {
    return 'TWO_DAYS';
  }

  // 3 days
  if (diffDays === 3) {
    return 'THREE_DAYS';
  }

  return 'NORMAL';
}

/**
 * Get the blink alert configuration for a given alert type
 * Colors as per requirements:
 * - 3 days before: Green
 * - 2 days before: Yellow
 * - 1 day before: Dark Brown
 */
export function getBlinkAlertConfig(alertType: BlinkAlertType): BlinkAlertConfig {
  switch (alertType) {
    case 'OVERDUE':
      return {
        color: '#DC2626', // Red
        bgColor: 'rgba(220, 38, 38, 0.15)',
        borderColor: '#DC2626',
        animation: 'blink-red 1s infinite',
        label: 'OVERDUE'
      };
    case 'ONE_DAY':
      return {
        color: '#5D4037', // Dark Brown
        bgColor: 'rgba(93, 64, 55, 0.15)',
        borderColor: '#5D4037',
        animation: 'blink-brown 1.5s infinite',
        label: '1 DAY LEFT'
      };
    case 'TWO_DAYS':
      return {
        color: '#EAB308', // Yellow
        bgColor: 'rgba(234, 179, 8, 0.15)',
        borderColor: '#EAB308',
        animation: 'blink-yellow 2s infinite',
        label: '2 DAYS LEFT'
      };
    case 'THREE_DAYS':
      return {
        color: '#22C55E', // Green
        bgColor: 'rgba(34, 197, 94, 0.15)',
        borderColor: '#22C55E',
        animation: 'blink-green 2.5s infinite',
        label: '3 DAYS LEFT'
      };
    default:
      return {
        color: '#6B7280', // Gray
        bgColor: 'transparent',
        borderColor: '#E5E7EB',
        animation: 'none',
        label: ''
      };
  }
}

/**
 * Get the CSS class name for blink alert type
 */
export function getBlinkAlertClassName(alertType: BlinkAlertType): string {
  switch (alertType) {
    case 'OVERDUE':
      return 'blink-alert-overdue';
    case 'ONE_DAY':
      return 'blink-alert-one-day';
    case 'TWO_DAYS':
      return 'blink-alert-two-days';
    case 'THREE_DAYS':
      return 'blink-alert-three-days';
    default:
      return '';
  }
}

/**
 * Get CSS for blinking animations
 * This should be added to global styles or component
 */
export const BLINK_ANIMATIONS_CSS = `
@keyframes blink-red {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.5); }
  50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.8); }
}

@keyframes blink-brown {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 2px rgba(93, 64, 55, 0.5); }
  50% { opacity: 0.8; box-shadow: 0 0 0 4px rgba(93, 64, 55, 0.7); }
}

@keyframes blink-yellow {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.5); }
  50% { opacity: 0.85; box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.7); }
}

@keyframes blink-green {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.5); }
  50% { opacity: 0.9; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.6); }
}

.blink-alert-overdue {
  animation: blink-red 1s infinite;
}

.blink-alert-one-day {
  animation: blink-brown 1.5s infinite;
}

.blink-alert-two-days {
  animation: blink-yellow 2s infinite;
}

.blink-alert-three-days {
  animation: blink-green 2.5s infinite;
}
`;
