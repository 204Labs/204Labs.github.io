// Generates every place a product appears from data/products.json, and the shared
// header and footer on subpages. Output is committed, so hosting stays static.
// Run: npm run build
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const origin = 'https://www.204labs.com';
const products = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));
const site = JSON.parse(fs.readFileSync(path.join(root, 'data/site.json'), 'utf8'));
const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const write = (file, content) => {
  const full = path.join(root, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
};
const arrow = '<span aria-hidden="true">↗</span>';

const actionLinks = (product, { productPage }) => {
  // The first link is the product's one primary action; the rest are secondary.
  const primary = 'button button-navy button-small';
  const links = [];
  if (product.action?.email) links.push(`<a class="${primary}" href="mailto:${esc(product.action.email)}${product.action.subject ? `?subject=${encodeURIComponent(product.action.subject)}` : ''}">${esc(product.action.label)}</a>`);
  if (product.action?.url) links.push(`<a class="${primary}" href="${esc(product.action.url)}" target="_blank" rel="noopener noreferrer">${esc(product.action.label)} ${arrow}</a>`);
  if (product.website && product.website.url !== product.action?.url) links.push(`<a class="text-link" href="${esc(product.website.url)}" target="_blank" rel="noopener noreferrer">${esc(product.website.label)} ${arrow}</a>`);
  if (productPage) links.push(`<a class="text-link" href="/products/${product.slug}/">About ${esc(product.name)}</a>`);
  return links.join('');
};

// ---- Homepage regions -------------------------------------------------------
const productRows = products.map((product) => `          <article class="product-row" id="product-${product.slug}" aria-labelledby="${product.slug}-name">
            <div class="product-row-name"><h3 id="${product.slug}-name">${esc(product.name)}</h3><p class="product-status">${esc(product.status)}</p></div>
            <div class="product-row-body"><p class="product-tagline">${esc(product.tagline)}</p><p>${esc(product.summary)}</p><div class="product-actions">${actionLinks(product, { productPage: true })}</div></div>
          </article>`).join('\n');

const itemList = `{
      "@type": "ItemList",
      "@id": "${origin}/#products",
      "name": "204Labs software products",
      "numberOfItems": ${products.length},
      "itemListElement": [
${products.map((product, index) => `        {
          "@type": "ListItem",
          "position": ${index + 1},
          "name": "${product.name}",
          "url": "${origin}/products/${product.slug}/"
        }`).join(',\n')}
      ]
    }`;

let home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const region = (html, name, content) => {
  const start = `<!-- build:${name} -->`;
  const end = `<!-- /build:${name} -->`;
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
  if (!pattern.test(html)) throw new Error(`index.html is missing the ${name} region`);
  return html.replace(pattern, () => `${start}\n${content}\n${end}`);
};
home = region(home, 'product-rows', productRows);
const signupForm = site.signupEndpoint ? `            <form class="signup" id="signup-form" novalidate data-endpoint="${esc(site.signupEndpoint)}">
              <label for="signup-email">Get product news by email</label>
              <div class="signup-row">
                <input id="signup-email" name="email" type="email" inputmode="email" autocomplete="email" maxlength="254" placeholder="you@example.com" required aria-describedby="signup-note signup-status">
                <button class="button button-navy button-small" type="submit">Sign up</button>
              </div>
              <p class="signup-trap" aria-hidden="true"><label for="signup-company">Company</label><input id="signup-company" name="company" type="text" tabindex="-1" autocomplete="off"></p>
              <p class="signup-note" id="signup-note">Occasional news from 204Labs. We email a confirmation link first, and you can unsubscribe at any time. See our <a href="privacy.html">Privacy Policy</a>.</p>
              <p class="signup-status" id="signup-status" role="status" aria-live="polite"></p>
            </form>` : '            <!-- Email sign-up appears here once data/site.json has a signupEndpoint. -->';
home = region(home, 'signup', signupForm);
home = home.replace(/\n  <script src="signup\.js[^"]*" defer><\/script>/, '');
if (site.signupEndpoint) home = home.replace('<script src="script.js', '<script src="signup.js?v=20261011" defer></script>\n  <script src="script.js');
home = home.replace(/\{\s*"@type": "ItemList"[\s\S]*?\n    \}(?=\n  \])/, () => itemList);
write('index.html', home);

