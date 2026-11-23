(() => {
  'use strict';

  // Free, keyless rate feeds. All return rates relative to 1 PHP.
  const SOURCES = [
    {
      name: 'ExchangeRate-API',
      url: 'https://open.er-api.com/v6/latest/PHP',
      trusted: true,
      parse(d) {
        if (!d || d.result !== 'success' || !d.rates) throw new Error('Bad response');
        return { rates: d.rates, updated: d.time_last_update_unix * 1000, dateOnly: false };
      },
    },
    {
      name: 'Currency API',
      url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/php.json',
      trusted: false,
      parse: parseCurrencyApi,
    },
    {
      name: 'Currency API',
      url: 'https://latest.currency-api.pages.dev/v1/currencies/php.json',
      trusted: false,
      parse: parseCurrencyApi,
    },
  ];

  function parseCurrencyApi(d) {
    if (!d || !d.php) throw new Error('Bad response');
    const rates = {};
    for (const [k, v] of Object.entries(d.php)) rates[k.toUpperCase()] = v;
    return { rates, updated: Date.parse(d.date + 'T00:00:00Z'), dateOnly: true };
  }

  const CHIPS = ['USD', 'JPY', 'KRW', 'SGD', 'AED', 'SAR', 'HKD', 'EUR', 'AUD', 'CAD'];
  const POPULAR = ['PHP', 'USD', 'JPY', 'KRW', 'SGD', 'AED', 'SAR', 'HKD', 'EUR', 'GBP', 'AUD', 'CAD', 'TWD', 'CNY', 'QAR', 'KWD'];
  const DEFAULT_FAVS = ['USD', 'JPY', 'SGD', 'EUR', 'KRW'];
  const STALE_MS = 60 * 60 * 1000;
  const PREFS_KEY = 'salapi:prefs';
  const RATES_KEY = 'salapi:rates';

  // Currency code -> flag region, where the first two letters don't match.
  const REGION_OVERRIDES = { EUR: 'EU', ANG: 'CW', CNH: 'CN' };
  // Names for codes that Intl doesn't know (non-ISO territory currencies).
  const EXTRA_NAMES = {
    FOK: 'Faroese Króna', GGP: 'Guernsey Pound', IMP: 'Manx Pound', JEP: 'Jersey Pound',
    KID: 'Kiribati Dollar', TVD: 'Tuvaluan Dollar',
  };
  // Extra search words so "dubai" finds AED, "uk" finds GBP, etc.
  const ALIASES = {
    USD: 'america united states us usa', AED: 'dubai abu dhabi uae emirates', SAR: 'saudi ksa riyadh',
    GBP: 'uk britain england london', EUR: 'europe euro', HKD: 'hong kong', KRW: 'south korea',
    QAR: 'doha', KWD: 'kuwait', TWD: 'taiwan', CNY: 'china', MOP: 'macau', NZD: 'new zealand',
  };
  const NOT_MONEY = new Set(['XAU', 'XAG', 'XPT', 'XPD', 'XDR', 'XBT']);

  const safe = (fn) => { try { return fn(); } catch { return null; } };
  const nameFmt = safe(() => new Intl.DisplayNames(['en'], { type: 'currency' }));
  const regionFmt = safe(() => new Intl.DisplayNames(['en'], { type: 'region' }));
  const supported = new Set(safe(() => Intl.supportedValuesOf('currency')) || []);

  function currencyName(code) {
    if (EXTRA_NAMES[code]) return EXTRA_NAMES[code];
    return (nameFmt && safe(() => nameFmt.of(code))) || code;
  }

  function regionOf(code) {
    if (code in REGION_OVERRIDES) return REGION_OVERRIDES[code];
    if (code[0] === 'X') return null; // regional/special currencies (XAF, XOF, XCD, XPF...)
    return code.slice(0, 2);
  }

  function regionName(code) {
    const r = regionOf(code);
    return (r && regionFmt && safe(() => regionFmt.of(r))) || '';
  }

  function keepCode(code, trusted) {
    if (!/^[A-Z]{3}$/.test(code) || NOT_MONEY.has(code)) return false;
    if (trusted || EXTRA_NAMES[code]) return true;
    if (supported.size && !supported.has(code)) return false;
    const n = currencyName(code);
    return n !== code && !n.includes('(');
  }

  // ---------- storage (best effort; the app works without it) ----------
  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }

  // ---------- formatting ----------
  const moneyFmts = new Map();
  function moneyFormatter(code, small) {
    const key = code + (small ? ':s' : '');
    if (!moneyFmts.has(key)) {
      const opts = { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' };
      if (small) opts.maximumSignificantDigits = 4;
      moneyFmts.set(key, safe(() => new Intl.NumberFormat('en', opts)));
    }
    return moneyFmts.get(key);
  }

  function money(value, code) {
    const small = value !== 0 && Math.abs(value) < 1;
    const f = moneyFormatter(code, small);
    if (!f) return number(value) + ' ' + code;
    return f.format(value);
  }

  function symbolOf(code) {
    const f = moneyFormatter(code, false);
    const part = f && safe(() => f.formatToParts(0).find((p) => p.type === 'currency'));
    return part ? part.value : code;
  }

  function number(value, maxDigits = 2) {
    return new Intl.NumberFormat('en', { maximumFractionDigits: maxDigits }).format(value);
  }

  function rateNum(r) {
    const opts = r >= 1
      ? { maximumFractionDigits: r >= 100 ? 2 : 4 }
      : { maximumSignificantDigits: 4 };
    return new Intl.NumberFormat('en', opts).format(r);
  }

  const dateTimeFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const dateFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });

  function parseAmount(s) {
    const n = parseFloat(String(s).replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  // ---------- state ----------
  const prefs = load(PREFS_KEY) || {};
  const state = {
    from: typeof prefs.from === 'string' ? prefs.from : 'PHP',
    to: typeof prefs.to === 'string' ? prefs.to : 'USD',
    amount: typeof prefs.amount === 'string' ? prefs.amount : '1,000',
    favs: Array.isArray(prefs.favs) ? prefs.favs.filter((c) => typeof c === 'string') : DEFAULT_FAVS.slice(),
    data: load(RATES_KEY),
    loading: false,
    failed: false,
  };
  if (!state.data || !state.data.rates) state.data = null;

  function savePrefs() {
    store(PREFS_KEY, { from: state.from, to: state.to, amount: state.amount, favs: state.favs });
  }

  const rates = () => (state.data ? state.data.rates : null);

  function convert(amount, from, to) {
    const r = rates();
    if (!r || !r[from] || !r[to]) return null;
    return amount * (r[to] / r[from]);
  }

  function allCodes() {
    const r = rates();
    const codes = r ? Object.keys(r) : POPULAR.slice();
    return codes.sort((a, b) => currencyName(a).localeCompare(currencyName(b)));
  }

  // ---------- fetching ----------
  async function fetchRates() {
    for (const src of SOURCES) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        const res = await fetch(src.url, {
          signal: ctrl.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const parsed = src.parse(await res.json());
        const clean = { PHP: 1 };
        for (const [code, v] of Object.entries(parsed.rates)) {
          if (typeof v === 'number' && v > 0 && keepCode(code, src.trusted)) clean[code] = v;
        }
        if (Object.keys(clean).length < 20) throw new Error('Too few rates');
        return { rates: clean, updated: parsed.updated, dateOnly: parsed.dateOnly, source: src.name, fetchedAt: Date.now() };
      } catch {
        // try the next source
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error('All sources failed');
  }

  async function refresh(force) {
    if (state.loading) return;
    if (!force && state.data && Date.now() - state.data.fetchedAt < STALE_MS) return;
    state.loading = true;
    els.refreshBtn.classList.add('spinning');
    render();
    try {
      state.data = await fetchRates();
      state.failed = false;
      store(RATES_KEY, state.data);
    } catch {
      state.failed = true;
    }
    state.loading = false;
    els.refreshBtn.classList.remove('spinning');
    render();
  }

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const els = {
    amount: $('amount'), amountSymbol: $('amountSymbol'),
    fromBtn: $('fromBtn'), toBtn: $('toBtn'), swapBtn: $('swapBtn'),
    resultFrom: $('resultFrom'), resultValue: $('resultValue'), resultCode: $('resultCode'), resultRates: $('resultRates'),
    copyBtn: $('copyBtn'), favBtn: $('favBtn'),
    chips: $('chips'), favList: $('favList'), compareTitle: $('compareTitle'), addFavBtn: $('addFavBtn'),
    status: $('status'), refreshBtn: $('refreshBtn'),
    picker: $('picker'), pickerTitle: $('pickerTitle'), pickerSearch: $('pickerSearch'),
    pickerList: $('pickerList'), pickerClose: $('pickerClose'),
  };

  function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  function flagEl(code, small) {
    const wrap = el('span', 'flag' + (small ? ' sm' : ''));
    const region = regionOf(code);
    const fallback = () => { wrap.textContent = code.slice(0, 2); };
    if (region) {
      const r = region.toLowerCase();
      const img = new Image();
      img.alt = '';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.src = `https://flagcdn.com/w40/${r}.png`;
      img.srcset = `https://flagcdn.com/w80/${r}.png 2x`;
      img.addEventListener('error', () => { img.remove(); fallback(); }, { once: true });
      wrap.append(img);
    } else {
      fallback();
    }
    return wrap;
  }

  function curText(code, nameText) {
    const box = el('span', 'cur-text');
    box.append(el('span', 'cur-code', code), el('span', 'cur-name', nameText || currencyName(code)));
    return box;
  }

  function fillCurrencyBtn(btn, code, label) {
    btn.replaceChildren(flagEl(code), curText(code));
    btn.setAttribute('aria-label', `${label}: ${currencyName(code)} (${code}). Change`);
  }

  // Static icon markup only (no data is ever interpolated into these).
  const STAR = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="FILL" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>';
  const X_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  // ---------- render ----------
  function render() {
    fillCurrencyBtn(els.fromBtn, state.from, 'From');
    fillCurrencyBtn(els.toBtn, state.to, 'To');
    els.amountSymbol.textContent = symbolOf(state.from);

    const amt = parseAmount(state.amount);
    const value = convert(amt, state.from, state.to);

    els.resultFrom.textContent = `${number(amt, 6)} ${currencyName(state.from)} =`;
    if (value != null) {
      const text = money(value, state.to);
      els.resultValue.textContent = text;
      els.resultCode.textContent = text.includes(state.to) ? '' : state.to;
      const fwd = convert(1, state.from, state.to);
      const back = convert(1, state.to, state.from);
      els.resultRates.replaceChildren(
        el('span', null, `1 ${state.from} = ${rateNum(fwd)} ${state.to}`),
        el('span', null, `1 ${state.to} = ${rateNum(back)} ${state.from}`),
      );
    } else {
      els.resultValue.textContent = rates() ? 'Not available' : state.failed ? 'No rates yet' : 'Loading…';
      els.resultCode.textContent = '';
      els.resultRates.textContent = rates() ? `No rate for ${state.from} to ${state.to} right now` : '';
    }
    els.copyBtn.disabled = value == null;

    const isFav = state.favs.includes(state.to);
    els.favBtn.setAttribute('aria-pressed', String(isFav));
    els.favBtn.innerHTML = STAR.replace('FILL', isFav ? 'currentColor' : 'none');
    els.favBtn.append(el('span', null, isFav ? 'In compare' : 'Add to compare'));

    renderChips();
    renderFavs(amt);
    renderStatus();
  }

  function renderChips() {
    const frag = document.createDocumentFragment();
    for (const code of CHIPS) {
      const b = el('button', 'chip' + (code === state.to ? ' active' : ''));
      b.type = 'button';
      b.dataset.code = code;
      b.setAttribute('aria-pressed', String(code === state.to));
      b.setAttribute('aria-label', `Convert to ${currencyName(code)}`);
      b.append(flagEl(code, true), document.createTextNode(code));
      frag.append(b);
    }
    els.chips.replaceChildren(frag);
  }

  function renderFavs(amt) {
    els.compareTitle.textContent = `${symbolOf(state.from)}${number(amt, 6)} in`;
    const frag = document.createDocumentFragment();
    const list = state.favs.filter((c) => c !== state.from);
    if (!list.length) {
      frag.append(el('li', 'empty', 'Star a currency to compare it here'));
    }
    for (const code of list) {
      const li = el('li');
      const row = el('button', 'fav-row');
      row.type = 'button';
      row.dataset.code = code;
      const v = convert(amt, state.from, code);
      row.append(flagEl(code), curText(code), el('span', 'fav-value', v == null ? '—' : money(v, code)));
      const rm = el('button', 'remove-btn');
      rm.type = 'button';
      rm.dataset.remove = code;
      rm.setAttribute('aria-label', `Remove ${code} from compare`);
      rm.innerHTML = X_ICON;
      li.append(row, rm);
      frag.append(li);
    }
    els.favList.replaceChildren(frag);
  }

  function renderStatus() {
    const s = els.status;
    s.classList.remove('warn');
    if (state.loading && !state.data) { s.textContent = 'Loading rates…'; return; }
    if (!state.data) {
      s.textContent = 'Couldn’t load rates. Check your connection, then tap refresh';
      s.classList.add('warn');
      return;
    }
    const when = state.data.dateOnly ? dateFmt.format(state.data.updated) : dateTimeFmt.format(state.data.updated);
    let text = `Rates as of ${when} · ${state.data.source}`;
    if (state.loading) text += ' · updating…';
    else if (state.failed) { text += ' · offline, showing saved rates'; s.classList.add('warn'); }
    s.textContent = text;
  }

  // ---------- picker ----------
  let pickerMode = 'to';
  const haystacks = new Map();
  function haystack(code) {
    if (!haystacks.has(code)) {
      haystacks.set(code, `${code} ${currencyName(code)} ${regionName(code)} ${ALIASES[code] || ''}`.toLowerCase());
    }
    return haystacks.get(code);
  }

  function openPicker(mode) {
    pickerMode = mode;
    els.pickerTitle.textContent = { from: 'Convert from', to: 'Convert to', fav: 'Add to compare' }[mode];
    els.pickerSearch.value = '';
    renderPicker();
    els.picker.showModal();
    els.pickerSearch.focus();
    els.pickerList.scrollTop = 0;
  }

  function pickerItem(code) {
    const li = el('li');
    const b = el('button', 'picker-item');
    b.type = 'button';
    b.dataset.code = code;
    const region = regionName(code);
    const name = currencyName(code);
    b.append(flagEl(code), curText(code, region && !name.includes(region) ? `${name} · ${region}` : name));
    const selected = (pickerMode === 'from' && code === state.from)
      || (pickerMode === 'to' && code === state.to)
      || (pickerMode === 'fav' && state.favs.includes(code));
    if (selected) {
      const check = el('span', 'check');
      check.innerHTML = CHECK;
      b.append(check);
      b.setAttribute('aria-current', 'true');
    }
    li.append(b);
    return li;
  }

  function renderPicker() {
    const q = els.pickerSearch.value.trim().toLowerCase();
    const codes = allCodes();
    const frag = document.createDocumentFragment();
    if (!q) {
      const avail = new Set(codes);
      frag.append(el('li', 'picker-group', 'Popular'));
      for (const c of POPULAR) if (avail.has(c)) frag.append(pickerItem(c));
      frag.append(el('li', 'picker-group', 'All currencies'));
      for (const c of codes) frag.append(pickerItem(c));
    } else {
      const score = (c) => (c.toLowerCase() === q ? 0 : c.toLowerCase().startsWith(q) ? 1 : 2);
      const hits = codes.filter((c) => haystack(c).includes(q)).sort((a, b) => score(a) - score(b));
      if (!hits.length) frag.append(el('li', 'picker-empty', `No currency matches “${els.pickerSearch.value.trim()}”`));
      for (const c of hits) frag.append(pickerItem(c));
    }
    els.pickerList.replaceChildren(frag);
  }

  function pick(code) {
    if (pickerMode === 'from') {
      if (code === state.to) state.to = state.from;
      state.from = code;
    } else if (pickerMode === 'to') {
      if (code === state.from) state.from = state.to;
      state.to = code;
    } else if (!state.favs.includes(code)) {
      state.favs.push(code);
    }
    els.picker.close();
    savePrefs();
    render();
  }

  // ---------- events ----------
  els.amount.value = state.amount;

  els.amount.addEventListener('input', () => {
    let v = els.amount.value.replace(/[^\d.,]/g, '');
    const dot = v.indexOf('.');
    if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '');
    if (v !== els.amount.value) els.amount.value = v;
    state.amount = v;
    savePrefs();
    render();
  });
  els.amount.addEventListener('focus', () => els.amount.select());
  els.amount.addEventListener('blur', () => {
    const n = parseAmount(els.amount.value);
    if (els.amount.value.trim() !== '') {
      els.amount.value = number(n, 6);
      state.amount = els.amount.value;
      savePrefs();
    }
  });
  els.amount.addEventListener('keydown', (e) => { if (e.key === 'Enter') els.amount.blur(); });

  els.fromBtn.addEventListener('click', () => openPicker('from'));
  els.toBtn.addEventListener('click', () => openPicker('to'));
  els.addFavBtn.addEventListener('click', () => openPicker('fav'));

  els.swapBtn.addEventListener('click', () => {
    [state.from, state.to] = [state.to, state.from];
    els.swapBtn.classList.toggle('flip');
    savePrefs();
    render();
  });

  els.chips.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    const code = b.dataset.code;
    if (code === state.from) state.from = state.to;
    state.to = code;
    savePrefs();
    render();
  });

  els.favList.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-remove]');
    if (rm) {
      state.favs = state.favs.filter((c) => c !== rm.dataset.remove);
      savePrefs();
      render();
      return;
    }
    const row = e.target.closest('.fav-row');
    if (row) {
      state.to = row.dataset.code;
      savePrefs();
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  els.favBtn.addEventListener('click', () => {
    const code = state.to;
    state.favs = state.favs.includes(code) ? state.favs.filter((c) => c !== code) : [...state.favs, code];
    savePrefs();
    render();
  });

  els.copyBtn.addEventListener('click', async () => {
    const v = convert(parseAmount(state.amount), state.from, state.to);
    if (v == null) return;
    const text = new Intl.NumberFormat('en', { maximumFractionDigits: Math.abs(v) < 1 ? 6 : 2, useGrouping: false }).format(v);
    const label = $('copyLabel');
    try {
      await navigator.clipboard.writeText(text);
      label.textContent = 'Copied';
    } catch {
      label.textContent = 'Copy failed';
    }
    setTimeout(() => { label.textContent = 'Copy'; }, 1400);
  });

  els.refreshBtn.addEventListener('click', () => refresh(true));

  els.pickerSearch.addEventListener('input', renderPicker);
  els.pickerSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = els.pickerList.querySelector('.picker-item');
      if (first) pick(first.dataset.code);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const first = els.pickerList.querySelector('.picker-item');
      if (first) first.focus();
    }
  });
  els.pickerList.addEventListener('click', (e) => {
    const b = e.target.closest('.picker-item');
    if (b) pick(b.dataset.code);
  });
  els.pickerList.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = [...els.pickerList.querySelectorAll('.picker-item')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowUp' && i <= 0) { els.pickerSearch.focus(); return; }
    const next = items[Math.min(items.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))];
    if (next) next.focus();
  });
  els.pickerClose.addEventListener('click', () => els.picker.close());
  els.picker.addEventListener('click', (e) => { if (e.target === els.picker) els.picker.close(); });

  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(false); });
  window.addEventListener('online', () => refresh(true));

  render();
  refresh(false);
})();
