import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CampusTheme {
  primaryColor: string | null;
  secondaryColor: string | null;
  campusName: string | null;
}

const CampusThemeContext = createContext<CampusTheme>({
  primaryColor: null,
  secondaryColor: null,
  campusName: null,
});

function hexToHSL(hex: string): string {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function CampusThemeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [theme, setTheme] = useState<CampusTheme>({ primaryColor: null, secondaryColor: null, campusName: null });

  useEffect(() => {
    if (!profile?.campus_id) {
      // Reset to defaults
      document.documentElement.style.removeProperty("--campus-primary");
      document.documentElement.style.removeProperty("--campus-secondary");
      setTheme({ primaryColor: null, secondaryColor: null, campusName: profile?.campus_name ?? null });
      return;
    }

    const fetchColors = async () => {
      const { data } = await supabase
        .from("campus_domains")
        .select("primary_color, secondary_color, campus_name")
        .eq("id", profile.campus_id!)
        .single();

      if (data?.primary_color) {
        const hsl = hexToHSL(data.primary_color);
        document.documentElement.style.setProperty("--campus-primary", hsl);
        setTheme(prev => ({ ...prev, primaryColor: data.primary_color }));
      } else {
        document.documentElement.style.removeProperty("--campus-primary");
      }

      if (data?.secondary_color) {
        const hsl = hexToHSL(data.secondary_color);
        document.documentElement.style.setProperty("--campus-secondary", hsl);
        setTheme(prev => ({ ...prev, secondaryColor: data.secondary_color }));
      } else {
        document.documentElement.style.removeProperty("--campus-secondary");
      }

      setTheme(prev => ({ ...prev, campusName: data?.campus_name ?? profile.campus_name ?? null }));
    };

    fetchColors();
  }, [profile?.campus_id, profile?.campus_name]);

  return (
    <CampusThemeContext.Provider value={theme}>
      {children}
    </CampusThemeContext.Provider>
  );
}

export function useCampusTheme() {
  return useContext(CampusThemeContext);
}
