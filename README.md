# Social Current

A production-ready Next.js storefront for Instagram, TikTok, and YouTube growth packages. It includes crawlable service pages, a package calculator, order tracking, structured data, a content section, policy pages, and a generic SMM panel adapter.

## Run locally

Node 22.13 or newer is recommended.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Connect SMM World

The server adapter includes service discovery, balance checks, order creation, status, refill, cancellation, custom comments, signed customer order numbers, and payment-gated fulfillment.

1. Copy `.env.example` to `.env.local` and add the SMM World API key.
2. Generate strong values for `ORDER_TOKEN_SECRET` and `SMM_FULFILLMENT_SECRET`.
3. Inspect the catalog with `GET /api/admin/smm?provider=smmworld&action=services&q=instagram%20followers` and an `Authorization: Bearer SMM_FULFILLMENT_SECRET` header. Use `action=balance` to check the account balance.
4. Storefront service IDs are versioned in `lib/smm-routes.ts` because they are configuration rather than secrets.
5. Have the payment webhook call `POST /api/order` with `x-social-current-fulfillment: SMM_FULFILLMENT_SECRET`. Requests without payment confirmation cannot spend provider balance.

After mapping services, request `action=routes` from the admin endpoint to see the current provider service name, wholesale cost at the storefront base quantity, retail price, gross margin, and refill/cancel support for every mapped package.

## SEO setup

Set `NEXT_PUBLIC_SITE_URL` to the final canonical HTTPS domain before deployment. The project includes:

- Per-page titles, descriptions, canonicals, and social metadata
- Product, FAQ, article, organization, and website structured data
- Generated `sitemap.xml`, `robots.txt`, manifest, icon, and social image
- Static service and guide pages with internal links
- Platform topic hubs, breadcrumb trails, and related-content clusters
- Per-service and per-article social sharing images
- RSS and `llms.txt` discovery endpoints
- Semantic headings, accessible controls, reduced motion support, and responsive layouts

## Before launch

- Replace the brand email and canonical domain.
- Add the Google Search Console verification token and submit `/sitemap.xml` after launch.
- Review prices, service limits, refill terms, and provider service IDs.
- Connect Stripe or another payment processor and submit provider orders from its verified server webhook.
- Store customer orders in a database and protect tracking with a signed lookup token or customer login.
- Have the privacy policy, terms, and refund policy reviewed for the operating company and target markets.
