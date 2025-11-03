// MainScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet, 
} from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaView as SAView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';

// ▼ 로그 스토리지 (일기별)
import {
  getLogs,
  getLogById,
  appendMessages,
  createLog,
  detectEmotionKorean,
} from './utils/fileLogStorage';

// ======================= 서버 주소 헬퍼 + API 래퍼 =======================

function resolveApiBase() {
  const fromEnv =
    process.env.EXPO_PUBLIC_API_BASE ||
    Constants?.expoConfig?.extra?.apiBase ||
    Constants?.manifest2?.extra?.expoClient?.extra?.apiBase ||
    Constants?.manifest?.extra?.apiBase;

  if (fromEnv) return String(fromEnv).replace(/\/$/, '');

  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoClient?.hostUri ||
    Constants?.manifest?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:4000`;
  }

  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  return 'http://localhost:4000';
}

async function chatWithLLM(message) {
  const base = resolveApiBase();
  const url = `${base}/api/chat`;
  const res = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  let data = null; try { data = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (data && typeof data.response === 'string') return data.response;
  return '응답을 이해하지 못했어요.';
}

// ======================= 안내문 생성 헬퍼 =======================

async function buildIntroMessage() {
  const logs = await getLogs();
  if (!logs.length) {
    return '새 일기를 시작했어요. 오늘의 전반적인 기분을 한 문장으로 적어볼까요?';
  }
  const now = new Date();
  const monthAgo = new Date(); monthAgo.setMonth(now.getMonth() - 1);
  const recent = logs.filter(l => new Date(l.dateISO) >= monthAgo);

  if (!recent.length) {
    return '최근 한 달 기록이 없어요. 오늘의 전반적인 감정 상태를 간단히 알려주세요 :)';
  }

  const EMOTIONS = ['기쁨','상쾌','긴장','무료','슬픔','분노','기본'];
  const cnt = Object.fromEntries(EMOTIONS.map(e => [e, 0]));
  for (const l of recent) cnt[l.emotion] = (cnt[l.emotion] || 0) + 1;

  const top = EMOTIONS.reduce((a,b)=>(cnt[b]>(cnt[a]||0)?b:a),'기본');
  const total = recent.length;
  const topCount = cnt[top] || 0;

  return `최근 한 달 동안 가장 자주 기록된 감정은 ‘${top}’(${topCount}/${total})였어요. 오늘은 지금 기분을 한 문장으로 적어볼까요?`;
}

// ============================= 화면 컴포넌트 =============================

export default function MainScreen({ route, navigation }) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentLogId, setCurrentLogId] = useState(route.params?.logId || null);

  const listRef = useRef(null);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [inputBarH, setInputBarH] = useState(56);

  // ▶ 진입/변경 시: logId 기준으로 해당 일기 대화 복원 (빈 일기면 안내문 주입)
  useEffect(() => {
    (async () => {
      let id = route.params?.logId || currentLogId;
      if (!id) {
        const intro = await buildIntroMessage();
        const t = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        id = await createLog({
          emotion: '기본',
          messages: [{ role: 'assistant', text: intro, time: t }],
        });
        setCurrentLogId(id);
        navigation.setParams({ logId: id });
      } else {
        setCurrentLogId(id);
      }

      const log = await getLogById(id);
      if (log) {
        // 비어 있으면 안내문 주입
        if (!log.messages?.length) {
          const intro = await buildIntroMessage();
          const t = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
          await appendMessages(id, [{ role: 'assistant', text: intro, time: t }]);
          log.messages = [{ role: 'assistant', text: intro, time: t }];
        }
        const restored = log.messages.map((m, i) => ({
          id: i + 1,
          type: m.role === 'user' ? 'user' : 'system',
          text: m.text,
          time: m.time || '',
        }));
        setMessages(restored);
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.logId]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const handleSend = useCallback(async () => {
    const userText = input.trim();
    if (!userText || sending || !currentLogId) return;

    setSending(true);

    const userMsg = {
      id: Date.now(),
      type: 'user',
      text: userText,
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    scrollToEnd();

    try {
      const reply = await chatWithLLM(userText);
      const aiMsg = {
        id: Date.now() + 1,
        type: 'system',
        text: String(reply),
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
      scrollToEnd();

      // 🔸 현재 일기에 메시지 append (일기별 저장)
      const emotion = detectEmotionKorean(`${userText} ${reply}`);
      await appendMessages(currentLogId, [
        { role: 'user', text: userText, time: userMsg.time },
        { role: 'assistant', text: reply, time: aiMsg.time },
      ], { updateEmotion: emotion });

    } catch (err) {
      const errMsg = {
        id: Date.now() + 2,
        type: 'system',
        text:
          '서버 연결에 문제가 있어요. 같은 네트워크인지, 방화벽/포트(4000) 허용인지 확인해 주세요.\n' +
          `(${err?.message ?? '알 수 없는 오류'})`,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errMsg]);
      scrollToEnd();
    } finally {
      setSending(false);
    }
  }, [input, sending, currentLogId, scrollToEnd]);

  const renderItem = useCallback(({ item }) => {
    const isUser = item.type === 'user';
    return (
      <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleSystem]}>
          <Text style={[styles.msgText, isUser ? styles.msgUser : styles.msgSystem]}>{item.text}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
      </View>
    );
  }, []);

  const keyExtractor = useCallback(item => String(item.id), []);
  const disabled = useMemo(() => sending || !input.trim(), [sending, input]);

  return (
    <SAView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.container} behavior="padding" keyboardVerticalOffset={headerHeight}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: inputBarH + 12 }]}
          onContentSizeChange={scrollToEnd}
          keyboardShouldPersistTaps="handled"
        />

        <View
          style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}
          onLayout={(e) => setInputBarH(e.nativeEvent.layout.height)}
        >
          <TextInput
            style={styles.input}
            placeholder="메시지를 입력하세요…"
            placeholderTextColor="#9aa6b2"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, disabled && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={disabled}
          >
            <Text style={styles.sendText}>{sending ? '전송중…' : '전송'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SAView>
  );
}

// ===================== Styles =====================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#101216' },
  container: { flex: 1 },
  listContent: { padding: 12, paddingTop: 8 },
  row: { flexDirection: 'row', marginVertical: 6 },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 },
  bubbleUser: { backgroundColor: '#2f6fed' },
  bubbleSystem: { backgroundColor: '#1c1f26', borderWidth: 1, borderColor: '#2a2f3a' },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgUser: { color: '#fff' },
  msgSystem: { color: '#e7eaf0' },
  time: { marginTop: 6, fontSize: 10, color: '#a3adbe', textAlign: 'right' },
  inputBar: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingTop: 10,
    backgroundColor: '#0c0e12',
    borderTopWidth: 1,
    borderTopColor: '#1a1f28',
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#161a22',
    color: '#e7eaf0',
    borderWidth: 1,
    borderColor: '#242a35',
  },
  sendBtn: {
    marginLeft: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2f6fed',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '600' },
});
