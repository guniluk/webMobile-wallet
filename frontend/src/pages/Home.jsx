import React, { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth, useClerk } from '@clerk/clerk-react';
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  Trash2,
  LogOut,
  RefreshCw,
  Calendar,
  Tag,
  PlusCircle,
  AlertCircle,
} from 'lucide-react';

const CATEGORIES = {
  income: ['급여', '용돈', '투자', '기타 수입'],
  expense: ['식비', '교통비', '쇼핑', '문화생활', '주거/통신', '기타 지출'],
};

export default function Home() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();

  // State Management
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    income: 0,
    expenses: 0,
    balance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [txType, setTxType] = useState('expense'); // 'income' or 'expense'
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES.expense[0]);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // 1. 거래 요약 정보 조회
  const fetchSummary = useCallback(async () => {
    if (!user?.id) return;
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/transactions/summary/${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) throw new Error('요약 정보 로드 실패');
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error(err);
    }
  }, [user?.id, getToken, API_BASE_URL]);

  // 2. 전체 거래 내역 조회
  const fetchTransactions = useCallback(async () => {
    if (!user?.id) return;
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/transactions/${user.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('거래 내역 로드 실패');
      const data = await response.json();
      setTransactions(data);
    } catch (err) {
      console.error(err);
    }
  }, [user?.id, getToken, API_BASE_URL]);

  // 전체 데이터 로드
  const loadData = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      await Promise.all([fetchSummary(), fetchTransactions()]);
      setLoading(false);
    },
    [fetchSummary, fetchTransactions],
  );

  useEffect(() => {
    if (user?.id) {
      loadData(true);
    }
  }, [user?.id, loadData]);

  // 3. 신규 거래 등록
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!title.trim() || !amount || !category) {
      alert('모든 필드를 입력해 주세요.');
      return;
    }

    setActionLoading(true);
    try {
      const token = await getToken();
      const numericAmount = parseFloat(amount);
      const finalAmount =
        txType === 'income'
          ? Math.abs(numericAmount)
          : -Math.abs(numericAmount);

      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          title: title.trim(),
          amount: finalAmount,
          category,
        }),
      });

      if (!response.ok) throw new Error('거래 등록 실패');

      // 입력 폼 초기화
      setTitle('');
      setAmount('');
      setCategory(
        txType === 'income' ? CATEGORIES.income[0] : CATEGORIES.expense[0],
      );

      // 데이터 리로드
      await loadData(false);
    } catch (err) {
      console.error(err);
      alert('거래 등록 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. 거래 삭제
  const handleDeleteTransaction = async (id) => {
    if (!confirm('정말로 이 거래 내역을 삭제하시겠습니까?')) return;

    setActionLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('거래 삭제 실패');

      await loadData(false);
    } catch (err) {
      console.error(err);
      alert('거래 삭제 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // 수입/지출 탭 전환 시 카테고리 디폴트 설정 변경
  const handleTypeChange = (type) => {
    setTxType(type);
    setCategory(
      type === 'income' ? CATEGORIES.income[0] : CATEGORIES.expense[0],
    );
  };

  // 포맷 도구들
  const formatCurrency = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '₩0';
    return `${num.toLocaleString('ko-KR')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 이메일 앞부분 추출
  const username =
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    '사용자';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-gray-500 font-semibold">
            데이터를 불러오는 중입니다...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation Bar */}
      <header className="navbar bg-white border-b border-gray-100 px-6 py-4 shadow-sm sticky top-0 z-50">
        <div className="flex-1">
          <span className="text-2xl font-black text-blue-600 tracking-tight flex items-center gap-2">
            <Wallet className="h-7 w-7" />
            Web Wallet
          </span>
        </div>
        <div className="flex-none gap-4">
          <div className="hidden sm:flex flex-col items-end text-sm">
            <span className="text-gray-400 font-medium">반갑습니다 👋</span>
            <span className="text-gray-800 font-bold">{username} 님</span>
          </div>
          {user?.imageUrl && (
            <img
              src={user.imageUrl}
              alt="avatar"
              className="h-10 w-10 rounded-full border border-gray-200 object-cover"
            />
          )}
          <button
            onClick={() => signOut()}
            className="btn btn-ghost btn-sm text-gray-500 hover:text-red-600 gap-1 rounded-xl"
            title="로그아웃"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">로그아웃</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Asset Card & Transaction Form) */}
        <section className="lg:col-span-1 space-y-8">
          {/* Asset Summary Card */}
          <div className="card bg-blue-600 text-white rounded-3xl shadow-xl overflow-hidden relative">
            {/* Background pattern */}
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
              <Wallet className="h-48 w-48" />
            </div>

            <div className="card-body p-8 relative z-10">
              <div className="flex justify-between items-center mb-6">
                <span className="text-blue-100 text-sm font-semibold tracking-wide uppercase">
                  나의 총 자산
                </span>
                <button
                  onClick={() => loadData(false)}
                  className="btn btn-circle btn-ghost btn-xs text-white hover:bg-blue-700"
                  title="새로고침"
                  disabled={actionLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${actionLoading ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>
              <h2 className="text-4xl font-extrabold mb-8 tracking-tight">
                {formatCurrency(summary.balance)}
              </h2>

              <div className="grid grid-cols-2 gap-4 border-t border-blue-500/40 pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-full">
                    <TrendingUp className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div>
                    <span className="text-blue-200 text-xs block">총 수입</span>
                    <span className="font-bold text-lg text-emerald-300">
                      {formatCurrency(summary.income)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-full">
                    <TrendingDown className="h-5 w-5 text-red-300" />
                  </div>
                  <div>
                    <span className="text-blue-200 text-xs block">총 지출</span>
                    <span className="font-bold text-lg text-red-300">
                      {formatCurrency(summary.expenses)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* New Transaction Form */}
          <div className="card bg-white rounded-3xl border border-gray-100 shadow-md">
            <div className="card-body p-6">
              <h3 className="card-title text-gray-800 font-extrabold mb-4 flex items-center gap-2 text-lg">
                <PlusCircle className="h-5 w-5 text-blue-600" />
                신규 거래 내역 등록
              </h3>

              {/* Type Switcher Tab */}
              <div className="tabs tabs-boxed bg-gray-100 rounded-xl p-1 mb-4 flex">
                <button
                  type="button"
                  onClick={() => handleTypeChange('expense')}
                  className={`tab flex-1 rounded-lg py-2 font-bold text-sm transition-all duration-200 ${txType === 'expense' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500'}`}
                >
                  지출
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('income')}
                  className={`tab flex-1 rounded-lg py-2 font-bold text-sm transition-all duration-200 ${txType === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
                >
                  수입
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="space-y-4">
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text font-semibold text-gray-700">
                      거래 제목
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="예: 점심 식사, 용돈 등"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={30}
                    className="input input-bordered w-full rounded-xl focus:border-blue-500 text-gray-800 text-sm"
                  />
                </div>

                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text font-semibold text-gray-700">
                      금액 (원)
                    </span>
                  </label>
                  <input
                    type="number"
                    placeholder="금액을 입력하세요"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    min="1"
                    className="input input-bordered w-full rounded-xl focus:border-blue-500 text-gray-800 text-sm"
                  />
                </div>

                {/* Category Section */}
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text font-semibold text-gray-700">
                      카테고리 선택
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {CATEGORIES[txType].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`btn btn-xs rounded-lg border px-3 py-1 font-semibold transition-all duration-150 normal-case ${category === cat ? 'bg-blue-500 border-blue-500 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-55'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-primary w-full mt-4 rounded-xl text-white font-bold bg-blue-600 hover:bg-blue-700 border-none normal-case shadow-md"
                >
                  {actionLoading ? '처리 중...' : '기록하기'}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Right Column (Transactions Scroll Area) */}
        <section className="lg:col-span-2">
          <div className="card bg-white rounded-3xl border border-gray-100 shadow-md h-full flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
                전체 거래 내역
                <span className="badge badge-neutral rounded-lg py-3 font-bold bg-gray-100 text-gray-600 border-none text-xs">
                  {transactions.length}건
                </span>
              </h3>
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto max-h-[70vh] p-6 space-y-4">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle className="h-16 w-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 font-bold">
                    등록된 거래 내역이 없습니다.
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    좌측 폼을 이용해 첫 가계부 내역을 등록해 보세요!
                  </p>
                </div>
              ) : (
                transactions.map((tx) => {
                  const numericAmount = parseFloat(tx.amount);
                  const isIncome = numericAmount > 0;
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-sm transition-all duration-200"
                    >
                      {/* Left side details */}
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-xl ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}
                        >
                          {isIncome ? (
                            <TrendingUp className="h-5 w-5" />
                          ) : (
                            <TrendingDown className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-gray-800 font-bold text-sm sm:text-base">
                            {tx.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {tx.category}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(tx.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right side amount & action */}
                      <div className="flex items-center gap-4">
                        <span
                          className={`font-extrabold text-sm sm:text-base ${isIncome ? 'text-emerald-600' : 'text-red-500'}`}
                        >
                          {formatCurrency(tx.amount)}
                        </span>
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          disabled={actionLoading}
                          className="btn btn-circle btn-ghost btn-xs text-gray-400 hover:text-red-600 hover:bg-red-50"
                          title="삭제"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
