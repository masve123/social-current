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
NOWPAYMENTS_PAYOUT_CURRENCY=usdttrc20
```

Set `NOWPAYMENTS_PAYOUT_CURRENCY` to the exact settlement wallet currency configured in NOWPayments (the existing production wallet uses USDT on Tron). Checkout checks the current minimum for the selected payment/settlement pair with the same fixed-rate and fee settings used for payment creation. It blocks amounts below that minimum and offers a larger quantity before taking customers to payment. If the minimum cannot be verified, checkout offers a retry or a different method instead of sending customers to an unusable invoice.

The server creates both the invoice and its payment instructions before returning a checkout link. A provider rejection remains visible on our checkout. Payment status is refreshed from the provider during tracking when an existing payment is stale, so a missed callback does not leave it waiting indefinitely.

The application supplies this callback for every invoice:

```text
https://getsocialcurrent.com/api/payments/nowpayments
```

The webhook signature is verified with HMAC-SHA512 before any order can reach the supplier. The checkout offers explicit USDT BSC, USDT Tron and Litecoin network choices. Confirm these routes are enabled for the merchant account. Other coins and fiat on-ramp options should only be added after their limits and availability are integrated.

### 3. Connect SMM World

The server adapter includes service discovery, balance checks, order creation, status, refill, cancellation, custom comments, and payment-gated fulfillment.

1. Add the rotated SMM World key as `SMM_SMMWORLD_API_KEY`.
2. Generate a strong value for `SMM_FULFILLMENT_SECRET`.
3. Add a small supplier balance before accepting live orders.
4. Inspect the catalog with `GET /api/admin/smm?provider=smmworld&action=services&q=instagram%20followers` and an `Authorization: Bearer SMM_FULFILLMENT_SECRET` header. Use `action=balance` to check the account balance.
5. Storefront service IDs are versioned in `lib/smm-routes.ts` because they are configuration rather than secrets.

Paid orders are submitted automatically when the supplier has enough balance. Otherwise, they enter `queued_supplier_funds` without losing the customer's payment or creating a duplicate supplier order.

### Recovery for interrupted supplier calls

Set `CRON_SECRET` in Vercel (a random value at least 16 characters long) and redeploy. The scheduled `/api/cron/reconcile` endpoint runs daily at 06:00 UTC on all Vercel plans. Vercel sends the secret in its Authorization header. To run it manually, call the same endpoint with `Authorization: Bearer <CRON_SECRET>`. On Vercel Pro you can increase the schedule frequency in `vercel.json`; Hobby only allows daily schedules. Order tracking and the admin queue also detect interrupted submissions when opened.

An interrupted order with no supplier request is safe to retry. Once a request might have reached SMM World, the order enters `manual_review`: check for a matching supplier order before choosing **Checked — retry**. Do not retry an ambiguous supplier submission automatically.

### 4. Optional order email

Verify `getsocialcurrent.com` in Resend and set `RESEND_API_KEY`. Payment and fulfillment emails are sent from `orders@getsocialcurrent.com`. Checkout and fulfillment continue to work if email is not configured.

### Profile checks

Follower and subscriber checkout accepts a username or public profile URL. TikTok and YouTube use their public profile pages for a best-effort check. Instagram often redirects server requests to login, so add an optional `HIKER_API_KEY` in Vercel for reliable Instagram username and public/private checks. The server calls HikerAPI's documented `GET /v1/user/by/username` endpoint; the key is never sent to the browser. Without a key or when a platform blocks the check, checkout asks the buyer to open and confirm the profile rather than claiming it was verified.

### 5. Operations queue

Open `/admin/orders` and enter `SMM_FULFILLMENT_SECRET`. The page lists paid orders that need attention. After adding supplier funds, use **Retry** on orders marked `queued_supplier_funds`. For `manual_review`, first check the SMM World dashboard for a matching order, then use **Checked — retry** only when no supplier order exists.

The same page shows customer support messages saved by `/contact`. You can reply using your own email client and mark requests resolved. Messages are stored in Postgres even when Resend is not configured.

## Order lifecycle

1. The customer chooses a package and submits a public social URL.
2. Checkout verifies the payment minimum, then the server stores the order and prepares both the NOWPayments invoice and payment instructions.
3. NOWPayments sends a signed status callback.
4. Confirmed payments atomically claim the order for fulfillment.
5. The server checks SMM World service pricing and account balance.
6. The order is submitted once, or safely queued when supplier funds are insufficient.
7. Interrupted requests are reconciled on tracking, in the admin queue, and by the daily cron. Ambiguous supplier submissions require manual verification before any retry.
8. `/track` reads the local payment state and refreshes the live supplier status.

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

## Checkout verification

Run `npm test`, `npm run lint`, and `npm run build`. The regression suite checks every offered quantity for increasing prices, volume-discount boundaries, every service/offer/payment-method combination, package limits, customer targets, provider minimum failures, payment initialization, signed callbacks, duplicate and delayed updates, refunds racing delivery, concurrent fulfillment, supplier outages, insufficient funds and safe retry behavior.

No tests use `.env.local` or connect to the production database. Database integration tests require an explicitly supplied loopback `TEST_DATABASE_URL` owned by `checkout_test`; without it they are skipped locally. CI fails if that database is missing. `.github/workflows/checkout.yml` provisions an isolated PostgreSQL service and runs the full suite, lint and production build on pushes and pull requests. Configure its `checkout` job as a required branch protection check to enforce it before merging.

Provider responses are simulated in automated tests. A real paid checkout, wallet settlement, supplier delivery and any future Banxa card flow still require a separately authorized low-value acceptance transaction. Banxa must be approved and configured before showing card payment as available.

## Checkout friction and measurement

Package cards, the homepage picker and service pages check the current USDT/BSC minimum before showing a starting price. The package picker supports all enabled currencies and excludes quantities below that currency's current minimum. Checkout still rechecks the live minimum before preparing payment; provider rates can change between pages.

Checkout drafts (including entered email, target and comments) stay in session storage in the same browser tab, expire after one hour, and are not sent to measurement. Terms acceptance is never restored. Expired/failed orders provide a recovery link preserving their package, quantity, target and comments; email is restored only from that tab's matching draft. Across browsers, customers enter email again. A recovery starts a new order after review and terms acceptance; it does not automatically charge or reuse an expired invoice. Existing payment references are checked with the provider again before permitting a restart, and partially paid, paid or refunded orders cannot restart. Customers who already sent funds are directed to tracking/support.

`social_current_checkout_events` records package selection, checkout opening/submission, setup success/failure, return/recovery, confirmation and expiration. The first-party event endpoint accepts a fixed schema with no email, social username/URL, comments, wallet credentials or free-form error text. Browser events use a random tab identifier, respect Do Not Track and are best effort; authoritative setup and payment stages are recorded server-side. Repeat payment confirmations deduplicate by order. The protected admin queue shows 30-day counts and failure categories; counts include testing/repeat attempts and are not verified customer counts. Records older than 90 days are pruned on event writes and by the existing reconciliation cron. Existing historical orders have no retroactive browser-event history.

Card payments remain unavailable pending approval and testing. NOWPayments documents Guardarian as another fiat on-ramp; availability, catalog acceptance, fees, customer verification and minimums must be confirmed for this merchant account. Payop is a separate processing candidate requiring explicit approval for this catalog. No inactive card payment option is shown to customers.

## Crypto payment guidance and verification limits

`/how-to-pay` provides four payment steps, a separate beginner section for obtaining withdrawable crypto before opening a timed invoice, network-specific USDT/BSC, USDT/Tron and Litecoin guidance, fee checks and recovery instructions. Checkout includes an optional, coin-specific help disclosure and a full-guide link in a separate tab. Package pages, FAQ and footer also link to the guide. The final button says **Continue to payment** and explains that it does not charge automatically.

Package selection defaults to the smallest payable quantity for each offer unless the customer has explicitly chosen a quantity; explicit selections are preserved across offer changes. The checkout and tracking pages restore the current tab's previous order reference where available. When email is not configured, checkout asks for an email for support and directs buyers to tracking instead of promising automated email updates. Browser minimum checks and payment setup have timeouts so stalled requests can return a useful error.

Verification for this change: 47 existing public routes returned successful responses; all three live minimum endpoints returned valid quotes; 195 automated scenarios pass with an isolated database and mocked provider writes. Browser checks cover selection/network handoff, explicit quantity preservation, contextual guide links, beginner instructions and phone-width layout. No live invoices, payments, supplier orders or emails were created during verification. The production supplier key is configured but is not readable for local balance/catalog auditing. Supplier funding/service availability and a real paid settlement-to-delivery journey remain unverified. Production has no RESEND_API_KEY, so automated order emails and supplier alerts are disabled until configured.

### Concrete beginner wallet walkthrough

Checkout now contains an optional Trust Wallet mobile + native Litecoin walkthrough. An explicit **Use Litecoin for this order** action selects the matching payment method; buying instructions remain hidden for USDT or unavailable/below-minimum Litecoin checkouts. The guide shows the order total, official app download, wallet creation, Buy → Litecoin selection, purchase-provider prompts, spendable-funds check, NOWPayments address/amount copying, Send in LTC rather than USD, fee reserve and tracking. The full `/how-to-pay#trust-wallet-guide` version opens expanded.

The choice avoids needing a separate gas coin for the supported LTC transfer and avoids starting the invoice timer while the buyer is still acquiring funds. It is a documented beginner route, not a guarantee of the lowest fees or universal availability. Third-party purchase methods, identity checks, fees, minimums, delivery times and app screens vary. No hardcoded purchase amount, wallet address, affiliate link, embedded wallet connection or recovery-phrase collection is used.

References checked 2026-10-21: https://trustwallet.com/download , https://trustwallet.com/buy-crypto/litecoin , https://trustwallet.com/ , and https://support.moonpay.com/en/articles/380500-how-do-i-buy-cryptocurrency-with-moonpay . The wallet guidance follows published vendor instructions; a funded wallet purchase/send was not performed. Website testing covered explicit method switching, preservation of entered details, currency/availability guards and phone layout. Regression suite: 197 passing scenarios.
