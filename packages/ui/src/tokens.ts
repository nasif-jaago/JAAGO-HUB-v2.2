import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const JAAGO_THEME_COLORS = {
  light: {
    background: 'hsl(43 33% 93%)',       // #F4EFE4
    surface: 'hsl(44 45% 97%)',          // #FBF8F1
    card: 'hsl(44 45% 97%)',
    foreground: 'hsl(40 24% 9%)',        // #1E1A12
    primary: 'hsl(45 92% 52%)',          // #F5C518 (JAAGO gold)
    brand: 'hsl(45 92% 52%)',
    brandStrong: 'hsl(42 96% 45%)',
    border: 'hsl(42 33% 85%)',           // #E7DFCD
  },
  dark: {
    background: 'hsl(240 5% 6%)',        // #0F0F10 (matte black)
    surface: 'hsl(240 4% 9.5%)',         // #18181A (matte card)
    card: 'hsl(240 4% 9.5%)',            // #18181A
    foreground: 'hsl(0 0% 96%)',         // #F5F5F5
    primary: 'hsl(45 96% 51%)',          // #FAC00A (vivid gold)
    brand: 'hsl(45 96% 51%)',
    brandStrong: 'hsl(45 98% 58%)',
    border: 'hsl(240 4% 16%)',           // #27272B
  },
  espresso: {
    header: 'hsl(28 45% 10%)',           // #23170E (espresso header)
    background: 'hsl(38 32% 93%)',       // #F5EFE6 (warm sand)
    surface: 'hsl(0 0% 100%)',           // #FFFFFF (pure white cards)
    card: 'hsl(0 0% 100%)',              // #FFFFFF
    foreground: 'hsl(28 44% 11%)',       // #26180E (deep chocolate text)
    primary: 'hsl(45 96% 51%)',          // #FAC00A (amber gold)
    brand: 'hsl(45 96% 51%)',
    brandStrong: 'hsl(42 96% 45%)',
    border: 'hsl(38 20% 83%)',           // #E2D9CA
  },
} as const;
