import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { API_ENDPOINTS } from "../../constants/api";
import SignOutButton from "../../components/SignOutButton";

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

const CATEGORIES = {
  income: ["급여", "용돈", "투자", "기타"],
  expense: ["식비", "쇼핑", "교통", "문화/여가", "기타"],
};

export default function Index() {
  const { user, isLoaded: isUserLoaded } = useUser();

  // State Management
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({
    income: 0,
    expenses: 0,
    balance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("식비");
  const [submitLoading, setSubmitLoading] = useState(false);

  // 1. 거래 내역 목록 가져오기
  const fetchTransactions = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`${API_ENDPOINTS.transactions}/${user.id}`);
      if (!response.ok) {
        throw new Error("거래 내역 조회 실패");
      }
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("fetchTransactions 에러:", error);
    }
  }, [user?.id]);

  // 2. 거래 요약 정보 가져오기
  const fetchSummary = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(
        `${API_ENDPOINTS.transactions}/summary/${user.id}`,
      );
      if (!response.ok) {
        throw new Error("요약 정보 조회 실패");
      }
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error("fetchSummary 에러:", error);
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

  // 초기 데이터 로드 (user.id가 준비되었을 때)
  useEffect(() => {
    if (isUserLoaded && user?.id) {
      loadData(true);
    }
  }, [isUserLoaded, user?.id, loadData]);

  // 4. 신규 거래 등록 추가
  const handleAddTransaction = async () => {
    if (!user?.id) return;
    if (!title.trim() || !amount.trim()) {
      Alert.alert("알림", "제목과 금액을 모두 입력해 주세요.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("알림", "올바른 금액(양수)을 입력해 주세요.");
      return;
    }

    setSubmitLoading(true);
    // 지출은 음수, 수입은 양수로 가공
    const finalAmount =
      txType === "expense" ? -Math.abs(numAmount) : Math.abs(numAmount);

    try {
      const response = await fetch(API_ENDPOINTS.transactions, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          title: title.trim(),
          amount: finalAmount,
          category,
        }),
      });

      if (!response.ok) {
        throw new Error("거래 내역 등록 실패");
      }

      Alert.alert("성공", "거래 내역이 등록되었습니다.");
      setModalVisible(false);
      // 입력 폼 리셋
      setTitle("");
      setAmount("");
      setCategory(txType === "expense" ? "식비" : "급여");

      // 데이터 갱신
      loadData(false);
    } catch (error) {
      console.error(error);
      Alert.alert("등록 오류", "서버와의 통신 중 오류가 발생했습니다.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // 5. 거래 내역 삭제
  const handleDeleteTransaction = (id: number) => {
    Alert.alert(
      "거래 내역 삭제",
      "이 거래 내역을 영구적으로 삭제하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_ENDPOINTS.transactions}/${id}`,
                {
                  method: "DELETE",
                },
              );
              if (!response.ok) {
                throw new Error("거래 내역 삭제 실패");
              }
              Alert.alert("삭제 완료", "내역이 성공적으로 삭제되었습니다.");
              loadData(false);
            } catch (error) {
              console.error(error);
              Alert.alert("삭제 오류", "내역을 삭제하지 못했습니다.");
            }
          },
        },
      ],
    );
  };

  // 금액 포맷팅 (원화)
  const formatCurrency = (val: number | string) => {
    const numeric = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(numeric)) return "₩0";
    const formatted = Math.abs(numeric).toLocaleString();
    return numeric < 0 ? `-₩${formatted}` : `₩${formatted}`;
  };

  // 날짜 형식 가공
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  // 로딩 인디케이터
  if (!isUserLoaded || !user?.id || loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: COLORS.background },
        ]}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        <View style={styles.contentContainer}>
          {/* Header Profile */}
          <View style={styles.header}>
            <View style={styles.profileContainer}>
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
                    { backgroundColor: COLORS.primary + "20" },
                  ]}
                >
                  <Ionicons name="person" size={24} color={COLORS.primary} />
                </View>
              )}
              <View style={styles.profileTextContainer}>
                <Text style={[styles.welcomeText, { color: COLORS.textLight }]}>
                  반갑습니다 👋
                </Text>
                <Text style={[styles.usernameText, { color: COLORS.text }]}>
                  {user?.username || "사용자"} 님
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.iconButton, { borderColor: COLORS.border }]}
              onPress={() => loadData(false)}
            >
              <Ionicons name="sync-outline" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Wallet Balance Card */}
          <View
            style={[styles.balanceCard, { backgroundColor: COLORS.primary }]}
          >
            <View style={styles.balanceHeader}>
              <Text
                style={[styles.balanceTitle, { color: COLORS.white + "B0" }]}
              >
                나의 총 자산
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(true)}>
                <View style={styles.addTxButtonBadge}>
                  <Ionicons name="add-circle" size={20} color={COLORS.white} />
                  <Text style={styles.addTxButtonBadgeText}>내역 추가</Text>
                </View>
              </TouchableOpacity>
            </View>
            <Text style={[styles.balanceAmount, { color: COLORS.white }]}>
              {formatCurrency(summary.balance)}
            </Text>

            {/* StatsRow */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: "rgba(255,255,255,0.2)" },
                  ]}
                >
                  <Ionicons
                    name="arrow-down-outline"
                    size={16}
                    color={COLORS.white}
                  />
                </View>
                <View>
                  <Text
                    style={[styles.statLabel, { color: COLORS.white + "90" }]}
                  >
                    총 수입
                  </Text>
                  <Text style={[styles.statValue, { color: COLORS.white }]}>
                    {formatCurrency(summary.income)}
                  </Text>
                </View>
              </View>

              <View style={styles.statItem}>
                <View
                  style={[
                    styles.statIconContainer,
                    { backgroundColor: "rgba(255,255,255,0.2)" },
                  ]}
                >
                  <Ionicons
                    name="arrow-up-outline"
                    size={16}
                    color={COLORS.white}
                  />
                </View>
                <View>
                  <Text
                    style={[styles.statLabel, { color: COLORS.white + "90" }]}
                  >
                    총 지출
                  </Text>
                  <Text style={[styles.statValue, { color: COLORS.white }]}>
                    {formatCurrency(-summary.expenses)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Transactions Header */}
          <View style={styles.transactionsHeader}>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
              전체 거래 내역 ({transactions.length}건)
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Text style={[styles.seeAllText, { color: COLORS.primary }]}>
                + 신규 등록
              </Text>
            </TouchableOpacity>
          </View>

          {/* Transactions List */}
          {transactions.length === 0 ? (
            <View
              style={[
                styles.emptyContainer,
                { borderColor: COLORS.border, backgroundColor: COLORS.card },
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={48}
                color={COLORS.textLight + "60"}
              />
              <Text style={[styles.emptyText, { color: COLORS.textLight }]}>
                등록된 거래 내역이 없습니다.
              </Text>
              <TouchableOpacity
                style={[
                  styles.emptyAddButton,
                  { backgroundColor: COLORS.primary + "15" },
                ]}
                onPress={() => setModalVisible(true)}
              >
                <Text style={{ color: COLORS.primary, fontWeight: "bold" }}>
                  첫 거래 추가하기
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.transactionsList,
                { backgroundColor: COLORS.card, borderColor: COLORS.border },
              ]}
            >
              {transactions.map((tx) => {
                const numericAmount = parseFloat(tx.amount);
                const isIncome = numericAmount > 0;
                return (
                  <View key={tx.id} style={styles.txItem}>
                    <View style={txLeftStyle(isIncome)}>
                      <View
                        style={[
                          styles.txIconContainer,
                          {
                            backgroundColor: isIncome
                              ? COLORS.income + "15"
                              : COLORS.expense + "15",
                          },
                        ]}
                      >
                        <Ionicons
                          name={isIncome ? "arrow-down" : "arrow-up"}
                          size={18}
                          color={isIncome ? COLORS.income : COLORS.expense}
                        />
                      </View>
                      <View>
                        <Text style={[styles.txTitle, { color: COLORS.text }]}>
                          {tx.title}
                        </Text>
                        <Text
                          style={[styles.txMeta, { color: COLORS.textLight }]}
                        >
                          {tx.category} • {formatDate(tx.created_at)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.txRight}>
                      <Text
                        style={[
                          styles.txAmount,
                          { color: isIncome ? COLORS.income : COLORS.expense },
                        ]}
                      >
                        {formatCurrency(tx.amount)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteTransaction(tx.id)}
                        style={styles.deleteButton}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color={COLORS.expense + "CC"}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Sign Out Section */}
          <View style={styles.signOutSection}>
            <SignOutButton style={styles.signOutButton} textStyle={undefined} />
          </View>
        </View>
      </ScrollView>

      {/* Transaction Add Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalContentWrapper}
            >
              <View
                style={[styles.modalContent, { backgroundColor: COLORS.card }]}
              >
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: COLORS.text }]}>
                    새 거래 내역 추가
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                {/* Type Tab Selector */}
                <View
                  style={[
                    styles.tabSelector,
                    { backgroundColor: COLORS.border + "30" },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.tabItem,
                      txType === "expense" && [
                        styles.activeTab,
                        { backgroundColor: COLORS.expense },
                      ],
                    ]}
                    onPress={() => {
                      setTxType("expense");
                      setCategory("식비");
                    }}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        txType === "expense"
                          ? { color: COLORS.white }
                          : { color: COLORS.textLight },
                      ]}
                    >
                      지출
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.tabItem,
                      txType === "income" && [
                        styles.activeTab,
                        { backgroundColor: COLORS.income },
                      ],
                    ]}
                    onPress={() => {
                      setTxType("income");
                      setCategory("급여");
                    }}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        txType === "income"
                          ? { color: COLORS.white }
                          : { color: COLORS.textLight },
                      ]}
                    >
                      수입
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Title Input */}
                <Text style={[styles.modalLabel, { color: COLORS.text }]}>
                  내역 제목
                </Text>
                <View
                  style={[
                    styles.modalInputContainer,
                    { borderColor: COLORS.border },
                  ]}
                >
                  <TextInput
                    style={[styles.modalInput, { color: COLORS.text }]}
                    placeholder="예: 점심 식사, 용돈 등"
                    placeholderTextColor={COLORS.textLight + "80"}
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                {/* Amount Input */}
                <Text style={[styles.modalLabel, { color: COLORS.text }]}>
                  금액 (₩)
                </Text>
                <View
                  style={[
                    styles.modalInputContainer,
                    { borderColor: COLORS.border },
                  ]}
                >
                  <TextInput
                    style={[styles.modalInput, { color: COLORS.text }]}
                    placeholder="금액을 입력하세요 (양수)"
                    placeholderTextColor={COLORS.textLight + "80"}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>

                {/* Category Chip Selector */}
                <Text style={[styles.modalLabel, { color: COLORS.text }]}>
                  카테고리
                </Text>
                <View style={styles.chipContainer}>
                  {CATEGORIES[txType].map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.chip,
                          {
                            borderColor: COLORS.primary,
                            backgroundColor: isSelected
                              ? COLORS.primary
                              : "transparent",
                          },
                        ]}
                        onPress={() => setCategory(cat)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: isSelected ? COLORS.white : COLORS.primary,
                            },
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    {
                      backgroundColor:
                        txType === "expense" ? COLORS.expense : COLORS.income,
                    },
                  ]}
                  onPress={handleAddTransaction}
                  disabled={submitLoading}
                >
                  {submitLoading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.submitButtonText}>등록하기</Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// helper style
