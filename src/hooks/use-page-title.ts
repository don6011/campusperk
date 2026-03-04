import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    const suffix = "CampusPerk";
    document.title = title ? `${title} | ${suffix}` : `${suffix} — Every Student Discount. One Dashboard.`;
    return () => { document.title = `${suffix} — Every Student Discount. One Dashboard.`; };
  }, [title]);
}
