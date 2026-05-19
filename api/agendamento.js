// api/agendamento.js — salva agendamento na planilha
import { google } from 'googleapis';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

const PLANILHA_ID = '1lk0bzP9ZHLAPJlG-8BrjumD6t-lqcoHeiMhakCm0zRs';

const MAPA = {
  'Transpaleteira':'Transpaleteira',
  'Selecionadora sem VNA':'Selecionadora sem VNA',
  'Selecionadora com VNA':'Selecionadora com VNA',
  'Patolada / Apilador':'Patolada / Apilador',
  'Patolada':'Patolada / Apilador',
  'Rebocadora / Tugger':'Rebocadora / Tugger',
  'Rebocadora':'Rebocadora / Tugger',
  'Embarcada':'Embarcada',
  'Validacao de Empilhadeira':'Validacao de Empilhadeira',
  'Validação de Empilhadeira':'Validacao de Empilhadeira',
  'Novo Treinamento NR11+NR12 (2h) - Maquinas de Chao':'Novo Treinamento NR11+NR12 (2h) - Maquinas de Chao',
  'Novo Treinamento NR11+NR12 (2h) - Maquinas de Chao - Online':'Novo Treinamento NR11+NR12 (2h) - Maquinas de Chao - Online',
  'Novo Treinamento NR11+NR12+NR35 (4h) - Maquinas de Altura':'Novo Treinamento NR11+NR12+NR35 (4h) - Maquinas de Altura',
  'Novo Treinamento NR11+NR12+NR35 (4h) - Maquinas de Altura - Online':'Novo Treinamento NR11+NR12+NR35 (4h) - Maquinas de Altura - Online',
  'Reciclagem NR Vencidas NR11+NR12+NR35 (2h)':'Reciclagem NR Vencidas NR11+NR12+NR35 (2h)',
  'Reciclagem NR Vencidas NR11+NR12+NR35 (2h) - Online':'Reciclagem NR Vencidas NR11+NR12+NR35 (2h) - Online',
  'Formacao de Multiplicador - Escola de Maquinas':'Formacao de Multiplicador - Escola de Maquinas',
};

function norm(n) { return MAPA[String(n||'').trim()] || String(n||'').trim(); }

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
    const treinoNorm = norm(dados.treino || '');

    await sheets.spreadsheets.values.append({
      spreadsheetId: PLANILHA_ID,
      range: 'Agendamentos!A4',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          'PENDENTE',
          treinoNorm,
          dados.nome      || '',
          dados.galpao    || '',
          dados.wpp       || '',
          dados.qtd       || '1',
          dados.data      || '',
          dados.obs       || '',
          dados.timestamp || timestamp,
          dados.turno     || '',
          dados.email     || '',
        ]]
      }
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erro agendamento:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
