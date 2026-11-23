<p align="center">
  <img src="assets/logo.svg" alt="Salapi logo" width="72" height="72">
</p>

<h1 align="center">salapi</h1>

<p align="center">Peso-first currency converter with live exchange rates. Free, no API key, no build step.</p>

---

*Salapi* is an old Tagalog word for money.

## Features

- Converts Philippine peso (PHP) to 160+ currencies, updating as you type
- Searchable picker: type a country, a currency or a city like "dubai"
- One-tap swap and quick picks for common currencies
- Compare list: see one amount in several currencies at once
- Remembers your last currencies and amount
- Keeps working offline with the last rates it loaded
- Light and dark mode, works on a phone

## How rates work

Salapi fetches rates in the browser from free, keyless sources, falling back to the next one if a source is down:

1. [ExchangeRate-API open access](https://www.exchangerate-api.com/docs/free) (`open.er-api.com`)
2. [fawazahmed0/exchange-api](https://github.com/fawazahmed0/exchange-api) via jsDelivr
3. The same API's Cloudflare mirror

These are mid-market rates, updated about once a day. Banks and remittance shops quote slightly different rates.

## Privacy

- No API keys, accounts, cookies or analytics
- Your preferences and the cached rates are kept only in your own browser (`localStorage`)
- Requests to the rate APIs and the flag images (flagcdn.com) send no referrer

## Run locally

It's plain HTML, CSS and JavaScript. Serve the folder with any static server:

```bash
python -m http.server 5173
```

Then open http://localhost:5173.

## Deploy

Import the repo into [Vercel](https://vercel.com/new). There are no build settings to change: the framework preset is "Other" and the output is the repo root. `vercel.json` adds a few security headers.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page markup and Content Security Policy |
| `style.css` | Styles, light and dark |
| `app.js` | Rate fetching, conversion and UI |
| `assets/logo.svg` | Logo and favicon |
| `vercel.json` | Security headers for Vercel |
