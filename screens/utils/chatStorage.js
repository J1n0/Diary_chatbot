// screens/utils/chatStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'chat_logs_v1';

/**
 * 저장된 모든 대화 로그를 배열로 반환
 * @returns {Promise<Array>}
 */
export async function getLogs() {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

/**
 * 새 로그 엔트리를 맨 앞(unshift)으로 추가하고 저장
 * @param {Object} entry - { id, dateISO, dateLabel, device?, emotion, messages:[{role,text,time?}, ...] }
 * @returns {Promise<Array>} 저장 후 전체 로그
 */
export async function addLog(entry) {
  const logs = await getLogs();
  logs.unshift(entry); // 최신이 위로 오도록
  await AsyncStorage.setItem(KEY, JSON.stringify(logs));
  return logs;
}

/**
 * 모든 로그 삭제
 */
export async function clearLogs() {
  await AsyncStorage.removeItem(KEY);
}

/**
 * 매우 단순한 키워드 기반 한국어 감정 태깅(임시)
 * 필요 시 서버/모델 감정분석 결과로 교체하세요.
 * @param {string} text
 * @returns {'기쁨'|'분노'|'슬픔'|'긴장'|'상쾌'|'무료'|'기본'}
 */
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
