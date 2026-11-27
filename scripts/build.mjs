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
const countWord = (n) => ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] ?? String(n);
// Product landings kept by hand outside data/products.json (each has its own page and legal pages).
const landingRoutes = ['/lurniq/', '/lurniq/privacy/', '/lurniq/terms/', '/paper-run/', '/paper-run/privacy/'];

const actionLinks = (product, { productPage }) => {
  // The first link is the product's one primary action; the rest are secondary.
  const primary = 'button button-navy button-small';
  const links = [];
  if (product.action?.email) links.push(`<a class="${primary}" href="mailto:${esc(product.action.email)}${product.action.subject ? `?subject=${encodeURIComponent(product.action.subject)}` : ''}">${esc(product.action.label)}</a>`);
  // A link to a page on this site opens in place, without the external-link arrow.
  const external = (url) => !(url.startsWith('/') || url.startsWith(`${origin}/`));
  const outbound = (url) => (external(url) ? ' target="_blank" rel="noopener noreferrer"' : '');
  const mark = (url) => (external(url) ? ` ${arrow}` : '');
  if (product.action?.url) links.push(`<a class="${primary}" href="${esc(product.action.url)}"${outbound(product.action.url)}>${esc(product.action.label)}${mark(product.action.url)}</a>`);
  if (product.website && product.website.url !== product.action?.url) links.push(`<a class="text-link" href="${esc(product.website.url)}"${outbound(product.website.url)}>${esc(product.website.label)}${mark(product.website.url)}</a>`);
  if (productPage) links.push(`<a class="text-link" href="/products/${product.slug}/">About ${esc(product.name)}</a>`);
  return links.join('');
};

// ---- Homepage regions -------------------------------------------------------
const productRows = products.map((product) => `          <article class="product-row" id="product-${product.slug}" aria-labelledby="${product.slug}-name">
            <div class="product-row-name"><h3 id="${product.slug}-name">${esc(product.name)}</h3><p class="product-status">${esc(product.status)}</p></div>
            <div class="product-row-body"><p class="product-tagline">${esc(product.tagline)}</p><p>${esc(product.summary)}</p><div class="product-actions">${actionLinks(product, { productPage: true })}</div></div>
          </article>`).join('\n');

const homepageItemList = [...products.map((p) => ({ name: p.name, url: `${origin}/products/${p.slug}/` })), { name: "Lurniq", url: `${origin}/lurniq/` }];

