# Social Current

A Next.js storefront for Instagram, TikTok, and YouTube growth packages. It includes hosted cryptocurrency checkout, signed payment webhooks, persistent orders, automatic SMM World fulfillment, supplier balance protection, customer tracking, an operations queue, crawlable service pages, and structured SEO data.

## Run locally

Node 22.13 or newer is recommended.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Production setup

### 1. Connect Postgres

Create a Postgres database through the Vercel Marketplace and connect it to the project. The application accepts either `DATABASE_URL` or Vercel's `POSTGRES_URL`. Tables and indexes are created automatically on the first order request. The same schema is available in `sql/001_orders.sql` for manual provisioning.

### 2. Connect NOWPayments

Create a NOWPayments account, add the wallet that should receive settlements, generate an API key, and generate an IPN secret in Store Settings. Set:

```bash
NOWPAYMENTS_API_KEY=...
NOWPAYMENTS_IPN_SECRET=...
```

The application supplies this callback for every invoice:

```text
https://getsocialcurrent.com/api/payments/nowpayments
```

The webhook signature is verified with HMAC-SHA512 before any order can reach the supplier. Configure the currencies offered on the NOWPayments hosted invoice in the NOWPayments dashboard; USDC and USDT are the recommended initial choices.

### 3. Connect SMM World

The server adapter includes service discovery, balance checks, order creation, status, refill, cancellation, custom comments, and payment-gated fulfillment.

1. Add the rotated SMM World key as `SMM_SMMWORLD_API_KEY`.
2. Generate a strong value for `SMM_FULFILLMENT_SECRET`.
3. Add a small supplier balance before accepting live orders.
4. Inspect the catalog with `GET /api/admin/smm?provider=smmworld&action=services&q=instagram%20followers` and an `Authorization: Bearer SMM_FULFILLMENT_SECRET` header. Use `action=balance` to check the account balance.
5. Storefront service IDs are versioned in `lib/smm-routes.ts` because they are configuration rather than secrets.

Paid orders are submitted automatically when the supplier has enough balance. Otherwise, they enter `queued_supplier_funds` without losing the customer's payment or creating a duplicate supplier order.

### 4. Optional order email

Verify `getsocialcurrent.com` in Resend and set `RESEND_API_KEY`. Payment and fulfillment emails are sent from `orders@getsocialcurrent.com`. Checkout and fulfillment continue to work if email is not configured.

### 5. Operations queue

Open `/admin/orders` and enter `SMM_FULFILLMENT_SECRET`. The page lists paid orders that need attention. After adding supplier funds, use **Retry** on orders marked `queued_supplier_funds`. For `manual_review`, first check the SMM World dashboard for a matching order, then use **Checked — retry** only when no supplier order exists.

## Order lifecycle

1. The customer chooses a package and submits a public social URL.
2. The server stores the order and creates a NOWPayments hosted invoice.
3. NOWPayments sends a signed status callback.
4. Confirmed payments atomically claim the order for fulfillment.
5. The server checks SMM World service pricing and account balance.
6. The order is submitted once, or safely queued when supplier funds are insufficient.
7. `/track` reads the local payment state and refreshes the live supplier status.

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

- Confirm with NOWPayments that the exact service catalog is approved for your account.
- Configure a settlement wallet and limit the initial checkout currencies to USDC/USDT.
- Connect Postgres and add the NOWPayments secrets in Vercel.
- Deposit a small operating balance with SMM World and place one low-value end-to-end order.
- Verify `orders@getsocialcurrent.com` in Resend if customer emails are enabled.
- Add the Google Search Console verification token and submit `/sitemap.xml` after launch.
- Review prices, service limits, refill terms, and provider service IDs.
- Have the privacy policy, terms, and refund policy reviewed for the operating company and target markets.
