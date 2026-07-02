const ANON_ID_KEY = "fyn:anonId";

/** Returns the device's anonymous ID, creating one in localStorage if missing. */
export function getAnonId(): string {
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}
