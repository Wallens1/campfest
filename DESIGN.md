---
name: Camp Fest Bugalagrande
description: Memphis camp world for the public site of the II Campamento Juvenil del Valle del Cauca, built as a trust board where every fact shows its status and source.
colors:
  pink: "#FF2E8B"
  yellow: "#FFD400"
  cyan: "#00D2C6"
  purple: "#8B2FF0"
  orange: "#FF6B00"
  ink: "#1A1A1E"
  ink-2: "#3B3842"
  cream: "#FFF7EA"
  cream-2: "#FFEFD4"
  white: "#FFFFFF"
  tint-pink: "#FFE3EF"
  tint-cyan: "#DDF8F5"
  tint-yellow: "#FFF4BF"
  tint-purple: "#EFE3FF"
  tint-orange: "#FFE7D6"
  deep-pink: "#A3124F"
  deep-cyan: "#00695F"
  deep-purple: "#5A13B0"
  deep-orange: "#A33F00"
  deep-yellow: "#6E5600"
  paper-rule: "#ECE5D8"
  paper-zebra: "#FFFBF2"
typography:
  display:
    fontFamily: "Fredoka, sans-serif"
    fontSize: "clamp(44px, 5.4vw, 84px)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Fredoka, sans-serif"
    fontSize: "clamp(30px, 4.4vw, 46px)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.005em"
  title:
    fontFamily: "Fredoka, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  lead:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "17.5px"
    fontWeight: 500
    lineHeight: 1.6
  label:
    fontFamily: "Fredoka, sans-serif"
    fontSize: "12.5px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.2px"
rounded:
  stamp: "8px"
  s: "10px"
  tile: "14px"
  m: "16px"
  l: "24px"
  cta: "30px"
  pill: "999px"
spacing:
  xs: "8px"
  s: "14px"
  m: "18px"
  l: "24px"
  xl: "48px"
  section: "88px"
  section-mobile: "64px"
components:
  button-primary:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.pill}"
    padding: "13px 26px"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    rounded: "{rounded.pill}"
    padding: "13px 26px"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "13px 26px"
  stamp-ok:
    backgroundColor: "{colors.cyan}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.stamp}"
    padding: "4px 10px"
  stamp-wip:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.stamp}"
    padding: "4px 10px"
  stamp-hold:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.stamp}"
    padding: "4px 10px"
  stamp-ask:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.stamp}"
    padding: "4px 10px"
  chip-kind:
    backgroundColor: "{colors.tint-cyan}"
    textColor: "{colors.deep-cyan}"
    rounded: "6px"
    padding: "2px 8px"
  chip-kind-money:
    backgroundColor: "{colors.tint-orange}"
    textColor: "{colors.deep-orange}"
    rounded: "6px"
    padding: "2px 8px"
  icon-tile:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    size: "46px"
  card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.m}"
    padding: "24px 22px 20px"
  status-board:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.l}"
    padding: "22px 22px 14px"
  nav-bar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    padding: "10px 20px"
  nav-link-active:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  input-field:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.s}"
    padding: "12px 14px"
---

# Design System: Camp Fest Bugalagrande

## Overview

**Creative North Star: "The Camp Trust Board"**

Camp Fest is a Memphis camp world drawn in thick ink: every object has a hard black outline, sits on a solid offset shadow, and is filled with one flat, loud color. Confetti, triangles, rings and floating shapes make it read as a youth festival. The trust board is what makes it credible. Each fact the public needs (date, registration, venue, allies, budget lines, legal articles) sits in a ruled, outlined container and carries a rotated status stamp that says how settled it is: confirmed, in progress, postponed, or requested.

The ground is warm cream, not white. White is reserved for the objects that sit on it: cards, boards, tables, panels. Bands of soft palette tint mark the sections, each closed by a 6px ink rule, and saturated color is concentrated in the hero, the postponement notice, the stamps, the icon tiles and the buttons. Display type is Fredoka, rounded and heavy, often uppercase. Body text is Poppins at a comfortable 16px with generous leading. The site is read mostly on phones, so every multi-column structure collapses to a single readable column and tables become stacked records.

Motion is playful but optional. The hero copy rises in, the board drops in, and its stamps thump down one at a time. Confetti floats, cards straighten when hovered, and the sponsor strip scrolls. All of it is switched off under `prefers-reduced-motion`, and content never depends on JavaScript to become visible.

