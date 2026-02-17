

# CampusPerk — Full-Stack Student Discount Dashboard

## Overview
A dark-mode, modern SaaS dashboard where college students discover, track, and access verified student discounts. Includes user authentication, deal browsing, favorites, alerts, a premium tier (mock payments), an admin portal, AI-powered deal ingestion, and automated link scanning.

**Backend:** Lovable Cloud (Supabase) for database, auth, edge functions
**AI:** Lovable AI for deal extraction from URLs/text
**Scraping:** Firecrawl connector for scanning deal links

---

## Phase 1: Foundation & Authentication

### Landing Page
- Dark, premium SaaS design with hero section: "Every Student Discount. One Dashboard."
- CTA buttons: "Explore Discounts" and "Verify Student Access"
- Feature highlights, category showcase, and social proof section

### Authentication
- Email/password signup and login
- .edu email verification flow for student status
- Auth-protected routes for dashboard, favorites, alerts
- User roles system (user, premium_user, admin) stored in a separate `user_roles` table

### Database Schema
- **profiles** table: name, email, student_verified, premium_status, timestamps
- **user_roles** table: user_id, role (enum: user, premium_user, admin)
- **stores** table: name, logo_url, website_url, categories, student_discount_available
- **deals** table: store_id, title, description, discount_type, discount_value, affiliate_link_url, direct_link_url, requires_edu_email, status (active/expired/coming_soon), sponsored, featured, commission_rate, last_checked_at, ai_summary
- **favorites** table: user_id, deal_id
- **alert_subscriptions** table: user_id, categories, alert_type
- **submissions** table: store_name, deal_info, submitted_by, status (pending/approved/rejected)
- RLS policies on all tables

### Seed Data
- 10 categories: Clothing, Software, Tech, Books, Subscriptions, Food, Travel, Fitness, Entertainment, Learning
- 20 example deals across categories with sample stores

---

## Phase 2: User Dashboard & Deal Browsing

### User Dashboard
- Featured deals carousel (sponsored/featured deals)
- Recently updated deals section
- "Expiring Soon" deals with countdown indicators
- Favorites preview widget
- Quick stats (saved deals, active alerts)

### Explore Deals Page
- Grid/list view of all deals with store logos
- Filter sidebar: category, discount %, requires verification, active status
- Sort options: newest, most popular, expiring soon
- Search bar for deals and stores

### Deal Details Page
- Full offer details with discount value and type
- Step-by-step redemption instructions
- Eligibility requirements (edu email, student ID, etc.)
- "Last checked" timestamp with freshness indicator
- Affiliate redirect button (tracks clicks)
- Related deals from the same store

---

## Phase 3: User Engagement Features

### Favorites System
- Save/unsave deals and stores
- Favorites page with deal change tracking
- Visual indicators on deal cards for saved items

### Alerts Center
- Subscribe to categories for new deal notifications
- Expiring deal alerts
- Alert preferences management page
- In-app notification feed

### Deal Submissions
- User form to submit discovered deals (store name, deal info, URL)
- Submission status tracking (pending, approved, rejected)

---

## Phase 4: Premium Subscription (Mock)

### Premium Features
- Premium badge on user profile
- Early access deals section (visible only to premium users)
- Hidden/private discounts section
- Price drop alerts toggle
- Unlimited alerts (free tier gets limited alerts)
- Ad-free browsing (hide sponsored deal badges)

### Upgrade Flow
- Pricing page with free vs premium comparison
- Upgrade modal with feature highlights
- Mock payment confirmation (no real Stripe — admin toggles premium)

---

## Phase 5: Admin Portal

### Admin Dashboard
- Stats overview: total deals, active vs expired, affiliate clicks, estimated revenue, pending submissions
- Charts for deal trends and user growth

### Deals Manager
- Table view of all deals with CRUD operations
- Toggle sponsored/featured status
- Manage affiliate links and commission rates
- Bulk actions (activate, expire, delete)

### Stores Manager
- CRUD for stores
- Assign/edit categories
- Upload store logos

### Submissions Queue
- Review user-submitted deals
- Approve (auto-creates deal entry) or reject with reason

### Users Manager
- User list with search and filters
- Toggle premium status manually
- Manually verify student status
- View user activity

---

## Phase 6: AI Deal Ingestion & Scanning

### AI Deal Extraction (Admin Tool)
- "Add Deal with AI" form — paste a URL or offer text
- Uses Firecrawl to scrape the URL content
- Sends scraped content to Lovable AI to extract: store name, discount value, eligibility, redemption steps, expiration date
- Pre-fills the deal creation form for admin review before saving

### Automated Link Scanning
- Edge function that re-checks deal URLs for availability
- Updates deal status (active/expired) and last_checked_at timestamp
- Admin can trigger manual scans from the admin dashboard
- Scan results summary in admin view

---

## Design & UX
- **Theme:** Dark mode default, fintech-inspired minimal design
- **Colors:** Deep navy/charcoal backgrounds, vibrant accent colors for CTAs and badges
- **Typography:** Clean sans-serif, clear hierarchy
- **Components:** Cards with subtle gradients, glass-morphism effects, smooth animations
- **Responsive:** Mobile-first, works on all devices

