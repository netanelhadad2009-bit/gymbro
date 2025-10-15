const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

// Log the API base URL on initialization
console.log('🌐 API Base URL:', BASE);

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const errorMsg = `HTTP ${res.status} ${res.statusText} - ${text || 'No response body'}`;
    console.error('❌ API Error:', errorMsg);
    throw new Error(errorMsg);
  }
  return res.json() as Promise<T>;
}

export async function get<T>(path: string, init?: RequestInit) {
  const url = `${BASE}${path}`;
  console.log('📡 GET:', url);

  try {
    const res = await fetch(url, { ...init, cache: "no-store" });
    return json<T>(res);
  } catch (err) {
    console.error('❌ Fetch failed for GET', url, ':', err);
    throw err;
  }
}

export async function post<T>(path: string, body: unknown, init?: RequestInit) {
  const url = `${BASE}${path}`;
  console.log('📡 POST:', url);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return json<T>(res);
  } catch (err) {
    console.error('❌ Fetch failed for POST', url, ':', err);
    throw err;
  }
}
