# DTF Pipeline

A Shopify-integrated apparel customizer and DTF print-order pipeline.

Customers design t-shirts, hoodies, and crewneck sweatshirts — uploading artwork that is validated against DTF print resolution standards (300 DPI at max print size) — and submit orders that flow through Shopify as draft orders.

---

## Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL via Prisma (hosted on Railway)
- **File storage:** Cloudinary
- **Shopify:** Admin GraphQL API + Customer Account API
- **Hosting:** Railway

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/themightykwin/DTF_Pipeline.git
cd DTF_Pipeline
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Fill in all values in .env
```

### 3. Set up the database

```bash
npm run db:push
```

### 4. Run locally

```bash
npm run dev
```

---

## Environment variables

See `.env.example` for all required variables. You will need:

- A Shopify Partner account with an app created
- A Railway PostgreSQL database
- A Cloudinary account

---

## API endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/install` | Start Shopify OAuth flow |
| GET | `/api/auth/callback` | Complete OAuth, store token |
| POST | `/api/configs` | Save a product configuration |
| GET | `/api/configs/[id]` | Load a saved configuration |
| POST | `/api/products/sync` | Sync config to Shopify product |
| POST | `/api/draft-orders/create` | Create Shopify draft order |
| GET | `/api/draft-orders/[id]` | Get draft order status |
| POST | `/api/webhooks/orders-create` | Shopify order webhook |
| POST | `/api/webhooks/orders-updated` | Shopify order update webhook |
| POST | `/api/webhooks/app-uninstalled` | App uninstall cleanup |

---

## DTF print validation

All artwork is validated at 300 DPI against the maximum approved print area for the selected garment family:

| Garment | Max print area | Min pixels at 300 DPI |
|---------|---------------|----------------------|
| T-shirt | 12 × 16 in | 3600 × 4800 px |
| Hoodie | 12 × 16 in | 3600 × 4800 px |
| Crewneck | 12 × 15 in | 3600 × 4500 px |
