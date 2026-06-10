export const ADMIN_COOKIE_NAME = "fyn_admin_session";

export async function getAdminSessionToken(): Promise<string> {
  const secret = process.env.ADMIN_PASSWORD ?? "";
  const data = new TextEncoder().encode(`fyn-admin:${secret}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
