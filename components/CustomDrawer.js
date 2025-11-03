// CustomDrawer.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const MenuCard = ({ icon, color, title, desc, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.iconWrap,{backgroundColor: `${color}15`}]}>
      <Icon name={icon} size={22} color={color}/>
    </View>
    <View style={styles.cardTextWrap}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{desc}</Text>
    </View>
    <Icon name="chevron-right" size={22} color="#C7CAD1"/>
  </TouchableOpacity>
);

export default function CustomDrawer({ navigation }) {
  return (
    <View style={{flex:1, backgroundColor:'#fff'}}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}/>
        <View style={{marginLeft:12}}>
          <Text style={styles.userName}>USER 님</Text>
          <Text style={styles.userRole}>감정 일기 작성자</Text>
        </View>
        <TouchableOpacity onPress={()=>navigation.closeDrawer()} style={{marginLeft:'auto'}}>
          <Icon name="x" size={22} color="#9AA0A6"/>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{paddingHorizontal:16, paddingBottom:24}}>
        <Text style={styles.sectionTitle}>메뉴</Text>

        <MenuCard
          icon="home" color="#3B82F6"
          title="메인 홈" desc="오늘의 기분을 기록해보세요"
          onPress={()=>navigation.navigate('Main')}
        />
        <MenuCard
          icon="book-open" color="#2563EB"
          title="일기 목록" desc="지난 일기들을 확인해보세요"
          onPress={()=>navigation.navigate('JournalList')}
        />
        <MenuCard
          icon="user" color="#1D4ED8"
          title="마이 페이지" desc="감정 분석 결과를 확인하세요"
          onPress={()=>navigation.navigate('MyPage')}
        />

        <View style={styles.divider}/>

        <MenuCard
          icon="settings" color="#94A3B8"
          title="설정" desc="앱 설정 및 환경설정"
          onPress={()=>navigation.navigate('Settings')}
        />
        <MenuCard
          icon="help-circle" color="#94A3B8"
          title="도움말" desc="사용법 및 FAQ"
          onPress={()=>navigation.navigate('Help')}
        />
        <MenuCard
          icon="info" color="#94A3B8"
          title="앱 정보" desc="버전 1.0.0"
          onPress={()=>navigation.navigate('About')}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>감정 일기와 함께하는 마음 건강 케어</Text>
        <Text style={styles.version}>v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header:{ flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:1, borderColor:'#F1F3F5'},
  avatar:{ width:44, height:44, borderRadius:22, backgroundColor:'#E9EEF6' },
  userName:{ fontSize:18, fontWeight:'700', color:'#111827' },
  userRole:{ fontSize:12, color:'#6B7280', marginTop:2 },
  sectionTitle:{ fontWeight:'700', color:'#111827', marginVertical:12 },
  card:{ flexDirection:'row', alignItems:'center', backgroundColor:'#fff', borderRadius:16, padding:14, marginBottom:12, elevation:2, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:8, shadowOffset:{width:0,height:2}},
  iconWrap:{ width:40, height:40, borderRadius:12, alignItems:'center', justifyContent:'center' },
  cardTextWrap:{ flex:1, marginHorizontal:12 },
  cardTitle:{ fontSize:16, fontWeight:'700', color:'#111827' },
  cardDesc:{ fontSize:12, color:'#6B7280', marginTop:2 },
  divider:{ height:1, backgroundColor:'#F1F3F5', marginVertical:12 },
  footer:{ alignItems:'center', paddingVertical:12, borderTopWidth:1, borderColor:'#F1F3F5'},
  footerText:{ fontSize:12, color:'#6B7280' },
  version:{ fontSize:11, color:'#9AA0A6', marginTop:4 }
});
