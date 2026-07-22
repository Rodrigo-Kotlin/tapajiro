import { registerSW } from 'virtual:pwa-register';

export const updateSW = registerSW({
  immediate: false,
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('sw-updated'));
  },
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent('sw-offline-ready'));
  },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000,
      );
    }
  },
  onRegisterError(_error) {
    window.dispatchEvent(new CustomEvent('sw-register-error'));
  },
});

export function acceptUpdate() {
  return updateSW(true);
}
