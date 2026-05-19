// api/precadastro.js — salva pré-cadastro dos operadores
import { google } from 'googleapis';

const PLANILHA_ID = '1lk0bzP9ZHLAPJlG-8BrjumD6t-lqcoHeiMhakCm0zRs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const dados = req.body;
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const linhas = (dados.operadores || []).map(op => [
      timestamp,
      dados.treino  || '',
      dados.data    || '',
      dados.turno   || '',
      dados.cad     || '',
      dados.solNome || '',
      op.nome       || '',
      op.ldap       || '',
      op.cpf        || '',
    ]);

    if (linhas.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: PLANILHA_ID,
        range: 'Pre-Cadastro!A2',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: linhas }
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro precadastro:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
