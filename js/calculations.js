/**
 * FinFlow PWA - Calculations & Financial Telemetry Engine
 * Handles period date windows, budget limits, daily safe spend, category breakdowns, and threshold alerts.
 */

const Calc = (function() {

  // Currency Formatter
  function formatIDR(amount, withPrefix = false) {
    const num = Math.round(Number(amount) || 0);
    const formatted = new Intl.NumberFormat('id-ID').format(num);
    return withPrefix ? `Rp ${formatted}` : formatted;
  }

  function parseIDR(str) {
    if (typeof str === 'number') return str;
    if (!str) return 0;
    const clean = str.toString().replace(/[^0-9-]/g, '');
    return parseInt(clean, 10) || 0;
  }

  // Date Formatters (Indonesian Locale)
  const MONTH_NAMES_ID = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  const MONTH_NAMES_FULL_ID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const DAY_NAMES_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  function formatDateDisplay(dateInput) {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    return `${d.getDate()} ${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatDateWithDay(dateInput) {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    return `${DAY_NAMES_ID[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatTimeOnly(dateInput) {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // Get start and end dates for a period type
  function getPeriodBounds(periodType, customStart, customEnd) {
    const now = new Date();
    let startDate, endDate, label, subLabel;

    if (periodType === 'weekly') {
      // Monday to Sunday of current week
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day; // If Sunday (0), go back 6 days
      
      startDate = new Date(now);
      startDate.setDate(now.getDate() + diffToMonday);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      label = `Minggu Ini (${startDate.getDate()} - ${endDate.getDate()} ${MONTH_NAMES_ID[endDate.getMonth()]})`;
      subLabel = `${startDate.getDate()} ${MONTH_NAMES_ID[startDate.getMonth()]} – ${endDate.getDate()} ${MONTH_NAMES_ID[endDate.getMonth()]} ${endDate.getFullYear()}`;

    } else if (periodType === 'monthly') {
      // 1st to last day of current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      label = `${MONTH_NAMES_FULL_ID[now.getMonth()]} ${now.getFullYear()}`;
      subLabel = `1 ${MONTH_NAMES_ID[now.getMonth()]} – ${endDate.getDate()} ${MONTH_NAMES_ID[now.getMonth()]} ${now.getFullYear()}`;

    } else if (periodType === 'custom') {
      if (customStart && customEnd) {
        startDate = new Date(customStart);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customEnd);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Fallback: 30 days window
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 15);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setDate(now.getDate() + 15);
        endDate.setHours(23, 59, 59, 999);
      }
      label = `Periode Kustom`;
      subLabel = `${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`;
    }

    // Days calculation
    const nowTime = now.getTime();
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    const totalDays = Math.max(1, Math.round((endTime - startTime) / (1000 * 60 * 60 * 24)));
    const elapsedDays = Math.max(1, Math.min(totalDays, Math.ceil((nowTime - startTime) / (1000 * 60 * 60 * 24))));
    const daysRemaining = Math.max(1, Math.ceil((endTime - nowTime) / (1000 * 60 * 60 * 24)));

    return {
      periodType,
      startDate,
      endDate,
      startDateISO: startDate.toISOString(),
      endDateISO: endDate.toISOString(),
      label,
      subLabel,
      totalDays,
      elapsedDays,
      daysRemaining,
      elapsedPercent: Math.min(100, Math.round((elapsedDays / totalDays) * 100))
    };
  }

  // Main Period Telemetry Summary
  function getPeriodTelemetry(budgetConfig, transactions, categories, overridePeriodType = null) {
    const pType = overridePeriodType || budgetConfig.periodType || 'weekly';
    const bounds = getPeriodBounds(pType, budgetConfig.customStartDate, budgetConfig.customEndDate);

    // Filter transactions in this period
    const periodTransactions = transactions.filter(t => {
      const tTime = new Date(t.date).getTime();
      return tTime >= bounds.startDate.getTime() && tTime <= bounds.endDate.getTime();
    });

    // Split into Expense and Income transactions
    const expenseTransactions = periodTransactions.filter(t => (t.type || 'expense') !== 'income');
    const incomeTransactions = periodTransactions.filter(t => t.type === 'income');

    // Total spent (only expenses)
    const totalSpent = expenseTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    // Total income
    const totalIncome = incomeTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    // Net cashflow (Surplus/Defisit)
    const netSavings = totalIncome - totalSpent;
    const isSurplus = netSavings >= 0;

    // Total limit according to active period type
    let totalLimit = 0;
    if (pType === 'weekly') {
      totalLimit = budgetConfig.weeklyLimit || 1200000;
    } else if (pType === 'monthly') {
      totalLimit = budgetConfig.monthlyLimit || 4000000;
    } else {
      totalLimit = budgetConfig.customLimit || 3000000;
    }

    const remainingBudget = totalLimit - totalSpent;
    const spentPercent = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
    const clampedProgress = Math.min(100, Math.max(0, spentPercent));

    // Safe to Spend Per Day (Rekomendasi Aman Belanja / Hari)
    const safeDailySpend = remainingBudget > 0 ? Math.floor(remainingBudget / bounds.daysRemaining) : 0;

    // Warning status classification
    const warnThresh = budgetConfig.warningThreshold || 80;
    const critThresh = budgetConfig.criticalThreshold || 100;

    let status = 'safe'; // 'safe' | 'warning' | 'danger'
    let statusLabel = `AMAN (${spentPercent}%)`;
    let statusColorClass = 'text-[#047857]';
    let statusBgClass = 'bg-[#10b981]';
    let statusPillClass = 'status-pill-safe';

    if (spentPercent >= critThresh) {
      status = 'danger';
      statusLabel = `OVERBUDGET (${spentPercent}%)`;
      statusColorClass = 'text-[#b91c1c]';
      statusBgClass = 'bg-[#ef4444]';
      statusPillClass = 'status-pill-danger';
    } else if (spentPercent >= warnThresh) {
      status = 'warning';
      statusLabel = `WASPADA (${spentPercent}%)`;
      statusColorClass = 'text-[#b45309]';
      statusBgClass = 'bg-[#f59e0b]';
      statusPillClass = 'status-pill-warning';
    }

    // Category Breakdowns (Only for Expense Categories)
    const categoryLimitsMap = budgetConfig.categoryLimits || {};
    const expenseCategories = categories.filter(c => (c.type || 'expense') !== 'income');
    const categoryBreakdown = expenseCategories.map(cat => {
      const catTxList = expenseTransactions.filter(t => t.categoryId === cat.id);
      const spent = catTxList.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
      
      // Default proportion if not explicitly set
      let limit = categoryLimitsMap[cat.id];
      if (limit === undefined) {
        // Provide proportional estimate if not set
        limit = Math.round(totalLimit * 0.25);
      }

      const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      const remaining = limit - spent;
      const progressWidth = Math.min(100, Math.max(0, percent));

      let catStatus = 'safe';
      let catStatusLabel = `${percent}% terpakai`;
      let catColor = '#006c49';
      let catBarBg = 'bg-primary-container';
      let catBadgeBg = 'bg-emerald-100 text-emerald-800 font-bold';

      if (percent >= 100) {
        catStatus = 'danger';
        catStatusLabel = 'Melebihi plafon';
        catColor = '#dc2626';
        catBarBg = 'bg-red-500';
        catBadgeBg = 'bg-red-600 text-white font-bold';
      } else if (percent >= warnThresh) {
        catStatus = 'warning';
        catStatusLabel = `${percent}% mendekati limit`;
        catColor = '#d97706';
        catBarBg = 'bg-amber-500';
        catBadgeBg = 'bg-amber-100 text-amber-900 font-bold';
      }

      return {
        category: cat,
        spent,
        limit,
        remaining,
        percent,
        progressWidth,
        catStatus,
        catStatusLabel,
        catColor,
        catBarBg,
        catBadgeBg,
        txCount: catTxList.length
      };
    });

    // Sort category breakdown with highest spend or highest percentage first
    categoryBreakdown.sort((a, b) => b.spent - a.spent);

    return {
      periodType: pType,
      bounds,
      totalLimit,
      totalSpent,
      totalIncome,
      netSavings,
      isSurplus,
      remainingBudget,
      spentPercent,
      clampedProgress,
      safeDailySpend,
      status,
      statusLabel,
      statusColorClass,
      statusBgClass,
      statusPillClass,
      warnThresh,
      critThresh,
      periodTransactions,
      expenseTransactions,
      incomeTransactions,
      transactionCount: periodTransactions.length,
      categoryBreakdown
    };
  }

  // Group transactions by Relative Day (Hari Ini, Kemarin, Date)
  function groupTransactionsByDay(transactionsList) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const groups = {};

    transactionsList.forEach(t => {
      const datePart = t.date.split('T')[0];
      if (!groups[datePart]) {
        let title = formatDateWithDay(t.date);
        let isToday = false;

        if (datePart === todayStr) {
          title = `Hari Ini • ${formatDateDisplay(t.date)}`;
          isToday = true;
        } else if (datePart === yesterdayStr) {
          title = `Kemarin • ${formatDateDisplay(t.date)}`;
        }

        groups[datePart] = {
          dateStr: datePart,
          title,
          isToday,
          total: 0,
          totalExpense: 0,
          totalIncome: 0,
          items: []
        };
      }
      groups[datePart].items.push(t);
      if (t.type === 'income') {
        groups[datePart].totalIncome += Number(t.amount) || 0;
      } else {
        groups[datePart].totalExpense += Number(t.amount) || 0;
        groups[datePart].total += Number(t.amount) || 0;
      }
    });

    return Object.values(groups).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  }

  return {
    formatIDR,
    parseIDR,
    formatDateDisplay,
    formatDateWithDay,
    formatTimeOnly,
    getPeriodBounds,
    getPeriodTelemetry,
    groupTransactionsByDay
  };
})();

if (typeof window !== 'undefined') {
  window.Calc = Calc;
}
