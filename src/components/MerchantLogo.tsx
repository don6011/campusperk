import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The one place a merchant logo is rendered.
 *
 * There were 31 logo render points across 25 files, each with its own tile
 * markup and its own fallback. That inconsistency produced real defects: the
 * related-deals strip referenced an undefined `.merchant-logo-img` class so its
 * images rendered at natural size and burst out of their tiles, and most sites
 * fell back to a generic shopping-bag icon that read as a broken image — Dell
 * and Microsoft looked broken on Explore rather than simply logo-less.
 *
 * Three behaviours worth knowing:
 *
 *  - No logo on file renders a monogram from the merchant's own name. It is
 *    honest (it asserts nothing the data does not support) and it reads as
 *    deliberate rather than failed.
 *  - A logo URL that fails to load falls back to the same monogram. The old
 *    handlers set `display: none` on the image, which left a visibly empty
 *    tile — a worse outcome than never having had a URL.
 *  - `contain`, never `cover`, so wordmarks are not cropped.
 *
 * The tile's size and radius belong to the caller via `className`; this owns
 * only what goes inside it.
 */
interface MerchantLogoProps {
  /** Merchant name. Supplies the monogram and the image's alt text. */
  name?: string | null;
  logoUrl?: string | null;
  /** Sizing, radius and background for the tile. */
  className?: string;
  /** Font size for the monogram; defaults to a size suited to a 48px tile. */
  monogramClassName?: string;
  /** Falls back to this when `name` is empty — usually the deal title. */
  fallbackName?: string | null;
}

function monogramFor(name?: string | null, fallbackName?: string | null) {
  const source = (name || fallbackName || "").trim();
  return source ? source.charAt(0).toUpperCase() : "·";
}

export function MerchantLogo({
  name,
  logoUrl,
  className,
  monogramClassName,
  fallbackName,
}: MerchantLogoProps) {
  const [failed, setFailed] = useState(false);
  const showImage = !!logoUrl && !failed;
  const isMark = !!logoUrl && logoUrl.endsWith(".svg");

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden",
        className,
      )}
    >
      {showImage && isMark ? (
        /*
         * SVG marks render as a mask filled with currentColor, so every logo on
         * the site has the same weight and takes the surrounding text colour.
         * An <img> could not do this: the file's own fill would win.
         */
        <span
          role="img"
          aria-label={name || fallbackName || "Merchant"}
          className="merchant-logo-mark"
          style={{ ["--mark" as string]: `url(${logoUrl})` }}
        />
      ) : showImage ? (
        <img
          src={logoUrl!}
          alt={name || fallbackName || "Merchant"}
          loading="lazy"
          onError={() => setFailed(true)}
          className="merchant-logo-img"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn("merchant-logo-monogram", monogramClassName ?? "text-base")}
        >
          {monogramFor(name, fallbackName)}
        </span>
      )}
    </div>
  );
}

export default MerchantLogo;
