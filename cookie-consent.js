(function () {
  const storageKey = '204labs_cookie_consent_v1';
  const acceptedValue = 'analytics';
  const declinedValue = 'essential';
  let sessionChoice = null;

  const getChoice = () => {
    try {
      return window.localStorage.getItem(storageKey) || sessionChoice;
    } catch (error) {
      return sessionChoice;
    }
  };

  const saveChoice = (choice) => {
    sessionChoice = choice;
    try {
      window.localStorage.setItem(storageKey, choice);
    } catch (error) {
      // If storage is unavailable, keep the choice for this page view only.
    }
    window.dispatchEvent(new CustomEvent('204labs:cookie-consent', { detail: { choice } }));
  };

  const buildBanner = () => {
    const cookiePolicyHref = location.protocol === 'file:' ? 'cookie-policy.html' : '/cookie-policy.html';
    const banner = document.createElement('section');
    banner.className = 'cookie-consent';
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML = `
      <div>
        <span class="cookie-consent__eyebrow">Privacy choices</span>
        <h2 class="cookie-consent__title">Can we use analytics?</h2>
        <p class="cookie-consent__copy">We use essential storage to remember this choice. With your permission, we also use privacy-friendly analytics to understand which pages are useful. Read our <a href="${cookiePolicyHref}">Cookie Policy</a>.</p>
      </div>
      <div class="cookie-consent__actions">
        <button class="cookie-consent__button" type="button" data-cookie-choice="essential">Decline analytics</button>
        <button class="cookie-consent__button cookie-consent__button--primary" type="button" data-cookie-choice="analytics">Accept analytics</button>
      </div>
    `;

    banner.addEventListener('click', (event) => {
      const button = event.target.closest('[data-cookie-choice]');
      if (!button) return;
      saveChoice(button.dataset.cookieChoice);
      banner.hidden = true;
    });

    return banner;
  };

  const openBanner = () => {
    let banner = document.querySelector('.cookie-consent');
    if (!banner) {
      banner = buildBanner();
      document.body.append(banner);
    }
    banner.hidden = false;
    banner.querySelector('[data-cookie-choice="analytics"]')?.focus({ preventScroll: true });
  };

  const addSettingsLink = () => {
    const targets = document.querySelectorAll('.footer-links, .policy-nav');
    targets.forEach((target) => {
      if (target.querySelector('.cookie-settings-button')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cookie-settings-button';
      button.textContent = 'Cookie Settings';
      button.addEventListener('click', openBanner);
      target.append(button);
    });
  };

  window.__204LabsCookieConsent = {
    getChoice,
    hasAnalyticsConsent: () => getChoice() === acceptedValue,
    open: openBanner
  };

  document.addEventListener('DOMContentLoaded', () => {
    addSettingsLink();
    const choice = getChoice();
    if (choice !== acceptedValue && choice !== declinedValue) {
      document.body.append(buildBanner());
    }
  });
})();
