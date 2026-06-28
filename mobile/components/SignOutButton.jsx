import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

export default function SignOutButton({ style, textStyle }) {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    Alert.alert(
      '로그아웃',
      '정말로 로그아웃 하시겠습니까?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await signOut();
            } catch (error) {
              console.error('로그아웃 에러:', error);
              Alert.alert('오류', '로그아웃 처리 중 문제가 발생했습니다.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: COLORS.expense + '15', borderColor: COLORS.expense },
        style,
      ]}
      onPress={handleSignOut}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.expense} />
      ) : (
        <>
          <Ionicons
            name="log-out-outline"
            size={18}
            color={COLORS.expense}
            style={styles.icon}
          />
          <Text style={[styles.text, { color: COLORS.expense }, textStyle]}>
            Logout
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
});
