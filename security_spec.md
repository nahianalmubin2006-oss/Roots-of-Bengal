# Roots of Bengal — Security Specification & Red Team Audit (`security_spec.md`)

## 1. Data Invariants & Master Sources of Truth

1. **Default-Deny Catch-All**: Every path not explicitly matched is denied (`allow read, write: if false;`).
2. **PII Isolation (`/users/{uid}` & `/users/{uid}/private/{docId}`)**:
   - Customer PII (`email`, `phone`, `defaultAddress`, `defaultCity`, `defaultPostalCode`) is isolated inside `/users/{uid}/private/{docId}`.
   - Both `/users/{uid}` and `/users/{uid}/private/{docId}` are readable ONLY by `isOwner(uid)` or `isAdmin()`. Blanket `isSignedIn()` reads are strictly forbidden.
3. **Catalog & Provenance Gate (`/products/{productId}`, `/products/{productId}/variants/{variantId}`, `/artisans/{artisanId}`)**:
   - Public visitors can read `/products/{productId}` ONLY when `resource.data.isPublished == true && resource.data.isDemoData == false && resource.data.verificationStatus == 'verified'`.
   - Public visitors can read `/artisans/{artisanId}` ONLY when `resource.data.isPublished == true && resource.data.consentToPublish == true && resource.data.verificationStatus == 'verified'`.
   - Only `isAdmin()` can create, update, publish, or delete products, variants ( except atomic stock decrements during validated order creation or admin edits), and artisan profiles.
4. **Order Integrity & COD Invariants (`/orders/{orderId}` & `/orders/{orderId}/items/{itemId}`)**:
   - Customers can only read orders where `resource.data.customerUid == request.auth.uid`.
   - Customers cannot mark an order as paid (`paymentStatus` must be `'unpaid_cod'` on creation, `paymentMethod` must be `'COD'`, and `orderStatus` must be `'pending_verification'`).
   - Customers can only transition their own order from `'pending_verification'` to `'cancelled'` (Terminal State Locking blocks any further customer edits once `orderStatus` is `'cancelled'`, `'confirmed'`, `'packed'`, `'shipped'`, or `'delivered'`).
   - Line items in `/orders/{orderId}/items/{itemId}` must reference a parent `/orders/{orderId}` owned by `request.auth.uid` and a verified, published, non-demo `/products/{productId}` whose unit price (`unitPricePoisha` & `unitPriceBdt`) matches the authoritative server document.
5. **Privilege Escalation Prevention (`/adminUsers/{uid}`)**:
   - Public users and standard authenticated customers can NEVER create or modify `/adminUsers/{uid}`. Only an existing verified administrator (`isAdmin()`) can write to `/adminUsers/{uid}`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 01 — Self-Assigned Admin Escalation**:
   - Target: `PUT /adminUsers/attacker_uid` with `{ uid: "attacker_uid", email: "attacker@example.com", role: "super_admin", grantedAt: request.time }`.
   - Result: `PERMISSION_DENIED` (Requires `isAdmin()`).
2. **Payload 02 — Unverified Email Spoofing on Admin**:
   - Target: Request with `auth.token.email == 'nahianalmubin2006@gmail.com'` but `auth.token.email_verified == false`.
   - Result: `PERMISSION_DENIED` (`isAdmin()` strictly enforces `request.auth.token.email_verified == true`).
3. **Payload 03 — Public Read of Demo or Unpublished Product**:
   - Target: `GET /products/demo_kantha_1` where `isDemoData: true` or `isPublished: false` by non-admin.
   - Result: `PERMISSION_DENIED`.
4. **Payload 04 — Public Read of Unconsented Artisan Profile**:
   - Target: `GET /artisans/rahima_begum` where `consentToPublish: false` by non-admin.
   - Result: `PERMISSION_DENIED`.
5. **Payload 05 — Customer Price Tampering on Order Item**:
   - Target: `POST /orders/ord_1/items/item_1` with `unitPriceBdt: 1, unitPricePoisha: 100` when `/products/prod_1/variants/var_1` has `priceBdt: 4800, pricePoisha: 480000`.
   - Result: `PERMISSION_DENIED` (Rule cross-checks `get(/databases/$(database)/documents/products/$(incoming().productId)/variants/$(incoming().variantId)).data.pricePoisha == incoming().unitPricePoisha`).
