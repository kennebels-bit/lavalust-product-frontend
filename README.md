# LavaLust Product Desk

React frontend for the LavaLust product API. This repository contains the
frontend application only; it does not contain the PHP backend or database
credentials.

## Run locally

```sh
npm ci
npm run dev
```

The local Vite server uses `http://localhost:3000/api` as its default API URL.
To override it, copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to
your API URL. Do not commit `.env` files or credentials.

## Production

The frontend is deployed as a Render Static Site:

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- `VITE_API_BASE_URL`: `https://escollar-kennelyn.onrender.com/api`

Live site: <https://lavalust-product-frontend.onrender.com/>

The API must allow the static site's origin in its CORS configuration.
Product writes require an administrator account; regular accounts are
read-only.
