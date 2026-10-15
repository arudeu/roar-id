This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
<<<<<<< HEAD
=======

---

## RoarID notes

- **UI**: Tailwind v4 + shadcn/ui (`components/ui/*`). Colours are unchanged: black navbar, gold `#d4b962`, animated rainbow “ID”, Monokai editor.
- **Previews** (Inbox, Overlay, Toaster, …) are pure Tailwind + shadcn now; Bootstrap is gone. Sitecore HTML inside them is styled by the `.rich` class in `app/globals.css`.
- **Checker engine**: `lib/html-checks.js` (pure JS, no React). Every issue has exact offsets, a severity, and often an auto-fix. Run the tests with `npm test`.
- **Detection / fetching**: `lib/sitecore.js`. Field lists per view: `lib/fields.js`.
- **Navigation**: Alt + ↑ / ↓ jumps between issues; hover a highlight for details and a one-click fix.
- **Compare modal**: pasted text is tidied (extra spaces and blank lines removed, single line breaks kept). The two text boxes scroll together, and the result panes stay lined up on each difference (`lib/scroll-sync.js` maps scroll positions between them, anchored on the differences). A strip between the panes marks where every difference is, prev/next buttons step through them, and an "Inline changes" tab shows one merged text with struck-through/green changes and long unchanged stretches folded (`segments` from `compareTexts` in `lib/text-compare.js`).
- **Spell check**: `lib/spellcheck.js` (pure JS, runs inside `analyzeFields` as the `spelling` rule). Only visible text is checked — tags, attributes, comments, script/style, entities, URLs and e-mails are skipped, and words split by inline tags (`Condi<b>tions</b>`) are joined. Settings open from the spell-check button in the navbar (`components/SpellButton.jsx` → modal in `components/SpellSettings.jsx`); state is shared through `components/SpellProvider.jsx` and the ignore list (single words and multi-word phrases) is saved in localStorage. Dictionary: Hunspell en_US in `public/dictionaries/` (licence in the README there), loaded once by `lib/spell-dictionary.js`. Spelling fixes are suggestions and are never applied by "Fix all".
>>>>>>> 8623917 (Updated overall look and improved code logic)
