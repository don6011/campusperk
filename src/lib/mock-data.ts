// Mock data for CampusPerk visuals

export type DealStatus = "active" | "expired" | "coming_soon" | "needs_review";
export type DealVisibility = "public" | "premium";
export type SubmissionStatus = "pending" | "approved" | "rejected";
export type ScanStatus = "success" | "failed" | "needs_review";

export interface Store {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string;
  categories: string[];
  studentDiscountAvailable: boolean;
}

export interface Deal {
  id: string;
  storeId: string;
  storeName: string;
  storeLogoUrl: string;
  title: string;
  description: string;
  discountType: "percentage" | "fixed" | "free_trial" | "bogo";
  discountValue: string;
  affiliateLinkUrl?: string;
  directLinkUrl: string;
  requiresEduEmail: boolean;
  status: DealStatus;
  visibility: DealVisibility;
  earlyAccess: boolean;
  sponsored: boolean;
  featured: boolean;
  commissionRate?: number;
  lastCheckedAt: string;
  aiSummary?: string;
  category: string;
  expiresAt?: string;
}

export interface Submission {
  id: string;
  storeName: string;
  dealInfo: string;
  url: string;
  submittedBy: string;
  submittedAt: string;
  status: SubmissionStatus;
  reviewNotes?: string;
}

export interface ScanRun {
  id: string;
  dealId: string;
  dealTitle: string;
  storeName: string;
  scannedAt: string;
  status: ScanStatus;
  previousStatus: DealStatus;
  newStatus: DealStatus;
  aiChangeNotes: string;
  responseCode?: number;
}

export const mockStores: Store[] = [
  { id: "s1", name: "Adobe", logoUrl: "", websiteUrl: "https://adobe.com", categories: ["Software"], studentDiscountAvailable: true },
  { id: "s2", name: "Spotify", logoUrl: "", websiteUrl: "https://spotify.com", categories: ["Subscriptions", "Entertainment"], studentDiscountAvailable: true },
  { id: "s3", name: "Apple", logoUrl: "", websiteUrl: "https://apple.com", categories: ["Tech", "Software"], studentDiscountAvailable: true },
  { id: "s4", name: "Nike", logoUrl: "", websiteUrl: "https://nike.com", categories: ["Clothing", "Fitness"], studentDiscountAvailable: true },
  { id: "s5", name: "GitHub", logoUrl: "", websiteUrl: "https://github.com", categories: ["Software"], studentDiscountAvailable: true },
  { id: "s6", name: "Samsung", logoUrl: "", websiteUrl: "https://samsung.com", categories: ["Tech"], studentDiscountAvailable: true },
  { id: "s7", name: "Coursera", logoUrl: "", websiteUrl: "https://coursera.org", categories: ["Learning"], studentDiscountAvailable: true },
  { id: "s8", name: "Domino's", logoUrl: "", websiteUrl: "https://dominos.com", categories: ["Food"], studentDiscountAvailable: true },
];

export const mockDeals: Deal[] = [
  { id: "d1", storeId: "s1", storeName: "Adobe", storeLogoUrl: "", title: "Adobe Creative Cloud – 60% Off", description: "Get the full Creative Cloud suite at 60% off with a valid .edu email.", discountType: "percentage", discountValue: "60%", affiliateLinkUrl: "https://adobe.com/students", directLinkUrl: "https://adobe.com/students", requiresEduEmail: true, status: "active", visibility: "public", earlyAccess: false, sponsored: true, featured: true, commissionRate: 12, lastCheckedAt: "2026-02-17T10:00:00Z", aiSummary: "Adobe offers 60% off Creative Cloud for students with .edu email verification.", category: "Software", expiresAt: "2026-06-30T00:00:00Z" },
  { id: "d2", storeId: "s2", storeName: "Spotify", storeLogoUrl: "", title: "Spotify Premium Student – $5.99/mo", description: "Spotify Premium, Hulu, and Showtime bundle for students.", discountType: "fixed", discountValue: "$5.99/mo", directLinkUrl: "https://spotify.com/student", requiresEduEmail: true, status: "active", visibility: "public", earlyAccess: false, sponsored: false, featured: true, lastCheckedAt: "2026-02-16T08:00:00Z", category: "Subscriptions" },
  { id: "d3", storeId: "s3", storeName: "Apple", storeLogoUrl: "", title: "Apple Education Pricing – Up to $300 Off", description: "Save on Mac and iPad with Apple Education Store.", discountType: "fixed", discountValue: "Up to $300", affiliateLinkUrl: "https://apple.com/shop/education", directLinkUrl: "https://apple.com/shop/education", requiresEduEmail: true, status: "active", visibility: "public", earlyAccess: false, sponsored: true, featured: false, commissionRate: 5, lastCheckedAt: "2026-02-15T12:00:00Z", category: "Tech" },
  { id: "d4", storeId: "s4", storeName: "Nike", storeLogoUrl: "", title: "Nike Student Discount – 10% Off", description: "Verify with UNiDAYS and get 10% off everything at Nike.", discountType: "percentage", discountValue: "10%", directLinkUrl: "https://nike.com", requiresEduEmail: false, status: "active", visibility: "public", earlyAccess: false, sponsored: false, featured: false, lastCheckedAt: "2026-02-14T09:00:00Z", category: "Clothing" },
  { id: "d5", storeId: "s5", storeName: "GitHub", storeLogoUrl: "", title: "GitHub Student Developer Pack – Free", description: "Free access to developer tools, cloud credits, and domains.", discountType: "free_trial", discountValue: "Free", directLinkUrl: "https://education.github.com/pack", requiresEduEmail: true, status: "active", visibility: "public", earlyAccess: false, sponsored: false, featured: true, lastCheckedAt: "2026-02-17T06:00:00Z", category: "Software" },
  { id: "d6", storeId: "s6", storeName: "Samsung", storeLogoUrl: "", title: "Samsung Education Store – 30% Off", description: "Exclusive pricing on Galaxy phones, tablets and laptops.", discountType: "percentage", discountValue: "30%", affiliateLinkUrl: "https://samsung.com/education", directLinkUrl: "https://samsung.com/education", requiresEduEmail: true, status: "active", visibility: "premium", earlyAccess: true, sponsored: false, featured: false, commissionRate: 8, lastCheckedAt: "2026-02-13T14:00:00Z", category: "Tech" },
  { id: "d7", storeId: "s7", storeName: "Coursera", storeLogoUrl: "", title: "Coursera Plus – 50% Off Annual", description: "Half off unlimited learning with Coursera Plus.", discountType: "percentage", discountValue: "50%", directLinkUrl: "https://coursera.org/student", requiresEduEmail: true, status: "active", visibility: "premium", earlyAccess: false, sponsored: false, featured: false, lastCheckedAt: "2026-02-12T11:00:00Z", category: "Learning" },
  { id: "d8", storeId: "s8", storeName: "Domino's", storeLogoUrl: "", title: "Domino's Student Combo – 20% Off", description: "Show your student ID in-store or use code STUDENT20 online.", discountType: "percentage", discountValue: "20%", directLinkUrl: "https://dominos.com", requiresEduEmail: false, status: "expired", visibility: "public", earlyAccess: false, sponsored: false, featured: false, lastCheckedAt: "2026-02-10T07:00:00Z", category: "Food", expiresAt: "2026-02-01T00:00:00Z" },
  { id: "d9", storeId: "s3", storeName: "Apple", storeLogoUrl: "", title: "Free AirPods with Mac Purchase", description: "Students get free AirPods when buying a Mac during Back to School.", discountType: "bogo", discountValue: "Free AirPods", directLinkUrl: "https://apple.com/shop/education", requiresEduEmail: true, status: "coming_soon", visibility: "premium", earlyAccess: true, sponsored: true, featured: true, lastCheckedAt: "2026-02-17T08:00:00Z", category: "Tech", expiresAt: "2026-09-30T00:00:00Z" },
  { id: "d10", storeId: "s2", storeName: "Spotify", storeLogoUrl: "", title: "Spotify 3-Month Free Trial", description: "New student subscribers get 3 months of Premium free.", discountType: "free_trial", discountValue: "3 months free", directLinkUrl: "https://spotify.com/student", requiresEduEmail: true, status: "active", visibility: "public", earlyAccess: false, sponsored: false, featured: false, lastCheckedAt: "2026-02-16T15:00:00Z", category: "Subscriptions" },
];

