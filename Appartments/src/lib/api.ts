/**
 * Safe, robust Fetch wrapper for the Nazeel PMS.
 * Adds authorization headers for /api/ endpoints and dispatches unauthorized session events.
 * Does not overwrite read-only browser properties on the global window context.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem("nazeel_auth_token");
  let modifiedInit = { ...init };

  const urlStr = typeof input === "string" ? input : (input instanceof URL ? input.toString() : "");

  if (urlStr.startsWith("/api/") || urlStr.includes("/api/")) {
    const headers = new Headers(modifiedInit.headers || {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    // Ensure content type defaults to application/json for non-GET requests if not set
    if (modifiedInit.method && modifiedInit.method !== "GET" && !headers.has("Content-Type") && !(modifiedInit.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    modifiedInit.headers = headers;
  }

  try {
    const response = await window.fetch(input, modifiedInit);

    // If unauthorized, clear the token and notify the app state
    if (response.status === 401 && !urlStr.includes("/api/auth/login") && !urlStr.includes("/api/auth/register")) {
      localStorage.removeItem("nazeel_auth_token");
      window.dispatchEvent(new Event("nazeel_unauthorized"));
    }

    return response;
  } catch (error) {
    console.error("Network or connection level error in apiFetch:", error);
    throw error;
  }
}
