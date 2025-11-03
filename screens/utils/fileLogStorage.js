// screens/utils/fileLogStorage.js  (추가/개선 버전)
import * as FileSystem from 'expo-file-system/legacy';

let BASE_DIR = FileSystem.documentDirectory + 'logs/';
let FILE_NAME = 'chat_logs.json';

function filePath() { return BASE_DIR + FILE_NAME; }

async function ensureFileReady() {
  const dirInfo = await FileSystem.getInfoAsync(BASE_DIR);
  if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(BASE_DIR, { intermediates: true });
  const fileInfo = await FileSystem.getInfoAsync(filePath());
  if (!fileInfo.exists) await FileSystem.writeAsStringAsync(filePath(), '[]', { encoding: FileSystem.EncodingType.UTF8 });
}

export async function configureStorage({ directory, filename } = {}) {
  if (directory) BASE_DIR = directory.endsWith('/') ? directory : directory + '/';
  if (filename) FILE_NAME = filename;
  await ensureFileReady();
}

export async function getLogs() {
  await ensureFileReady();
  const raw = await FileSystem.readAsStringAsync(filePath(), { encoding: FileSystem.EncodingType.UTF8 });
  try { return JSON.parse(raw) || []; }
  catch { await FileSystem.writeAsStringAsync(filePath(), '[]', { encoding: FileSystem.EncodingType.UTF8 }); return []; }
}

async function saveLogs(logs) {
  await FileSystem.writeAsStringAsync(filePath(), JSON.stringify(logs, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
  return logs;
}

/** 새 일기(로그) 생성 → id 반환 */
export async function createLog({ title, emotion = '기본', messages = [] } = {}) {
  const logs = await getLogs();
  const now = new Date();
  const entry = {
    id: `${now.getTime()}`,
    dateISO: now.toISOString(),
    dateLabel: now.toLocaleDateString('ko-KR'),
    title: title || '',       // 제목(선택)
    emotion,
    messages,                 // [{role:'user'|'assistant', text, time?}]
  };
  logs.unshift(entry);
  await saveLogs(logs);
  return entry.id;
}

/** 특정 일기 조회 */
export async function getLogById(id) {
  const logs = await getLogs();
  return logs.find(l => l.id === id) || null;
}

/** 특정 일기의 메시지 뒤에 추가(append) */
export async function appendMessages(id, newMessages = [], { updateEmotion } = {}) {
  const logs = await getLogs();
  const idx = logs.findIndex(l => l.id === id);
  if (idx === -1) return false;
  logs[idx].messages = [...logs[idx].messages, ...newMessages];
  if (updateEmotion) logs[idx].emotion = updateEmotion;
  // 최신 정렬 유지: 수정된 항목을 맨 앞으로 이동
  const [updated] = logs.splice(idx, 1);
  logs.unshift(updated);
  await saveLogs(logs);
  return true;
}

/** 메타데이터(제목/감정 등) 갱신 */
export async function updateLogMeta(id, patch = {}) {
  const logs = await getLogs();
  const idx = logs.findIndex(l => l.id === id);
  if (idx === -1) return false;
  logs[idx] = { ...logs[idx], ...patch };
  // 최근 사용으로 맨 앞으로
  const [updated] = logs.splice(idx, 1);
  logs.unshift(updated);
  await saveLogs(logs);
  return true;
}

/** 전체 삭제 */
export async function clearLogs() {
  await ensureFileReady();
  await FileSystem.writeAsStringAsync(filePath(), '[]', { encoding: FileSystem.EncodingType.UTF8 });
}

/** (그대로) 간단 감정 태깅 */
export function detectEmotionKorean(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('행복') || t.includes('좋') || t.includes('기뻐') || t.includes('감사')) return '기쁨';
  if (t.includes('화나') || t.includes('짜증') || t.includes('분노')) return '분노';
  if (t.includes('슬프') || t.includes('눈물') || t.includes('우울')) return '슬픔';
  if (t.includes('긴장') || t.includes('불안') || t.includes('걱정')) return '긴장';
  if (t.includes('상쾌') || t.includes('개운')) return '상쾌';
  if (t.includes('무료') || t.includes('심심')) return '무료';
  return '기본';
}
