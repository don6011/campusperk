import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Instrument Sans", "system-ui", "sans-serif"],
      },
      /*
       * THE TYPE SCALE. Six steps, each with its line-height baked in, so a
       * size cannot be used without its leading. Anything not on this list is
       * an arbitrary size and should not appear in new work.
       *
       * Tailwind's default text-* scale is intentionally left in place: it is
       * still referenced by hundreds of utilities across screens this commit
       * must not rewrite, and removing those keys would make them silently
       * match nothing rather than fail loudly.
       */
      fontSize: {
        display: ["32px", { lineHeight: "1.15", fontWeight: "500" }],
        h1: ["24px", { lineHeight: "1.25", fontWeight: "500" }],
        h2: ["18px", { lineHeight: "1.35", fontWeight: "500" }],
        body: ["15px", { lineHeight: "1.5", fontWeight: "400" }],
        small: ["13px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.4", fontWeight: "400" }],
      },
      /*
       * The 4px spacing scale, as named steps. Same reasoning as fontSize:
       * these are the values new work uses; Tailwind's numeric scale stays so
       * existing p-5 / gap-2.5 utilities keep resolving until the screens that
       * use them are rewritten.
       */
      spacing: {
        s1: "4px",
        s2: "8px",
        s3: "12px",
        s4: "16px",
        s6: "24px",
        s8: "32px",
        s12: "48px",
      },
        colors: {
          border: "hsl(var(--border))",
          input: "hsl(var(--input))",
          ring: "hsl(var(--ring))",
          background: "hsl(var(--background))",
          foreground: "hsl(var(--foreground))",
          primary: {
            DEFAULT: "hsl(var(--primary))",
            foreground: "hsl(var(--primary-foreground))",
          },
          secondary: {
            DEFAULT: "hsl(var(--secondary))",
            foreground: "hsl(var(--secondary-foreground))",
          },
          destructive: {
            DEFAULT: "hsl(var(--destructive))",
            foreground: "hsl(var(--destructive-foreground))",
          },
          muted: {
            DEFAULT: "hsl(var(--muted))",
            foreground: "hsl(var(--muted-foreground))",
          },
          accent: {
            DEFAULT: "hsl(var(--accent))",
            foreground: "hsl(var(--accent-foreground))",
          },
          /*
           * `gold` is aliased to the secondary text neutral, not deleted.
           *
           * C4 removes the gold Premium treatment, but 214 utilities across the
           * app still say text-gold / bg-gold/15 / border-gold/40. Dropping the
           * key would make every one of them resolve to nothing — silently, and
           * in screens this commit is not allowed to rewrite. Aliasing kills the
           * treatment (gold now reads as ordinary secondary text) while keeping
           * each call site meaningful, and leaves one line to change when those
           * screens are swept.
           */
          gold: {
            DEFAULT: "hsl(var(--muted-foreground))",
          },
          /*
           * Brand. Mapped from the four tokens in index.css — no hex here
           * either, so the palette has exactly one definition site.
           */
          brand: {
            DEFAULT: "hsl(var(--brand))",
            hover: "hsl(var(--brand-hover))",
            wash: "hsl(var(--brand-wash))",
            border: "hsl(var(--brand-border))",
          },
          // The only warning colour in the system, for recorded caveats.
          caveat: {
            DEFAULT: "hsl(var(--caveat))",
            surface: "hsl(var(--caveat-surface))",
          },
          "muted-faint": "hsl(var(--muted-faint))",
          campus: {
            DEFAULT: "hsl(var(--campus-primary))",
            secondary: "hsl(var(--campus-secondary))",
          },
          popover: {
            DEFAULT: "hsl(var(--popover))",
            foreground: "hsl(var(--popover-foreground))",
          },
          card: {
            DEFAULT: "hsl(var(--card))",
            foreground: "hsl(var(--card-foreground))",
          },
          sidebar: {
            DEFAULT: "hsl(var(--sidebar-background))",
            foreground: "hsl(var(--sidebar-foreground))",
            primary: "hsl(var(--sidebar-primary))",
            "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
            accent: "hsl(var(--sidebar-accent))",
            "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
            border: "hsl(var(--sidebar-border))",
            ring: "hsl(var(--sidebar-ring))",
          },
        },
      borderRadius: {
        // 12px cards, 8px inner tiles. Two values, nothing between.
        lg: "var(--radius)",
        md: "var(--radius-inner)",
        sm: "var(--radius-inner)",
        card: "var(--radius)",
        tile: "var(--radius-inner)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        "marquee": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "marquee": "marquee 30s linear infinite",
        "shimmer": "shimmer 3s ease-in-out infinite",
        "gradient-shift": "gradient-shift 6s ease infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
