import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { google } from 'googleapis';

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });

const auth = getAuth(app);

function extractIds(inputUrl: string) {
  try {
    const u = new URL(inputUrl);
    const m = u.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const sheetId = m?.[1] || u.searchParams.get('id') || '';
    const gid = u.searchParams.get('gid') || (u.hash.match(/gid=(\d+)/)?.[1] ?? '');
    return { sheetId, gid };
  } catch {
    return { sheetId: '', gid: '' };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const authz = req.headers.authorization || '';
    const idToken = authz.startsWith('Bearer ') ? authz.slice(7) : '';
    if (!idToken) return res.status(401).json({ error: 'unauthorized' });
    await auth.verifyIdToken(idToken);

    const url = (req.query.url as string) || '';
    const range = (req.query.range as string) || '';
    if (!url) return res.status(400).json({ error: 'url required' });

    const { sheetId, gid } = extractIds(url);
    if (!sheetId) return res.status(400).json({ error: 'invalid sheet url' });

    const jwt = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      undefined,
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );
    await jwt.authorize();
    const sheets = google.sheets({ version: 'v4', auth: jwt });

    let a1Range = range;
    if (!a1Range) {
      if (gid) {
        const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const sheet = meta.data.sheets?.find(s => s.properties?.sheetId === Number(gid));
        const title = sheet?.properties?.title || 'Sheet1';
        a1Range = `${title}!A:Z`;
      } else {
        a1Range = 'Sheet1!A:Z';
      }
    }

    const resp = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: a1Range });
    const values = resp.data.values || [];
    if (values.length === 0) return res.status(200).json([]);

    const headers = values[0];
    const rows = values.slice(1).map(r => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').toString()])));

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json(rows);
  } catch (e) {
    res.status(500).json({ error: 'internal_error' });
  }
}


