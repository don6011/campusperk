export type MarketplaceCollection = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  categories: string[];
  keywords: string[];
};

export type CollectionDealLike = {
  title?: string | null;
  description?: string | null;
  category?: string | null;
};

export const MARKETPLACE_COLLECTIONS: MarketplaceCollection[] = [
  {
    slug: "student-essentials",
    title: "Student Essentials",
    eyebrow: "Daily student staples",
    description: "Food, apparel, supplies, transportation, and dorm-life deals students can use every week.",
    categories: ["food", "apparel", "shopping", "student essentials", "transportation", "local", "supplies", "dorm"],
    keywords: ["food", "delivery", "meal", "coffee", "apparel", "supplies", "dorm", "transit", "student essentials"],
  },
  {
    slug: "travel-ready",
    title: "Travel Deals",
    eyebrow: "Move for less",
    description: "Flights, rides, hotels, luggage, and student travel savings for breaks, internships, and visits home.",
    categories: ["travel", "transportation", "hotel", "rideshare", "airline"],
    keywords: ["travel", "flight", "hotel", "ride", "rideshare", "bus", "train", "luggage", "trip"],
  },
  {
    slug: "tech-toolkit",
    title: "Tech Toolkit",
    eyebrow: "Software and gear",
    description: "Student-friendly software, creator tools, devices, and productivity offers for class and side projects.",
    categories: ["technology", "software", "productivity", "tech"],
    keywords: ["software", "tech", "laptop", "cloud", "developer", "creative", "productivity", "subscription"],
  },
  {
    slug: "study-stack",
    title: "Study Stack",
    eyebrow: "Learn smarter",
    description: "Courses, books, research tools, tutoring, and academic resources that support better study sessions.",
    categories: ["education", "career", "books", "learning"],
    keywords: ["course", "learn", "education", "book", "tutor", "study", "career", "resume", "certification"],
  },
  {
    slug: "new-this-week",
    title: "New This Week",
    eyebrow: "Freshly added",
    description: "Recently imported and verified offers worth checking before they expire or rotate out.",
    categories: [],
    keywords: [],
  },
];

const normalize = (value?: string | null) => (value || "").toLowerCase().trim();

export function dealMatchesCollection(deal: CollectionDealLike, collection: MarketplaceCollection) {
  if (collection.slug === "new-this-week") return true;

  const category = normalize(deal.category);
  const haystack = `${normalize(deal.title)} ${normalize(deal.description)} ${category}`;

  return (
    collection.categories.some((item) => category.includes(item) || item.includes(category)) ||
    collection.keywords.some((keyword) => haystack.includes(keyword))
  );
}

export function getMarketplaceCollection(slug?: string) {
  return MARKETPLACE_COLLECTIONS.find((collection) => collection.slug === slug);
}