const txLeftStyle = (isIncome: boolean) => [styles.txLeft, { opacity: 1 }];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
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
    justifyContent: "center",
    alignItems: "center",
  },
  profileTextContainer: {
    justifyContent: "center",
  },
  welcomeText: {
    fontSize: 11,
  },
  usernameText: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 4,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  balanceTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  addTxButtonBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  addTxButtonBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    marginLeft: 4,
  },
  balanceAmount: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    paddingTop: 18,
    marginLeft: -14,     // 부모 카드의 좌측 패딩(24)을 상쇄하여 총수입 영역을 더 왼쪽으로 끌어당김
    marginRight: -14,    // 부모 카드의 우측 패딩(24)을 상쇄하여 총지출 영역을 더 오른쪽으로 밀어냄
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "46%", // 가로 간격을 더 넓히기 위해 가로 폭을 살짝 조율
  },
  statIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12, // 아이콘과 수치 텍스트 간격 확대
  },
  statLabel: {
    fontSize: 10,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  transactionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: "600",
  },
  transactionsList: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  txItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.03)",
  },
  txLeft: {
    flex: 1, // 남은 가로 공간을 모두 채워 금액 영역을 우측 끝으로 완전히 밀어냄
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20, // 왼쪽 날짜/제목 영역과 오른쪽 금액 간의 최소 가로 간격 확보
  },
  txIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  txMeta: {
    fontSize: 10,
    marginTop: 4,
  },
  txRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end", // 금액과 삭제 버튼을 오른쪽에 정렬
    marginRight: -16,           // 리스트 박스의 오른쪽 내부 여백(16)을 완전히 상쇄하여 우측 경계선에 밀착시킴
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "right",
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 12,
    marginBottom: 16,
    textAlign: "center",
  },
  emptyAddButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  signOutSection: {
    marginTop: 8,
  },
  signOutButton: {
    width: "100%",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContentWrapper: {
    width: "100%",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  tabSelector: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabItem: {
    flex: 1,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  activeTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  modalInputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
    justifyContent: "center",
    marginBottom: 16,
  },
  modalInput: {
    fontSize: 15,
    height: "100%",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 24,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  submitButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
