// MyPageScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getLogs } from './utils/fileLogStorage';

const screenWidth = Dimensions.get('window').width;

export default function MyPageScreen({ navigation }) {
  const [emotionData, setEmotionData] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    (async ()=>{
      const logs = await getLogs();
      const now = new Date();
      const monthAgo = new Date(); monthAgo.setMonth(now.getMonth()-1);
      const recent = logs.filter(l => new Date(l.dateISO) >= monthAgo);

      const EMOTIONS = ['기쁨','분노','슬픔','무료','상쾌','긴장','기본'];
      const counts = Object.fromEntries(EMOTIONS.map(e=>[e,0]));
      recent.forEach(l => counts[l.emotion] = (counts[l.emotion]||0)+1);

      const labels = EMOTIONS;
      const data = labels.map(l => counts[l]||0);
      setEmotionData({
        labels,
        datasets: [{ data, strokeWidth: 3 }]
      });

      const total = recent.length;
      const frequent = labels.reduce((a,b)=>counts[b]>(counts[a]||0)?b:a,'기본');

      // 간단한 평균 기분 점수(기쁨10, 상쾌9, 무료5, 슬픔3, 분노2, 긴장4, 기본5)
      const scoreMap = {기쁨:10, 상쾌:9, 무료:5, 슬픔:3, 분노:2, 긴장:4, 기본:5};
      const avg = total ? (recent.reduce((s,l)=>s+(scoreMap[l.emotion]||5),0)/total).toFixed(1) : '-';

      const msWeek = 7*24*3600*1000;
      const w1 = recent.filter(l => (now - new Date(l.dateISO)) <= msWeek).length;
      const w2 = recent.filter(l => {
        const d = now - new Date(l.dateISO);
        return d>msWeek && d<=2*msWeek;
      }).length;
      const improve = (w1===0&&w2===0)?'0%':(((w1-w2)/Math.max(w2,1))*100).toFixed(0)+'%';

      setSummary({ total, avg, frequent, improve });
    })();
  },[]);

  return (
    <View style={{flex:1, backgroundColor:'#0B1220'}}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>마이페이지</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{paddingBottom:24}}>
        {/* 프로필 */}
        <View style={styles.profile}>
          <View style={styles.avatar}/>
          <Text style={styles.userName}>USER 님</Text>
          <View style={styles.badgeWrap}>
            <Text style={styles.badge}>최근 한달간의 감정 분류표 표시</Text>
          </View>
        </View>

        {/* 요약 카드 4개 */}
        {summary && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{summary.total}</Text>
              <Text style={styles.statLabel}>일기 작성</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{summary.avg}/10</Text>
              <Text style={styles.statLabel}>평균 기분</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{summary.frequent}</Text>
              <Text style={styles.statLabel}>주요 감정</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber,{color:'#16A34A'}]}>{summary.improve}</Text>
              <Text style={styles.statLabel}>개선도</Text>
            </View>
          </View>
        )}

        {/* 감정 분포도 */}
        <Text style={styles.blockTitle}>최근 감정 분포도</Text>
        {emotionData && (
          <LineChart
            data={emotionData}
            width={screenWidth-32}
            height={240}
            chartConfig={{
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: () => `rgba(30, 94, 255, 1)`,
              labelColor: () => '#6B7280',
              propsForDots:{ r:'4' },
              propsForBackgroundLines:{ stroke:'#E5E7EB' }
            }}
            style={{borderRadius:16}}
            bezier
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar:{ height:56, alignItems:'center', justifyContent:'center' },
  topTitle:{ color:'#fff', fontSize:18, fontWeight:'700' },
  body:{ flex:1, backgroundColor:'#fff', borderTopLeftRadius:20, borderTopRightRadius:20, paddingHorizontal:16 },
  profile:{ alignItems:'center', paddingVertical:18 },
  avatar:{ width:70, height:70, borderRadius:35, backgroundColor:'#E9EEF6' },
  userName:{ marginTop:10, fontSize:18, fontWeight:'700', color:'#111827' },
  badgeWrap:{ marginTop:8, backgroundColor:'#FFF7E6', paddingHorizontal:12, paddingVertical:6, borderRadius:999 },
  badge:{ color:'#9A7B38', fontSize:12, fontWeight:'700' },
  statsRow:{ flexDirection:'row', justifyContent:'space-between', marginTop:12 },
  statCard:{ width:(screenWidth-32-18)/4, backgroundColor:'#fff', borderWidth:1, borderColor:'#EEF2F7', borderRadius:14, paddingVertical:12, alignItems:'center' },
  statNumber:{ fontSize:18, fontWeight:'800', color:'#111827' },
  statLabel:{ fontSize:11, color:'#6B7280', marginTop:4 },
  blockTitle:{ fontSize:16, fontWeight:'700', color:'#111827', marginTop:16, marginBottom:8 },
});
