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

## Connect the SMM providers

The server adapter in `lib/smm.ts` supports Followiz, SMM World, and SMM PWR through their form-encoded API v2 interfaces. It includes service discovery, balance checks, order creation, status, refill, cancellation, custom comments, drip-feed fields, signed customer order numbers, and controlled provider fallbacks.

1. Copy `.env.example` to `.env.local` and add each provider API key.
2. Generate strong values for `ORDER_TOKEN_SECRET`, `SMM_ADMIN_TOKEN`, and `SMM_FULFILLMENT_SECRET`.
3. Inspect a provider catalog with `GET /api/admin/smm?provider=followiz&action=services&q=instagram%20followers` and an `Authorization: Bearer SMM_ADMIN_TOKEN` header. Omit `q` for the full catalog and use `action=balance` to check account balance.
4. Map each storefront package to a provider service ID using the `SMM_ROUTE_*` variables. The format is `provider:serviceId`; an optional comma-separated second route is used only after an explicit provider rejection.
5. Keep `SMM_LIVE_ORDERING=false` while testing the checkout. Preview orders never spend provider balance.
6. Have the payment webhook call `POST /api/order` with `x-social-current-fulfillment: SMM_FULFILLMENT_SECRET`. Set `SMM_LIVE_ORDERING=true` only after that payment flow is in place.

After mapping services, request `action=routes` from the admin endpoint to see the current provider service name, wholesale cost at the storefront base quantity, retail price, gross margin, and refill/cancel support for every mapped package.

Setting `SMM_ALLOW_UNPAID_ORDERS=true` lets the public checkout submit live provider orders and should only be used for controlled testing.

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