// ---- Shared subpage chrome --------------------------------------------------
const themeBoot = `<script>(()=>{try{const s=localStorage.getItem('204labs_theme');const d=matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=s||(d?'dark':'light')}catch(_){document.documentElement.dataset.theme='light'}})();</script>`;
const head = ({ title, description, route, jsonLd }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${themeBoot}
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${origin}${route}">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="stylesheet" href="/styles.css?v=20261011">
  <link rel="stylesheet" href="/entity.css?v=20261011">
  <link rel="stylesheet" href="/cookie-consent.css?v=20261011">
  <script src="/chrome.js?v=20261011" defer></script>
  <script src="/cookie-consent.js?v=20261001" defer></script>
  <script src="/analytics.js" defer></script>
  <script type="application/ld+json">
${JSON.stringify(jsonLd)}
  </script>
</head>`;
const navItems = [['/products/', 'Products'], ['/company/', 'Company'], ['/approach/', 'Approach'], ['/#contact', 'Connect']];
export const header = (current) => `  <a class="skip-link" href="#main">Skip to content</a>
  <header class="entity-header wrap">
    <a class="brand" href="/" aria-label="204Labs home"><img src="/assets/brand/204Labs_Primary_Logo.svg" width="1605" height="545" alt="204Labs. Bringing Ideas to Life."></a>
    <nav class="entity-nav" aria-label="Main navigation">${navItems.map(([href, label]) => `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
    <button class="theme-toggle" type="button" aria-label="Switch to dark mode" hidden><svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg><svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg></button>
  </header>`;
export const footer = () => `  <footer class="entity-footer wrap">
    <p>© 2026 204Labs FZE. Licence No. 4432199. United Arab Emirates.</p>
    <nav aria-label="Legal and contact"><a href="mailto:connect@204labs.com">connect@204labs.com</a><a href="/privacy.html">Privacy Policy</a><a href="/terms.html">Terms of Use</a><a href="/cookie-policy.html">Cookie Policy</a></nav>
  </footer>`;

// ---- Product pages ----------------------------------------------------------
for (const product of products) {
  const route = `/products/${product.slug}/`;
  const title = `${product.name} | 204Labs Product`;
  const jsonLd = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Products', item: `${origin}/products/` },
      { '@type': 'ListItem', position: 2, name: product.name, item: `${origin}${route}` } ] },
    { '@type': 'WebPage', '@id': `${origin}${route}#webpage`, url: `${origin}${route}`, name: title, description: product.metaDescription, about: { '@id': `${origin}${route}#app` }, inLanguage: 'en' },
    { '@type': 'WebApplication', '@id': `${origin}${route}#app`, name: product.name, ...(product.website ? { url: product.website.url } : {}), applicationCategory: product.category, description: product.summary, creator: { '@id': `${origin}/#organization` }, publisher: { '@id': `${origin}/#organization` } } ] };
  const facts = [['Status', esc(product.status)], ['Made by', '204Labs FZE']];
  const actions = actionLinks(product, { productPage: false });
  if (product.website) facts.push(['Website', `<a href="${esc(product.website.url)}">${esc(product.website.display)}</a>`]);
  write(`products/${product.slug}/index.html`, `${head({ title, description: product.metaDescription, route, jsonLd })}
<body class="entity-page">
${header('/products/')}
  <main class="wrap" id="main">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/products/">Products</a><span>${esc(product.name)}</span></nav>
    <section class="entity-hero">
      <p class="entity-status">${esc(product.status)}</p>
      <h1>${esc(product.headline)}</h1>
      <p class="lead">${esc(product.summary)}</p>
${actions ? `      <div class="entity-actions">${actions}</div>\n` : ''}    </section>
${product.sections.map((section) => `    <section class="entity-panel"><h2>${esc(section.title)}</h2><div class="entity-copy">${section.body.map((text) => `<p>${esc(text)}</p>`).join('')}</div></section>`).join('\n')}
    <section class="entity-panel"><h2>At a glance</h2><div class="entity-copy"><dl class="entity-facts">${facts.map(([term, value]) => `<div><dt>${term}</dt><dd>${value}</dd></div>`).join('')}</dl></div></section>${actions ? `\n    <section class="entity-closing"><p class="lead">${esc(product.tagline)}</p><div class="entity-actions">${actions}</div></section>` : ''}
  </main>
${footer()}
</body>
</html>
`);
}

