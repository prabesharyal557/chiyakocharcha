# Chiya ko Charcha ↔ SajiloPOS

Active restaurant: **101**. POS: https://sajilo-restaurant.aryalprabesh300.workers.dev

The website reads `GET /api/public/menu` and sends requests to `POST /api/public/orders`, with `X-Sajilo-Restaurant: 101`. Only the Chiya ko Charcha website origin is permitted for browser writes. No staff token, password, ingredient cost or financial records are exposed to the website.

Managers open **Online orders** to see **Website pickup & delivery requests**, alongside the existing table-QR workspace. Confirm or reject requests, then mark confirmed requests ready and completed. The team must contact the customer to confirm timing and delivery fees. These requests do not automatically become kitchen/table tickets or paid sales. Record fulfilment and payment in the POS as appropriate.

`website_orders` is an additive, separately stored inbox, initialized only by its own endpoints. Request IDs make retries safe, totals are calculated from the current POS menu/tax, closed/unavailable/stale requests are rejected, and new submissions are rate-limited. Manager status changes are authenticated and audited. Other restaurant codes cannot use this website integration.

## Source preservation

The current deployed POS is newer than `KitchenSystem` on GitHub. Publishing the older GitHub copy would discard existing platform, restaurant, QR, stock and finance features. The final integration therefore uses the existing working source at `D:/website/KitchenSystem`, not the older draft under `integrations/sajilo-pos`.

This directory contains the three new modules and `current-pos.patch` for the existing Worker, manager app, service worker and asset-sync script. The updated source is also saved in the existing POS working copy. Existing unrelated working changes have been preserved. The complete POS working copy has not been committed or pushed as part of this task.

## Validation

- Worker production bundle builds with the current POS source.
- Current-bundle tests against isolated SQLite verify public menu sanitization, restaurant isolation, authenticated inbox/status transitions, authoritative pricing, and retry behavior.
- Browser tests verify menu → bag → checkout → request → manager inbox, including a deliberately lost response followed by a retry producing one order.
- Menu and populated checkout checked at 320, 375, 768, 1024, 1440 and 1920px.
- Cloudflare's native Windows runtime crashed before startup. Application tests use the actual compiled Worker handlers with a Node/SQLite platform adapter; they do not assert Cloudflare-native behavior. Live public-menu/CORS checks additionally verify the deployed runtime.
- No test orders were placed in the production database.

The frontend source is in `dist/sajilo.js` and `dist/sajilo.css`. The current frontend renders POS items without images. It replaces the old sample menu/prices and WhatsApp checkout, updates privacy/terms, and links Staff Portal to the actual POS login.
