Wallpaper Engine built-in font compatibility assets

The renderer can resolve known install-level Wallpaper Engine font references
such as `fonts/Monofur-PK7og.ttf` from this directory when the wallpaper's
scene.pkg does not embed the font.

Only Monofur is bundled by this patch because the accompanying upstream text
explicitly permits redistribution when distributed together with that text.
Other known WE built-in font filenames are recognized by the resolver, but a
font file must be placed in this directory before it can be loaded.

Do not copy additional fonts into a redistributable build without checking the
license that applies to each font.
