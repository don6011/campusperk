import { cn } from "@/lib/utils";

/**
 * The CampusPerk wordmark, set in type rather than shipped as an image.
 *
 * It was a 226KB PNG rendered by 22 files. Three things were wrong with it, and
 * only the first is why it changed:
 *
 *  - **Half of it was invisible.** "Campus" is filled #E0E0E0 with a thin white
 *    outline — sampled from the file, not guessed. That was legible on the old
 *    dark navy surface. On #FFFFFF it is 1.3:1 against the background, so every
 *    header on the site read "Perk" next to a graduation cap. Nobody noticed for
 *    five sessions because the source says `alt="CampusPerk"` and reads fine.
 *  - **It could not take a token.** An RGB raster cannot be recoloured, so the
 *    wordmark was the one brand surface `--brand` could not reach.
 *  - **Its ink filled 60% x 29% of the canvas.** `h-10 w-auto` therefore drew
 *    ~11px of glyph inside a 40px box, with the rest transparent padding, which
 *    is why the header logo always looked small and off-centre.
 *
 * Type solves all three: it reads `hsl(var(--brand))` like everything else, it
 * is sized by the text scale, and it is legible because it is text.
 *
 * `size` is coarse on purpose. The old call sites carried eight different
 * `h-*` values with no rationale between them; three steps cover every use,
 * and each step is a named step of the type scale rather than a loose px.
 */
interface WordmarkProps {
  /** nav headers | page headers | hero and auth screens */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "text-h2",
  md: "text-h1",
  lg: "text-display",
} as const;

export function Wordmark({ size = "sm", className }: WordmarkProps) {
  return (
    <span
      className={cn(
        // inline-block so callers' vertical margins apply; horizontal centring
        // comes from the parent's text-align, as it does for any run of type.
        "inline-block font-display tracking-tight text-brand",
        SIZES[size],
        className,
      )}
    >
      CampusPerk
    </span>
  );
}

export default Wordmark;
