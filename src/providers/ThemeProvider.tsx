"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";

type Theme = "light" | "dark" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableSystem?: boolean;
  enableColorScheme?: boolean;
  disableTransitionOnChange?: boolean;
}

interface ThemeContextValue {
  theme: Theme | undefined;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark" | undefined;
  systemTheme: "light" | "dark" | undefined;
  themes: Theme[];
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function ThemeProviderInner({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  enableSystem = true,
  enableColorScheme = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const { theme, setTheme, resolvedTheme, systemTheme, themes } = useNextTheme();

  const toggleTheme = React.useCallback(() => {
    const themeOrder: Theme[] = ["light", "dark", "system"];
    const currentIndex = themeOrder.indexOf(theme as Theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  }, [theme, setTheme]);

  const value = React.useMemo(
    () => ({
      theme: theme as Theme | undefined,
      setTheme: setTheme as (theme: Theme) => void,
      resolvedTheme: resolvedTheme as "light" | "dark" | undefined,
      systemTheme: systemTheme as "light" | "dark" | undefined,
      themes: themes as Theme[],
      toggleTheme,
    }),
    [theme, setTheme, resolvedTheme, systemTheme, themes, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  enableSystem = true,
  enableColorScheme = true,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      storageKey={storageKey}
      enableSystem={enableSystem}
      enableColorScheme={enableColorScheme}
      disableTransitionOnChange={disableTransitionOnChange}
    >
      <ThemeProviderInner
        defaultTheme={defaultTheme}
        storageKey={storageKey}
        enableSystem={enableSystem}
        enableColorScheme={enableColorScheme}
        disableTransitionOnChange={disableTransitionOnChange}
      >
        {children}
      </ThemeProviderInner>
    </NextThemesProvider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  
  return context;
}

export type { Theme, ThemeProviderProps, ThemeContextValue };
