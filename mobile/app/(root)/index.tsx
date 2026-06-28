import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useUser } from '@clerk/expo';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';
import SignOutButton from '../../components/SignOutButton';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles as homeStyles } from '../../assets/styles/home.styles';

interface Transaction {
  id: number;
  user_id: string;
  title: string;
  amount: string; // Postgres DECIMAL returns as string
  category: string;
  created_at: string;
}

interface Summary {
  income: number;
  expenses: number;
  balance: number;
}

export default function Index() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // State Management
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({
    income: 0,
    expenses: 0,
    balance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 1. 거래 내역 목록 가져오기
  const fetchTransactions = useCallback(async () => {
    if (!user?.id) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${API_ENDPOINTS.transactions}/${user.id}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error('거래 내역 조회 실패');
      }
      const data = await response.json();
      setTransactions(data);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('fetchTransactions 에러:', error);
      if (error.name === 'AbortError') {
        console.warn('⚠️ fetchTransactions 요청 타임아웃 발생');
      }
    }
  }, [user?.id]);

  // 2. 거래 요약 정보 가져오기
  const fetchSummary = useCallback(async () => {
    if (!user?.id) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(
        `${API_ENDPOINTS.transactions}/summary/${user.id}`,
        {
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error('요약 정보 조회 실패');
      }
      const data = await response.json();
      setSummary(data);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('fetchSummary 에러:', error);
      if (error.name === 'AbortError') {
        console.warn('⚠️ fetchSummary 요청 타임아웃 발생');
      }
    }
  }, [user?.id]);

  // 3. 전체 데이터 로딩 및 동기화
  const loadData = useCallback(
    async (showIndicator = true) => {
      if (showIndicator) setLoading(true);
      await Promise.all([fetchTransactions(), fetchSummary()]);
      setLoading(false);
    },
    [fetchTransactions, fetchSummary],
  );

  // 당겨서 새로고침
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchTransactions(), fetchSummary()]);
    setRefreshing(false);
  }, [fetchTransactions, fetchSummary]);

  // 화면 포커스가 잡힐 때마다 최신 데이터 로드
  useFocusEffect(
    useCallback(() => {
      if (isUserLoaded && user?.id) {
        // 첫 진입 시(loading이 true일 때)에만 로딩 바를 보여주고,
        // 그 이후 화면 갱신 시에는 백그라운드에서 로딩 바 노출 없이 갱신하도록 처리
        loadData(loading);
      }
    }, [isUserLoaded, user?.id, loadData, loading]),
  );

  // 5. 거래 내역 삭제
  const handleDeleteTransaction = (id: number) => {
    Alert.alert(
      '거래 내역 삭제',
      '이 거래 내역을 영구적으로 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_ENDPOINTS.transactions}/${id}`,
                {
                  method: 'DELETE',
                },
              );
              if (!response.ok) {
                throw new Error('거래 내역 삭제 실패');
              }
              Alert.alert('삭제 완료', '내역이 성공적으로 삭제되었습니다.');
              loadData(false);
            } catch (error) {
              console.error(error);
              Alert.alert('삭제 오류', '내역을 삭제하지 못했습니다.');
            }
          },
        },
      ],
    );
  };

  // 금액 포맷팅 (원화)
  const formatCurrency = (val: number | string) => {
    const numeric = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(numeric)) return '₩0';
    const formatted = Math.abs(numeric).toLocaleString();
    return numeric < 0 ? `-₩${formatted}` : `₩${formatted}`;
  };

  // 날짜 형식 가공
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  // 로딩 인디케이터
  if (!isUserLoaded || !user?.id || loading) {
    return (
      <View style={homeStyles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        style={homeStyles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        <View style={[homeStyles.content, { paddingBottom: 20 }]}>
          {/* Header Profile */}
          <View style={homeStyles.header}>
            <View style={homeStyles.headerLeft}>
              {user?.imageUrl ? (
                <Image
                  source={{ uri: user.imageUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View
                  style={[
                    styles.avatarFallback,
                    { backgroundColor: COLORS.primary + '20' },
                  ]}
                >
                  <Ionicons name="person" size={24} color={COLORS.primary} />
                </View>
              )}
              <View style={styles.profileTextContainer}>
                <Text
                  style={[homeStyles.welcomeText, { color: COLORS.textLight }]}
                >
                  Nice to meet you
                </Text>
                <Text style={[homeStyles.usernameText, { color: COLORS.text }]}>
                  {user?.username ||
                    user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
                    'User'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => loadData(false)}
            >
              <Ionicons name="sync-outline" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Wallet Balance Card */}
          <View
            style={[
              homeStyles.balanceCard,
              { backgroundColor: COLORS.primary },
            ]}
          >
            <View style={styles.balanceHeader}>
              <Text
                style={[
                  homeStyles.balanceTitle,
                  { color: COLORS.white + 'B0' },
                ]}
              >
                My Total Assets
              </Text>
              <TouchableOpacity onPress={() => router.push('/create')}>
                <View style={styles.addTxButtonBadge}>
                  <Ionicons name="add-circle" size={20} color={COLORS.white} />
                  <Text style={styles.addTxButtonBadgeText}>
                    Add Transaction
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <Text style={[homeStyles.balanceAmount, { color: COLORS.white }]}>
              {formatCurrency(summary.balance)}
            </Text>

            {/* StatsRow */}
            <View style={styles.statsRow}>
              <View style={homeStyles.balanceStatItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons
                    name="arrow-up-outline"
                    size={16}
                    color={COLORS.white}
                  />
                </View>
                <View style={{ marginTop: 10 }}>
                  <Text
                    style={[
                      homeStyles.balanceStatLabel,
                      { color: COLORS.white + '90 ' },
                    ]}
                  >
                    Total income
                  </Text>
                  <Text
                    style={[
                      homeStyles.balanceStatAmount,
                      { color: COLORS.white },
                    ]}
                  >
                    {formatCurrency(summary.income)}
                  </Text>
                </View>
              </View>

              <View style={homeStyles.balanceStatItem}>
                <View style={styles.statIconContainer}>
                  <Ionicons
                    name="arrow-down-outline"
                    size={16}
                    color={COLORS.white}
                  />
                </View>
                <View style={{ marginTop: 10 }}>
                  <Text
                    style={[
                      homeStyles.balanceStatLabel,
                      { color: COLORS.white + '90' },
                    ]}
                  >
                    Total expenses
                  </Text>
                  <Text
                    style={[
                      homeStyles.balanceStatAmount,
                      { color: COLORS.white },
                    ]}
                  >
                    {formatCurrency(-summary.expenses)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Transactions Header */}
          <View style={homeStyles.transactionsHeaderContainer}>
            <Text style={homeStyles.sectionTitle}>
              Total Transactions ({transactions.length})
            </Text>
            <TouchableOpacity onPress={() => router.push('/create')}>
              <Text style={[styles.seeAllText, { color: COLORS.primary }]}>
                + Add Transaction
              </Text>
            </TouchableOpacity>
          </View>

          {/* Transactions List */}
          {transactions.length === 0 ? (
            <View style={homeStyles.emptyState}>
              <Ionicons
                name="receipt-outline"
                size={48}
                color={COLORS.textLight + '60'}
              />
              <Text style={homeStyles.emptyStateText}>
                No transactions yet.
              </Text>
              <TouchableOpacity
                style={homeStyles.emptyStateButton}
                onPress={() => router.push('/create')}
              >
                <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>
                  First Transaction
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[homeStyles.transactionsList, { marginHorizontal: 0 }]}
            >
              {transactions.map((tx) => {
                const numericAmount = parseFloat(tx.amount);
                const isIncome = numericAmount > 0;
                return (
                  <View key={tx.id} style={homeStyles.transactionCard}>
                    <View style={homeStyles.transactionContent}>
                      <View
                        style={[
                          homeStyles.categoryIconContainer,
                          {
                            backgroundColor: isIncome
                              ? COLORS.income + '15'
                              : COLORS.expense + '15',
                          },
                        ]}
                      >
                        <Ionicons
                          name={isIncome ? 'arrow-up' : 'arrow-down'}
                          size={18}
                          color={isIncome ? COLORS.income : COLORS.expense}
                        />
                      </View>
                      <View style={homeStyles.transactionLeft}>
                        <Text style={homeStyles.transactionTitle}>
                          {tx.title}
                        </Text>
                        <Text style={homeStyles.transactionCategory}>
                          {tx.category} • {formatDate(tx.created_at)}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        homeStyles.transactionRight,
                        { flexDirection: 'row', alignItems: 'center' },
                      ]}
                    >
                      <Text
                        style={[
                          homeStyles.transactionAmount,
                          {
                            color: isIncome ? COLORS.income : COLORS.expense,
                            marginRight: 8,
                            marginBottom: 0,
                          },
                        ]}
                      >
                        {formatCurrency(tx.amount)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteTransaction(tx.id)}
                        style={homeStyles.deleteButton}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color={COLORS.expense + 'CC'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sign Out Section (화면 최하단 고정) */}
      <View
        style={[
          styles.signOutSection,
          {
            padding: 16,
            paddingBottom: Math.max(insets.bottom, 16),
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            backgroundColor: COLORS.background,
          },
        ]}
      >
        <SignOutButton style={styles.signOutButton} textStyle={undefined} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileTextContainer: {
    justifyContent: 'center',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addTxButtonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  addTxButtonBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 18,
    marginLeft: -14,
    marginRight: -14,
  },
  statIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  signOutSection: {
    marginTop: 8,
  },
  signOutButton: {
    width: '100%',
  },
  txLeft: {
    flex: 1,
  },
});
