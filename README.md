# MinTML

**The HTML-first, zero-build, single-page, client-side application, micro-framework.**

MinTML extends standard HTML instead of replacing it — routing, templating, and role-based visibility that get out of the way. Remove `new MinTML()` from your page and everything (links, forms, layout) should still just work.

Write clean, pure HTML, modern CSS, and vanilla JavaScript — standards-compliant, semantic markup that runs natively in the browser, with no transpiler standing between your code and the platform. The way the web was intended.

No build step required to *use* it, no config, no virtual DOM. Just HTML with a few `data-*` attributes and a small script tag.

## Install

```bash
npm install @toddkingham/mintml
```

```js
import MinTML from '@toddkingham/mintml';
```

### Or via CDN (no install needed)

```html
<script type="module">
  import MinTML from 'https://cdn.jsdelivr.net/npm/@toddkingham/mintml/dist/mintml.js';
</script>
```

A minified build is also published at `dist/mintml.min.js` (about 4.4kB, ~1.9kB gzipped) — swap the path above for `dist/mintml.min.js` in production if you want the smaller payload:

```html
<script type="module">
  import MinTML from 'https://cdn.jsdelivr.net/npm/@toddkingham/mintml/dist/mintml.min.js';
</script>
```

## Quick example

```html
<header>
  <nav>
    <a href="#">Home</a>
    <a href="#about">About</a>
  </nav>
</header>

<main>
  <section id="home" data-page>Home content</section>
  <section id="about" data-page>About content</section>
</main>

<script type="module">
  import MinTML from '@toddkingham/mintml';
  const app = new MinTML();
</script>
```

Every `[data-page]` section is a "page." Hash links (`#about`) toggle which one is visible — no router config required. If you strip out the `<script>` tag, the page is still valid, readable HTML; it just won't switch sections automatically.

## Features

- **Hash-based page routing** — mark sections with `data-page`; navigation is driven by `href="#id"` links and `window.location.hash`.
- **404 handling** — if no matching page exists for the current hash, an auto-generated (or your own) error page is shown.
- **`data-before` guards** — intercept a link or form submission before it navigates, run async logic (validation, confirmation, etc.), and decide whether to proceed:
  ```js
  app.before('confirmDelete', async ({ element, payload }) => {
    return confirm('Are you sure?');
  });
  ```
  ```html
  <a href="#done" data-before="confirmDelete">Delete</a>
  ```
- **Role-based visibility** — elements with `data-show="admin,editor"` are shown/hidden based on the app's current role:
  ```js
  const app = new MinTML({ roles: ['guest', 'admin'] });
  app.role = 'admin';
  ```
- **Lightweight templating** — `<template>` elements are read once and removed from the DOM; render them anywhere with variable substitution:
  ```html
  <template id="card">Hello {{name}}</template>
  ```
  ```js
  el.innerHTML = app.render('card', { name: 'Todd' });
  ```
- **DOM helpers** — `$`, `$$`, and `$id` are exported as short wrappers around `querySelector`, `querySelectorAll`, and `getElementById`.
- **Form serialization** — `form2Object(form)` turns a submitted `<form>` into a plain object, grouping repeated fields (checkboxes, multi-selects) into arrays automatically.

## API

| Export | Description |
|---|---|
| `MinTML` (default) | Main class. `new MinTML({ roles, errorPageId })` |
| `.navigate(id)` | Navigate to a page by id |
| `.refresh()` | Re-run routing for the current hash |
| `.before(name, fn)` | Register a guard used by `data-before="name"` |
| `.role` / `.roles` | Get/set the current role and configured roles |
| `.render(templateIdOrString, data)` | Render a `<template>` with `{{key}}` substitution |
| `$(selector)` | `document.querySelector` shorthand |
| `$$(selector)` | `document.querySelectorAll` shorthand, returns an array |
| `$id(id)` | `document.getElementById` shorthand |
| `form2Object(form)` | Serialize a `<form>` element into a plain object |

## Philosophy

HTML is the foundation, not an afterthought. A MinTML page should degrade gracefully — if you delete the script tag, you still have a working, semantic HTML document.

MinTML encourages standards-compliant, semantic markup: clean, pure HTML, modern CSS, and vanilla JavaScript that run natively in the browser — no transpiler, no compiler, no build step standing between your code and the platform. The micro-framework adds behavior on top of markup you'd write anyway; it doesn't ask you to learn a templating DSL, run a bundler, or restructure your project around it. This is the way the web was intended.

## Development

```bash
npm install       # installs esbuild, used only to produce the dist build
npm run build     # regenerates dist/mintml.js and dist/mintml.min.js from public/mintml.js
```

The `dist/` build regenerates automatically before every `npm publish` (via `prepublishOnly`), so you never have to remember to run it by hand. `dist/` is gitignored — it's fully derived from `public/mintml.js`, so there's nothing there to hand-edit or commit.

## License

MIT © Todd Kingham
