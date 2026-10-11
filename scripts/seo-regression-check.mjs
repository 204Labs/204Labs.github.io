import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const productionOrigin = 'https://www.204labs.com';
const products = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/products.json'), 'utf8'));
const requiredPaths = [
  '/',
  '/company/',
  '/approach/',
  '/products/',
  ...products.map((product) => `/products/${product.slug}/`),
  '/terms.html',
  '/privacy.html',
  '/cookie-policy.html'
];
// Draft or placeholder wording that must never reach a published page.
const bannedPhrases = ['placeholder', 'not supplied', 'site-supported', 'crawlable', 'lorem ipsum', 'at a high level', 'public description', 'preview only'];
const expectedNav = ['Products', 'Company', 'Approach', 'Connect'];
const requiredBots = [
  'Googlebot',
  'Bingbot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User'
];
const errors = [];

const fail = (message) => errors.push(message);
const posix = (value) => value.split(path.sep).join('/');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const stripQueryHash = (href) => href.split('#')[0].split('?')[0];
const decodeAttr = (value) => value.replace(/&amp;/g, '&');
const htmlFiles = [];

const walk = (dir = root) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) htmlFiles.push(posix(path.relative(root, full)));
  }
};

const routeForFile = (file) => {
  if (file === 'index.html') return '/';
  if (file.endsWith('/index.html')) return `/${file.slice(0, -'index.html'.length)}`;
  return `/${file}`;
};

const fileForRoute = (route) => {
  if (route === '/') return 'index.html';
  if (route.endsWith('/')) return `${route.slice(1)}index.html`;
  return route.slice(1);
};

const toRoute = (href, fromFile) => {
  if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
    if (!href.startsWith(productionOrigin)) return null;
    return new URL(href).pathname;
  }
  const clean = stripQueryHash(decodeAttr(href));
  if (!clean) return null;
  if (clean.startsWith('/')) return clean;
  const fromDir = routeForFile(fromFile).endsWith('/') ? routeForFile(fromFile) : path.posix.dirname(routeForFile(fromFile)) + '/';
  return path.posix.normalize(path.posix.join(fromDir, clean)).replace(/\\/g, '/');
};

walk();
const routes = new Map(htmlFiles.map((file) => [routeForFile(file), file]));

for (const requiredPath of requiredPaths) {
  if (!routes.has(requiredPath)) fail(`Missing required canonical page: ${requiredPath}`);
}

for (const file of htmlFiles) {
  const html = read(file);
  const route = routeForFile(file);
  // Retired addresses are kept as redirect pages; they only need a working target.
  const redirect = html.match(/<body data-redirect="([^"]+)"/)?.[1];
  if (redirect) {
    if (!fs.existsSync(path.join(root, fileForRoute(redirect)))) fail(`${file}: redirect target ${redirect} does not exist`);
    continue;
  }
  const visible = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/\s(?:placeholder|autocomplete)="[^"]*"/gi, ' ').toLowerCase();
  for (const phrase of bannedPhrases) if (visible.includes(phrase)) fail(`${file}: contains draft wording "${phrase}"`);
  const nav = html.match(/<nav[^>]*aria-label="Main navigation"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  if (file !== '404.html') {
    const labels = nav ? [...nav.matchAll(/>([^<>]+)<\/a>/g)].map((match) => match[1].trim()) : [];
    if (labels.join('|') !== expectedNav.join('|')) fail(`${file}: main navigation should be ${expectedNav.join(', ')} (found ${labels.join(', ') || 'none'})`);
  }
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  if (!title) fail(`${file}: missing title`);
  else if (title.length > 70) fail(`${file}: title is longer than 70 characters`);

  const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1]?.trim();
  if (file !== '404.html' && !description) fail(`${file}: missing meta description`);
  else if (description && (description.length < 50 || description.length > 170)) fail(`${file}: description length should be 50-170 characters`);

  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
  if (file !== '404.html') {
    const expectedCanonical = `${productionOrigin}${route}`;
    if (canonical !== expectedCanonical) fail(`${file}: canonical should be ${expectedCanonical}`);
  }

  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1Count !== 1) fail(`${file}: expected exactly one h1, found ${h1Count}`);

  const noindex = /<meta\s+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
  if (file !== '404.html' && noindex) fail(`${file}: accidental noindex`);

  for (const script of html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(script[1].trim());
    } catch (error) {
      fail(`${file}: invalid JSON-LD (${error.message})`);
    }
  }

  for (const attr of html.matchAll(/\s(?:href|src)=["']([^"']+)["']/gi)) {
    const href = decodeAttr(attr[1]);
    if (href.startsWith('http://www.204labs.com')) fail(`${file}: production URL must use https: ${href}`);
    const routeTarget = toRoute(href, file);
    if (!routeTarget) continue;
    const targetFile = fileForRoute(routeTarget);
    if (!fs.existsSync(path.join(root, targetFile))) fail(`${file}: broken internal link or asset ${href}`);
  }
}

// Every product must appear on the homepage and have its own page.
const homepage = read('index.html');
for (const product of products) {
  if (!homepage.includes(`id="product-${product.slug}"`)) fail(`index.html: product ${product.name} is missing. Run npm run build.`);
  if (!routes.has(`/products/${product.slug}/`)) fail(`products/${product.slug}/: page is missing. Run npm run build.`);
}

// ECHO is locked. Its script and styles must match the recorded fingerprints;
// after an intended ECHO change, update data/echo-lock.json in the same commit.
{
  const digest = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
  const script = read('script.js');
  const styles = read('styles.css');
  const echoScript = script.slice(script.indexOf('// ECHO: progressive enhancement'));
  const echoStyles = styles.slice(styles.indexOf('/* ECHO only:'), styles.indexOf('/* Portfolio disclosures'));
  const lock = JSON.parse(read('data/echo-lock.json'));
  if (!echoScript.startsWith('// ECHO') || echoStyles.length < 1000) fail('ECHO script or styles could not be located');
  if (digest(echoScript) !== lock.script) fail(`script.js: ECHO script changed (fingerprint ${digest(echoScript)}, locked ${lock.script})`);
  if (digest(echoStyles) !== lock.styles) fail(`styles.css: ECHO styles changed (fingerprint ${digest(echoStyles)}, locked ${lock.styles})`);
}

const sitemap = read('sitemap.xml');
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
for (const requiredPath of requiredPaths) {
  const url = `${productionOrigin}${requiredPath}`;
  if (!sitemapUrls.includes(url)) fail(`sitemap.xml missing ${url}`);
}
for (const url of sitemapUrls) {
  if (!url.startsWith(productionOrigin)) fail(`sitemap.xml has non-canonical origin: ${url}`);
  const route = new URL(url).pathname;
  if (!routes.has(route)) fail(`sitemap.xml references missing route: ${route}`);
}

const robots = read('robots.txt');
if (!/User-agent:\s*\*/i.test(robots) || !/Allow:\s*\//i.test(robots)) fail('robots.txt must be permissive for all crawlers');
if (/Disallow:\s*\//i.test(robots)) fail('robots.txt must not block site crawling');
for (const bot of requiredBots) {
  if (new RegExp(`User-agent:\\s*${bot}`, 'i').test(robots) && new RegExp(`User-agent:\\s*${bot}[\\s\\S]*?Disallow:\\s*/`, 'i').test(robots)) {
    fail(`robots.txt blocks ${bot}`);
  }
}
if (!robots.includes(`${productionOrigin}/sitemap.xml`)) fail('robots.txt missing canonical sitemap URL');

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`SEO regression check passed for ${htmlFiles.length} HTML files.`);
