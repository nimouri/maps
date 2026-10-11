import dns from 'dns';
import { URL } from 'url';

/**
 * Checks if an IP address is a private, loopback, link-local, or reserved address.
 */
export function isPrivateIp(ip: string): boolean {
  // IPv4 checks
  if (ip === '127.0.0.1' || ip === 'localhost' || ip === '0.0.0.0') return true;

  // 10.0.0.0 - 10.255.255.255
  if (/^10\./.test(ip)) return true;

  // 172.16.0.0 - 172.31.255.255
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;

  // 192.168.0.0 - 192.168.255.255
  if (/^192\.168\./.test(ip)) return true;

  // 169.254.0.0 - 169.254.255.255 (Cloud metadata, link-local)
  if (/^169\.254\./.test(ip)) return true;

  // 100.64.0.0 - 100.127.255.255 (Carrier grade NAT)
  if (/^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(ip)) return true;

  // IPv6 loopback & private
  if (ip === '::1' || /^fe80:/i.test(ip) || /^fc00:/i.test(ip) || /^fd00:/i.test(ip)) return true;

  return false;
}

/**
 * Validates a target URL against SSRF vulnerabilities by resolving DNS
 * and verifying that the destination is a public, routable IP address.
 */
export async function validateSafeUrl(targetUrl: string): Promise<{ safe: boolean; resolvedUrl?: URL; error?: string }> {
  try {
    const parsed = new URL(targetUrl);

    // Only allow HTTP and HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, error: `Disallowed protocol: ${parsed.protocol}` };
    }

    const hostname = parsed.hostname;

    // Disallow obvious local hostnames
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return { safe: false, error: `Local hostname prohibited: ${hostname}` };
    }

    // Direct IP address check
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':')) {
      if (isPrivateIp(hostname)) {
        return { safe: false, error: `Direct private IP prohibited: ${hostname}` };
      }
    }

    // DNS lookup verification
    const lookupResult = await dns.promises.lookup(hostname, { all: true });
    for (const entry of lookupResult) {
      if (isPrivateIp(entry.address)) {
        return { safe: false, error: `Host resolves to private IP: ${entry.address}` };
      }
    }

    return { safe: true, resolvedUrl: parsed };
  } catch (err: any) {
    return { safe: false, error: `URL resolution error: ${err.message}` };
  }
}

/**
 * Safe fetch wrapper that enforces:
 * 1. SSRF prevention on initial URL and every redirect hop
 * 2. Strict timeout (default 5000ms)
 * 3. Max response body size cap (default 1MB)
 */
export async function safeFetch(
  targetUrl: string, 
  options: { timeoutMs?: number; maxBytes?: number; headers?: Record<string, string> } = {}
): Promise<{ ok: boolean; status: number; text: string; finalUrl: string } | null> {
  const timeoutMs = options.timeoutMs ?? 5000;
  const maxBytes = options.maxBytes ?? 1024 * 1024; // 1MB cap

  let currentUrl = targetUrl;
  let redirects = 0;
  const maxRedirects = 3;

  while (redirects <= maxRedirects) {
    const safety = await validateSafeUrl(currentUrl);
    if (!safety.safe || !safety.resolvedUrl) {
      console.warn(`[SSRF Blocked] URL rejected: ${currentUrl} (${safety.error})`);
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(safety.resolvedUrl.href, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...(options.headers || {})
        },
        redirect: 'manual', // Manual redirects to inspect each hop for SSRF
        signal: controller.signal
      });

      clearTimeout(timer);

      // Handle redirects securely
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) return null;
        currentUrl = new URL(location, currentUrl).href;
        redirects++;
        continue;
      }

      if (!res.ok) {
        return { ok: false, status: res.status, text: '', finalUrl: currentUrl };
      }

      const reader = res.body?.getReader();
      if (!reader) {
        const text = await res.text();
        return { ok: true, status: res.status, text: text.slice(0, maxBytes), finalUrl: currentUrl };
      }

      let receivedBytes = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          receivedBytes += value.length;
          if (receivedBytes > maxBytes) {
            reader.cancel();
            break;
          }
          chunks.push(value);
        }
      }

      const totalBuffer = Buffer.concat(chunks);
      const text = totalBuffer.toString('utf-8');

      return { ok: true, status: res.status, text, finalUrl: currentUrl };
    } catch (err: any) {
      clearTimeout(timer);
      return null;
    }
  }

  return null;
}
