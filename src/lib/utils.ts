import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge has to be told about the named type scale, or it silently
 * eats half of every class list that uses it.
 *
 * `text-*` is ambiguous: it is both the font-size utility and the text-colour
 * utility, and tailwind-merge tells them apart from a built-in list of size
 * names. `display`, `h1`, `h2`, `body`, `small` and `caption` are ours, so they
 * are not on that list — they get classified as colours, and two "colours" in
 * one list means the last one wins:
 *
 *     twMerge("text-caption text-muted-foreground")  ->  "text-muted-foreground"
 *     twMerge("text-h1 text-brand")                  ->  "text-brand"
 *     twMerge("text-brand text-h1")                  ->  "text-h1"
 *
 * The dropped class is not an error anywhere. The element simply renders at the
 * inherited 16px, or in the inherited colour, and looks *nearly* right — the
 * catch text on every deal card was rendering 4px too large for exactly this
 * reason and read as a normal paragraph.
 *
 * Only class lists that pass through `cn()` are affected; a plain string
 * `className` never reaches tailwind-merge. That is why this stayed hidden: the
 * same two classes behave differently depending on whether the component
 * happens to accept a `className` prop.
 *
 * Registering the six names puts them back in the font-size group, where a size
 * and a colour no longer compete.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "body", "small", "caption"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
