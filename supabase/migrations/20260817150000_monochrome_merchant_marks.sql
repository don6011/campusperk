-- Point merchants at monochrome brand marks, and clear the ones we cannot draw.
--
-- The old assets were opaque RGB PNGs with each brand's own background baked in.
-- None of the seven checked carries an alpha channel, so on a white surface they
-- rendered as solid black or coloured squares and could not be recoloured or
-- masked — the background is pixels, not transparency.
--
-- simple-icons (npm, v16.28) ships single-path marks with no fill, which the UI
-- masks with currentColor. That gives every logo the same weight and lets it
-- take the surrounding text colour.
--
-- Coverage is partial, and the gaps are not oversights: simple-icons has removed
-- a number of brands following trademark requests. Of the merchants that matter
-- here, it has no mark for Adobe, Hulu, Peacock or Chegg —
-- checked under every plausible slug.
--
-- Those five are set to NULL rather than left pointing at an unusable PNG, so
-- they render the name monogram. A monogram is honest and matches the weight of
-- the marks beside it. The alternative — thresholding an opaque PNG into a
-- silhouette — would ship a distorted approximation of someone's trademark, so
-- it was not done.
--
-- Note for whoever closes the gap: Adobe is the flagship deal and now renders as
-- "A". Supplying `public/logos/adobe.svg` (and microsoft.svg) and setting
-- `logo_url` here is all that is needed; the rendering path already handles it.

UPDATE public.stores AS s
SET logo_url = v.logo_url
FROM (
  VALUES
    -- Marks now shipped in public/logos/
    ('Dell',        '/logos/dell.svg'),
    ('Figma',       '/logos/figma.svg'),
    ('Google',      '/logos/google.svg'),
    ('JetBrains',   '/logos/jetbrains.svg'),
    ('Paramount+',  '/logos/paramountplus.svg'),
    ('Skillshare',  '/logos/skillshare.svg'),
    ('YouTube',     '/logos/youtube.svg'),
    ('Apple',       '/logos/apple.svg'),
    ('GitHub',      '/logos/github.svg'),
    ('Notion',      '/logos/notion.svg'),
    ('Spotify',     '/logos/spotify.svg'),
    ('Samsung',     '/logos/samsung.svg'),
    -- Microsoft is absent from simple-icons but present in Font Awesome's free
    -- brands set (CC-BY-4.0), extracted to public/logos/microsoft.svg.
    ('Microsoft',   '/logos/microsoft.svg'),
    -- No mark available; monogram instead of an unusable opaque PNG.
    ('Adobe',       NULL),
    ('Hulu',        NULL),
    ('Peacock',     NULL),
    ('Chegg',       NULL)
) AS v(name, logo_url)
WHERE s.name = v.name
  AND s.logo_url IS DISTINCT FROM v.logo_url;
