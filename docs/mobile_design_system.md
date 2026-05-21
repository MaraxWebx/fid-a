# Mobile Design System

## Direction

Fidea should feel like premium beauty operations software: calm, warm, organized, and fast. The interface should avoid cold admin-panel patterns, heavy tables, hard outlines, and over-bold typography.

## Color Palette

- Canvas: warm linen `#FBF7F1`
- Surface: white `#FFFFFF`
- Soft surfaces: warm clay/linen `#F8F3EC`, `#F1EBE4`
- Primary text: deep petrol `#173F4A`
- Body text: muted petrol `#243F46`
- Accent: petrol teal `#2F7E84`
- Warm accents: blush `#F8E8EC`, champagne `#FFF3D8`
- Status: success moss, warning champagne, danger rose

Use color as a quiet signal, not decoration. Prefer small status pills, subtle cover areas, and gentle backgrounds over saturated blocks.

## Typography

- Screen titles: 30px, 700
- Section titles: 21-24px, 600
- Card titles: 19-24px, 600
- Body: 16px, regular
- Metadata: 12-13px, 600 only when actionable
- Eyebrows: 11px uppercase, 600, slight letter spacing

Hierarchy should come from spacing, grouping, and scale. Reserve 700 weight for screen titles, metrics, and primary actions. Avoid 800 unless there is a very specific brand moment.

## Spacing

Token scale: 4, 8, 12, 16, 20, 24, 32, 40.

- Screen horizontal padding: 20
- Card padding: 16-20
- Section gap: 24-32
- Related control gap: 8-12
- Bottom CTA clearance: at least 96

Mobile layouts should breathe. Prefer fewer denser modules over long repetitive rows.

## Radius

- Small controls: 8-12
- Inputs and compact cards: 12-16
- Main cards: 22
- Hero/floating cards: 28
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

- Primary: petrol teal fill, 52px min height
- Secondary: white or soft surface, light border
- Danger: rose soft background, not a harsh red block
- Icon actions: circular 30-36px controls
- Sticky CTA: bottom anchored for save flows
- Floating action: thumb-friendly add/create action

## Status

Use compact badges and dots:

- Active: moss success
- Hidden/offline: rose
- Draft: muted neutral
- Incomplete: champagne warning
- Danger/moderation: rose danger

Status copy should be short: `Active`, `Hidden`, `Draft`, `Incomplete`, `Online`.

## Inputs

Inputs should feel calm and tappable:

- Min height 52-54
- Radius 12-16
- Soft warm background
- Labels above fields, 13px 600
- Helper text only when it reduces errors

Avoid dense forms. Group related numeric fields side by side only when they are short and obvious.

## Bottom Navigation

Use a floating rounded container with 5 or fewer primary destinations. Active tab gets a soft teal background and filled Ionicon. Labels stay short and readable.

## Icons

Use Ionicons consistently. Prefer outline icons for inactive/default states and filled icons for selected navigation. Icons should clarify actions, not decorate every label.

## Mobile UX

- Keep primary actions in thumb reach.
- Use inline editing before modals.
- Use sticky save bars for multi-field edits.
- Use segmented controls for small mutually exclusive modes.
- Use compact cards and status badges for scanning.
- Avoid table-like layouts and repeated full-width text rows.
