// Keep local previews out of the production analytics account.
function load204LabsAnalytics() {
  if (window.__204LabsAnalyticsLoaded) return;
  if (!['www.204labs.com', '204labs.com'].includes(location.hostname)) return;
  if (!window.__204LabsCookieConsent?.hasAnalyticsConsent()) return;

  window.__204LabsAnalyticsLoaded = true;
  const beacon = document.createElement('script');
  beacon.type = 'module';
  beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  beacon.dataset.cfBeacon = JSON.stringify({ token: '2ab8a0fb5a084abaa8947a02b9ced87f' });
  document.head.append(beacon);
}

load204LabsAnalytics();
window.addEventListener('204labs:cookie-consent', load204LabsAnalytics);
