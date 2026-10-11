// Newsletter sign-up. The page only collects and checks the address; the sign-up
// service does the real protection (confirmation email, bot check, rate limits).
(() => {
  'use strict';
  const form = document.querySelector('#signup-form');
  if (!form) return;
  const email = form.querySelector('#signup-email');
  const trap = form.querySelector('#signup-company');
  const status = form.querySelector('#signup-status');
  const button = form.querySelector('button[type="submit"]');
  const endpoint = form.dataset.endpoint;
  const loadedAt = Date.now();
  const pattern = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;
  let busy = false;
  const say = (text, state) => {
    status.textContent = text;
    form.dataset.state = state;
    if (state === 'error') email.setAttribute('aria-invalid', 'true');
    else email.removeAttribute('aria-invalid');
  };
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    const address = email.value.trim();
    if (!pattern.test(address) || address.length > 254) {
      say('Enter a valid email address, such as name@example.com.', 'error');
      email.focus();
      return;
    }
    // Bots fill hidden fields and submit instantly. Answer them as if it worked.
    const looksAutomated = trap.value !== '' || Date.now() - loadedAt < 1500;
    const confirmation = 'Check your inbox and open the confirmation link to finish signing up.';
    if (looksAutomated) { say(confirmation, 'done'); return; }
    if (!endpoint) { say(`${confirmation} (Preview only: nothing was sent.)`, 'done'); form.reset(); return; }
    busy = true;
    button.disabled = true;
    say('Signing you up…', 'busy');
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: address }) });
      if (!response.ok) throw new Error(String(response.status));
      say(confirmation, 'done');
      form.reset();
    } catch (_) {
      say('Sign-up did not go through. Try again in a minute, or email connect@204labs.com.', 'error');
    } finally {
      busy = false;
      button.disabled = false;
    }
  });
})();
