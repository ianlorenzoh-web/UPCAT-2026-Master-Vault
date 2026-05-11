/* ================================================================
   UPCAT 2027 MASTER VAULT — pwa.js
   Drop-in PWA registration module.
   Add <script src="pwa.js"></script> just before </body> in index.html
   (after script.js)
   ================================================================ */

(function initPWA() {
  'use strict';

  /* ----------------------------------------------------------------
     1. SERVICE WORKER REGISTRATION
     ---------------------------------------------------------------- */
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Workers not supported in this browser.');
    return;
  }

  let swRegistration = null;

  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(reg => {
      swRegistration = reg;
      console.log('[PWA] Service Worker registered. Scope:', reg.scope);

      /* Check for updates every 30 minutes while app is open */
      setInterval(() => reg.update(), 30 * 60 * 1000);

      /* Detect SW update available */
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            /* New version available — show update banner */
            showUpdateBanner();
          }
        });
      });
    })
    .catch(err => console.error('[PWA] Service Worker registration failed:', err));

  /* Reload page when new SW has taken control */
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (window._pwaReloading) return;
    window._pwaReloading = true;
    window.location.reload();
  });

  /* ----------------------------------------------------------------
     2. UPDATE BANNER
     Shows a non-intrusive banner when a new app version is ready.
     ---------------------------------------------------------------- */
  function showUpdateBanner() {
    /* Don't duplicate */
    if (document.getElementById('pwa-update-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML = `
      <span>⚡ A new version of UPCAT Vault is ready!</span>
      <button id="pwa-update-btn">Update Now</button>
      <button id="pwa-dismiss-btn" aria-label="Dismiss">✕</button>
    `;

    /* Inline styles so this works even before CSS loads */
    Object.assign(banner.style, {
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(99,102,241,0.95)',
      backdropFilter: 'blur(12px)',
      color: '#fff',
      padding: '0.65rem 1rem',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '0.85rem',
      fontWeight: '500',
      zIndex: '99999',
      boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
      whiteSpace: 'nowrap',
      maxWidth: 'calc(100vw - 2rem)',
    });

    const btnStyle = {
      background: 'rgba(255,255,255,0.2)',
      border: '1px solid rgba(255,255,255,0.3)',
      color: '#fff',
      borderRadius: '7px',
      padding: '4px 10px',
      cursor: 'pointer',
      fontSize: '0.8rem',
      fontWeight: '600',
    };

    document.body.appendChild(banner);

    const updateBtn  = document.getElementById('pwa-update-btn');
    const dismissBtn = document.getElementById('pwa-dismiss-btn');
    Object.assign(updateBtn.style,  btnStyle);
    Object.assign(dismissBtn.style, { ...btnStyle, padding: '4px 8px' });

    updateBtn.addEventListener('click', () => {
      /* Tell the waiting SW to skip waiting and take control */
      if (swRegistration?.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      banner.remove();
    });

    dismissBtn.addEventListener('click', () => banner.remove());
  }

  /* ----------------------------------------------------------------
     3. INSTALL PROMPT (Add to Home Screen)
     Captures the browser's beforeinstallprompt event and shows
     a custom, branded install button instead of the default browser UI.
     ---------------------------------------------------------------- */
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); // Suppress default mini-infobar
    deferredPrompt = e;
    console.log('[PWA] Install prompt captured. Showing install button.');
    showInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully!');
    deferredPrompt = null;
    hideInstallButton();
    /* Show toast using the app's existing toast system */
    if (typeof showToast === 'function') {
      showToast('✅ UPCAT Vault installed! Find it on your home screen.');
    }
  });

  function showInstallButton() {
    /* Don't show if already installed or button already exists */
    if (isStandalone() || document.getElementById('pwa-install-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'pwa-install-btn';
    btn.innerHTML = '<i class="fas fa-download"></i> Install App';
    btn.title = 'Install UPCAT Vault to your device';

    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      color: '#fff',
      border: 'none',
      borderRadius: '50px',
      padding: '0.65rem 1.25rem',
      fontSize: '0.85rem',
      fontWeight: '700',
      cursor: 'pointer',
      zIndex: '9999',
      boxShadow: '0 8px 24px rgba(99,102,241,0.5)',
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      transition: 'opacity 0.2s, transform 0.2s',
      letterSpacing: '0.02em',
    });

    btn.addEventListener('mouseenter', () => { btn.style.opacity = '0.9'; btn.style.transform = 'scale(1.03)'; });
    btn.addEventListener('mouseleave', () => { btn.style.opacity = '1';   btn.style.transform = 'scale(1)'; });
    btn.addEventListener('click', triggerInstall);
    document.body.appendChild(btn);
  }

  function hideInstallButton() {
    document.getElementById('pwa-install-btn')?.remove();
  }

  async function triggerInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install prompt outcome:', outcome);
    deferredPrompt = null;
    if (outcome === 'accepted') hideInstallButton();
  }

  /* ----------------------------------------------------------------
     4. STANDALONE DETECTION
     ---------------------------------------------------------------- */
  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
  }

  /* Add class to <html> for CSS targeting */
  if (isStandalone()) {
    document.documentElement.classList.add('pwa-standalone');
    console.log('[PWA] Running in standalone (installed app) mode.');
  }

  /* ----------------------------------------------------------------
     5. DEEP LINK SUPPORT
     Parse ?section= URL param and navigate to the right section on launch
     ---------------------------------------------------------------- */
  function handleDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    if (section && typeof showSection === 'function') {
      /* Wait for app to fully initialize */
      setTimeout(() => showSection(section), 600);
    }
  }

  /* Wait for app's initAll() to run first */
  window.addEventListener('load', () => setTimeout(handleDeepLink, 800));

  /* ----------------------------------------------------------------
     6. PUSH NOTIFICATION PERMISSION REQUEST
     Call this from a user interaction (button click) — not on page load.
     Exposed globally so you can wire it to a Settings button.
     ---------------------------------------------------------------- */
  window.requestPushPermission = async function() {
    if (!('Notification' in window)) {
      alert('Push notifications are not supported in this browser.');
      return;
    }
    if (!('PushManager' in window)) {
      alert('Push notifications require a secure (HTTPS) connection.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('[PWA] Notification permission granted.');
      if (typeof showToast === 'function') {
        showToast('🔔 Study reminders enabled!');
      }
      /* Optionally subscribe to a push server here:
         const sub = await swRegistration.pushManager.subscribe({...});
         sendSubscriptionToServer(sub);
      */
    } else {
      console.log('[PWA] Notification permission denied or dismissed.');
    }
    return permission;
  };

  /* ----------------------------------------------------------------
     7. NETWORK STATUS BANNER
     ---------------------------------------------------------------- */
  function showOfflineBanner(show) {
    let banner = document.getElementById('pwa-offline-banner');

    if (show) {
      if (banner) return;
      banner = document.createElement('div');
      banner.id = 'pwa-offline-banner';
      banner.textContent = '📡 You\'re offline — showing cached content';
      Object.assign(banner.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        background: '#f59e0b',
        color: '#1c1917',
        padding: '6px 16px',
        fontSize: '0.8rem',
        fontWeight: '600',
        textAlign: 'center',
        zIndex: '99998',
      });
      document.body.prepend(banner);
    } else {
      banner?.remove();
    }
  }

  window.addEventListener('online',  () => showOfflineBanner(false));
  window.addEventListener('offline', () => showOfflineBanner(true));

  /* Show immediately if already offline */
  if (!navigator.onLine) showOfflineBanner(true);

})();
