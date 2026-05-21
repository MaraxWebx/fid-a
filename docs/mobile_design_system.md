# Mobile Design System

## Direction

Fidea should feel like Apple-quality beauty operations software: calm, warm, organized, and fast. The interface should avoid cold admin-panel patterns, heavy tables, hard outlines, playful decoration, and over-bold typography.

## Color Palette

- Canvas: warm linen `#FBF8F2`
- Surface: white `#FFFFFF`
- Soft surfaces: warm clay/linen `#F7F1E9`, `#EFE8DF`
- Primary text/action: deep petrol `#183F3D`
- Body text: warm petrol grey `#253A38`
- Accent/info: muted teal `#286F70`
- Warm accents: blush `#F8E8EC`, champagne `#FFF4DE`
- Status: success moss `#78A98F`, warning amber `#D9AA5F`, danger rose `#BE6A74`

Use color as a quiet semantic signal, not decoration. Prefer small status dots, subtle cover areas, and gentle backgrounds over saturated blocks.

Semantic roles:

- Primary action: deep petrol
- Secondary action: soft teal surface
- Success: moss
- Warning: muted amber
- Error: soft rose red
- Inactive: warm grey
- Background: ivory / warm white

## Typography

- Screen titles: 28-29px, 700
- Section titles: 20px, 700
- Card titles: 18-23px, 700
- Body: 16px, regular
- Metadata: 12-13px, 600 only when actionable
- Eyebrows: 11px uppercase, 700, no letter spacing

Hierarchy should come from spacing, grouping, and scale. Reserve 800 weight for compact operational labels, important metrics, and primary action labels only.

## Spacing

Token scale: 4, 8, 12, 16, 20, 24, 32, 40.

- Screen horizontal padding: 20
- Card padding: 16 for most cards, 20 for hero/complex cards
- Section gap: 20-24
- Related control gap: 8-12
- Bottom CTA clearance: at least 96

Mobile layouts should breathe without wasting screen space. Prefer horizontally scannable modules and bottom sheets over long repetitive management grids.

## Radius

- Small controls: 8-12
- Inputs and compact cards: 12-16
- Main cards: 20
- Hero/floating cards: 26
- Pills: 999

## Shadows

Use three levels:

- `soft`: ordinary cards
- `card`: premium cards and primary buttons
- `floating`: bottom nav, sticky actions, FABs

Avoid stacking multiple heavy shadows in one viewport.

## Card Hierarchy

- Hero card: one per screen, highest visual weight
- Section card: grouped operational content
- Item card: services, reviews, categories
- Soft card: summaries and secondary tools
- Flat layout: when content already has enough structure

Cards should not feel like spreadsheet rows. Use badges, metrics, and actions to make state scannable.

## Buttons

- Primary: deep petrol fill, 50px min height
- Secondary: white or soft surface, light border
- Danger: rose soft background, not a harsh red block
- Icon actions: circular 34-44px controls
- Sticky CTA: bottom anchored for save flows
- Floating action: thumb-friendly add/create action

## Status

Use compact badges and dots:

- Active: moss success
- Hidden/offline: rose
- Draft: muted neutral
- Incomplete: champagne warning
- Danger/moderation: rose danger

Prefer status dots in overview surfaces. Use copy only when it changes the decision.

## Inputs

Inputs should feel calm and tappable:

- Min height 52-54
- Radius 12-16
- Soft warm background
- Labels above fields, 13px 600
- Helper text only when it reduces errors

Avoid dense forms. Group related numeric fields side by side only when they are short and obvious.

## Bottom Navigation

Use a floating rounded container with 4-5 primary destinations. Active tab gets a soft teal background, filled Ionicon, and restrained label weight. Labels stay short and readable.

## Icons

Use Ionicons consistently. Prefer outline icons for inactive/default states and filled icons for selected navigation. Icons should clarify actions, not decorate every label.

## Mobile UX

- Keep primary actions in thumb reach.
- Use inline editing before modals.
- Use sticky save bars for multi-field edits.
- Use segmented controls for small mutually exclusive modes.
- Use compact cards and status dots for scanning.
- Avoid table-like layouts and repeated full-width text rows.
- Prefer bottom sheets for category/detail editing.
- Keep overview cards quiet; move pricing, validation, and toggles into contextual detail views.
