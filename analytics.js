// Keep local previews out of the production analytics account.
if (['www.204labs.com', '204labs.com'].includes(location.hostname)) {
  const beacon = document.createElement('script');
  beacon.type = 'module';
  beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  beacon.dataset.cfBeacon = JSON.stringify({ token: '2ab8a0fb5a084abaa8947a02b9ced87f' });
  document.head.append(beacon);
}
