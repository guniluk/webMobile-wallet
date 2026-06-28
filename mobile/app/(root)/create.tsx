import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { API_ENDPOINTS } from '../../constants/api';
import { styles as createStyles } from '../../assets/styles/create.styles';

const CATEGORIES = {
  income: ['급여', '용돈', '투자', '기타'],
  expense: ['식비', '쇼핑', '교통', '문화/여가', '기타'],
};

export default function CreateTransactionScreen() {
  const { user } = useUser();
  const router = useRouter();

  // State Management
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('식비');
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleSave = async () => {
    if (!user?.id) return;
    if (!title.trim() || !amount.trim()) {
      Alert.alert('알림', '제목과 금액을 모두 입력해 주세요.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('알림', '올바른 금액(양수)을 입력해 주세요.');
      return;
    }

    setSubmitLoading(true);
    // 지출은 음수, 수입은 양수로 가공
    const finalAmount =
      txType === 'expense' ? -Math.abs(numAmount) : Math.abs(numAmount);

    try {
      const response = await fetch(API_ENDPOINTS.transactions, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          title: title.trim(),
          amount: finalAmount,
          category,
        }),
      });

      if (!response.ok) {
        throw new Error('거래 내역 등록 실패');
      }

      Alert.alert('성공', '거래 내역이 등록되었습니다.', [
        {
          text: '확인',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('등록 오류', '서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const currentCategories = CATEGORIES[txType];

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={createStyles.container}
      >
        {/* Header */}
        <View style={createStyles.header}>
          <TouchableOpacity
            style={createStyles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={createStyles.headerTitle}>New transaction</Text>
          <TouchableOpacity
            style={[
              createStyles.saveButtonContainer,
              submitLoading && createStyles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={submitLoading}
          >
            {submitLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={createStyles.saveButton}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={createStyles.card}>
            {/* Type Selector (Income / Expense) */}
            <View style={createStyles.typeSelector}>
              <TouchableOpacity
                style={[
                  createStyles.typeButton,
                  txType === 'expense' && createStyles.typeButtonActive,
                ]}
                onPress={() => {
                  setTxType('expense');
                  setCategory('식비');
                }}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={20}
                  color={txType === 'expense' ? COLORS.white : COLORS.expense}
                  style={createStyles.typeIcon}
                />
                <Text
                  style={[
                    createStyles.typeButtonText,
                    txType === 'expense' && createStyles.typeButtonTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  createStyles.typeButton,
                  txType === 'income' && createStyles.typeButtonActive,
                ]}
                onPress={() => {
                  setTxType('income');
                  setCategory('급여');
                }}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={20}
                  color={txType === 'income' ? COLORS.white : COLORS.income}
                  style={createStyles.typeIcon}
                />
                <Text
                  style={[
                    createStyles.typeButtonText,
                    txType === 'income' && createStyles.typeButtonTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <View style={createStyles.amountContainer}>
              <Text style={createStyles.currencySymbol}>₩</Text>
              <TextInput
                style={createStyles.amountInput}
                placeholder="0"
                placeholderTextColor={COLORS.textLight + '60'}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus={true}
              />
            </View>

            {/* Title Input */}
            <View style={createStyles.inputContainer}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={COLORS.textLight}
                style={createStyles.inputIcon}
              />
              <TextInput
                style={createStyles.input}
                placeholder="Enter title"
                placeholderTextColor={COLORS.textLight + '80'}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Category Selector */}
            <Text style={createStyles.sectionTitle}> Category</Text>
            <View style={createStyles.categoryGrid}>
              {currentCategories.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      createStyles.categoryButton,
                      isSelected && createStyles.categoryButtonActive,
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        createStyles.categoryButtonText,
                        isSelected && createStyles.categoryButtonTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
