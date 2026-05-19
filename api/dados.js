// api/dados.js — lê Agendamentos e Ocupados via Google Sheets API v4
import { google } from 'googleapis';

const PLANILHA_ID    = '1lk0bzP9ZHLAPJlG-8BrjumD6t-lqcoHeiMhakCm0zRs';
const MAX_VAGAS      = 10;
const BLOQUEAR_TODOS = 'TODOS';

function formatarData(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (!s) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const num = parseFloat(s);
  if (!isNaN(num) && num > 40000) {
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    const dd = String(d.getUTCDate()).padStart(2,'0');
    const mm = String(d.getUTCMonth()+1).padStart(2,'0');
    return `${dd}/${mm}/${d.getUTCFullYear()}`;
  }
  return s;
}

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

function addOcup(ocupados, key, data) {
  if (!ocupados[key]) ocupados[key] = [];
  if (!ocupados[key].includes(data)) ocupados[key].push(data);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const ocupados = {};
    const vagas    = {};

    // Lê os dados diretamente pelo range
    const getRange = async (range) => {
      const r = await sheets.spreadsheets.values.get({
        spreadsheetId: PLANILHA_ID,
        range,
        valueRenderOption: 'FORMATTED_VALUE',
      });
      return r.data.values || [];
    };

    // Aba Ocupados — linha 2 = cabeçalho, linha 3+ = dados
    const rowsOcup = await getRange('Ocupados!A3:C200');
    for (const row of rowsOcup) {
      const treino  = String(row[0] || '').trim();
      const dataStr = formatarData(String(row[1] || '').trim());
      if (!treino || !dataStr) continue;
      if (treino === 'TREINAMENTO') continue;
      if (treino.startsWith('⬆') || treino.startsWith('💡')) continue;
      if (treino.toUpperCase().includes('COMO FUNCIONA') || treino.toUpperCase().includes('EXEMPLO')) continue;
      if (/^\d+\./.test(treino)) continue;
      if (treino.toUpperCase() === BLOQUEAR_TODOS) {
        addOcup(ocupados, 'TODOS_DIAS', dataStr);
      } else {
        addOcup(ocupados, norm(treino), dataStr);
      }
    }

    // Aba Agendamentos — linha 3 = cabeçalho, linha 4+ = dados
    // A=STATUS B=TREINAMENTO C=NOME D=CAD E=WHATSAPP F=Nº OPERADORES G=DATA SOLICITADA H=OBS I=RECEBIDO J=TURNO K=EMAIL
    const rowsAgend = await getRange('Agendamentos!A4:K500');

    for (const row of rowsAgend) {
      const status = String(row[0] || '').trim().toUpperCase();
      if (!status || status === 'CANCELADO') continue;
      const treino = norm(String(row[1] || '').trim());
      const data   = formatarData(String(row[6] || '').trim());
      const turno  = String(row[9] || '').trim().toUpperCase();
      const qtd    = parseInt(row[5] || '1') || 1;
      if (!treino || !data) continue;

      if (status === 'OCUPADO') {
        addOcup(ocupados, treino, data);
        ['T1','T2','T3'].forEach(t => { vagas[`${treino}|${data}|${t}`] = MAX_VAGAS; });
        continue;
      }

      if (['T1','T2','T3'].includes(turno)) {
        const k = `${treino}|${data}|${turno}`;
        vagas[k] = (vagas[k] || 0) + qtd;
      }
    }

    // Bloqueia dias com todos os turnos cheios
    const seen = new Set();
    for (const row of rowsAgend) {
      const status = String(row[0] || '').trim().toUpperCase();
      if (!status || status === 'CANCELADO' || status === 'OCUPADO') continue;
      const treino = norm(String(row[1] || '').trim());
      const data   = formatarData(String(row[6] || '').trim());
      if (!treino || !data) continue;
      const key = `${treino}|${data}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const t1 = vagas[`${treino}|${data}|T1`] || 0;
      const t2 = vagas[`${treino}|${data}|T2`] || 0;
      const t3 = vagas[`${treino}|${data}|T3`] || 0;
      if (t1 >= MAX_VAGAS && t2 >= MAX_VAGAS && t3 >= MAX_VAGAS) {
        addOcup(ocupados, treino, data);
      }
    }

    return res.status(200).json({ ocupados, vagas });

  } catch (err) {
    console.error('Erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
