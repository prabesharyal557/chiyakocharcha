# Chiya ko Charcha ↔ SajiloPOS

Active restaurant: **101**. POS: https://sajilo-restaurant.aryalprabesh300.workers.dev

The website reads `GET /api/public/menu` and sends requests to `POST /api/public/orders`, with `X-Sajilo-Restaurant: 101`. Only the Chiya ko Charcha website origin is permitted for browser writes. No staff token, password, ingredient cost or financial records are exposed to the website.

New website submissions automatically create normal, unpaid POS tickets in restaurant **101 only**. They appear in **Orders** and on a dedicated **Online Orders** table under **Tables**. The table is allocated at the next unused table number on the first successful new submission, retained across restarts and protected from deletion. Other restaurants are unaffected.

The ticket, table configuration and website receipt are committed in one database batch. A retry with the same request ID returns the original receipt without creating another ticket. The current POS menu determines prices and ingredient costs. Stale totals and unavailable items are rejected before creating tickets. No payments or sales are automatically recorded.

The manager's Online orders inbox retains customer phone/address, links each new request to its POS ticket and displays the actual kitchen/payment status. New linked tickets are managed through normal POS controls. Earlier inbox-only requests retain their existing workflow and are not silently resubmitted.

**Billing:** this is one shared POS table. Its existing bill includes all unpaid tickets on that table. The bill dialog lists customers and warns staff to review them before collecting payment; this change does not introduce separate per-customer payments.

## Source preservation

The current deployed POS is newer than `KitchenSystem` on GitHub. Publishing the older GitHub copy would discard existing platform, restaurant, QR, stock and finance features. The final integration therefore uses the existing working source at `D:/website/KitchenSystem`, not the older draft under `integrations/sajilo-pos`.

This directory contains the three new modules and `current-pos.patch` for the existing Worker, manager app, service worker and asset-sync script. The updated source is also saved in the existing POS working copy. Existing unrelated working changes have been preserved. The complete POS working copy has not been committed or pushed as part of this task.

## Validation

- Worker production bundle builds with the current POS source.
- Current-bundle tests against isolated SQLite verify public menu sanitization, restaurant isolation, authenticated inbox, real ticket/status synchronization, reserved-table protection, authoritative pricing, and retry behavior.
- Browser tests verify menu → bag → checkout → request → manager inbox, including a deliberately lost response followed by a retry producing one inbox entry and one POS ticket.
- Menu and populated checkout checked at 320, 375, 768, 1024, 1440 and 1920px.
- Cloudflare's native Windows runtime crashed before startup. Application tests use the actual compiled Worker handlers with a Node/SQLite platform adapter; they do not assert Cloudflare-native behavior. Live public-menu/CORS checks additionally verify the deployed runtime.
- No test orders were placed in the production database.

The frontend source is in `dist/sajilo.js` and `dist/sajilo.css`. The current frontend renders POS items without images. It replaces the old sample menu/prices and WhatsApp checkout, updates privacy/terms, and links Staff Portal to the actual POS login.
