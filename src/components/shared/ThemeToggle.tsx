"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, type Theme } from "@/providers/ThemeProvider";

interface ThemeToggleProps {
  showLabel?: boolean;
  variant?: "default" | "outline" | "ghost" | "secondary" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: "light",
    label: "Light",
    icon: <Sun className="size-4" />,
  },
  {
    value: "dark",
    label: "Dark",
    icon: <Moon className="size-4" />,
  },
  {
    value: "system",
    label: "System",
    icon: <Monitor className="size-4" />,
  },
];

export function ThemeToggle({
  showLabel = false,
  variant = "ghost",
  size = "icon",
  className,
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const currentThemeIcon = React.useMemo(() => {
    if (!mounted) {
      return <Sun className="size-5" />;
    }

    switch (theme) {
      case "light":
        return <Sun className="size-5" />;
      case "dark":
        return <Moon className="size-5" />;
      case "system":
      default:
        return resolvedTheme === "dark" ? (
          <Moon className="size-5" />
        ) : (
          <Sun className="size-5" />
        );
    }
  }, [theme, resolvedTheme, mounted]);

  const currentThemeLabel = React.useMemo(() => {
    const option = themeOptions.find((opt) => opt.value === theme);
    return option?.label ?? "System";
  }, [theme]);

  if (!mounted) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Sun className="size-5" />
        {showLabel && <span className="ml-2">Theme</span>}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          aria-label="Toggle theme"
        >
          {currentThemeIcon}
          {showLabel && (
            <span className="ml-2 hidden sm:inline">{currentThemeLabel}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themeOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className="cursor-pointer"
          >
            <span className="mr-2 flex items-center">{option.icon}</span>
            <span>{option.label}</span>
            {theme === option.value && (
              <span className="ml-auto text-xs text-muted-foreground">
                Active
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeToggle;
