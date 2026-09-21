"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Laptop, Check } from "lucide-react";
import { useTheme, Theme } from "@/context/ThemeContext";

interface ThemeToggleProps {
  align?: "left" | "right";
  variant?: "dropdown" | "compact";
  className?: string;
}

export default function ThemeToggle({
  align = "right",
  variant = "dropdown",
  className = "",
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const options: Array<{
    value: Theme;
    label: string;
    icon: typeof Sun;
    description: string;
  }> = [
    {
      value: "light",
      label: "Light",
      icon: Sun,
      description: "Clean bright theme",
    },
    {
      value: "dark",
      label: "Dark",
      icon: Moon,
      description: "Eye-friendly dark theme",
    },
    {
      value: "system",
      label: "System",
      icon: Laptop,
      description: "Matches OS setting",
    },
  ];

  if (variant === "compact") {
    return (
      <div
        className={`inline-flex items-center p-1 rounded-xl bg-surface-2 border border-border ${className}`}
        role="group"
        aria-label="Theme selector"
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              title={opt.label}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-3"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
      </div>
    );
  }

  const ActiveIcon =
    theme === "system"
      ? Laptop
      : resolvedTheme === "dark"
      ? Moon
      : Sun;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Toggle theme appearance"
        className="px-2.5 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-foreground border border-border shadow-sm text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring/30"
      >
        <ActiveIcon className="w-3.5 h-3.5 text-primary" />
        <span className="hidden sm:inline capitalize">
          {theme}
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } mt-2 w-48 rounded-2xl bg-popover/95 backdrop-blur-xl border border-border shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border mb-1">
            Appearance
          </div>

          <div className="space-y-0.5">
            {options.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setTheme(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        isSelected ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <div>
                      <div className="leading-tight">{option.label}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">
                        {option.description}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