**Key Characteristics:**
- Thick ink outlines (2–4px #1A1A1E) on every interactive or containing object.
- Solid, unblurred offset shadows in ink, pink or cyan; no soft shadows anywhere.
- Status stamps (cyan, yellow, pink, dashed white) as the system's unit of honesty.
- Custom 24px line icons with a 2px round stroke, usually seated in a colored ink-bordered tile; no emoji.
- Cream ground, tinted section bands, white objects, saturated accents.
- Fredoka display and labels over Poppins body.

## Colors

Five saturated Memphis primaries over warm cream and near-black ink, each with a pale tint for grounds and a deep shade for legible text on that tint.

### Primary
- **Festival Purple** (`purple`): the home hero ground, the focus ring, the scrollbar thumb, form-field focus border and checkbox accent. Takes white text.
- **Marquee Yellow** (`yellow`): the primary button, the nav CTA, the postponement notice band, the default icon tile, the in-progress stamp, the highlighter under key words in section titles, and text selection. Always paired with ink text.

### Secondary
- **Hot Pink** (`pink`): the active nav pill, the ink button's offset shadow, the postponed stamp, budget-list bullets, the question icons and the default subpage hero. Ink text on it.
- **Pool Cyan** (`cyan`): the confirmed stamp, the secondary button's offset shadow, the checklist check badge and the dot on the status board's corner.

### Tertiary
- **Campfire Orange** (`orange`): the date badge circle, food and logistics icon tiles, and the orange subpage hero. Ink text on it.

### Neutral
- **Camp Ink** (`ink`): all outlines, all offset shadows, body text, the nav bar, table headers, the footer and the ink-band variant.
- **Faded Ink** (`ink-2`): secondary text (leads, descriptions, captions). Each tinted band redefines it to a darker hue-matched value (#4A3A22 on cream, #134A45 on cyan, #5E1736 on pink, #3D1673 on purple, #4D3D00 on yellow) so muted text keeps its contrast.
- **Camp Cream** (`cream`): the page ground, light text on ink, and form-field fill.
- **Kraft Cream** (`cream-2`): the cream band variant and scrollbar track.
- **Paper White** (`white`): the surface of every card, board, table, panel, stamp-ask and secondary button.
- **Paper Rule** (`paper-rule`) and **Paper Zebra** (`paper-zebra`): hairline row dividers and alternate-row fill inside white tables. These are literal values in the stylesheet, not custom properties yet.

### Tints and deeps
- **Tints** (`tint-pink`, `tint-cyan`, `tint-yellow`, `tint-purple`, `tint-orange`): section band grounds, audience-directory columns, legal article numbers, nav-menu hover, notices and form status messages.
- **Deeps** (`deep-pink`, `deep-cyan`, `deep-purple`, `deep-orange`, `deep-yellow`): text and icon color when it sits on its own tint (article numbers, contribution chips, form labels, schedule times, card links, form status messages). They exist for AA contrast; never use the saturated color as text on its tint.

### Named Rules
**The Stamp Code Rule.** Status color is fixed: cyan means confirmed or ready, yellow means in progress or under review, pink means postponed but still in force, dashed white means requested with no answer. The same four meanings apply on the large rotated stamps and on the small inline budget chips. Never use these four fills for a decorative status that means something else.

**The Ink-On-Bright Rule.** Saturated pink, yellow, cyan and orange take ink text. White text belongs only on purple and ink.

**The Tint-Deep Pair Rule.** Text on a tint uses that hue's deep shade, never the saturated hue and never plain gray.

## Typography

**Display Font:** Fredoka (with sans-serif fallback), weights 500, 600 and 700
**Body Font:** Poppins (with system-ui, sans-serif), weights 400 to 800

**Character:** Fredoka's rounded, heavy letterforms carry the festival voice in titles, labels, buttons, stamps and numbers. Poppins is the plain, geometric workhorse for anything people need to read in full.

### Hierarchy
- **Display** (700, clamp(44px, 5.4vw, 84px), 0.92): the home hero wordmark only, uppercase, white with a 4px ink offset text shadow and the second word in yellow, tilted -2deg. Subpage heroes use a smaller step (700, clamp(36px, 6vw, 64px), 0.95) with a 3px text shadow.
- **Headline** (700, clamp(30px, 4.4vw, 46px), 1.02): section titles, sentence case, with one key word optionally underlined by a yellow highlighter band. The final call to action uses clamp(32px, 5vw, 50px).
- **Title** (600–700, 17–22px, 1.1–1.25): card, panel, legal article, ally and board titles.
- **Body** (400, 16px, 1.6): running text. Prose sits at 17px with a measure of about 64–68ch. Section leads use 17.5px at weight 500 in faded ink.
- **Label** (Fredoka 600, 12.5px, 0.2px tracking): stamps, the board's field values and nav links (14px, weight 500). Small Poppins labels (12.5–13.5px, weight 600, faded ink) handle field names and source notes.

### Named Rules
**The Fredoka-For-Facts Rule.** Values the visitor scans (board values, schedule times, goal figures, article numbers, registration codes) are set in Fredoka 600–700 with tabular numerals. Descriptions and explanations stay in Poppins.

**The Uppercase-Is-The-Name Rule.** Uppercase is used for the brand wordmark, hero titles and footer brand. Section headings stay in sentence case.

## Layout

Content sits in two containers: 1240px for wide bands (hero, nav, footer, budget, directory) and 1020px for reading sections. Sections are padded 88px vertically and 24px horizontally, dropping to 64px by 18px below 720px. Each section is a full-bleed band closed by a 6px ink rule along its bottom edge, so the page reads as a stack of colored strips.

Grids are asymmetric, not uniform card piles: the hero splits 1.08 to 0.92, the project and viability sections split about 1.1 to 0.9, legal articles sit in a two-column ruled grid, the audience directory in three tinted columns, allies in three columns, questions in two. Gaps cluster around 14px inside components, 18–24px between items and 40–48px between major columns.

Responsive behavior: at 980px the nav collapses into a toggled panel and every split becomes one column. At 720px the article, question, rule and directory grids go single-column, and the budget and schedule tables turn into stacked records with labels injected before each cell. At 520px the hero buttons and date badge go full-width, and the board's stamps drop under their values. At 420px the nav wordmark hides and only the logo mark remains. Scroll padding (84px) clears the sticky nav.

## Elevation & Depth

Depth is entirely graphic. Nothing is blurred: every shadow is a solid ink (or pink, or cyan) block offset down and to the right, so objects look like cut paper lifted off the ground. Shadow size encodes importance: small objects get 4–5px, standard containers 6px, hero-level objects (the status board, the final call to action) 10px. Hover lifts an object by translating it up and left while the shadow grows by 2–3px. Pressing reverses this, shrinking the shadow to 2px.

### Shadow Vocabulary
- **Block shadow** (`box-shadow: 6px 6px 0 #1A1A1E`): cards, panels, tables, the legal grid, the directory, the "Más" menu, the date badge.
- **Small block** (`box-shadow: 4px 4px 0 #1A1A1E`): pillars, allies, rules, the back pill, program tabs.
- **Hero block** (`box-shadow: 10px 10px 0 #1A1A1E`): the status board and the final call to action; 7px on phones.
- **Colored button shadow** (`box-shadow: 5px 5px 0 <pink | ink | cyan>`): ink buttons cast pink, primary buttons cast ink, secondary buttons cast cyan.
- **Display text shadow** (`text-shadow: 4px 4px 0 #1A1A1E`): hero wordmark only (3px on subpage heroes, white on the cyan subpage hero).

### Named Rules
**The No-Blur Rule.** Shadows are solid offsets with zero blur radius. A soft or ambient shadow does not belong in this world.

**The Lift-Toward-Light Rule.** Hover moves an object up and to the left while its shadow grows; active pushes it back down. The light source never changes.

## Shapes

The form language is Memphis geometry with soft corners. Containers use a 16px radius, the status board and sponsor strip 24px, the final call to action 30px, and inputs and small chips 6–10px. Buttons, nav links, the date badge and the back link are full pills. Every object carries an ink outline: 4px for hero-level objects and badges, 3px for cards, tiles and buttons, 2px for stamps, inputs and inner dividers.

Rotation is part of the vocabulary. Stamps sit at -3deg (alternating with +2deg on the board), cards alternate between -1.2deg and +1.2deg until hovered, and the hero's second word tilts -2deg. Decorative geometry comes from a fixed set: filled circles, CSS triangles, rotated squares, outlined rings and zigzag strips, plus circles and triangles clipped into the corners of the board, cards, subpage heroes and the final call to action. Dividers inside ruled containers are solid 2–3px ink. Dividers between rows in a list are 2px dashed.

## Components

### Buttons
Chunky, tactile pills that visibly press.
- **Shape:** full pill (999px), 3px ink outline, Fredoka 600 at 16px, 13px by 26px padding, icon after the label.
- **Primary:** yellow fill, ink text, ink block shadow. Used for "Inscribirme" and the main action in each section.
- **Ink:** ink fill, cream text, pink block shadow.
- **Secondary:** white fill, ink text, cyan block shadow.
- **Hover / Active:** lift up and left by 2px while the shadow grows to 7px, and the trailing arrow icon nudges 3px right; press down by 2px with the shadow at 2px. Disabled state is 55% opacity with no movement.
- **Text link:** Poppins 600 with a 2px yellow underline offset 5px, which turns to the text color on hover.

### Status stamps and chips
The signature of the system.
- **Stamp:** Fredoka 600 at 12.5px in a 2px ink-outlined rectangle (8px radius), rotated -3deg, with a 14px icon (check, hourglass, clock) in front of the label. Fills follow the Stamp Code Rule; the "requested" stamp uses a dashed outline on white. On the board each stamp thumps in at scale 1.8, staggered 150ms apart. In the ally grid stamps sit level.
- **Inline status chip:** the same four fills and meanings at 12px with a 1.5px outline and 6px radius, unrotated, placed before a source name in the budget table and explained by a legend.
- **Contribution chip:** borderless 6px-radius label, deep cyan on cyan tint for in-kind, deep orange on orange tint for money.

### Icon tiles
A 46px rounded square (14px radius) with a 3px ink outline, filled yellow by default or pink, cyan, orange, purple (white icon) or white, holding a 24px stroke icon. They shrink to 42px on board rows and 38px with a 2px outline in budget rows. Icons come only from the project sprite: 24px grid, 2px round-capped stroke, `currentColor`.

### Status board
A white panel with a 4px ink outline, 24px radius and the 10px hero block shadow, with a cyan circle clipped onto its top-right edge. The heading sits over a 3px ink rule. Below it, a definition list of rows: icon tile, a small faded field name over a Fredoka value, and a stamp at the end, separated by 2px dashed rules. A flat variant drops the entrance animation and the corner dot for reuse lower on the page.

### Cards / Containers
- **Corner Style:** 16px radius (24px for the board and sponsor strip).
- **Background:** white on cream or tinted bands.
- **Shadow Strategy:** block shadow from the Elevation vocabulary; link cards straighten and rise 6px on hover with a 9px shadow.
- **Border:** 3px ink.
- **Internal Padding:** 22–28px. Link cards place the icon tile in a left column, carry a colored circle clipped into the top-right corner (cycling yellow, pink, cyan, purple), and end with a deep-pink "go" link.

### Ruled grids and tables
The budget table, the legal article grid, the goals table, the schedule and the audience directory share one construction: a single white container with a 3px ink outline, 16px radius and block shadow, divided internally. Table headers are ink with cream Fredoka text. Body rows are split by 2px paper-rule lines with paper-zebra alternation or hover. Legal articles use solid 2px ink cell dividers and a purple-tint number block in deep purple. Directory columns are filled pink, cyan and purple tint, divided by 3px ink. Below 720px, tables become stacked records.

### Inputs / Fields
- **Style:** cream fill, 2px ink outline, 10px radius, 12px by 14px padding, Poppins 16px. Labels are Fredoka 600 at 14px in deep purple.
- **Focus:** the outline turns purple, the fill turns white, and a 3px ink block shadow appears.
- **Messages:** status boxes use a tint fill with deep text and a deep-colored outline (cyan for success, pink for failure, yellow for loading). Checkbox options are cream pills with ink outlines and a purple accent.

### Navigation
A sticky ink bar with a 4px yellow bottom rule. Wordmark in uppercase Fredoka 700 next to a pink circle mark with a yellow triangle. A yellow pill CTA with a cream outline sits next to the brand. Links are Fredoka 500 at 14px in cream pills: a yellow outline on hover, a pink fill with ink text when active. Secondary destinations live in a "Más" disclosure that opens a white, ink-outlined, block-shadowed menu with tint hover rows. Below 980px a 44px outlined toggle reveals a full-width stacked list with the "Más" items indented inline.

### Postponement notice
A full-width yellow band with a 58px ink icon tile (yellow icon), a Fredoka headline, a paragraph up to 78ch, and a row of check-circle points.

### Footer
A wave edge into an ink field with a four-column grid (brand plus three link lists). Column headings are yellow Fredoka, links are warm gray and turn yellow on hover, and social links are 44px yellow circles with cream outlines that tilt on hover.

## Do's and Don'ts

### Do:
- **Do** outline every card, tile, button, stamp, input and table in ink (2–4px) and give containers a solid zero-blur offset shadow.
- **Do** attach a status stamp to any fact whose state can change (date, venue, allies, budget sources), using the fixed four-color stamp code.
- **Do** use icons from the project sprite (24px, 2px round stroke), seated in an ink-outlined color tile when they label a row or card.
- **Do** put white objects on the cream ground or a tinted band, and close each section band with a 6px ink rule.
- **Do** set text on a tint in that hue's deep shade, and set ink text on saturated pink, yellow, cyan and orange.
- **Do** collapse every grid to one column and every table to stacked records on phones, and keep all motion behind `prefers-reduced-motion`.

### Don't:
- **Don't** use emoji as icons, or icons from outside the project sprite.
- **Don't** blur a shadow or use a soft, ambient elevation; depth here is always a solid offset.
- **Don't** reuse the stamp colors to mean anything other than confirmed, in progress, postponed or requested.
- **Don't** set white body text on pink, orange, yellow or cyan.
- **Don't** put small uppercase labels or kickers above section titles; the old title tag was retired from the system.
