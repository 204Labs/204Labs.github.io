import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const productionOrigin = 'https://www.204labs.com';
const requiredPaths = [
  '/',
  '/company/',
  '/approach/',
  '/products/',
  '/products/rewizz/',
  '/products/baisect/',
  '/products/tether/',
  '/products/lurniq/',
  '/products/flatintel/',
  '/notes/',
  '/terms.html',
  '/privacy.html',
  '/cookie-policy.html'
];
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