// ---- Products index ---------------------------------------------------------
{
  const route = '/products/';
  const names = products.map((product) => product.name);
  const listed = `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  const description = `Software products created and owned by 204Labs: ${listed}.`;
  const jsonLd = { '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': `${origin}${route}#webpage`, url: `${origin}${route}`, name: 'Products | 204Labs', description, isPartOf: { '@id': `${origin}/#website` }, inLanguage: 'en' };
  write('products/index.html', `${head({ title: 'Products | 204Labs', description, route, jsonLd })}
<body class="entity-page">
${header(route)}
  <main class="wrap" id="main">
    <section class="entity-hero"><h1>Products</h1><p class="lead">204Labs builds and owns ${products.length === 4 ? 'four' : products.length} software products.</p></section>
    <section class="entity-card-grid">
${products.map((product) => `      <a class="entity-card" href="/products/${product.slug}/"><span class="status">${esc(product.status)}</span><h2>${esc(product.name)}</h2><p>${esc(product.tagline)}</p></a>`).join('\n')}
    </section>
  </main>
${footer()}
</body>
</html>
`);
}

// ---- Company ----------------------------------------------------------------
{
  const route = '/company/';
  const names = products.map((product) => product.name);
  const listed = `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  const description = `204Labs FZE is an independent software company based in the United Arab Emirates, and creator of ${listed}.`;
  const jsonLd = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': `${origin}/#organization`, name: '204Labs', legalName: '204Labs FZE', url: `${origin}/`, logo: `${origin}/assets/brand/logo.png`, email: 'connect@204labs.com', address: { '@type': 'PostalAddress', addressCountry: 'AE' }, identifier: { '@type': 'PropertyValue', propertyID: 'Licence number', value: '4432199' }, sameAs: ['https://github.com/204Labs'] },
    { '@type': 'WebPage', '@id': `${origin}${route}#webpage`, url: `${origin}${route}`, name: 'Company | 204Labs FZE', description, isPartOf: { '@id': `${origin}/#website` }, about: { '@id': `${origin}/#organization` }, inLanguage: 'en' } ] };
  write('company/index.html', `${head({ title: 'Company | 204Labs FZE', description, route, jsonLd })}
<body class="entity-page">
${header(route)}
  <main class="wrap" id="main">
    <section class="entity-hero">
      <h1>Useful ideas deserve a serious attempt.</h1>
      <p class="lead">204Labs is an independent software company based in the United Arab Emirates. It builds and owns ${listed}.</p>
    </section>
    <section class="entity-panel">
      <h2>How we work</h2>
      <div class="entity-copy">
        <p>We pick problems others overlook. Each product gets its own name, audience and direction, with 204Labs providing the foundation behind it.</p>
        <p><a class="text-link" href="/approach/">Read about ECHO, our approach</a></p>
      </div>
    </section>
    <section class="entity-panel">
      <h2>Company details</h2>
      <div class="entity-copy">
        <dl class="entity-facts"><div><dt>Brand</dt><dd>204Labs</dd></div><div><dt>Legal entity</dt><dd>204Labs FZE</dd></div><div><dt>Registered in</dt><dd>United Arab Emirates</dd></div><div><dt>Licence number</dt><dd>4432199</dd></div><div><dt>Contact</dt><dd><a href="mailto:connect@204labs.com">connect@204labs.com</a></dd></div></dl>
      </div>
    </section>
    <section class="entity-panel">
      <h2>Products</h2>
      <div class="entity-card-grid">
${products.map((product) => `        <a class="entity-card" href="/products/${product.slug}/"><span class="status">${esc(product.status)}</span><h3>${esc(product.name)}</h3><p>${esc(product.tagline)}</p></a>`).join('\n')}
      </div>
    </section>
  </main>
${footer()}
</body>
</html>
`);
}