const itemList = `{
      "@type": "ItemList",
      "@id": "${origin}/#products",
      "name": "204Labs software products",
      "numberOfItems": ${homepageItemList.length},
      "itemListElement": [
${homepageItemList.map((product, index) => `        {
          "@type": "ListItem",
          "position": ${index + 1},
          "name": "${product.name}",
          "url": "${product.url}"
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
  <link rel="stylesheet" href="/styles.css?v=20261127">
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
// Footer details shared by every 204Labs page. Product pages use productFooter instead.
const copyright = '© 2026 204Labs. All Rights Reserved.';
const footerCompanies = `<div class="footer-entities"><p>204Labs FZE<br><span>Licence No. 4432199</span><br><span>United Arab Emirates</span></p><p>204Labs Lanka (Pvt) Ltd<br><span>Company Reg. No. PV 00381058</span><br><span>Sri Lanka</span></p></div>`;
const footerSocial = `<nav class="footer-social" aria-label="204Labs on social media"><a href="https://www.instagram.com/204.labs/" rel="noopener" aria-label="204Labs on Instagram" title="Instagram @204.labs"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/></svg></a><a href="https://www.tiktok.com/@204labs" rel="noopener" aria-label="204Labs on TikTok" title="TikTok @204labs"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></a></nav>`;
const sameAs = ["https://github.com/204Labs", "https://www.instagram.com/204.labs/", "https://www.tiktok.com/@204labs"];
const organizationNode = {"@type": "Organization", "@id": "https://www.204labs.com/#organization", "name": "204Labs", "legalName": "204Labs FZE", "url": "https://www.204labs.com/", "logo": "https://www.204labs.com/assets/brand/logo.png", "sameAs": ["https://github.com/204Labs", "https://www.instagram.com/204.labs/", "https://www.tiktok.com/@204labs"]};
const lankaOrganizationNode = {"@type": "Organization", "@id": "https://www.204labs.com/#organization-lk", "name": "204Labs Lanka (Pvt) Ltd", "legalName": "204Labs Lanka (Pvt) Ltd", "url": "https://www.204labs.com/", "brand": {"@type": "Brand", "name": "204Labs"}, "identifier": {"@type": "PropertyValue", "propertyID": "Company registration number", "value": "PV 00381058"}, "address": {"@type": "PostalAddress", "addressCountry": "LK"}, "sameAs": ["https://www.instagram.com/204.labs/", "https://www.tiktok.com/@204labs"]};
export const footer = () => `  <footer class="entity-footer wrap">
    <div class="footer-group">${footerCompanies}<div class="footer-meta">${footerSocial}<p>${copyright}</p></div></div>
    <nav aria-label="Legal and contact"><a href="mailto:connect@204labs.com">connect@204labs.com</a><a href="/privacy.html">Privacy Policy</a><a href="/terms.html">Terms of Use</a><a href="/cookie-policy.html">Cookie Policy</a></nav>
  </footer>`;
// Product pages carry only their own brand and their own legal pages.
const productFooter = (product) => {
  const links = (product.legal ?? []).map((item) => item.url.startsWith('http')
    ? `<a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.label)}</a>`
    : `<a href="${esc(item.url)}">${esc(item.label)}</a>`).join('');
  return `  <footer class="entity-footer product-footer wrap">
    <div class="product-footer-mark"><p><strong>${esc(product.name)}</strong> by <a href="/">204Labs</a></p><p>${copyright}</p></div>${links ? `\n    <nav aria-label="${esc(product.name)} legal">${links}</nav>` : ''}
  </footer>`;
};

// ---- Product pages ----------------------------------------------------------
for (const product of products) {
  const route = `/products/${product.slug}/`;
  const title = `${product.name} | 204Labs Product`;
  const jsonLd = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Products', item: `${origin}/products/` },
      { '@type': 'ListItem', position: 2, name: product.name, item: `${origin}${route}` } ] },
    { '@type': 'WebPage', '@id': `${origin}${route}#webpage`, url: `${origin}${route}`, name: title, description: product.metaDescription, about: { '@id': `${origin}${route}#app` }, inLanguage: 'en' },
    { '@type': 'WebApplication', '@id': `${origin}${route}#app`, name: product.name, ...(product.website ? { url: product.website.url } : {}), applicationCategory: product.category, description: product.summary, creator: { '@id': `${origin}/#organization` }, publisher: { '@id': `${origin}/#organization` } },
    organizationNode ] };
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
${productFooter(product)}
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
    <section class="entity-hero"><h1>Products</h1><p class="lead">204Labs builds and owns ${countWord(products.length)} software products.</p></section>
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
    { '@type': 'Organization', '@id': `${origin}/#organization`, name: '204Labs', legalName: '204Labs FZE', url: `${origin}/`, logo: `${origin}/assets/brand/logo.png`, email: 'connect@204labs.com', address: { '@type': 'PostalAddress', addressCountry: 'AE' }, identifier: { '@type': 'PropertyValue', propertyID: 'Licence number', value: '4432199' }, sameAs },
    lankaOrganizationNode,
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
        <dl class="entity-facts"><div><dt>Brand</dt><dd>204Labs</dd></div><div><dt>UAE company</dt><dd>204Labs FZE<br>Licence No. 4432199</dd></div><div><dt>Sri Lankan company</dt><dd>204Labs Lanka (Pvt) Ltd<br>Company Reg. No. PV 00381058</dd></div><div><dt>Contact</dt><dd><a href="mailto:connect@204labs.com">connect@204labs.com</a></dd></div><div><dt>Social</dt><dd><a href="https://www.instagram.com/204.labs/" rel="noopener">Instagram @204.labs</a><br><a href="https://www.tiktok.com/@204labs" rel="noopener">TikTok @204labs</a></dd></div></dl>
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
    <div class="footer-group">${footerCompanies}<div class="footer-meta">${footerSocial}<p>${copyright}</p></div></div>
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
  const routes = ['/', '/company/', '/approach/', '/products/', ...products.map((product) => `/products/${product.slug}/`), ...legal, ...landingRoutes];
  const lastmod = (route) => (legal.includes(route) || landingRoutes.includes(route) ? stamp(route) ?? today : site.contentUpdated ?? today);
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
- Companies: 204Labs FZE (United Arab Emirates, Licence No. 4432199) and 204Labs Lanka (Pvt) Ltd (Sri Lanka, Company Reg. No. PV 00381058)
- Contact: connect@204labs.com
- Social: Instagram https://www.instagram.com/204.labs/ · TikTok https://www.tiktok.com/@204labs
`);
}

console.log(`Built the homepage regions, ${products.length} product pages and every shared page.`);