export const mockSubmissions: Submission[] = [
  { id: "sub1", storeName: "Figma", dealInfo: "Figma offers free Professional plan for students. Verify via .edu email.", url: "https://figma.com/education", submittedBy: "alex@mit.edu", submittedAt: "2026-02-16T14:30:00Z", status: "pending" },
  { id: "sub2", storeName: "JetBrains", dealInfo: "Free All Products Pack for students and teachers.", url: "https://jetbrains.com/student", submittedBy: "maria@stanford.edu", submittedAt: "2026-02-15T09:00:00Z", status: "pending" },
  { id: "sub3", storeName: "Notion", dealInfo: "Notion Plus is free for students with .edu email.", url: "https://notion.so/students", submittedBy: "jason@ucla.edu", submittedAt: "2026-02-14T11:20:00Z", status: "approved", reviewNotes: "Verified and added to Software category." },
  { id: "sub4", storeName: "Pizza Hut", dealInfo: "15% off for students on Tuesdays", url: "https://pizzahut.com", submittedBy: "sam@nyu.edu", submittedAt: "2026-02-13T16:00:00Z", status: "rejected", reviewNotes: "Could not verify this deal. No student program found on their site." },
];

export const mockScanRuns: ScanRun[] = [
  { id: "sr1", dealId: "d1", dealTitle: "Adobe Creative Cloud – 60% Off", storeName: "Adobe", scannedAt: "2026-02-17T10:00:00Z", status: "success", previousStatus: "active", newStatus: "active", aiChangeNotes: "Deal page still active. Discount remains at 60%. No changes detected.", responseCode: 200 },
  { id: "sr2", dealId: "d8", dealTitle: "Domino's Student Combo – 20% Off", storeName: "Domino's", scannedAt: "2026-02-17T10:05:00Z", status: "needs_review", previousStatus: "active", newStatus: "expired", aiChangeNotes: "Page content contains 'this offer has ended'. Marking as expired.", responseCode: 200 },
  { id: "sr3", dealId: "d4", dealTitle: "Nike Student Discount – 10% Off", storeName: "Nike", scannedAt: "2026-02-17T10:10:00Z", status: "success", previousStatus: "active", newStatus: "active", aiChangeNotes: "Deal verified. UNiDAYS verification still active. Discount unchanged at 10%.", responseCode: 200 },
  { id: "sr4", dealId: "d6", dealTitle: "Samsung Education Store – 30% Off", storeName: "Samsung", scannedAt: "2026-02-17T10:15:00Z", status: "failed", previousStatus: "active", newStatus: "needs_review", aiChangeNotes: "Failed to fetch page. HTTP 503 returned. Needs manual verification.", responseCode: 503 },
  { id: "sr5", dealId: "d2", dealTitle: "Spotify Premium Student – $5.99/mo", storeName: "Spotify", scannedAt: "2026-02-16T08:00:00Z", status: "success", previousStatus: "active", newStatus: "active", aiChangeNotes: "No changes. Student bundle still includes Hulu and Showtime.", responseCode: 200 },
];