// ---- Approach ---------------------------------------------------------------
{
  const route = '/approach/';
  const description = 'ECHO is the 204Labs approach: Experimentation, Curiosity with Purpose, Human and Optimism guide how 204Labs explores and builds software products.';
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebPage', '@id': `${origin}${route}#webpage`, url: `${origin}${route}`, name: 'Approach | ECHO at 204Labs', description, about: { '@id': `${origin}/#organization` }, inLanguage: 'en' };
  const principles = [
    ['Experimentation', 'Try things. Learn. Improve. Try again.', 'Good products rarely arrive fully formed. 204Labs creates room to test ideas, question assumptions and learn from what does not work.'],
    ['Curiosity with Purpose', 'Ask questions, but know why you are asking them.', 'Curiosity is used to find overlooked gaps, awkward problems and small frustrations that can become useful software when handled with purpose.'],
    ['Human', 'People come before features.', 'Human means thinking about both the people who use a product and the people who create it.'],
    ['Optimism', 'Assume there is a way forward.', 'Optimism means approaching problems believing they can be understood, challenged and improved.'] ];
  write('approach/index.html', `${head({ title: 'Approach | ECHO at 204Labs', description, route, jsonLd })}
<body class="entity-page">
${header(route)}
  <main class="wrap" id="main">
    <section class="entity-hero"><h1>E C H O</h1><p class="lead">ECHO is the ethos behind how 204Labs explores ideas, builds products and responds when things do not go according to plan.</p><div class="entity-actions"><a class="text-link" href="/#approach">See ECHO in motion on the homepage</a></div></section>
${principles.map(([name, line, body]) => `    <section class="entity-panel"><h2>${name}</h2><div class="entity-copy"><p><strong>${line}</strong></p><p>${body}</p></div></section>`).join('\n')}
  </main>
${footer()}
</body>
</html>
`);
}

// ---- Redirect stubs for retired addresses -----------------------------------
for (const [file, target] of [['products/tether/index.html', '/products/'], ['products/lurniq/index.html', '/products/'], ['notes/index.html', '/']]) {
  write(file, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page moved | 204Labs</title>
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${origin}${target}">
  <meta http-equiv="refresh" content="0; url=${target}">
</head>
<body data-redirect="${target}">
  <p>This page has moved. <a href="${target}">Continue to 204Labs</a>.</p>
</body>
</html>
`);
}

// ---- Legal pages: shared navigation and footer, policy text untouched --------
for (const file of ['privacy.html', 'terms.html', 'cookie-policy.html']) {
  let page = fs.readFileSync(path.join(root, file), 'utf8');
  const nav = `<nav class="policy-nav" aria-label="Main navigation">${navItems.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}</nav>`;
  page = page.replace(/<nav class="policy-nav"[\s\S]*?<\/nav>/, () => nav);
  const policyFooter = `  <!-- build:footer -->
  <footer class="policy-footer wrap">
    <p>© 2026 204Labs FZE.</p>
    <nav aria-label="Legal and contact"><a href="mailto:connect@204labs.com">connect@204labs.com</a><a href="/privacy.html">Privacy Policy</a><a href="/terms.html">Terms of Use</a><a href="/cookie-policy.html">Cookie Policy</a></nav>
  </footer>
  <!-- /build:footer -->`;
  page = page.replace(/\s*<!-- build:footer -->[\s\S]*?<!-- \/build:footer -->/, '');
  page = page.replace('\n</body>', () => `\n${policyFooter}\n</body>`);
  write(file, page);
}

// ---- Sitemap and llms.txt ---------------------------------------------------
{
  const today = new Date().toISOString().slice(0, 10);
  const previous = fs.existsSync(path.join(root, 'sitemap.xml')) ? fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8') : '';
  const stamp = (route) => previous.match(new RegExp(`<loc>${origin}${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc><lastmod>([^<]+)</lastmod>`))?.[1];
  const legal = ['/terms.html', '/privacy.html', '/cookie-policy.html'];
  const routes = ['/', '/company/', '/approach/', '/products/', ...products.map((product) => `/products/${product.slug}/`), ...legal];
  const lastmod = (route) => (legal.includes(route) ? stamp(route) ?? today : site.contentUpdated ?? today);
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((route) => `  <url><loc>${origin}${route}</loc><lastmod>${lastmod(route)}</lastmod></url>`).join('\n')}
</urlset>
`);
  write('llms.txt', `# 204Labs

> 204Labs FZE is an independent software company based in the United Arab Emirates. It builds and owns ${products.length} software products.

## Products

${products.map((product) => `- [${product.name}](${origin}/products/${product.slug}/): ${product.tagline} Status: ${product.status}.${product.website ? ` Website: ${product.website.url}` : ''}`).join('\n')}

## Company

- [Company](${origin}/company/): legal entity and contact details
- [Approach](${origin}/approach/): ECHO, the four principles behind how 204Labs works
- Contact: connect@204labs.com
`);
}

console.log(`Built the homepage regions, ${products.length} product pages and every shared page.`);
