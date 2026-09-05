/**
 * FinFlow PWA - UI Renderer & Interaction Controller
 * Renders Dashboard, Transactions History, Keypad Quick Entry, Budget Management, and Modals.
 */

const UI = (function() {
  // Navigation & View State
  let currentView = 'dashboard';
  let activePeriodFilter = 'minggu'; // 'minggu' | 'bulan' | 'kustom'
  let activeCategoryFilter = 'all';
  let activeTypeFilter = 'all'; // 'all' | 'expense' | 'income'
  let searchQuery = '';
  let customDateRange = { start: '', end: '' };

  // Keypad State
  let currentTxType = 'expense'; // 'expense' | 'income'
  let keypadRawAmount = 45000;
  let selectedCategoryId = 'cat_makanan';
  let selectedPaymentSource = 'QRIS / BCA';
  let selectedTxDate = new Date().toISOString().split('T')[0];

  // DOM Elements cache
  let views = {};
  let navLinks = [];

  function init() {
    views = {
      dashboard: document.getElementById('view-dashboard'),
      transaksi: document.getElementById('view-transaksi'),
      'quick-entry': document.getElementById('view-quick-entry'),
      budget: document.getElementById('view-budget'),
      settings: document.getElementById('view-settings')
    };

    navLinks = document.querySelectorAll('nav [data-path]');

    initTheme();
    bindNavigation();
    bindKeypadEvents();
    bindHistoryFilterEvents();
    bindBudgetConfigEvents();
    bindSettingsEvents();
    bindThemeEvents();
    bindModalEvents();
    bindKeyboardShortcuts();

    // Subscribe to Store updates
    Store.subscribe((event, data) => {
      renderCurrentView();
    });

    // Sync slider threshold elements with persisted budgetConfig on startup
    const budgetConfig = Store.getBudgetConfig();
    activePeriodFilter = budgetConfig.periodType === 'weekly' ? 'minggu' : (budgetConfig.periodType === 'monthly' ? 'bulan' : 'kustom');

    const sWarn = document.getElementById('slider-threshold-warn');
    const sCrit = document.getElementById('slider-threshold-crit');
    if (sWarn) {
      sWarn.value = budgetConfig.warningThreshold || 80;
      updateSliderProgress(sWarn);
      const vWarn = document.getElementById('threshold-warn-val');
      if (vWarn) vWarn.textContent = `${sWarn.value}%`;
    }
    if (sCrit) {
      sCrit.value = budgetConfig.criticalThreshold || 100;
      updateSliderProgress(sCrit);
      const vCrit = document.getElementById('threshold-crit-val');
      if (vCrit) vCrit.textContent = `${sCrit.value}%`;
    }

    switchView('dashboard');
  }

  // --- NAVIGATION ROUTER ---
  function bindNavigation() {
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPath = link.getAttribute('data-path');
        switchView(targetPath);
      });
    });

    // Quick trigger buttons
    document.querySelectorAll('[data-goto]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = btn.getAttribute('data-goto');
        switchView(target);
      });
    });
  }

  function switchView(viewName) {
    if (!views[viewName]) return;
    currentView = viewName;

    // Toggle view containers
    Object.keys(views).forEach(key => {
      if (views[key]) {
        if (key === viewName) {
          views[key].classList.remove('hidden');
          views[key].classList.add('animate-fade-in');
        } else {
          views[key].classList.add('hidden');
          views[key].classList.remove('animate-fade-in');
        }
      }
    });

    // Update bottom nav highlighting
    navLinks.forEach(link => {
      const path = link.getAttribute('data-path');
      const isQuickEntry = path === 'quick-entry';
      if (isQuickEntry) return;

      if (path === viewName) {
        link.classList.remove('text-on-surface-variant');
        link.classList.add('text-primary');
      } else {
        link.classList.remove('text-primary');
        link.classList.add('text-on-surface-variant');
      }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    renderCurrentView();
  }

  function renderCurrentView() {
    if (currentView === 'dashboard') {
      renderDashboard();
    } else if (currentView === 'transaksi') {
      renderTransactions();
    } else if (currentView === 'quick-entry') {
      renderKeypadView();
    } else if (currentView === 'budget') {
      renderBudgetManagement();
    } else if (currentView === 'settings') {
      renderSettings();
    }
  }

  // --- 1. DASHBOARD VIEW RENDERER ---
  function renderDashboard() {
    const budgetConfig = Store.getBudgetConfig();
    const transactions = Store.getTransactions();
    const categories = Store.getCategories();
    const telemetry = Calc.getPeriodTelemetry(budgetConfig, transactions, categories);

    // Period Top Bar Status & Capsule (Clean Pill Toggle)
    const periodContainer = document.getElementById('dash-period-capsule');
    if (periodContainer) {
      const isWeekly = telemetry.periodType === 'weekly';
      periodContainer.innerHTML = `
        <button class="px-5 py-2 rounded-full text-[14px] cursor-pointer ${isWeekly ? 'pill-btn-active' : 'pill-btn-inactive'}" id="dash-switch-weekly">
          Mingguan
        </button>
        <button class="px-5 py-2 rounded-full text-[14px] cursor-pointer ${!isWeekly ? 'pill-btn-active' : 'pill-btn-inactive'}" id="dash-switch-monthly">
          Bulanan
        </button>
      `;

      document.getElementById('dash-switch-weekly')?.addEventListener('click', () => {
        Store.updateBudgetConfig({ periodType: 'weekly' });
      });
      document.getElementById('dash-switch-monthly')?.addEventListener('click', () => {
        Store.updateBudgetConfig({ periodType: 'monthly' });
      });
    }

    // Status Pill (Minimalist, borderless with soft shadow and clean typography)
    const statusPill = document.getElementById('dash-status-pill');
    if (statusPill) {
      statusPill.className = `inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wider shrink-0 transition-all duration-200 ${telemetry.statusPillClass}`;
      statusPill.innerHTML = `<span class="truncate">${telemetry.statusLabel}</span>`;
    }

    // Hero Card: Sisa Anggaran, Progress Track, Safe Daily Spend
    const remainingEl = document.getElementById('dash-remaining-amount');
    const spentEl = document.getElementById('dash-spent-amount');
    const totalEl = document.getElementById('dash-total-amount');
    const progressFill = document.getElementById('dash-progress-fill');
    const dailySpendEl = document.getElementById('dash-daily-spend');
    const daysLeftEl = document.getElementById('dash-days-left');
    const checkpointPin = document.getElementById('dash-checkpoint-pin');

    if (remainingEl) remainingEl.textContent = Calc.formatIDR(Math.abs(telemetry.remainingBudget));
    if (spentEl) spentEl.textContent = `Terpakai ${Calc.formatIDR(telemetry.totalSpent, true)}`;
    if (totalEl) totalEl.textContent = `Total ${Calc.formatIDR(telemetry.totalLimit, true)}`;
    if (dailySpendEl) dailySpendEl.innerHTML = `${Calc.formatIDR(telemetry.safeDailySpend, true)} <span class="text-[11px] font-normal text-slate-500 dark:text-slate-400">/ hari</span>`;
    if (daysLeftEl) daysLeftEl.textContent = `${telemetry.bounds.daysRemaining} hari sisa`;

    if (progressFill) {
      progressFill.style.width = `${telemetry.clampedProgress}%`;
      progressFill.className = `h-full rounded-full transition-all duration-700 ease-out ${telemetry.statusBgClass}`;
    }

    if (checkpointPin) {
      checkpointPin.style.left = `${telemetry.warnThresh}%`;
      checkpointPin.setAttribute('title', `Ambang Waspada ${telemetry.warnThresh}%`);
    }

    // Cashflow Metrics (Income, Expense, Net)
    const incomeEl = document.getElementById('dash-cashflow-income');
    const expenseEl = document.getElementById('dash-cashflow-expense');
    const netEl = document.getElementById('dash-cashflow-net');

    if (incomeEl) incomeEl.textContent = `+${Calc.formatIDR(telemetry.totalIncome || 0, true)}`;
    if (expenseEl) expenseEl.textContent = `-${Calc.formatIDR(telemetry.totalSpent || 0, true)}`;
    if (netEl) {
      const net = telemetry.netSavings || 0;
      const sign = net > 0 ? '+' : (net < 0 ? '-' : '');
      netEl.textContent = `${sign}${Calc.formatIDR(Math.abs(net), true)}`;
      if (net > 0) {
        netEl.className = 'text-[13px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums';
      } else if (net < 0) {
        netEl.className = 'text-[13px] font-bold text-rose-600 dark:text-rose-400 mt-0.5 tabular-nums';
      } else {
        netEl.className = 'text-[13px] font-bold text-on-surface mt-0.5 tabular-nums';
      }
    }

    // Plafon Kategori List
    const categoryGrid = document.getElementById('dash-category-list');
    if (categoryGrid) {
      if (telemetry.categoryBreakdown.length === 0) {
        categoryGrid.innerHTML = `<div class="p-4 text-center text-on-surface-variant text-body-sm">Belum ada kategori.</div>`;
      } else {
        categoryGrid.innerHTML = telemetry.categoryBreakdown.map(item => `
          <div class="bg-surface-container-lowest rounded-xl p-unit-3 shadow-sm flex flex-col gap-2 active-press cursor-pointer hover:shadow transition-shadow" onclick="UI.openCategoryFilter('${item.category.id}')">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style="background-color: ${item.category.bgColor}; color: ${item.category.colorHex};">
                  <span class="material-symbols-outlined text-[19px]">${item.category.icon}</span>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <p class="text-[13px] font-semibold text-on-surface leading-tight truncate">${item.category.name}</p>
                    ${item.catStatus === 'warning' ? `<span class="px-2 py-0.5 rounded-full bg-[#d97706] text-white text-[10px] font-bold tracking-wide">Waspada ${item.percent}%</span>` : ''}
                    ${item.catStatus === 'danger' ? `<span class="px-2 py-0.5 rounded-full bg-[#dc2626] text-white text-[10px] font-bold tracking-wide">Over ${item.percent}%</span>` : ''}
                  </div>
                  <p class="text-[11px] text-on-surface-variant mt-0.5">${item.catStatus === 'danger' ? `<span class="text-error font-medium">Over limit +${Calc.formatIDR(item.spent - item.limit, true)}</span>` : `${item.percent}% terpakai • Sisa ${Calc.formatIDR(Math.max(0, item.limit - item.spent), true)}`}</p>
                </div>
              </div>
              <div class="text-right shrink-0 pl-2">
                <p class="text-[13px] font-semibold text-on-surface tabular-nums">${Calc.formatIDR(item.spent, true)}</p>
                <p class="text-[11px] text-on-surface-variant">dari ${Calc.formatIDR(item.limit, true)}</p>
              </div>
            </div>
            <div class="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500 ${item.catBarBg}" style="width: ${item.progressWidth}%;"></div>
            </div>
          </div>
        `).join('');
      }
    }

    // Recent Transactions in Dashboard
    const recentTxList = document.getElementById('dash-recent-transactions');
    if (recentTxList) {
      const recent = transactions.slice(0, 4);
      if (recent.length === 0) {
        recentTxList.innerHTML = `
          <div class="p-6 text-center bg-surface-container-lowest rounded-xl text-on-surface-variant text-body-sm">
            Belum ada catatan transaksi. Tekan <strong>+ Catat Transaksi</strong> untuk memulai.
          </div>
        `;
      } else {
        recentTxList.innerHTML = recent.map(t => {
          const isIncome = t.type === 'income';
          const cat = categories.find(c => c.id === t.categoryId) || { icon: isIncome ? 'savings' : 'receipt', colorHex: isIncome ? '#059669' : '#006c49', bgColor: isIncome ? '#ecfdf5' : '#e5eeff' };
          return `
            <div class="flex items-center justify-between p-unit-3 bg-surface-container-lowest rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] active:bg-surface-container-low transition-colors cursor-pointer min-h-[56px]" onclick="UI.openEditTxModal('${t.id}')">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background-color: ${cat.bgColor}; color: ${cat.colorHex};">
                  <span class="material-symbols-outlined text-[19px]">${cat.icon}</span>
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-[13px] font-semibold text-on-surface truncate leading-tight">${t.note || t.categoryName}</span>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <span class="text-[11px] text-on-surface-variant">${t.categoryName} • ${Calc.formatTimeOnly(t.date)}</span>
                    <span class="inline-flex items-center px-1.5 py-0.2 rounded ${isIncome ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-surface-container text-on-surface-variant'} text-[10px] font-medium">
                      ${isIncome ? 'Masuk' : t.paymentSource}
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex flex-col items-end shrink-0 pl-unit-2">
                <span class="text-[13px] font-semibold tabular-nums ${isIncome ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-on-surface'}">${isIncome ? '+' : '-'}${Calc.formatIDR(t.amount, true)}</span>
                <span class="text-[11px] text-outline">${Calc.formatDateDisplay(t.date)}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  // --- 2. TRANSACTIONS & HISTORY RENDERER ---
  function bindHistoryFilterEvents() {
    // Search input
    const searchInput = document.getElementById('transactionSearch');
    const clearBtn = document.getElementById('clearSearchBtn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderTransactions();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        searchQuery = '';
        renderTransactions();
      });
    }

    // History type segmented tabs (Semua | Pengeluaran | Pemasukan)
    document.querySelectorAll('.history-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        activeTypeFilter = type;
        activeCategoryFilter = 'all';
        renderTransactions();
      });
    });

    // Period segmented picker tabs
    document.querySelectorAll('.period-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const period = btn.getAttribute('data-period');
        activePeriodFilter = period;
        if (period === 'kustom') {
          openCustomDateModal();
        } else {
          renderTransactions();
        }
      });
    });

    // Export CSV Button
    const exportBtn = document.getElementById('exportCsvBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const budgetConfig = Store.getBudgetConfig();
        const pType = activePeriodFilter === 'minggu' ? 'weekly' : (activePeriodFilter === 'bulan' ? 'monthly' : 'custom');
        const bounds = Calc.getPeriodBounds(pType, customDateRange.start, customDateRange.end);

        Store.exportTransactionsCSV({
          startDate: bounds.startDateISO,
          endDate: bounds.endDateISO,
          categoryId: activeCategoryFilter,
          type: activeTypeFilter,
          searchQuery
        });

        showToast('File CSV riwayat transaksi berhasil diunduh!');
      });
    }
  }

  function renderTransactions() {
    const budgetConfig = Store.getBudgetConfig();
    const categories = Store.getCategories();
    
    // Determine filter bounds
    const pType = activePeriodFilter === 'minggu' ? 'weekly' : (activePeriodFilter === 'bulan' ? 'monthly' : 'custom');
    const bounds = Calc.getPeriodBounds(pType, customDateRange.start, customDateRange.end);

    // Active month/period label
    const activePeriodLabel = document.getElementById('history-active-period-label');
    if (activePeriodLabel) {
      activePeriodLabel.textContent = bounds.label;
    }

    // Highlight History Type Tabs
    document.querySelectorAll('.history-type-btn').forEach(btn => {
      const type = btn.getAttribute('data-type');
      if (type === activeTypeFilter) {
        btn.className = 'history-type-btn px-3 py-1 rounded-full text-[12px] font-bold pill-btn-active transition-all cursor-pointer';
      } else {
        btn.className = 'history-type-btn px-3 py-1 rounded-full text-[12px] font-bold pill-btn-inactive transition-all cursor-pointer';
      }
    });

    // Highlight Period Tabs (Clean Pill Design)
    document.querySelectorAll('.period-tab').forEach(btn => {
      const period = btn.getAttribute('data-period');
      if (period === activePeriodFilter) {
        btn.className = 'period-tab px-4 py-1.5 rounded-full text-[13px] pill-btn-active cursor-pointer';
      } else {
        btn.className = 'period-tab px-4 py-1.5 rounded-full text-[13px] pill-btn-inactive cursor-pointer';
      }
    });

    // Query filtered transactions
    const filteredTx = Store.getTransactions({
      startDate: bounds.startDateISO,
      endDate: bounds.endDateISO,
      categoryId: activeCategoryFilter,
      type: activeTypeFilter,
      searchQuery
    });

    // Category Filter Chips with counts
    const filterChipContainer = document.getElementById('history-category-chips');
    if (filterChipContainer) {
      const allTxInPeriod = Store.getTransactions({
        startDate: bounds.startDateISO,
        endDate: bounds.endDateISO,
        type: activeTypeFilter,
        searchQuery
      });

      const filterCategories = activeTypeFilter === 'all' 
        ? categories 
        : categories.filter(c => c.type === activeTypeFilter);

      let chipsHtml = `
        <button class="filter-chip shrink-0 h-9 px-unit-4 rounded-full font-body-sm text-body-sm font-medium shadow-sm transition-transform active:scale-95 ${activeCategoryFilter === 'all' ? 'bg-on-surface text-surface-container-lowest' : 'bg-surface-container-lowest text-on-surface-variant'}" onclick="UI.setCategoryFilter('all')">
          Semua (${allTxInPeriod.length})
        </button>
      `;

      filterCategories.forEach(cat => {
        const count = allTxInPeriod.filter(t => t.categoryId === cat.id).length;
        const isSelected = activeCategoryFilter === cat.id;
        chipsHtml += `
          <button class="filter-chip shrink-0 h-9 px-unit-4 rounded-full font-body-sm text-body-sm font-medium shadow-sm flex items-center gap-1.5 transition-transform active:scale-95 ${isSelected ? 'bg-on-surface text-surface-container-lowest' : 'bg-surface-container-lowest text-on-surface-variant'}" onclick="UI.setCategoryFilter('${cat.id}')">
            <span>${cat.shortName || cat.name}</span>
            <span class="px-1.5 py-0.5 rounded-full font-label-caps text-label-caps ${isSelected ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'}">${count}</span>
          </button>
        `;
      });

      filterChipContainer.innerHTML = chipsHtml;
    }

    // Summary Metric Banner
    const totalExpense = filteredTx.filter(t => t.type !== 'income').reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const totalIncome = filteredTx.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const netTotal = totalIncome - totalExpense;

    const summaryTotalEl = document.getElementById('history-summary-total');
    const summaryCountEl = document.getElementById('history-summary-count');
    const summaryAvgEl = document.getElementById('history-summary-avg');

    if (summaryTotalEl) {
      if (activeTypeFilter === 'income') {
        summaryTotalEl.textContent = `+${Calc.formatIDR(totalIncome, true)}`;
        summaryTotalEl.className = 'text-[24px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums';
      } else if (activeTypeFilter === 'expense') {
        summaryTotalEl.textContent = `-${Calc.formatIDR(totalExpense, true)}`;
        summaryTotalEl.className = 'text-[24px] font-bold text-on-surface tabular-nums';
      } else {
        const sign = netTotal > 0 ? '+' : (netTotal < 0 ? '-' : '');
        summaryTotalEl.textContent = `${sign}${Calc.formatIDR(Math.abs(netTotal), true)}`;
        summaryTotalEl.className = `text-[24px] font-bold ${netTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} tabular-nums`;
      }
    }

    if (summaryCountEl) {
      summaryCountEl.textContent = `${filteredTx.length} Transaksi`;
    }

    if (summaryAvgEl) {
      if (activeTypeFilter === 'income') {
        const avg = bounds.elapsedDays > 0 ? Math.round(totalIncome / bounds.elapsedDays) : totalIncome;
        summaryAvgEl.textContent = `Rata-rata +${Calc.formatIDR(avg, true)} / hari (${bounds.elapsedDays} hari berjalan)`;
      } else if (activeTypeFilter === 'expense') {
        const avg = bounds.elapsedDays > 0 ? Math.round(totalExpense / bounds.elapsedDays) : totalExpense;
        summaryAvgEl.textContent = `Rata-rata ${Calc.formatIDR(avg, true)} / hari (${bounds.elapsedDays} hari berjalan)`;
      } else {
        summaryAvgEl.textContent = `Keluar ${Calc.formatIDR(totalExpense, true)} • Masuk ${Calc.formatIDR(totalIncome, true)}`;
      }
    }

    // Grouped Daily Timeline Feed
    const feedContainer = document.getElementById('history-feed');
    if (feedContainer) {
      if (filteredTx.length === 0) {
        feedContainer.innerHTML = `
          <div class="p-8 text-center bg-surface-container-lowest rounded-2xl shadow-sm text-on-surface-variant flex flex-col items-center gap-2">
            <span class="material-symbols-outlined text-[36px] text-outline-variant">search_off</span>
            <p class="font-headline-sm text-on-surface">Tidak ada transaksi ditemukan</p>
            <p class="font-body-sm">Coba ubah kata kunci pencarian, filter kategori, atau periode tanggal.</p>
          </div>
        `;
      } else {
        const grouped = Calc.groupTransactionsByDay(filteredTx);
        feedContainer.innerHTML = grouped.map(group => {
          let groupTotalHtml = '';
          if (activeTypeFilter === 'income') {
            groupTotalHtml = `<span class="text-[12px] text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">+${Calc.formatIDR(group.totalIncome, true)}</span>`;
          } else if (activeTypeFilter === 'expense') {
            groupTotalHtml = `<span class="text-[12px] text-on-surface-variant font-semibold tabular-nums">-${Calc.formatIDR(group.totalExpense, true)}</span>`;
          } else {
            if (group.totalIncome > 0 && group.totalExpense > 0) {
              groupTotalHtml = `
                <div class="text-[12px] flex items-center gap-1.5 tabular-nums">
                  <span class="text-emerald-600 dark:text-emerald-400 font-bold">+${Calc.formatIDR(group.totalIncome, true)}</span>
                  <span class="text-on-surface-variant/40">/</span>
                  <span class="text-on-surface-variant font-semibold">-${Calc.formatIDR(group.totalExpense, true)}</span>
                </div>
              `;
            } else if (group.totalIncome > 0) {
              groupTotalHtml = `<span class="text-[12px] text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">+${Calc.formatIDR(group.totalIncome, true)}</span>`;
            } else {
              groupTotalHtml = `<span class="text-[12px] text-on-surface-variant font-semibold tabular-nums">-${Calc.formatIDR(group.totalExpense, true)}</span>`;
            }
          }

          return `
            <div class="flex flex-col gap-unit-2">
              <!-- Group Header -->
              <div class="flex items-center justify-between px-1">
                <div class="flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full ${group.isToday ? 'bg-primary-container animate-pulse' : 'bg-outline-variant'}"></span>
                  <span class="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">${group.title}</span>
                </div>
                ${groupTotalHtml}
              </div>
              <!-- Item Cards -->
              <div class="flex flex-col gap-1.5">
                ${group.items.map(t => {
                  const isInc = t.type === 'income';
                  const cat = categories.find(c => c.id === t.categoryId) || { icon: isInc ? 'savings' : 'receipt', colorHex: isInc ? '#059669' : '#006c49', bgColor: isInc ? '#ecfdf5' : '#e5eeff' };
                  return `
                    <div class="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] active:bg-surface-container-low transition-colors cursor-pointer min-h-[56px]" onclick="UI.openEditTxModal('${t.id}')">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background-color: ${cat.bgColor}; color: ${cat.colorHex};">
                          <span class="material-symbols-outlined text-[19px]">${cat.icon}</span>
                        </div>
                        <div class="flex flex-col min-w-0">
                          <div class="flex items-center gap-1.5">
                            <span class="text-[13px] font-semibold text-on-surface truncate leading-tight">${t.note || t.categoryName}</span>
                          </div>
                          <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span class="text-[11px] text-on-surface-variant">${t.categoryName} • ${Calc.formatTimeOnly(t.date)}</span>
                            <span class="inline-flex items-center px-1.5 py-0.2 rounded ${isInc ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-surface-container text-on-surface-variant'} text-[10px] font-medium">
                              ${isInc ? 'Masuk' : t.paymentSource}
                            </span>
                            <span class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium">
                              <span class="material-symbols-outlined text-[11px]">cloud_done</span> Synced
                            </span>
                          </div>
                        </div>
                      </div>
                      <div class="flex flex-col items-end shrink-0 pl-unit-2">
                        <span class="text-[13px] font-semibold tabular-nums ${isInc ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-on-surface'}">${isInc ? '+' : '-'}${Calc.formatIDR(t.amount, true)}</span>
                        <span class="text-[11px] text-outline">${isInc ? 'Pemasukan' : t.paymentSource.split('/')[0].trim()}</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  function setCategoryFilter(catId) {
    activeCategoryFilter = catId;
    renderTransactions();
  }

  function openCategoryFilter(catId) {
    activeCategoryFilter = catId;
    switchView('transaksi');
  }

  // --- 3. QUICK ENTRY KEYPAD VIEW ---
  function bindKeypadEvents() {
    const keypad = document.getElementById('keypad');
    if (keypad) {
      keypad.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const val = btn.getAttribute('data-val');

        if (val === 'backspace') {
          const str = keypadRawAmount.toString();
          if (str.length <= 1) {
            keypadRawAmount = 0;
          } else {
            keypadRawAmount = parseInt(str.slice(0, -1), 10) || 0;
          }
        } else if (val === '00') {
          if (keypadRawAmount > 0 && keypadRawAmount < 100000000) {
            keypadRawAmount = keypadRawAmount * 100;
          }
        } else {
          const digit = parseInt(val, 10);
          if (keypadRawAmount === 0) {
            keypadRawAmount = digit;
          } else {
            const newStr = keypadRawAmount.toString() + digit.toString();
            if (newStr.length <= 10) {
              keypadRawAmount = parseInt(newStr, 10);
            }
          }
        }
        updateKeypadDisplay();
      });
    }

    // Quick add pills
    document.querySelectorAll('.quick-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const addVal = parseInt(btn.getAttribute('data-add'), 10);
        keypadRawAmount += addVal;
        updateKeypadDisplay();
      });
    });

    // Segmented Transaction Type Pill (Pengeluaran vs Pemasukan)
    const btnExpense = document.getElementById('btn-tx-type-expense');
    const btnIncome = document.getElementById('btn-tx-type-income');

    btnExpense?.addEventListener('click', () => setKeypadTxType('expense'));
    btnIncome?.addEventListener('click', () => setKeypadTxType('income'));

    // Save transaction button
    const saveBtn = document.getElementById('save-transaction-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (keypadRawAmount <= 0) {
          showToast(`Masukkan nominal ${currentTxType === 'income' ? 'pemasukan' : 'pengeluaran'} terlebih dahulu!`, 'warning');
          return;
        }

        const noteInput = document.getElementById('note-input');
        const note = noteInput ? noteInput.value : '';

        // Current timestamp with selected date
        const now = new Date();
        const [y, m, d] = selectedTxDate.split('-');
        const txDate = new Date(y, parseInt(m, 10) - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());

        Store.addTransaction({
          amount: keypadRawAmount,
          type: currentTxType,
          categoryId: selectedCategoryId,
          note: note,
          paymentSource: selectedPaymentSource,
          date: txDate.toISOString()
        });

        // Animation & Toast
        saveBtn.classList.add('scale-95');
        setTimeout(() => saveBtn.classList.remove('scale-95'), 150);

        const typeLabel = currentTxType === 'income' ? 'Pemasukan' : 'Pengeluaran';
        showToast(`${typeLabel} tersimpan: ${Calc.formatIDR(keypadRawAmount, true)}`);

        // Reset note and amount to standard
        if (noteInput) noteInput.value = '';
        keypadRawAmount = 0;
        updateKeypadDisplay();

        // Switch to dashboard after short delay
        setTimeout(() => {
          switchView('dashboard');
        }, 400);
      });
    }

    // Date selector trigger in quick entry
    const dateBtn = document.getElementById('btn-entry-date');
    if (dateBtn) {
      dateBtn.addEventListener('click', () => {
        const picker = document.getElementById('entry-date-picker-input');
        if (picker) {
          picker.showPicker ? picker.showPicker() : picker.focus();
        }
      });
    }

    const datePickerInput = document.getElementById('entry-date-picker-input');
    if (datePickerInput) {
      datePickerInput.value = selectedTxDate;
      datePickerInput.addEventListener('change', (e) => {
        selectedTxDate = e.target.value;
        const dateLabel = document.getElementById('entry-date-label');
        if (dateLabel) {
          const todayStr = new Date().toISOString().split('T')[0];
          dateLabel.textContent = selectedTxDate === todayStr ? 'Hari ini' : Calc.formatDateDisplay(selectedTxDate);
        }
      });
    }
  }

  function renderKeypadView() {
    const categories = Store.getCategories(currentTxType);
    const picker = document.getElementById('category-picker');

    // Update pill buttons style
    const btnExpense = document.getElementById('btn-tx-type-expense');
    const btnIncome = document.getElementById('btn-tx-type-income');
    if (currentTxType === 'expense') {
      btnExpense?.classList.remove('pill-btn-inactive');
      btnExpense?.classList.add('pill-btn-active');
      btnIncome?.classList.remove('pill-btn-active');
      btnIncome?.classList.add('pill-btn-inactive');
    } else {
      btnIncome?.classList.remove('pill-btn-inactive');
      btnIncome?.classList.add('pill-btn-active');
      btnExpense?.classList.remove('pill-btn-active');
      btnExpense?.classList.add('pill-btn-inactive');
    }

    if (!categories.find(c => c.id === selectedCategoryId)) {
      selectedCategoryId = categories[0]?.id || '';
    }

    if (picker) {
      picker.innerHTML = categories.map(cat => {
        const isSelected = cat.id === selectedCategoryId;
        return `
          <button class="cat-pill flex items-center gap-2 p-2.5 rounded-xl transition-all text-left ${isSelected ? 'bg-primary text-white shadow-md ring-2 ring-primary/20' : 'bg-surface-container-lowest text-on-surface hover:bg-slate-50 active:scale-98'}" data-cat="${cat.id}" onclick="UI.selectKeypadCategory('${cat.id}')" type="button">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-surface-container text-primary'}">
              <span class="material-symbols-outlined text-[18px]">${cat.icon}</span>
            </div>
            <div class="min-w-0">
              <p class="text-[13px] leading-tight font-semibold truncate ${isSelected ? 'text-white' : 'text-on-surface'}">${cat.shortName || cat.name}</p>
              <p class="text-[10px] mt-0.5 truncate ${isSelected ? 'text-white/80' : 'text-on-surface-variant'}">${cat.subtitle || ''}</p>
            </div>
          </button>
        `;
      }).join('');
    }

    updateKeypadDisplay();
  }

  function selectKeypadCategory(catId) {
    selectedCategoryId = catId;
    renderKeypadView();
  }

  function setKeypadTxType(type) {
    currentTxType = type;
    const availableCats = Store.getCategories(currentTxType);
    if (!availableCats.find(c => c.id === selectedCategoryId)) {
      selectedCategoryId = availableCats[0]?.id || '';
    }
    renderKeypadView();
  }

  function selectPaymentSource(source) {
    selectedPaymentSource = source;
    const label = document.getElementById('selected-source-label');
    if (label) label.textContent = source;
    closeModal('modal-payment-source');
  }

  function updateKeypadDisplay() {
    const amountDisplay = document.getElementById('amount-display');
    const ctaLabel = document.getElementById('cta-label');

    const formatted = Calc.formatIDR(keypadRawAmount);
    if (amountDisplay) amountDisplay.textContent = formatted;
    if (ctaLabel) {
      const typeText = currentTxType === 'income' ? 'Pemasukan' : 'Pengeluaran';
      ctaLabel.textContent = keypadRawAmount > 0 
        ? `Simpan ${typeText} (${Calc.formatIDR(keypadRawAmount, true)})`
        : `Simpan ${typeText}`;
    }
  }

  function bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // If typing in input or modal is open, ignore
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (currentView !== 'quick-entry') return;

      if (e.key >= '0' && e.key <= '9') {
        const digit = parseInt(e.key, 10);
        if (keypadRawAmount === 0) {
          keypadRawAmount = digit;
        } else {
          keypadRawAmount = parseInt(keypadRawAmount.toString() + digit, 10);
        }
        updateKeypadDisplay();
      } else if (e.key === 'Backspace') {
        const str = keypadRawAmount.toString();
        keypadRawAmount = str.length <= 1 ? 0 : parseInt(str.slice(0, -1), 10) || 0;
        updateKeypadDisplay();
      } else if (e.key === 'Enter') {
        document.getElementById('save-transaction-btn')?.click();
      }
    });
  }

  // Helper: Pixel-perfect slider progress fill
  function updateSliderProgress(slider) {
    if (!slider) return;
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 100;
    const val = parseFloat(slider.value) || 0;
    const ratio = Math.max(0, Math.min(1, (val - min) / (max - min)));
    slider.style.setProperty('--slider-fill', `calc(8px + (100% - 16px) * ${ratio})`);
    slider.style.setProperty('--slider-pct', `${ratio * 100}%`);
  }

  // --- 4. BUDGET MANAGEMENT RENDERER ---
  function bindBudgetConfigEvents() {
    // Period Switcher Buttons in Budget View
    document.querySelectorAll('.budget-period-switch').forEach(btn => {
      btn.addEventListener('click', () => {
        const pType = btn.getAttribute('data-period-type');
        Store.updateBudgetConfig({ periodType: pType });
      });
    });

    // Total Budget Steppers
    document.querySelectorAll('.budget-step-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.getAttribute('data-step'), 10);
        const config = Store.getBudgetConfig();
        const pType = config.periodType;

        if (pType === 'weekly') {
          const current = config.weeklyLimit || 1200000;
          Store.updateBudgetConfig({ weeklyLimit: Math.max(100000, current + step) });
        } else if (pType === 'monthly') {
          const current = config.monthlyLimit || 4000000;
          Store.updateBudgetConfig({ monthlyLimit: Math.max(500000, current + step) });
        } else {
          const current = config.customLimit || 3000000;
          Store.updateBudgetConfig({ customLimit: Math.max(500000, current + step) });
        }
        showToast('Plafon total anggaran diperbarui!');
      });
    });

    // Direct input total budget
    const totalInput = document.getElementById('total-budget-input');
    if (totalInput) {
      totalInput.addEventListener('change', (e) => {
        const val = Calc.parseIDR(e.target.value);
        if (val > 0) {
          const config = Store.getBudgetConfig();
          if (config.periodType === 'weekly') {
            Store.updateBudgetConfig({ weeklyLimit: val });
          } else if (config.periodType === 'monthly') {
            Store.updateBudgetConfig({ monthlyLimit: val });
          } else {
            Store.updateBudgetConfig({ customLimit: val });
          }
          showToast(`Plafon diubah: ${Calc.formatIDR(val, true)}`);
        }
      });
    }

    // Threshold Sliders
    const slider1 = document.getElementById('slider-threshold-warn');
    if (slider1) {
      slider1.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        document.getElementById('threshold-warn-val').textContent = `${val}%`;
        updateSliderProgress(slider1);
        Store.updateBudgetConfig({ warningThreshold: val });

        const budgetConfig = Store.getBudgetConfig();
        const telemetry = Calc.getPeriodTelemetry(budgetConfig, Store.getTransactions(), Store.getCategories());
        const warnAmt = Math.round(telemetry.totalLimit * (val / 100));
        const note1 = document.getElementById('note-threshold-warn');
        if (note1) note1.innerHTML = `Notifikasi visual saat pengeluaran capai <strong>${Calc.formatIDR(warnAmt, true)}</strong>`;
      });
    }

    const slider2 = document.getElementById('slider-threshold-crit');
    if (slider2) {
      slider2.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        document.getElementById('threshold-crit-val').textContent = `${val}%`;
        updateSliderProgress(slider2);
        Store.updateBudgetConfig({ criticalThreshold: val });

        const budgetConfig = Store.getBudgetConfig();
        const telemetry = Calc.getPeriodTelemetry(budgetConfig, Store.getTransactions(), Store.getCategories());
        const critAmt = Math.round(telemetry.totalLimit * (val / 100));
        const note2 = document.getElementById('note-threshold-crit');
        if (note2) note2.innerHTML = `Peringatan visual & haptik saat tembus <strong>${Calc.formatIDR(critAmt, true)}</strong>`;
      });
    }

    // Rollover & Carryover Toggles
    const toggleRollover = document.getElementById('toggle-auto-rollover');
    if (toggleRollover) {
      toggleRollover.addEventListener('change', (e) => {
        Store.updateBudgetConfig({ autoRollover: e.target.checked });
        showToast(e.target.checked ? 'Rollover otomatis diaktifkan' : 'Rollover dinonaktifkan');
      });
    }

    const toggleCarryover = document.getElementById('toggle-carryover');
    if (toggleCarryover) {
      toggleCarryover.addEventListener('change', (e) => {
        Store.updateBudgetConfig({ carryOver: e.target.checked });
        showToast(e.target.checked ? 'Sisa saldo akan di-carryover' : 'Carryover dinonaktifkan');
      });
    }
  }

  function renderBudgetManagement() {
    const budgetConfig = Store.getBudgetConfig();
    const transactions = Store.getTransactions();
    const categories = Store.getCategories();
    const telemetry = Calc.getPeriodTelemetry(budgetConfig, transactions, categories);

    // Period switcher tabs (Clean Pill Design)
    document.querySelectorAll('.budget-period-switch').forEach(btn => {
      const pType = btn.getAttribute('data-period-type');
      if (pType === telemetry.periodType) {
        btn.className = 'budget-period-switch h-9 rounded-full pill-btn-active text-[13px] flex items-center justify-center cursor-pointer';
      } else {
        btn.className = 'budget-period-switch h-9 rounded-full pill-btn-inactive text-[13px] flex items-center justify-center cursor-pointer';
      }
    });

    // Active period banner
    const activeLabelEl = document.getElementById('budget-active-period-name');
    const activeRangeEl = document.getElementById('budget-active-period-range');
    const daysLeftEl = document.getElementById('budget-active-days-left');
    const elapsedBarEl = document.getElementById('budget-active-elapsed-bar');

    if (activeLabelEl) activeLabelEl.textContent = telemetry.bounds.label;
    if (activeRangeEl) activeRangeEl.textContent = telemetry.bounds.subLabel;
    if (daysLeftEl) daysLeftEl.textContent = `${telemetry.bounds.daysRemaining} Hari`;
    if (elapsedBarEl) elapsedBarEl.style.width = `${telemetry.bounds.elapsedPercent}%`;

    // Plafon Total Input
    const totalInput = document.getElementById('total-budget-input');
    if (totalInput) totalInput.value = Calc.formatIDR(telemetry.totalLimit);

    // Thresholds
    const slider1 = document.getElementById('slider-threshold-warn');
    const slider2 = document.getElementById('slider-threshold-crit');
    const val1 = document.getElementById('threshold-warn-val');
    const val2 = document.getElementById('threshold-crit-val');
    const note1 = document.getElementById('note-threshold-warn');
    const note2 = document.getElementById('note-threshold-crit');

    const warnAmt = Math.round(telemetry.totalLimit * (telemetry.warnThresh / 100));
    const critAmt = Math.round(telemetry.totalLimit * (telemetry.critThresh / 100));

    if (slider1) {
      slider1.value = telemetry.warnThresh;
      updateSliderProgress(slider1);
    }
    if (slider2) {
      slider2.value = telemetry.critThresh;
      updateSliderProgress(slider2);
    }
    if (val1) val1.textContent = `${telemetry.warnThresh}%`;
    if (val2) val2.textContent = `${telemetry.critThresh}%`;
    if (note1) note1.innerHTML = `Notifikasi visual saat pengeluaran capai <strong>${Calc.formatIDR(warnAmt, true)}</strong>`;
    if (note2) note2.innerHTML = `Peringatan visual & haptik saat tembus <strong>${Calc.formatIDR(critAmt, true)}</strong>`;

    // Category Plafon List
    const categoryAllocationList = document.getElementById('budget-category-allocations');
    if (categoryAllocationList) {
      categoryAllocationList.innerHTML = telemetry.categoryBreakdown.map(item => `
        <div class="p-unit-4 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col space-y-unit-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-unit-3 min-w-0">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style="background-color: ${item.category.bgColor}; color: ${item.category.colorHex};">
                <span class="material-symbols-outlined text-[22px]">${item.category.icon}</span>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h3 class="text-[14px] font-semibold text-on-surface truncate">${item.category.name}</h3>
                  ${item.catStatus === 'warning' ? `<span class="px-2 py-0.5 rounded-full bg-[#d97706] text-white text-[10px] font-bold tracking-wide">Waspada</span>` : ''}
                  ${item.catStatus === 'danger' ? `<span class="px-2 py-0.5 rounded-full bg-[#dc2626] text-white text-[10px] font-bold tracking-wide">Over</span>` : ''}
                </div>
                <span class="text-[12px] text-on-surface-variant">Limit ${Calc.formatIDR(item.limit, true)}</span>
              </div>
            </div>
            <button aria-label="Edit Plafon ${item.category.name}" class="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-transform" onclick="UI.openEditCategoryLimitModal('${item.category.id}')" type="button">
              <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
          </div>
          <div class="space-y-1.5">
            <div class="flex justify-between items-baseline">
              <span class="text-[14px] font-semibold text-on-surface tabular-nums">${Calc.formatIDR(item.spent, true)}</span>
              <span class="text-[11px] font-bold ${item.catStatus === 'danger' ? 'text-red-600' : (item.catStatus === 'warning' ? 'text-amber-600' : 'text-emerald-700')}">
                ${item.percent}% (${item.catStatus === 'danger' ? 'Over' : (item.catStatus === 'warning' ? 'Ambang Batas' : 'Aman')})
              </span>
            </div>
            <div class="w-full bg-surface-container h-2 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-300 ${item.catBarBg}" style="width: ${item.progressWidth}%;"></div>
            </div>
            <span class="text-[12px] text-on-surface-variant">
              ${item.remaining >= 0 ? `Sisa plafon: ${Calc.formatIDR(item.remaining, true)}` : `Melebihi plafon: +${Calc.formatIDR(Math.abs(item.remaining), true)}`}
            </span>
          </div>
        </div>
      `).join('');
    }
  }

  // --- 5. SETTINGS VIEW RENDERER ---
  function bindSettingsEvents() {
    // Export JSON Backup
    document.getElementById('btn-export-backup')?.addEventListener('click', () => {
      Store.exportBackupJSON();
      showToast('Backup JSON berhasil diunduh!');
    });

    // Import JSON Backup
    const fileInput = document.getElementById('input-import-backup');
    document.getElementById('btn-import-backup')?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const success = Store.importBackupJSON(event.target.result);
        if (success) {
          showToast('Data berhasil dipulihkan dari backup!');
        } else {
          showToast('File backup tidak valid!', 'danger');
        }
      };
      reader.readAsText(file);
    });



    // Add Custom Category Button
    document.getElementById('btn-add-category')?.addEventListener('click', () => {
      openModal('modal-add-category');
    });

    // --- Firebase Cloud Sync Events ---
    document.getElementById('btn-open-firebase-config')?.addEventListener('click', () => {
      const cfg = window.FirebaseSync ? window.FirebaseSync.getConfig() : null;
      if (cfg) {
        document.getElementById('firebase-cfg-api-key').value = cfg.apiKey || '';
        document.getElementById('firebase-cfg-project-id').value = cfg.projectId || '';
        document.getElementById('firebase-cfg-auth-domain').value = cfg.authDomain || '';
        document.getElementById('firebase-cfg-app-id').value = cfg.appId || '';
        document.getElementById('btn-remove-firebase-cfg')?.classList.remove('hidden');
      } else {
        document.getElementById('btn-remove-firebase-cfg')?.classList.add('hidden');
      }
      openModal('modal-firebase-config');
    });

    document.getElementById('btn-save-firebase-cfg')?.addEventListener('click', async () => {
      const apiKey = document.getElementById('firebase-cfg-api-key').value.trim();
      const projectId = document.getElementById('firebase-cfg-project-id').value.trim();
      const authDomain = document.getElementById('firebase-cfg-auth-domain').value.trim();
      const appId = document.getElementById('firebase-cfg-app-id').value.trim();

      if (!apiKey || !projectId) {
        showToast('API Key dan Project ID wajib diisi!', 'warning');
        return;
      }

      try {
        if (window.FirebaseSync) {
          await window.FirebaseSync.saveConfig({ apiKey, projectId, authDomain, appId });
          closeModal('modal-firebase-config');
          showToast('Konfigurasi Firebase disimpan!');
          renderSettings();
        }
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });

    document.getElementById('btn-demo-firebase-cfg')?.addEventListener('click', () => {
      const jsonStr = prompt('Tempelkan (Paste) konfigurasi JSON dari Firebase Console:\nContoh: { "apiKey": "...", "projectId": "..." }');
      if (!jsonStr) return;
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.apiKey) document.getElementById('firebase-cfg-api-key').value = parsed.apiKey;
        if (parsed.projectId) document.getElementById('firebase-cfg-project-id').value = parsed.projectId;
        if (parsed.authDomain) document.getElementById('firebase-cfg-auth-domain').value = parsed.authDomain;
        if (parsed.appId) document.getElementById('firebase-cfg-app-id').value = parsed.appId;
        showToast('Konfigurasi JSON berhasil dibaca!');
      } catch (e) {
        showToast('Format JSON tidak valid!', 'danger');
      }
    });

    document.getElementById('btn-remove-firebase-cfg')?.addEventListener('click', () => {
      if (confirm('Hapus konfigurasi Firebase dan kembali ke mode lokal murni?')) {
        if (window.FirebaseSync) window.FirebaseSync.removeConfig();
        closeModal('modal-firebase-config');
        showToast('Kembali ke mode penyimpanan lokal');
        renderSettings();
      }
    });

    document.getElementById('btn-sync-anonymous')?.addEventListener('click', async () => {
      if (!window.FirebaseSync || !window.FirebaseSync.isConfigured()) {
        showToast('Masukkan konfigurasi Firebase terlebih dahulu', 'warning');
        document.getElementById('btn-open-firebase-config')?.click();
        return;
      }
      try {
        showToast('Menghubungkan ke Cloud Firestore...');
        await window.FirebaseSync.loginAnonymously();
        showToast('Berhasil terhubung ke Cloud!');
        renderSettings();
      } catch (err) {
        showToast('Gagal terhubung: ' + err.message, 'danger');
      }
    });

    document.getElementById('btn-sync-google')?.addEventListener('click', async () => {
      if (!window.FirebaseSync || !window.FirebaseSync.isConfigured()) {
        showToast('Masukkan konfigurasi Firebase terlebih dahulu', 'warning');
        document.getElementById('btn-open-firebase-config')?.click();
        return;
      }
      try {
        showToast('Membuka Google Sign-In...');
        await window.FirebaseSync.loginWithGoogle();
        showToast('Login Google berhasil, data disinkronkan!');
        renderSettings();
      } catch (err) {
        showToast('Login Google gagal: ' + err.message, 'danger');
      }
    });

    document.getElementById('btn-disconnect-cloud')?.addEventListener('click', async () => {
      if (confirm('Putuskan koneksi cloud? Data Anda tetap tersimpan di penyimpanan lokal.')) {
        if (window.FirebaseSync) await window.FirebaseSync.logout();
        showToast('Koneksi cloud diputuskan');
        renderSettings();
      }
    });
  }

  function renderSettings() {
    const categories = Store.getCategories();
    const catList = document.getElementById('settings-category-list');
    if (catList) {
      catList.innerHTML = categories.map(cat => {
        const isInc = cat.type === 'income';
        return `
        <div class="flex items-center justify-between p-3 rounded-xl bg-surface-container-lowest shadow-sm">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background-color: ${cat.bgColor}; color: ${cat.colorHex};">
              <span class="material-symbols-outlined text-[20px]">${cat.icon}</span>
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <p class="text-[13px] font-semibold text-on-surface">${cat.name}</p>
                ${isInc ? `<span class="px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">Pemasukan</span>` : ''}
              </div>
              <p class="text-[11px] text-on-surface-variant">${cat.subtitle || 'Kategori'}</p>
            </div>
          </div>
          ${!cat.isDefault ? `
            <button class="w-8 h-8 rounded-lg flex items-center justify-center text-error hover:bg-error-container" onclick="UI.deleteCategory('${cat.id}')">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          ` : `<span class="text-[10px] font-medium text-outline px-2 py-0.5 rounded bg-surface-container">Default</span>`}
        </div>
      `;
      }).join('');
    }

    // Render Cloud Sync Section Status
    const badge = document.getElementById('cloud-sync-badge');
    const desc = document.getElementById('cloud-sync-status-desc');
    const userLabel = document.getElementById('cloud-user-id');
    const syncTime = document.getElementById('cloud-sync-time');
    const authBtns = document.getElementById('cloud-auth-buttons');
    const disconnectBtn = document.getElementById('btn-disconnect-cloud');

    const isCfg = window.FirebaseSync && window.FirebaseSync.isConfigured();
    const isConn = window.FirebaseSync && window.FirebaseSync.isConnected();
    const user = window.FirebaseSync ? window.FirebaseSync.getCurrentUser() : null;

    if (badge && desc && userLabel && syncTime) {
      if (isConn && user) {
        badge.className = 'px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-bold text-[10px] animate-pulse';
        badge.textContent = 'Cloud Terhubung';
        desc.textContent = 'Sinkronisasi real-time Firestore aktif';
        userLabel.textContent = user.isAnonymous 
          ? `Akun Anonim (${user.uid.slice(0, 8)}...)` 
          : (user.email || `User: ${user.uid.slice(0, 8)}`);
        syncTime.textContent = 'Perubahan data otomatis disinkronkan ke server';
        
        authBtns?.classList.add('hidden');
        disconnectBtn?.classList.remove('hidden');
        disconnectBtn?.classList.add('flex');
      } else if (isCfg) {
        badge.className = 'px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-bold text-[10px]';
        badge.textContent = 'Kunci Terpasang';
        desc.textContent = 'Firebase terkonfigurasi, belum masuk akun';
        userLabel.textContent = 'Mode Lokal (Tersedia Cloud)';
        syncTime.textContent = 'Tekan tombol Sync Anonim untuk mulai sinkron';

        authBtns?.classList.remove('hidden');
        disconnectBtn?.classList.add('hidden');
        disconnectBtn?.classList.remove('flex');
      } else {
        badge.className = 'px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-bold text-[10px]';
        badge.textContent = 'Lokal Murni';
        desc.textContent = 'Penyimpanan lokal browser (Offline-first)';
        userLabel.textContent = 'Belum Terhubung ke Cloud';
        syncTime.textContent = 'Data tersimpan aman di perangkat ini';

        authBtns?.classList.remove('hidden');
        disconnectBtn?.classList.add('hidden');
        disconnectBtn?.classList.remove('flex');
      }
    }

    // Render Theme Selector state
    const currentTheme = Store.getTheme ? Store.getTheme() : 'system';
    updateThemeSelectorUI(currentTheme);
  }

  // --- THEME & DARK MODE CONTROLLER ---
  function initTheme() {
    const savedTheme = Store.getTheme ? Store.getTheme() : 'system';
    applyTheme(savedTheme, false);

    // Listen for OS scheme changes when set to auto/system
    if (window.matchMedia) {
      try {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
          const activeTheme = Store.getTheme ? Store.getTheme() : 'system';
          if (activeTheme === 'system') {
            applyTheme('system', false);
          }
        });
      } catch (e) {}
    }
  }

  function applyTheme(themeName, showToastMsg = true) {
    const isSystem = themeName === 'system';
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = themeName === 'dark' || (isSystem && systemPrefersDark);

    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Update meta theme-color for mobile top status bar
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', shouldBeDark ? '#0f172a' : '#006c49');
    }

    updateThemeSelectorUI(themeName);

    if (showToastMsg) {
      const msg = themeName === 'dark' ? 'Mode Gelap diaktifkan' : (themeName === 'light' ? 'Mode Terang diaktifkan' : 'Tema Otomatis (Sistem) diaktifkan');
      showToast(msg);
    }
  }

  function updateThemeSelectorUI(themeName) {
    const activeLabel = document.getElementById('theme-active-label');
    const cardIcon = document.getElementById('theme-card-icon');
    if (activeLabel) {
      activeLabel.textContent = themeName === 'dark' ? 'Gelap' : (themeName === 'light' ? 'Terang' : 'Sistem');
    }
    if (cardIcon) {
      cardIcon.textContent = themeName === 'dark' ? 'dark_mode' : (themeName === 'light' ? 'light_mode' : 'settings_brightness');
    }

    document.querySelectorAll('.theme-option-btn').forEach(btn => {
      const btnTheme = btn.getAttribute('data-theme');
      if (btnTheme === themeName) {
        btn.className = 'theme-option-btn h-9 rounded-full text-[12px] font-bold flex items-center justify-center gap-1.5 pill-btn-active cursor-pointer';
      } else {
        btn.className = 'theme-option-btn h-9 rounded-full text-[12px] font-medium flex items-center justify-center gap-1.5 pill-btn-inactive cursor-pointer';
      }
    });
  }

  function bindThemeEvents() {
    document.querySelectorAll('.theme-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = btn.getAttribute('data-theme');
        if (Store.setTheme) {
          Store.setTheme(selected);
        }
        applyTheme(selected, true);
      });
    });
  }

  function deleteCategory(catId) {
    if (confirm('Hapus kategori ini?')) {
      Store.deleteCategory(catId);
      showToast('Kategori dihapus');
      renderSettings();
    }
  }

  // --- 6. MODALS & TOAST ---
  function bindModalEvents() {
    // Backdrop click to close modals
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.add('hidden');
        }
      });
    });

    // Modal Close Buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        closeModal(modalId);
      });
    });

    // Save Edit Transaction
    document.getElementById('btn-save-edit-tx')?.addEventListener('click', () => {
      const id = document.getElementById('edit-tx-id').value;
      const amount = Calc.parseIDR(document.getElementById('edit-tx-amount').value);
      const note = document.getElementById('edit-tx-note').value;
      const categoryId = document.getElementById('edit-tx-category').value;
      const dateVal = document.getElementById('edit-tx-date').value;

      if (amount <= 0) {
        showToast('Nominal harus lebih dari 0', 'warning');
        return;
      }

      Store.updateTransaction(id, {
        amount,
        note,
        categoryId,
        date: dateVal ? new Date(dateVal).toISOString() : undefined
      });

      closeModal('modal-edit-tx');
      showToast('Transaksi berhasil diperbarui!');
    });

    // Delete Transaction
    document.getElementById('btn-delete-tx')?.addEventListener('click', () => {
      const id = document.getElementById('edit-tx-id').value;
      if (confirm('Hapus catatan transaksi ini?')) {
        Store.deleteTransaction(id);
        closeModal('modal-edit-tx');
        showToast('Transaksi dihapus');
      }
    });

    // Save Category Limit
    document.getElementById('btn-save-category-limit')?.addEventListener('click', () => {
      const catId = document.getElementById('edit-cat-limit-id').value;
      const limitVal = Calc.parseIDR(document.getElementById('edit-cat-limit-input').value);

      if (limitVal > 0) {
        Store.setCategoryLimit(catId, limitVal);
        closeModal('modal-edit-cat-limit');
        showToast('Plafon kategori disimpan!');
      }
    });

    // --- Modal Add Category Interactive Events ---
    // Live update preview when name input changes
    const newCatNameInput = document.getElementById('new-cat-name');
    const newCatPreviewName = document.getElementById('new-cat-preview-name');
    newCatNameInput?.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (newCatPreviewName) {
        newCatPreviewName.textContent = val || 'Nama Kategori';
      }
    });

    // Icon chip selection
    const newCatIconInput = document.getElementById('new-cat-icon');
    const newCatPreviewIcon = document.getElementById('new-cat-preview-icon');
    const iconChips = document.querySelectorAll('.cat-icon-chip');
    iconChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const iconName = chip.getAttribute('data-icon');
        if (newCatIconInput) newCatIconInput.value = iconName;
        if (newCatPreviewIcon) newCatPreviewIcon.textContent = iconName;

        iconChips.forEach(c => {
          c.className = 'cat-icon-chip w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-white/60 dark:hover:bg-slate-800 active:scale-95 transition-all';
        });
        chip.className = 'cat-icon-chip w-10 h-10 rounded-xl flex items-center justify-center text-primary dark:text-emerald-400 bg-white dark:bg-slate-800 shadow-sm ring-2 ring-primary active:scale-95 transition-all';
      });
    });

    // Color swatches selection
    const newCatColorInput = document.getElementById('new-cat-color');
    const newCatHexLabel = document.getElementById('new-cat-hex-label');
    const newCatPreviewBox = document.getElementById('new-cat-preview-box');
    const colorSwatches = document.querySelectorAll('.cat-color-swatch');

    function selectCategoryColor(colorHex, activeSwatch = null) {
      if (newCatColorInput) newCatColorInput.value = colorHex;
      if (newCatHexLabel) newCatHexLabel.textContent = colorHex.toUpperCase();
      if (newCatPreviewBox) newCatPreviewBox.style.backgroundColor = colorHex;

      colorSwatches.forEach(swatch => {
        const check = swatch.querySelector('.material-symbols-outlined');
        if (swatch === activeSwatch) {
          swatch.classList.add('ring-2', 'ring-offset-2', 'ring-primary', 'dark:ring-offset-slate-800');
          if (check) check.classList.remove('hidden');
        } else {
          swatch.classList.remove('ring-2', 'ring-offset-2', 'ring-primary', 'dark:ring-offset-slate-800');
          if (check) check.classList.add('hidden');
        }
      });
    }

    colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        const color = swatch.getAttribute('data-color');
        selectCategoryColor(color, swatch);
      });
    });

    // Custom color picker input
    newCatColorInput?.addEventListener('input', (e) => {
      selectCategoryColor(e.target.value, null);
    });

    // Category type toggles in modal
    const btnNewCatExp = document.getElementById('btn-new-cat-expense');
    const btnNewCatInc = document.getElementById('btn-new-cat-income');
    const inputNewCatType = document.getElementById('new-cat-type');

    btnNewCatExp?.addEventListener('click', () => {
      if (inputNewCatType) inputNewCatType.value = 'expense';
      btnNewCatExp.className = 'flex-1 py-1.5 rounded-full text-[12px] font-bold pill-btn-active transition-all cursor-pointer';
      btnNewCatInc.className = 'flex-1 py-1.5 rounded-full text-[12px] font-bold pill-btn-inactive transition-all cursor-pointer';
    });

    btnNewCatInc?.addEventListener('click', () => {
      if (inputNewCatType) inputNewCatType.value = 'income';
      btnNewCatInc.className = 'flex-1 py-1.5 rounded-full text-[12px] font-bold pill-btn-active transition-all cursor-pointer';
      btnNewCatExp.className = 'flex-1 py-1.5 rounded-full text-[12px] font-bold pill-btn-inactive transition-all cursor-pointer';
    });

    // Save New Category
    document.getElementById('btn-save-new-category')?.addEventListener('click', () => {
      const name = document.getElementById('new-cat-name').value.trim();
      const icon = document.getElementById('new-cat-icon').value.trim() || 'category';
      const colorHex = document.getElementById('new-cat-color').value || '#006c49';
      const catType = inputNewCatType?.value || 'expense';

      if (!name) {
        showToast('Nama kategori wajib diisi', 'warning');
        return;
      }

      Store.addCategory({
        name,
        shortName: name,
        subtitle: catType === 'income' ? 'Pemasukan' : 'Kategori Kustom',
        type: catType,
        icon,
        colorHex,
        bgColor: colorHex + '20'
      });

      closeModal('modal-add-category');
      showToast(`Kategori ${name} ditambahkan!`);
      renderSettings();
      renderBudgetManagement();
    });

    // Custom Date Range Apply
    document.getElementById('btn-apply-custom-date')?.addEventListener('click', () => {
      const start = document.getElementById('custom-start-date').value;
      const end = document.getElementById('custom-end-date').value;
      if (start && end) {
        customDateRange = { start, end };
        activePeriodFilter = 'kustom';
        closeModal('modal-custom-date');
        renderTransactions();
      } else {
        showToast('Pilih tanggal awal dan akhir', 'warning');
      }
    });
  }

  function resetAddCategoryModal() {
    const nameInput = document.getElementById('new-cat-name');
    const previewName = document.getElementById('new-cat-preview-name');
    const iconInput = document.getElementById('new-cat-icon');
    const previewIcon = document.getElementById('new-cat-preview-icon');
    const colorInput = document.getElementById('new-cat-color');
    const hexLabel = document.getElementById('new-cat-hex-label');
    const previewBox = document.getElementById('new-cat-preview-box');
    const btnNewCatExp = document.getElementById('btn-new-cat-expense');
    const btnNewCatInc = document.getElementById('btn-new-cat-income');
    const inputNewCatType = document.getElementById('new-cat-type');

    if (inputNewCatType) inputNewCatType.value = 'expense';
    if (btnNewCatExp) btnNewCatExp.className = 'flex-1 py-1.5 rounded-full text-[12px] font-bold pill-btn-active transition-all cursor-pointer';
    if (btnNewCatInc) btnNewCatInc.className = 'flex-1 py-1.5 rounded-full text-[12px] font-bold pill-btn-inactive transition-all cursor-pointer';

    if (nameInput) nameInput.value = '';
    if (previewName) previewName.textContent = 'Nama Kategori';
    if (iconInput) iconInput.value = 'volunteer_activism';
    if (previewIcon) previewIcon.textContent = 'volunteer_activism';
    if (colorInput) colorInput.value = '#006c49';
    if (hexLabel) hexLabel.textContent = '#006C49';
    if (previewBox) previewBox.style.backgroundColor = '#006c49';

    const iconChips = document.querySelectorAll('.cat-icon-chip');
    iconChips.forEach((c, idx) => {
      if (idx === 0) {
        c.className = 'cat-icon-chip w-10 h-10 rounded-xl flex items-center justify-center text-primary dark:text-emerald-400 bg-white dark:bg-slate-800 shadow-sm ring-2 ring-primary active:scale-95 transition-all';
      } else {
        c.className = 'cat-icon-chip w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-white/60 dark:hover:bg-slate-800 active:scale-95 transition-all';
      }
    });

    const colorSwatches = document.querySelectorAll('.cat-color-swatch');
    colorSwatches.forEach((swatch, idx) => {
      const check = swatch.querySelector('.material-symbols-outlined');
      if (idx === 0) {
        swatch.classList.add('ring-2', 'ring-offset-2', 'ring-primary', 'dark:ring-offset-slate-800');
        if (check) check.classList.remove('hidden');
      } else {
        swatch.classList.remove('ring-2', 'ring-offset-2', 'ring-primary', 'dark:ring-offset-slate-800');
        if (check) check.classList.add('hidden');
      }
    });
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      if (modalId === 'modal-add-category') {
        resetAddCategoryModal();
      }
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  function openEditTxModal(txId) {
    const tx = Store.getTransactionById(txId);
    if (!tx) return;

    const categories = Store.getCategories();
    document.getElementById('edit-tx-id').value = tx.id;
    document.getElementById('edit-tx-amount').value = Calc.formatIDR(tx.amount);
    document.getElementById('edit-tx-note').value = tx.note || '';
    document.getElementById('edit-tx-date').value = tx.date.split('T')[0];

    const catSelect = document.getElementById('edit-tx-category');
    if (catSelect) {
      catSelect.innerHTML = categories.map(c => `
        <option value="${c.id}" ${c.id === tx.categoryId ? 'selected' : ''}>${c.name} ${c.type === 'income' ? '(Pemasukan)' : ''}</option>
      `).join('');
    }

    openModal('modal-edit-tx');
  }

  function openEditCategoryLimitModal(catId) {
    const cat = Store.getCategoryById(catId);
    const budgetConfig = Store.getBudgetConfig();
    const currentLimit = (budgetConfig.categoryLimits && budgetConfig.categoryLimits[catId]) || 1000000;

    document.getElementById('edit-cat-limit-id').value = catId;
    document.getElementById('edit-cat-limit-name').textContent = cat ? cat.name : 'Kategori';
    document.getElementById('edit-cat-limit-input').value = Calc.formatIDR(currentLimit);

    openModal('modal-edit-cat-limit');
  }

  function openCustomDateModal() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('custom-start-date').value = customDateRange.start || today;
    document.getElementById('custom-end-date').value = customDateRange.end || today;
    openModal('modal-custom-date');
  }

  function showToast(message, type = 'success') {
    const toast = document.getElementById('save-toast');
    const toastMsg = document.getElementById('toast-message');
    if (!toast) return;

    if (toastMsg) toastMsg.textContent = message;
    
    toast.classList.remove('opacity-0', 'pointer-events-none');
    toast.classList.add('opacity-100', '-translate-y-2');

    setTimeout(() => {
      toast.classList.remove('opacity-100', '-translate-y-2');
      toast.classList.add('opacity-0', 'pointer-events-none');
    }, 2400);
  }

  return {
    init,
    switchView,
    renderCurrentView,
    setCategoryFilter,
    openCategoryFilter,
    selectKeypadCategory,
    setKeypadTxType,
    selectPaymentSource,
    openEditTxModal,
    openEditCategoryLimitModal,
    openCustomDateModal,
    openModal,
    closeModal,
    deleteCategory,
    applyTheme,
    showToast
  };
})();

if (typeof window !== 'undefined') {
  window.UI = UI;
}
