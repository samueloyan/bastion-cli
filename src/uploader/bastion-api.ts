import * as https from 'https';
import type { JsonExport, UploadResponse } from '../types';

const UPLOAD_URL = 'https://bastion-zeta.vercel.app/api/cli/scan';

export function uploadScanResults(payload: JsonExport, apiKey: string): Promise<UploadResponse> {
  const body = JSON.stringify(payload);
  return new Promise((resolve) => {
    try {
      const u = new URL(UPLOAD_URL);
      const req = https.request(
        {
          hostname: u.hostname,
          path: u.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'x-bastion-key': apiKey,
          },
        },
        (res) => {
          let data = '';
          res.on('data', (c) => {
            data += c;
          });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data) as { success?: boolean; dashboard_url?: string; error?: string };
              if (parsed.success && parsed.dashboard_url) {
                resolve({ success: true, dashboard_url: parsed.dashboard_url });
              } else {
                resolve({ success: false, error: parsed.error ?? `HTTP ${res.statusCode}` });
              }
            } catch {
              resolve({ success: false, error: data.slice(0, 200) || `HTTP ${res.statusCode}` });
            }
          });
        },
      );
      req.on('error', (e) => resolve({ success: false, error: e.message }));
      req.write(body);
      req.end();
    } catch (e) {
      resolve({ success: false, error: e instanceof Error ? e.message : 'Upload failed' });
    }
  });
}
