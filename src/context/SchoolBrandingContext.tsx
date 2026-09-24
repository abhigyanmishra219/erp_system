"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  normalizeHexColor,
  getContrastTextColor,
  getHoverShade,
  getRgbaColor,
} from "@/lib/utils/color";

export interface SchoolBrandingState {
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface SchoolBrandingContextType {
  branding: SchoolBrandingState;
  schoolName: string;
  updateBranding: (newBranding: Partial<SchoolBrandingState>) => void;
  refreshBranding: () => Promise<void>;
  isLoading: boolean;
}

const DEFAULT_PRIMARY = "#4f46e5";
const DEFAULT_SECONDARY = "#06b6d4";

const SchoolBrandingContext = createContext<SchoolBrandingContextType | undefined>(
  undefined
);

interface SchoolBrandingProviderProps {
  children: ReactNode;
  schoolName?: string;
  initialBranding?: Partial<SchoolBrandingState> | null;
}

export function SchoolBrandingProvider({
  children,
  schoolName = "School ERP",
  initialBranding,
}: SchoolBrandingProviderProps) {
  const [branding, setBrandingState] = useState<SchoolBrandingState>({
    logo: initialBranding?.logo || "",
    favicon: initialBranding?.favicon || "",
    primaryColor: initialBranding?.primaryColor || "",
    secondaryColor: initialBranding?.secondaryColor || "",
  });
  const [isLoading, setIsLoading] = useState(false);

  // Apply tenant branding CSS custom properties to document root
  const applyBrandingCssVariables = useCallback((brand: SchoolBrandingState) => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    const primary = normalizeHexColor(brand.primaryColor, DEFAULT_PRIMARY);
    const secondary = normalizeHexColor(brand.secondaryColor, DEFAULT_SECONDARY);

    const primaryHover = getHoverShade(primary, "#4338ca");
    const primaryForeground = getContrastTextColor(primary);
    const primaryLight = getRgbaColor(primary, 0.12);

    const secondaryHover = getHoverShade(secondary, "#0891b2");
    const secondaryForeground = getContrastTextColor(secondary);
    const secondaryLight = getRgbaColor(secondary, 0.12);

    // Set Tenant-Scoped CSS Variables
    root.style.setProperty("--school-primary", primary);
    root.style.setProperty("--school-primary-hover", primaryHover);
    root.style.setProperty("--school-primary-foreground", primaryForeground);
    root.style.setProperty("--school-primary-light", primaryLight);

    root.style.setProperty("--school-secondary", secondary);
    root.style.setProperty("--school-secondary-hover", secondaryHover);
    root.style.setProperty("--school-secondary-foreground", secondaryForeground);
    root.style.setProperty("--school-secondary-light", secondaryLight);

    // Override active theme primary accents so all standard UI components adopt the brand
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--primary-hover", primaryHover);
    root.style.setProperty("--primary-foreground", primaryForeground);
    root.style.setProperty("--accent", primaryLight);
    root.style.setProperty("--accent-foreground", primary);
    root.style.setProperty("--ring", primary);

    // Dynamic Favicon application
    if (brand.favicon && brand.favicon.trim().length > 0) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = brand.favicon.trim();
    }
  }, []);

  // Update branding state and CSS variables in real time
  const updateBranding = useCallback(
    (newBranding: Partial<SchoolBrandingState>) => {
      setBrandingState((prev) => {
        const next: SchoolBrandingState = {
          logo: newBranding.logo !== undefined ? newBranding.logo : prev.logo,
          favicon: newBranding.favicon !== undefined ? newBranding.favicon : prev.favicon,
          primaryColor:
            newBranding.primaryColor !== undefined
              ? newBranding.primaryColor
              : prev.primaryColor,
          secondaryColor:
            newBranding.secondaryColor !== undefined
              ? newBranding.secondaryColor
              : prev.secondaryColor,
        };
        applyBrandingCssVariables(next);
        return next;
      });
    },
    [applyBrandingCssVariables]
  );

  // Fetch updated branding from backend API
  const refreshBranding = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/settings/branding");
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data?.branding) {
        const b = json.data.branding;
        const fresh: SchoolBrandingState = {
          logo: b.logo || "",
          favicon: b.favicon || "",
          primaryColor: b.primaryColor || "",
          secondaryColor: b.secondaryColor || "",
        };
        setBrandingState(fresh);
        applyBrandingCssVariables(fresh);
      }
    } catch {
      // Ignore network errors on refresh
    } finally {
      setIsLoading(false);
    }
  }, [applyBrandingCssVariables]);

  // Initial application on mount & sync when initialBranding changes
  useEffect(() => {
    if (initialBranding) {
      const initial: SchoolBrandingState = {
        logo: initialBranding.logo || "",
        favicon: initialBranding.favicon || "",
        primaryColor: initialBranding.primaryColor || "",
        secondaryColor: initialBranding.secondaryColor || "",
      };
      setBrandingState(initial);
      applyBrandingCssVariables(initial);
    } else {
      applyBrandingCssVariables(branding);
    }

    return () => {
      // Cleanup CSS variables on unmount (e.g. navigation out of tenant portal)
      if (typeof document !== "undefined") {
        const root = document.documentElement;
        root.style.removeProperty("--school-primary");
        root.style.removeProperty("--school-primary-hover");
        root.style.removeProperty("--school-primary-foreground");
        root.style.removeProperty("--school-primary-light");
        root.style.removeProperty("--school-secondary");
        root.style.removeProperty("--school-secondary-hover");
        root.style.removeProperty("--school-secondary-foreground");
        root.style.removeProperty("--school-secondary-light");
        root.style.removeProperty("--primary");
        root.style.removeProperty("--primary-hover");
        root.style.removeProperty("--primary-foreground");
        root.style.removeProperty("--accent");
        root.style.removeProperty("--accent-foreground");
        root.style.removeProperty("--ring");
      }
    };
  }, [initialBranding, applyBrandingCssVariables]);

  return (
    <SchoolBrandingContext.Provider
      value={{
        branding,
        schoolName,
        updateBranding,
        refreshBranding,
        isLoading,
      }}
    >
      {children}
    </SchoolBrandingContext.Provider>
  );
}

export function useSchoolBranding() {
  const context = useContext(SchoolBrandingContext);
  if (!context) {
    return {
      branding: {
        logo: "",
        favicon: "",
        primaryColor: DEFAULT_PRIMARY,
        secondaryColor: DEFAULT_SECONDARY,
      },
      schoolName: "School ERP",
      updateBranding: () => {},
      refreshBranding: async () => {},
      isLoading: false,
    };
  }
  return context;
}
