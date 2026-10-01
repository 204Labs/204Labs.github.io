# 204Labs SEO Implementation Report

Date: 2026-10-01  
Branch: `seo/foundation-entity-pages`

## Summary

This implementation adds a crawlable SEO/AEO entity architecture for 204Labs while preserving the existing homepage, ECHO experience, visual identity, legal pages, analytics consent and cookie controls.

## Changed URL Map

- `/` remains the main interactive homepage.
- `/company/` adds the company/entity page for 204Labs FZE.
- `/approach/` adds a crawlable ECHO approach page.
- `/products/` adds a product portfolio index.
- `/products/rewizz/` adds the canonical Rewizz page.
- `/products/baisect/` adds the canonical bAIsect page.
- `/products/tether/` adds the canonical Tether page.
- `/products/lurniq/` adds the canonical Lurniq page.
- `/products/flatintel/` adds the canonical FlatIntel page.
- `/notes/` adds a future notes collection page without Article schema.

## Structured Data

Homepage schema remains:

- `Organization`
- `WebSite`
- `WebPage`
- `ItemList`

Homepage product URLs now point to canonical product pages rather than anchors.

Product pages include:

- `WebPage`
- `BreadcrumbList`
- `WebApplication` where public facts support it

Notes uses:

- `CollectionPage`

No ratings, reviews, prices, awards, users, operating systems or availability claims were added.

## Sitemap And Robots

`sitemap.xml` now includes canonical indexable URLs with `lastmod` dates. `robots.txt` remains permissive and explicitly allows major search and AI crawlers including Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot and Perplexity-User.

## Regression Checks

Added `npm run test:seo`, which checks:

- titles
- descriptions
- canonical URLs
- one `h1`
- broken internal links and assets
- valid JSON-LD
- accidental `noindex` except `404.html`
- sitemap coverage
- required canonical pages
- production URL consistency
- permissive `robots.txt`

## Mobile Fixes

- Main mobile header uses the full primary 204Labs logo.
- Policy pages place the primary logo on a cream panel.
- ECHO mobile sequencing now animates through each principle when selected or advanced.
- Outlook globe responds to finger movement on touch devices while respecting reduced-motion settings.
- Footer content stacks more cleanly on mobile.
- Cookie settings moved from footer injection to a floating icon button.

## Indexing Submission Checklist

After merge and GitHub Pages deployment:

- Confirm `https://www.204labs.com/sitemap.xml` returns 200.
- Resubmit the sitemap in Google Search Console.
- Resubmit or inspect the new canonical URLs in Google Search Console.
- Submit sitemap in Bing Webmaster Tools if connected.
- Check that `/products/*/` pages return 200 and canonicalise to `www.204labs.com`.
- Confirm Cloudflare analytics still records visits only after analytics consent.

## Known Limitations

- No live Search Console validation can be committed to the repo.
- Product pages intentionally contain only public site-supported facts.
- `/notes/` is a collection placeholder and does not use Article schema.
- Browser and Lighthouse results depend on local tool availability and should be reviewed before merge if possible.

## Remaining External Or Manual Actions

- Merge the PR after review.
- Wait for GitHub Pages deployment.
- Submit the sitemap in search consoles.
- Confirm Cloudflare and domain DNS remain healthy.

## Rollback Instructions

Revert the merge commit for this PR, or revert the branch commit that adds the entity pages, sitemap/robots updates, homepage schema/link updates, SEO regression workflow and mobile CSS/JS changes. GitHub Pages will redeploy the previous static site state.

## IndexNow Position

IndexNow is not implemented in this PR. A safe IndexNow setup requires a deployment-side key file and submission workflow that does not expose or hard-code private secrets. It can be added later as an optional GitHub Actions workflow once the key handling approach is agreed.
