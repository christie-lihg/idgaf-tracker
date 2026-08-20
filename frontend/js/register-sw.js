/* Registers the service worker. Kept out of index.html so the CSP-friendly
 * "no inline script" property holds across the whole app.
 *
 * Registration is skipped on file:// because service workers require a secure
 * context — open the app over http://localhost or https:// to get offline mode.
 */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('[sw] registration failed — app still works, just not offline:', err);
    });
  });
}