6. **Payload 06 — Marking COD Order as Paid on Creation**:
   - Target: `POST /orders/ord_1` with `paymentMethod: "COD", paymentStatus: "cod_collected"`.
   - Result: `PERMISSION_DENIED` (Rule requires `incoming().paymentStatus == 'unpaid_cod'` and `incoming().orderStatus == 'pending_verification'` on customer creation).
7. **Payload 07 — Cross-Customer Order Scraping (`list` query without `customerUid` filter)**:
   - Target: `LIST /orders` without `where('customerUid', '==', auth.uid)`.
   - Result: `PERMISSION_DENIED` (`allow list` enforces `resource.data.customerUid == request.auth.uid`).
8. **Payload 08 — PII Blanket Read on Another User's Private Info**:
   - Target: `GET /users/victim_uid/private/contact` as `attacker_uid`.
   - Result: `PERMISSION_DENIED`.
9. **Payload 09 — Shadow Field Injection on Order Update**:
   - Target: `PATCH /orders/ord_1` adding `{ isVerified: true, orderStatus: "cancelled" }`.
   - Result: `PERMISSION_DENIED` (`isValidOrder(incoming())` enforces strict `.keys().hasOnly(...)` and `affectedKeys().hasOnly(['orderStatus', 'paymentStatus', 'updatedAt'])`).
10. **Payload 10 — Re-opening a Cancelled or Shipped Order (Terminal State Bypass)**:
    - Target: `PATCH /orders/ord_1` from `orderStatus: "shipped"` to `orderStatus: "cancelled"` by customer.
    - Result: `PERMISSION_DENIED` (Customer cancel action requires `existing().orderStatus == 'pending_verification'`).
11. **Payload 11 — Resource Exhaustion / 1MB String Injection**:
    - Target: `POST /orders/ord_1` with a 10,000-character `customerNotes` string or 500-character `orderId`.
    - Result: `PERMISSION_DENIED` (`isValidId(orderId)` caps ID at 128 chars, `customerNotes.size() <= 500`).
12. **Payload 12 — Client Timestamp Forgery**:
    - Target: `POST /orders/ord_1` with `createdAt: Timestamp(2020, 1, 1)`.
    - Result: `PERMISSION_DENIED` (`incoming().createdAt == request.time`).

---

## 3. Red Team Audit & Conflict Report

| Collection | Identity Spoofing Guard | State Shortcutting Guard | Resource & Value Poisoning Guard | Status |
| :--- | :--- | :--- | :--- | :--- |
| `/users/{uid}` | `incoming().uid == uid && uid == request.auth.uid` | N/A | `isValidUserPublicProfile(incoming())` wraps create & update | PASS |
| `/users/{uid}/private/{docId}` | `isOwner(uid)` & `incoming().uid == uid` | N/A | `isValidUserPrivateInfo(incoming())` wraps create & update | PASS |
| `/products/{productId}` | `isAdmin()` only | Only `verified` + `isPublished` + `!isDemoData` readable publicly | `isValidProduct(incoming())` wraps create & update | PASS |
| `/products/{productId}/variants/{variantId}` | `isAdmin()` for catalog edits | Stock cannot go `< 0` | `isValidVariant(incoming())` wraps create & update | PASS |
| `/artisans/{artisanId}` | `isAdmin()` only | Requires `consentToPublish == true` for public read | `isValidArtisan(incoming())` wraps create & update | PASS |
| `/orders/{orderId}` | `incoming().customerUid == request.auth.uid` | Starts at `pending_verification` + `unpaid_cod`; customer can only cancel while `pending_verification` | `isValidOrder(incoming())` wraps create & update | PASS |
| `/orders/{orderId}/items/{itemId}` | Parent order `customerUid == request.auth.uid` | Immutable after creation (`allow update, delete: if false`) | `isValidOrderItem(incoming())` + server price lookup | PASS |
| `/orderStatusEvents/{eventId}` | `incoming().authorizedActorId == request.auth.uid` | Immutable audit log (`allow update, delete: if false`) | `isValidOrderStatusEvent(incoming())` | PASS |
| `/adminUsers/{uid}` | `isAdmin()` only | N/A | `isValidAdminUser(incoming())` wraps create & update | PASS |
