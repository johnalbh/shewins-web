---
name: SheWins
description: A business community for women in Málaga, designed as the brand book's chapters.
colors:
  red: "#C7010F"
  gradient-mid: "#E2386F"
  pink: "#FF72AD"
  cream: "#F8F4ED"
  ink: "#1A1A1A"
  black: "#000000"
  white: "#FFFFFF"
  line: "rgba(26, 26, 26, 0.18)"
  line-on-dark: "rgba(248, 244, 237, 0.4)"
typography:
  numeral:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(120px, 19vw, 300px)"
    fontWeight: 700
    lineHeight: 0.8
    letterSpacing: "-0.06em"
    fontVariation: "'wdth' 96"
  display:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(50px, 11vw, 168px)"
    fontWeight: 700
    lineHeight: 0.88
    letterSpacing: "-0.055em"
    fontVariation: "'wdth' 96"
  display-closer:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(50px, 11vw, 160px)"
    fontWeight: 700
    lineHeight: 0.88
    letterSpacing: "-0.055em"
    fontVariation: "'wdth' 96"
  headline:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(38px, 6.4vw, 92px)"
    fontWeight: 700
    lineHeight: 0.94
    letterSpacing: "-0.045em"
    fontVariation: "'wdth' 96"
  title:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(28px, 4vw, 56px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontVariation: "'wdth' 96"
  title-event:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(34px, 4.6vw, 70px)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.045em"
    fontVariation: "'wdth' 96"
  title-list:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(24px, 2.6vw, 36px)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.04em"
    fontVariation: "'wdth' 96"
  title-pair:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(28px, 5.2vw, 68px)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.05em"
    fontVariation: "'wdth' 96"
  article-title:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(34px, 4.4vw, 64px)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.045em"
    fontVariation: "'wdth' 96"
  article-lead:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(19px, 1.75vw, 23px)"
    fontWeight: 400
    lineHeight: 1.6
  lead:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(17px, 1.6vw, 20px)"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  control:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.2
  small:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0.16em"
  button:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.2
  pill:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1
  script:
    fontFamily: "Wonderful Branding, Snell Roundhand, cursive"
    fontSize: "clamp(22px, 2.4vw, 32px)"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  none: "0"
  mark: "3px"
  focus: "4px"
  pill: "999px"
spacing:
  gutter: "20px"
  row: "26px"
  block: "clamp(22px, 3vw, 44px)"
  section: "clamp(48px, 7vw, 104px)"
  label-column: "200px"
  container: "1240px"
components:
  button-red:
    backgroundColor: "{colors.red}"
    textColor: "{colors.cream}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "10px 22px"
    height: "52px"
  button-cream:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.red}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "10px 22px"
    height: "52px"
  button-pink:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.black}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "10px 22px"
    height: "52px"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "10px 22px"
    height: "52px"
  pill:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.pill}"
    rounded: "{rounded.pill}"
    padding: "7px 14px"
  pill-filled:
    backgroundColor: "{colors.red}"
    textColor: "{colors.cream}"
    typography: "{typography.pill}"
    rounded: "{rounded.pill}"
    padding: "7px 14px"
  input-underline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "10px 0"
    height: "44px"
  event-frame:
    backgroundColor: "{colors.red}"
    textColor: "{colors.cream}"
    rounded: "{rounded.none}"
    padding: "clamp(12px, 1.6vw, 22px)"
  event-frame-panel:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.black}"
    rounded: "{rounded.none}"
    padding: "clamp(22px, 3.2vw, 52px)"
---

# Design System: SheWins

## Overview

**Creative North Star: "The Chapter Book"**

Every page of SheWins opens like a chapter of its brand book. A full-width band in a brand colour carries a giant two-digit numeral, a tight display headline and one handwritten phrase. The content below reads like the book's index: hairline rows, each with a small uppercase label in a left column and the substance on the right. The system was designed by Messin Virginia from the SheWins brand book. `public/style.css` is that work, and later layers (fixes, responsive, motion) extend it without editing it.

The personality is editorial structure with a bold voice:

- **Structure:** cream paper, ink type, 1px hairlines, underline-only fields and small uppercase labels. These keep the page calm and scannable.
- **Voice:** the emotion comes from flat blocks of red, pink and the one brand gradient; oversized Archivo display type set tight; square buttons that end in an arrow cell; and a single script phrase per chapter.

