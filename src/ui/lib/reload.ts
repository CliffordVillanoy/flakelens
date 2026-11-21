/** Reloading the page, behind an object so tests can replace it (the browser's own reload cannot be spied on). */
export const reload = { now: () => window.location.reload() };
