import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { AlertsSection } from "@/components/account/AlertsSection";

/**
 * Alerts is now a section of Account rather than its own nav item, so the whole
 * screen lives in AlertsSection and Account renders it inline.
 *
 * This route stays registered: /alerts is a URL students may have bookmarked,
 * and dropping it would 404 them. It renders the same section on its own page.
 */
export default function Alerts() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <AlertsSection />
      </div>
    </DashboardLayout>
  );
}