Density is generous: sections breathe (48–104px vertical), headlines are very large, and body copy stays short. Corners are square on blocks and on every control; only the small tags are round. Nothing floats: the page is flat, and depth comes from colour blocks, hairlines and the red frame around the next event.

**Key Characteristics:**

- Chapter openers: a numeral (01–04), headline, script phrase and lead on a red, pink, gradient or cream band.
- Hairline rows with a 200px uppercase label column, stacked on phones.
- Archivo 700 at 96% width with negative tracking for all display type. Inter for everything you read.
- One script phrase per chapter (Wonderful Branding), always small and never for UI.
- Flat colour blocks and one 135° gradient. No shadows on content.
- Square blocks, images and controls. Only tags are round pills.
- Motion that writes, draws and settles: the script writes itself in, hairlines draw on scroll, and pages cross-fade. Reduced motion shows final states.

## Colors

Five brand colours from the brand book, used as flat blocks. There are no tints or washes, and there is exactly one gradient.

### Primary

- **Red** (#C7010F): the brand's voice and action colour. Used for primary buttons, the footer, red chapter bands, the event frame, filled pills, the active navigation underline, label accents (dates, quote names) and article headings on cream.

### Secondary

- **Pink** (#FF72AD): energy and warmth. Used for pink chapter bands, the event panel inside the red frame, colour-block tiles and the form error underline. It always carries black text.

### Tertiary

- **Gradient** (135deg: Red 0%, Gradient-mid #E2386F 55%, Pink 100%): the brand gradient, and the only gradient. Used for the home cover, gradient bands, the third "door" and the "Move" tile. Carries cream text.

### Neutral

- **Cream** (#F8F4ED): the page paper. Default background, text on red and gradient, and the header and sticky bars.
- **Ink** (#1A1A1A): all body and display text on cream and white, and strong rules.
- **Black** (#000000): text on pink, and the surface of the event facts strip.
- **White** (#FFFFFF): an alternate light surface for section rhythm (schedule, next article, team cards, a "line" door).
- **Line** (rgba(26,26,26,0.18)): the hairline between rows on light surfaces.
- **Line on dark** (rgba(248,244,237,0.4)): the hairline on red and gradient surfaces.

### Named Rules

**The Approved Pairs Rule.** Text sits only on these pairs:

- Cream on Red (5.6:1).
- Black on Pink (8.3:1).
- Red on Cream (5.6:1).
- Ink or Black on Cream (15.9:1).
- Cream on Black (19:1), for the event facts strip.

Pink text on Cream is forbidden (2.3:1).

**The Gradient Text Rule.** On the gradient, cream text must be large (display or headline). The pink end drops to 2.3:1, so small labels or body copy go on the red half or on a solid block.

Known gap, pending a decision with Messin Virginia (October 2026): the current pages break this rule in 27 places, measured at 390 and 1280px:

- home cover: lead, line button, footer labels;
- membership opener: title at 2.8:1;
- About language quote: 2.5–2.7:1;
- the events and partners gradient blocks;
- the "Move" tile.

Cream reaches 4.5:1 only on the first ~27% of the gradient. Leave existing pages as they are until the designer decides, and do not add new small cream text on the gradient.

**The Flat Block Rule.** Colour arrives as full flat blocks and bands, never as tints, translucent washes or new gradients. The brand gradient is the only gradient and is never applied to text.

**The Muted Text Rule.** Secondary text may be quieter, but never below 4.5:1:

- cream on red stays at 90% opacity or more (the minimum is 89%);
- ink on cream or white stays at 65% or more.

To mark something as inactive or past, dim only large type (display, titles, numerals, which need 3:1) and keep small text at full contrast.

## Typography

**Display Font:** Archivo (variable, set at 96% width), with Helvetica Neue and Arial as fallbacks.
**Body Font:** Inter (variable), with system-ui as the fallback.
**Accent Script:** Wonderful Branding, with Snell Roundhand and cursive as fallbacks. It is a licensed font, fetched at build time and never committed.

**Character:** a tight, heavy grotesque speaks in short declarative lines ("Come to a free event."). A neutral, readable sans carries everything else. One loose handwritten phrase adds the human aside.

### Hierarchy

- **Numeral** (700, clamp(120px, 19vw, 300px), 0.8, −0.06em): the chapter number in opener bands (01–04), the event date and the trio figures. Decorative (`aria-hidden`).
- **Display** (700, clamp(50px, 11vw, 168px), 0.88, −0.055em): the home cover headline (tuned to clamp(46px, 8.6vw, 128px) at 0.96) and the waitlist closers. In the two-column form band, closers cap at 160px (display-closer) so the longest word fits its column.
- **Headline** (700, clamp(38px, 6.4vw, 92px), 0.94, −0.045em): section headings ("October at SheWins.") and opener titles (clamp(44px, 6.4vw, 100px)).
- **Title** (700, clamp(28px, 4vw, 56px), 1, −0.04em): sub-section heads. Row and card titles step down to clamp(24px, 2.6vw, 38px).
- **Feature titles** (700, display face): the next-event title (clamp(34px, 4.6vw, 70px), 0.95); blog list titles (clamp(24px, 2.6vw, 36px), max 28ch, two or three lines); "Why SheWins" pair titles (clamp(28px, 5.2vw, 68px)), capped so the longest pair holds one line with no hyphenation.
- **Lead** (400, clamp(17px, 1.6vw, 20px), 1.55): the first paragraph under a headline, max 44ch (36ch in openers).
- **Body** (400, 16px, 1.6): running text. Article paragraphs use clamp(17px, 1.4vw, 19px) at 1.8, on a 68ch column, 1.45em apart.
- **Article** (the reading page): title in red at clamp(34px, 4.4vw, 64px), max 18ch; the opening paragraph as a lead at clamp(19px, 1.75vw, 23px), 1.6; section heads at clamp(24px, 2.4vw, 32px) with 2.4em above.
- **Control and small** (Inter 500 14px; Inter 400 13px): navigation and share buttons; secondary details such as role and reading time.
- **Label** (500, 11px, 0.16em, uppercase): row labels, section labels, form labels, the footer and quote names.
- **Script** (400, clamp(22px, 2.4vw, 32px), 1.45): one phrase per opener, and the cover tagline at clamp(24px, 2.6vw, 36px).

### Named Rules

**The Tight Display Rule.** Display type is always Archivo 700 at 96% width, tracked from −0.035em down to −0.06em, with line-height at or below 1. Default tracking or a lighter weight breaks the voice.

**The Accent Script Rule.** Wonderful Branding is used for one short phrase per chapter, and never for body copy, labels, buttons or navigation. It needs room:

- a 0.3em indent so its loops stay inside the column;
- 0.3em above it, under the headline;
- 1.45 line-height when it wraps;
- never clipped.

**The Readable Text Rule.** Inter carries everything a visitor has to read or operate. Inputs stay at 16px or more so phones do not zoom in.

## Layout

- **Container:** content sits in a centred container of 1240px max, with a 20px gutter that respects safe-area insets. The header row widens to 1500px.
- **Sections:** vertical padding of clamp(48px, 7vw, 104px). Section backgrounds alternate cream, white and the colour bands to pace the page.
- **Rows:** the core unit is the row. A 1px hairline sits on top and 26px of padding below. From 760px up, a 200px label column sits on the left and the content on the right, with a 32px gap. On phones they stack.
- **Chapter openers:** one column on phones. From 860px they split into two equal halves (numeral left, text right, minimum height 440px), and the numeral aligns to the 1240px container edge.
- **Grids:** tiles ("doors", trio, notes, team) use 2–4 columns that collapse to one. Gaps are zero between colour blocks, so blocks meet edge to edge.
- **Breakpoints:** mobile-first at 640, 760, 860, 900, 1000 and 1100px. The desktop navigation appears at 1000px; below that, a full-screen red menu.
- **Single-column grids** use minmax(0, 1fr) so long pills wrap instead of overflowing at 320px.

### Named Rules

**The Hairline Row Rule.** Lists of facts, events, articles and FAQs are rows separated by 1px hairlines, never cards. The first row of a list takes a full-strength ink rule.

**The Chapter Opener Rule.** Every main page starts with a band: a numeral, a headline, one script phrase and a lead, on one of red, pink, gradient or cream, always in that order. When the page has a main action (waitlist, contact), its buttons follow the lead.

**The Shared Baseline Rule.** Elements that sit side by side share a line:

- A label next to large type sits on the baseline of its first line (names, quotes, rows).
- A description next to a title sits on the title's baseline.
- Repeated cards share row heights (subgrid), so numbers, titles, texts and links line up across cards whatever the copy length.

## Elevation & Depth

The system is flat. Depth comes from colour blocks meeting edge to edge, hairlines, and the red frame that holds the next event's pink panel. The sticky header is separated by a hairline, not a shadow. The single exception is the cookie banner: a layer over the page, marked by a 2px ink top border and a soft upward shadow.

### Shadow Vocabulary

- **Overlay lift** (`box-shadow: 0 -10px 40px rgba(0,0,0,.15)`): cookie banner only.

### Named Rules

**The Flat Page Rule.** No shadows, glows or blur on page content. If something needs separation, use a hairline, a colour block or the red frame.

## Shapes

The form language is square throughout, with round tags as the one exception:

- **Square (0):** bands, tiles, frames, images, posters, inputs and every control (buttons, arrow cells, the menu and close buttons, go arrows, FAQ toggles).
- **Fully round (999px):** tags only, the pills that label time, language, venue and status.
- **Small exceptions:** 3px for the pink placeholder marks in legal text and 4px for the focus ring.
- **Borders:** 1.5px currentColor on outline pills, line buttons, arrow-cell dividers, go arrows and input underlines (3px on focus or error). 1px hairlines between rows.
- **Images:** posters are cropped to 3:4 (4:5 in the four-up grid) with object-fit cover.

### Named Rules

**The Square Controls Rule.** Blocks, images and every control are square. Only tags are round pills. Nothing in between: no 4–16px rounded buttons or cards. (Team decision, October 2026: replaces the brand book's round pill buttons and circle arrows.)

## Components

### Buttons

The editorial block: square like the colour blocks, and always pointing forward.

- **Shape:** square corners (0), 52px minimum height, 22px horizontal padding. The label sits on the left. A square arrow cell (52px wide) runs the full height on the right, divided from the label by a 1.5px currentColor rule. Long labels wrap inside the block on narrow phones.
- **Red:** red fill, cream text. The primary action on light surfaces and in the header ("Join the waitlist").
- **Cream:** cream fill, red text. The primary action on red and gradient surfaces.
- **Pink:** pink fill, black text.
- **Line:** a transparent block with a 1.5px currentColor outline, inheriting the surface's text colour. The secondary action beside a filled one.
- **Hover / Active:** the arrow cell takes a 14% tint of the text colour and the arrow steps forward 4px (0.2s, ease-out). There is no lift. On press the block sinks 1px.
- **Focus:** the 2px ink (or cream) outline at a 3px offset, with square corners.
- **Disabled (sending a form):** 75% opacity and a progress cursor.
- **Header:** a compact variant, 40px high with a 40px arrow cell.
- **Cookie banner:** plain square buttons with no arrow cell.
- **Go arrow:** links in start cards and blog rows end in a 34px square outline cell holding the same drawn arrow. It fills red with a cream arrow on hover, and the arrow steps forward 3px.

### Pills

- **Style:** an outline pill, 12px Inter 500, 7×14px, with a 1.5px currentColor border. Used for time, language and venue tags.
- **Filled:** red with cream text on light surfaces. On red and gradient surfaces it inverts to cream fill with red text. It marks status ("Upcoming", "Today").
- **Wrapping:** on phones of 400px or less, long pills wrap. The event-frame and door pills then use a 16px radius and 1.25 line-height.

### Inputs / Fields

- **Style:** underline only. There is no box: a transparent background, a 1.5px currentColor bottom border, 0 radius, 10px vertical padding, 16px text and a 44px minimum height. Labels are uppercase 11px labels above the field.
- **Focus:** the underline thickens to 3px. There is no glow.
- **Error:** the underline turns pink at 3px. A cream error line in red text appears under the form.
- **Checkbox:** a native 20px box with an accent colour.

### Disclosure (FAQ)

- **Row:** questions are hairline rows. The question is in display type at clamp(20px, 2vw, 26px), 600 weight.
- **Toggle:** a 34px square outline cell with a drawn plus.
- **Open:** the plus folds its vertical bar away into a minus (0.35s), and the answer opens smoothly.

### Navigation

- **Desktop (1000px and up):**
  - 14px Inter links at 60% opacity, 100% on hover.
  - The current page is 600 weight with a 1.5px red underline.
  - An EN / ES switch (12px, 600, +0.08em) with the active language in red.
  - A compact red "Join the waitlist" button.
- **Header:** sticky on cream, with a hairline below it.
- **Mobile:** a square outline "Menu" button opens a full-screen red layer, closed by a square button with a drawn ×. Inside it, links are giant display type (clamp(36px, 11vw, 60px)) on line-on-dark hairlines, with small uppercase notes ("Soon") and the cream logo and script tagline at the foot. It drops in and the links follow in sequence.

### Hairline Row (signature)

The brand book's index line. A 1px hairline sits on top. An uppercase label in a 200px left column pairs with a title and text on the right. Rows draw their hairline from left to right as they scroll into view, and settle in with a 14px rise. Used for facts, the event schedule, blog articles, community quotes (the name in the label column, the quote at 46ch on the right), the blog index (author and reading time | title and excerpt | an arrow cell at the end of the row; the whole row is the link) and the partner, sponsor and host names (one name per line, each starting with a "+" at 60% opacity, with a hanging indent). Past events dim only their title and day number to ink at 55%. Host, venue and pills stay at full contrast, and the status pill reads "Past".

### Chapter Opener (signature)

A two-column band: a giant numeral on one side; headline, script phrase and lead on the other. On load:

- the numeral rises out of its band;
- the headline settles 0.12em, staying visible because it is the LCP element;
- the script phrase writes itself in from left to right (0.9s);
- the lead fades up.

### Event Frame (signature)

The next event, held in a red frame (12–22px border of red) around a pink panel. Inside:

- a giant date numeral with a weekday and month label;
- an uppercase "Next free event" label;
- the title, a topic line, and the host and role;
- a facts strip in black with cream text: When, Language and Where. Each fact is an uppercase label over a 15px 600 value, divided by line-on-dark rules; on phones each fact becomes its own row;
- red and line buttons to Meetup and Luma.

### Article Page (signature)

The reading page, centred as one composition.

- **From 1100px:** the 68ch reading column on the left, where the eye lands first, and a 200px side column on the right, with a 56–96px gap and equal margins on both sides.
- **Head:** in the reading column: "← Blog" (a drawn arrow), then the meta line ("By … · N min read") and the red title, aligned with the text below.
- **Side column:** sticky 150px from the top. It holds "Written by", the author's name in display type, the role and reading time in small, a hairline, then "Share this article".
- **Share actions:** outlined square buttons (1px ink, 44px, 14px label, drawn icon at the right) for Copy link, LinkedIn, WhatsApp and Email, plus the phone's Share… on touch devices. Hover tints them and turns the text red. Copy link confirms with "Link copied" for 2s, also announced to screen readers. They are plain links: nothing loads and no cookies are set until the reader shares.
- **Text:** the opening paragraph is a lead, a size up. Pull quotes are red display type between two ink hairlines, with no side bar. Text selection is pink with black text.
- **Reading progress:** a 3px red line along the top of the window fills as the article is read. It is scroll-driven, uses no script, and is hidden under reduced motion.
- **Below 1100px:** one column; the share buttons follow the article in a 2×2 grid.

### Colour-block Tiles

"Doors", the trio and the notes tiles are square blocks in red, pink, gradient, cream or white. They have generous padding (clamp(22–24px, 3vw, 44px)), a minimum height of 190–300px, and content pushed to the edges with a big title or figure.

## Do's and Don'ts

### Do:

- **Do** keep `public/style.css` exactly as the designer delivered it. Add changes in `src/styles/fixes.css`, `responsive.css` or `motion.css`.
- **Do** use only the approved text/background pairs: Cream on Red, Black on Pink, Red on Cream, Ink on Cream.
- **Do** open every main page with a chapter band (numeral, headline, one script phrase, lead).
- **Do** organise lists as hairline rows with the uppercase label in the left column.
- **Do** end every action button with the square arrow cell, divided by a 1.5px rule.
- **Do** give the script room: a 0.3em indent, 0.3em above it and 1.45 line-height when it wraps.
- **Do** keep content visible by default. Motion only enhances, and `prefers-reduced-motion` shows final states.
- **Do** keep touch targets at 44px on the phone layout (menu, EN / ES, fields) and at least 24px everywhere.

### Don't:

- **Don't** put pink text on cream (2.3:1), or small cream text over the pink end of the gradient.
- **Don't** add shadows, glows, glass or blur to page content. The cookie banner is the only shadow.
- **Don't** round blocks, images or controls. Corners are 0 everywhere; fully round is for tags only.
- **Don't** use text characters (→, ×, +) as icons. Arrows, close and FAQ toggles are drawn, in one stroke weight.
- **Don't** introduce new colours, tints or gradients, or put the brand gradient on text.
- **Don't** use the script for more than one short phrase per chapter, or for any UI text.
- **Don't** clip the script with overflow or a persistent clip-path; its loops reach past its box.
- **Don't** loosen display tracking or lighten its weight; Archivo stays 700 at 96% width.
