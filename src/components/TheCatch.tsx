import { cn } from "@/lib/utils";

/**
 * The catch: a named, labelled block rather than a warning sentence.
 *
 * This replaces an amber sentence prefixed with a triangle icon. Three reasons
 * the label beats the icon:
 *
 *  - A triangle reads as "something went wrong". Nothing has gone wrong — the
 *    deal is fine and this is the part of it worth knowing before you commit.
 *  - "The catch" names the thing. A student scanning nine cards learns the
 *    shape once and can then find it instantly on every card after.
 *  - It is the product's whole claim, so it should look deliberate rather than
 *    like a validation error.
 *
 * The rule and label are `--brand`, which is what makes this the one repeated
 * mark of colour down the page.
 *
 * Rendered identically on the deal card, the deal detail page and the homepage,
 * from here — three copies of the same markup would drift, and this exact block
 * drifting is how the caveat ends up looking like an error state again.
 */
interface TheCatchProps {
  children: React.ReactNode;
  /**
   * Clamp on cards, where vertical space is shared. Detail pages show it all.
   *
   * Three lines rather than two, measured at 375px: two lines clips five of the
   * seven live catches, three clips three of them, for one extra line of card
   * height. `line-clamp` ellipsises where the text stops fitting, which is
   * mid-word — there is no CSS that makes it break on a space — so the goal is
   * to clip fewer catches, not to clip them more tidily.
   */
  clamp?: boolean;
  className?: string;
}

export function TheCatch({ children, clamp = false, className }: TheCatchProps) {
  return (
    <div className={cn("border-l-2 border-brand pl-[11px]", className)}>
      <p className="text-[11px] uppercase leading-none tracking-[0.12em] text-brand">
        The catch
      </p>
      <p
        className={cn(
          "mt-1 text-caption leading-relaxed text-muted-foreground",
          clamp && "line-clamp-3",
        )}
      >
        {children}
      </p>
    </div>
  );
}

export default TheCatch;
