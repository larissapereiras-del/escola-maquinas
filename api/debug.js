// api/debug.js — mostra o conteúdo bruto da planilha
import { google } from 'googleapis';

const PLANILHA_ID = '1lk0bzP9ZHLAPJlG-8BrjumD6t-lqcoHeiMhakCm0zRs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Lê as primeiras 5 linhas da aba Agendamentos
    const r1 = await sheets.spreadsheets.values.get({
      spreadsheetId: PLANILHA_ID,
      range: 'Agendamentos!A1:K6',
      valueRenderOption: 'FORMATTED_VALUE',
    });

    // Lê as primeiras 5 linhas da aba Ocupados
    const r2 = await sheets.spreadsheets.values.get({
      spreadsheetId: PLANILHA_ID,
      range: 'Ocupados!A1:C6',
      valueRenderOption: 'FORMATTED_VALUE',
    });

    return res.status(200).json({
      agendamentos_primeiras_linhas: r1.data.values || [],
      ocupados_primeiras_linhas: r2.data.values || [],
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
