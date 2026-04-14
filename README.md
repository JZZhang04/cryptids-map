# Cryptids Field Guide

A map-based field journal for folklore, monster stories, regional sightings, and the strange creatures people swear they almost definitely saw.

## Screenshot

![Cryptids Field Guide screenshot](docs/cryptids-field-guide-screenshot.png)

Place your homepage screenshot at `docs/cryptids-field-guide-screenshot.png`.

Best results usually come from a capture that includes:

- the black-and-gold field guide header
- the map with clustered markers visible
- the session panel or migration UI in view

This project turns the United States (and the whole world later)into a browsable cryptid atlas: part campfire archive, part interactive map, part playful reminder that not every “eyewitness account” should be mistaken for zoology. Most cryptids are best understood as folklore, misidentification, exaggeration, or cultural storytelling rather than scientifically verified animals, and this app leans into that mystery with curiosity instead of pretending to be a lab report.

## What It Does

- Explore a map of built-in cryptid entries across the U.S. and China.
- Search by creature name and filter by category.
- Switch map themes and browse an in-app legend.
- Open a beginner guide overlay after entering the map.
- Sign up, log in, and persist sessions with Supabase Auth.
- Browse as a guest without creating an account.
- Add your own creature sightings with coordinates, category, and description.
- Edit and delete your own entries.
- Choose whether a new entry is private or visible to everyone.
- See public community sightings even if you are not logged in.
- Save guest entries locally, then migrate selected ones into your account later.
- Preview guest migrations before importing, choose specific entries, and see which ones will be skipped.

## Why It Exists

Because a normal spreadsheet of “Mothman, Jersey Devil, Dover Demon” is technically useful but spiritually incorrect.

Cryptids deserve atmosphere.

## Current Feature Highlights

### Map Experience

- Leaflet-powered interactive map
- Marker clustering for large groups of sightings
- Search jump-to-location behavior
- Category filtering
- Light, gray, and dark basemap modes
- Bounded map panning so the map does not scroll forever

### Field Guide UI

- Custom black-and-gold “field guide” interface
- Unified header panels, side drawers, modals, legend, and action buttons
- Guided onboarding callouts for first-time entry into the map
- Friendly empty states, save feedback, and clearer error messaging

### Auth And User Data

- Supabase Auth email/password login
- Persistent login across refresh
- Guest browsing mode
- User-owned entries stored in Supabase
- Local guest entries stored in `localStorage`
- Guest-to-account migration flow

### Visibility Controls

When a signed-in user adds or edits a creature, they can choose:

- `Only visible to you`
- `Visible to everyone`

Public entries show up for all visitors, including guests. Private entries stay inside the owner’s personal field guide.

## Tech Stack

- `React 19`
- `TypeScript`
- `Vite`
- `Leaflet` + `react-leaflet`
- `Apollo Client` + `GraphQL`
- `Supabase Auth` + `Supabase Database`
- Custom CSS for the full UI system

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a local env file:

```bash
cp .env.example .env.local
```

Fill in:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### 3. Start the dev server

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
```

## Supabase Notes

This project expects a `public.user_cryptids` table for user-created entries.

At minimum, the table should include:

- `id`
- `user_id`
- `name`
- `location`
- `latitude`
- `longitude`
- `description`
- `category`
- `created_at`
- `is_public`

The frontend currently assumes:

- logged-in users can read and write their own entries
- anyone can read entries where `is_public = true`
- public and private entries are both stored in the same `user_cryptids` table

If you are setting this up fresh, make sure Row Level Security policies reflect that behavior.

## Scripts

- `npm run dev` — start the local Vite dev server
- `npm run build` — type-check and build production assets
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint
- `npm run deploy` — build and deploy `dist/` with `gh-pages`

## Project Status

Actively evolving, slightly haunted, and very much not finished in the boring sense.

Likely next steps:

- image uploads for sightings
- richer public moderation flow
- profile polish for explorers
- cleaner admin/data management tools
- performance cleanup and chunk splitting

## A Small Disclaimer

This project is about folklore, storytelling, mystery culture, and interactive map design. It is not a scientific catalog of verified species, and it is not trying to argue otherwise. If a creature seems implausible, that is probably because folklore has once again done what folklore does best.
