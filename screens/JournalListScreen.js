// JournalListScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getLogs, createLog } from './utils/fileLogStorage';

const emotionIcon = (e) => {
  switch (e) {
    case '기쁨': return 'smile';
    case '슬픔': return 'frown';
    case '분노': return 'meh';
    case '상쾌': return 'sun';
    case '무료': return 'coffee';
    case '긴장': return 'alert-triangle';
    default: return 'circle';
  }
};

// 안내문 생성 헬퍼 (MainScreen과 동일)
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

export default function JournalListScreen({ navigation }) {
  const [journals, setJournals] = useState([]);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

  const load = async () => {
    const logs = await getLogs();
    const mapped = logs.map(log => {
      const userMsg = log.messages.find(m => m.role === 'user')?.text || '';
      const aiMsg = log.messages.find(m => m.role === 'assistant')?.text || '';
      return {
        id: log.id,
        date: (log.dateLabel || '').replaceAll('/', '.'),
        title: userMsg.slice(0, 18) || '새로운 일기',
        emotion: log.emotion || '기본',
        preview: aiMsg.length > 38 ? aiMsg.slice(0, 38) + '…' : aiMsg,
        time: log.messages[0]?.time || '',
      };
    });
    setJournals(mapped);
  };

  useEffect(() => { load(); }, []);

  // 🔹 새 일기 생성 → 생성된 id로 MainScreen 이동(해당 일기 이어쓰기 시작)
  const createNewJournal = async () => {
    const now = new Date();
    const intro = await buildIntroMessage();
    const newId = await createLog({
      emotion: '기본',
      messages: [
        {
          role: 'assistant',
          text: intro,
          time: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    });
    await load();
    navigation.navigate('Main', { logId: newId });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('Main', { logId: item.id })}
    >
      <View style={[styles.emoticon, { backgroundColor: '#F4F6FA' }]}>
        <Icon name={emotionIcon(item.emotion)} size={18} color="#6B7280" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
          <Text style={styles.dateText}>{item.date} 일기</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.preview}>{item.preview}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{item.emotion}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#0B1220' }}>
      {/* Top bar */}
      <View style={styles.top}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Icon name="menu" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>일기 목록</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>일기 저널</Text>

        <Text style={styles.hint}>이전 일기 옵션은 날짜 선택(YYYY/MM/DD 옵션으로 검색)</Text>

        <TouchableOpacity onPress={() => setShowPicker(true)} activeOpacity={0.8}>
          <View style={styles.dateInputWrap}>
            <Text style={styles.dateTextInput}>{dateStr}</Text>
            <Icon name="calendar" size={18} color="#6B7280" />
          </View>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            onChange={(e, selected) => { setShowPicker(false); if (selected) setDate(selected); }}
          />
        )}

        <View style={styles.notice}>
          <Text style={styles.noticeText}>클릭 시 자동 일일 날짜 입력 저장 생성 새로운 저널 생성</Text>
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={createNewJournal}>
          <Icon name="plus" size={18} color="#1E5EFF" />
          <Text style={styles.createBtnText}>새 일기 작성하기</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>작품 일기 저널 리스트 표시</Text>

        <FlatList
          data={journals}
          keyExtractor={(it) => it.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  body: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  hint: { fontSize: 12, color: '#6B7280', marginTop: 8 },
  dateInputWrap: { height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateTextInput: { fontSize: 16, color: '#111827' },
  notice: { backgroundColor: '#FFF7E6', padding: 10, borderRadius: 10, marginTop: 12 },
  noticeText: { fontSize: 12, color: '#9A7B38' },
  createBtn: { height: 56, borderRadius: 14, borderWidth: 1, borderColor: '#CFE0FF', backgroundColor: '#F3F7FF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 12 },
  createBtnText: { fontSize: 16, color: '#1E5EFF', fontWeight: '700', marginLeft: 6 },
  card: { flexDirection: 'row', padding: 14, backgroundColor: '#fff', borderRadius: 16, marginTop: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  emoticon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dateText: { fontSize: 12, color: '#6B7280' },
  title: { fontSize: 16, color: '#111827', fontWeight: '700', marginTop: 2 },
  preview: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  time: { fontSize: 11, color: '#9AA0A6', marginTop: 8 },
  badge: { backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, alignSelf: 'flex-start', marginLeft: 8 },
  badgeText: { fontSize: 12, color: '#1E40AF', fontWeight: '700' },
});
