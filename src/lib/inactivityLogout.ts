export const logoutEvent = "autoLogout";

let timeoutId: ReturnType<typeof setTimeout> | null = null;

const INACTIVITY_TIME = 10 * 60 * 1000;

const events = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

const resetTimer = () => {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  timeoutId = setTimeout(() => {
    window.dispatchEvent(new Event(logoutEvent));
  }, INACTIVITY_TIME);
};

export const startInactivityMonitoring = () => {
  stopInactivityMonitoring();

  events.forEach((event) => {
    window.addEventListener(event, resetTimer, { passive: true });
  });

  resetTimer();

  window.resetInactivityTimer = resetTimer;
};

export const stopInactivityMonitoring = () => {
  events.forEach((event) => {
    window.removeEventListener(event, resetTimer);
  });

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  timeoutId = null;
  window.resetInactivityTimer = undefined;
};