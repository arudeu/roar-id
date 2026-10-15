import { createDictionary } from "./spellcheck";

let pending = null;

/**
 * Loads the bundled US English dictionary once per page load (~0.9 MB from
 * /public/dictionaries, expanded in ~250 ms) and shares it between callers.
 */
export function loadDictionary() {
  if (!pending) {
    pending = Promise.all([
      fetch("/dictionaries/en_US.aff").then((r) => (r.ok ? r.text() : Promise.reject(new Error(`aff ${r.status}`)))),
      fetch("/dictionaries/en_US.dic").then((r) => (r.ok ? r.text() : Promise.reject(new Error(`dic ${r.status}`)))),
    ])
      .then(([aff, dic]) => createDictionary(aff, dic))
      .catch((err) => {
        pending = null; // allow a retry
        throw err;
      });
  }
  return pending;
}
