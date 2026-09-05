/**
 * FinFlow PWA - Store Engine & Local Persistence Layer
 * Structured for seamless future Firestore & Firebase Auth integration.
 */

const Store = (function() {
  const STORAGE_KEYS = {
    TRANSACTIONS: 'finflow_transactions_v1',
    CATEGORIES: 'finflow_categories_v1',
    BUDGET: 'finflow_budget_config_v1',
    USER: 'finflow_user_profile_v1',
    THEME: 'finflow_theme_v1'
  };

  // Default Categories (matching PRD & Stitch design)
  const DEFAULT_CATEGORIES = [
    {
      id: 'cat_makanan',
      name: 'Makanan & Minuman',
      shortName: 'Makan',
      subtitle: 'Kuliner & Cafe',
      icon: 'restaurant',
      colorHex: '#006c49',
      bgColor: '#e5eeff',
      type: 'expense',
      isDefault: true
    },
    {
      id: 'cat_transport',
      name: 'Transportasi',
      shortName: 'Transport',
      subtitle: 'Bensin, Ojol, Parkir',
      icon: 'commute',
      colorHex: '#565e74',
      bgColor: '#dae2fd',
      type: 'expense',
      isDefault: true
    },
    {
      id: 'cat_belanja',
      name: 'Belanja Harian',
      shortName: 'Belanja',
      subtitle: 'Supermarket & Retail',
      icon: 'shopping_bag',
      colorHex: '#006c49',
      bgColor: '#e5eeff',
      type: 'expense',
      isDefault: true
    },
    {
      id: 'cat_tagihan',
      name: 'Tagihan & Utilitas',
      shortName: 'Tagihan',
      subtitle: 'Listrik, Wifi, Air',
      icon: 'electric_bolt',
      colorHex: '#855300',
      bgColor: '#ffddb8',
      type: 'expense',
      isDefault: true
    },
    {
      id: 'cat_hiburan',
      name: 'Hiburan & Hobi',
      shortName: 'Hiburan',
      subtitle: 'Film, Game, Rekreasi',
      icon: 'sports_esports',
      colorHex: '#006c49',
      bgColor: '#e5eeff',
      type: 'expense',
      isDefault: true
    },
    {
      id: 'cat_kesehatan',
      name: 'Kesehatan',
      shortName: 'Kesehatan',
      subtitle: 'Apotek & Dokter',
      icon: 'medical_services',
      colorHex: '#ba1a1a',
      bgColor: '#ffdad6',
      type: 'expense',
      isDefault: true
    },
    {
      id: 'cat_lainnya',
      name: 'Lain-lain',
      shortName: 'Lainnya',
      subtitle: 'Pengeluaran rupa-rupa',
      icon: 'more_horiz',
      colorHex: '#6c7a71',
      bgColor: '#eff4ff',
      type: 'expense',
      isDefault: true
    },
    // Default Income Categories
    {
      id: 'cat_inc_gaji',
      name: 'Gaji Pokok',
      shortName: 'Gaji',
      subtitle: 'Payroll & Upah Kerja',
      icon: 'payments',
      colorHex: '#059669',
      bgColor: '#d1fae5',
      type: 'income',
      isDefault: true
    },
    {
      id: 'cat_inc_freelance',
      name: 'Freelance & Proyek',
      shortName: 'Freelance',
      subtitle: 'Side Hustle & Jasa',
      icon: 'laptop_mac',
      colorHex: '#2563eb',
      bgColor: '#dbeafe',
      type: 'income',
      isDefault: true
    },
    {
      id: 'cat_inc_investasi',
      name: 'Investasi & Bunga',
      shortName: 'Investasi',
      subtitle: 'Dividen, Reksadana, Bunga',
      icon: 'trending_up',
      colorHex: '#7c3aed',
      bgColor: '#f3e8ff',
      type: 'income',
      isDefault: true
    },
    {
      id: 'cat_inc_bonus',
      name: 'Bonus & Hadiah',
      shortName: 'Bonus',
      subtitle: 'THR, Reward, Hadiah',
      icon: 'redeem',
      colorHex: '#d97706',
      bgColor: '#fef3c7',
      type: 'income',
      isDefault: true
    },
    {
      id: 'cat_inc_lainnya',
      name: 'Pemasukan Lain',
      shortName: 'Lainnya',
      subtitle: 'Transferan & Cashflow Masuk',
      icon: 'account_balance_wallet',
      colorHex: '#0d9488',
      bgColor: '#ccfbf1',
      type: 'income',
      isDefault: true
    }
  ];

  // Default Initial Budget Configuration (Default: Weekly as confirmed in PRD)
  const DEFAULT_BUDGET_CONFIG = {
    periodType: 'weekly', // 'weekly' (default per PRD) | 'monthly' | 'custom'
    weeklyLimit: 1200000,
    monthlyLimit: 4000000,
    customStartDate: '',
    customEndDate: '',
    customLimit: 3000000,
    warningThreshold: 80,  // percent
    criticalThreshold: 100, // percent
    autoRollover: true,
    carryOver: true,
    categoryLimits: {
      'cat_makanan': 1600000,
      'cat_transport': 600000,
      'cat_tagihan': 800000,
      'cat_belanja': 1000000
    }
  };



  // Event Listeners for reactive updates
  const listeners = [];
  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  function notify(event, data) {
    listeners.forEach(fn => {
      try {
        fn(event, data);
      } catch (err) {
        console.error('Store listener error:', err);
      }
    });

    // Automatically trigger cloud sync if FirebaseSync is active
    if (window.FirebaseSync && window.FirebaseSync.pushChange) {
      window.FirebaseSync.pushChange(event, data);
    }
  }

  function notifyLocalOnly(event, data) {
    listeners.forEach(fn => {
      try {
        fn(event, data);
      } catch (err) {
        console.error('Store local listener error:', err);
      }
    });
  }

  // Persistence helpers
  function load(key, fallback) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      console.error('Failed to load from storage key:', key, e);
      return fallback;
    }
  }

  function save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to storage key:', key, e);
    }
  }

  // Initial State Bootstrapping - Clean without demo data
  const DEMO_TRANSACTION_NOTES = new Set([
    'Makan Siang Soto Betawi',
    'Kopi & Roti Siang',
    'Parkir Motor',
    'Superindo Bahan Masak',
    'Bensin Motor Pertamax',
    'Listrik PLN & Indihome',
    'Tiket Bioskop Weekend',
    'Vitamin & Obat Apotek'
  ]);

  let transactions = load(STORAGE_KEYS.TRANSACTIONS, []);
  if (!Array.isArray(transactions)) {
    transactions = [];
  }
  // Automatically purge any remaining demo seed transactions
  const prevCount = transactions.length;
  transactions = transactions.filter(t => !DEMO_TRANSACTION_NOTES.has(t.note));
  if (transactions.length !== prevCount || !localStorage.getItem('finflow_demo_purged_v1')) {
    save(STORAGE_KEYS.TRANSACTIONS, transactions);
    try {
      localStorage.setItem('finflow_demo_purged_v1', 'true');
    } catch (e) {}
  }

  let categories = load(STORAGE_KEYS.CATEGORIES, null);
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    categories = [...DEFAULT_CATEGORIES];
    save(STORAGE_KEYS.CATEGORIES, categories);
  } else {
    // Ensure all default categories (especially income ones) are merged
    let updated = false;
    DEFAULT_CATEGORIES.forEach(defCat => {
      if (!categories.some(c => c.id === defCat.id)) {
        categories.push(defCat);
        updated = true;
      }
    });
    // Ensure existing categories have type
    categories.forEach(c => {
      if (!c.type) {
        c.type = c.id.startsWith('cat_inc_') ? 'income' : 'expense';
        updated = true;
      }
    });
    if (updated) {
      save(STORAGE_KEYS.CATEGORIES, categories);
    }
  }

  let budgetConfig = load(STORAGE_KEYS.BUDGET, null);
  if (!budgetConfig || !budgetConfig.periodType) {
    budgetConfig = { ...DEFAULT_BUDGET_CONFIG };
    save(STORAGE_KEYS.BUDGET, budgetConfig);
  }

  let userProfile = load(STORAGE_KEYS.USER, {
    displayName: 'Pengguna FinFlow',
    email: 'user@finflow.app',
    currency: 'IDR',
    currencySymbol: 'Rp'
  });

  return {
    subscribe,

    // --- TRANSACTIONS ---
    getTransactions(filter = {}) {
      let list = [...transactions];

      if (filter.startDate) {
        const start = new Date(filter.startDate).getTime();
        list = list.filter(t => new Date(t.date).getTime() >= start);
      }
      if (filter.endDate) {
        const end = new Date(filter.endDate).getTime();
        list = list.filter(t => new Date(t.date).getTime() <= end);
      }
      if (filter.type && filter.type !== 'all') {
        list = list.filter(t => (t.type || 'expense') === filter.type);
      }
      if (filter.categoryId && filter.categoryId !== 'all') {
        list = list.filter(t => t.categoryId === filter.categoryId);
      }
      if (filter.searchQuery && filter.searchQuery.trim() !== '') {
        const q = filter.searchQuery.toLowerCase().trim();
        list = list.filter(t => 
          (t.note && t.note.toLowerCase().includes(q)) ||
          (t.categoryName && t.categoryName.toLowerCase().includes(q)) ||
          (t.paymentSource && t.paymentSource.toLowerCase().includes(q)) ||
          t.amount.toString().includes(q)
        );
      }

      // Sort newest first
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return list;
    },

    getTransactionById(id) {
      return transactions.find(t => t.id === id) || null;
    },

    addTransaction(txData) {
      const category = categories.find(c => c.id === txData.categoryId) || categories[0];
      const txType = txData.type || (category && category.type ? category.type : 'expense');
      const newTx = {
        id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        amount: Number(txData.amount) || 0,
        type: txType,
        categoryId: category.id,
        categoryName: category.name,
        date: txData.date || new Date().toISOString(),
        note: (txData.note || '').trim(),
        paymentSource: txData.paymentSource || 'QRIS / BCA',
        createdAt: new Date().toISOString()
      };

      transactions.unshift(newTx);
      save(STORAGE_KEYS.TRANSACTIONS, transactions);
      notify('TRANSACTION_ADDED', newTx);
      return newTx;
    },

    updateTransaction(id, updatedFields) {
      const idx = transactions.findIndex(t => t.id === id);
      if (idx === -1) return null;

      if (updatedFields.categoryId) {
        const cat = categories.find(c => c.id === updatedFields.categoryId);
        if (cat) {
          updatedFields.categoryName = cat.name;
          if (cat.type && !updatedFields.type) {
            updatedFields.type = cat.type;
          }
        }
      }

      transactions[idx] = {
        ...transactions[idx],
        ...updatedFields,
        amount: updatedFields.amount !== undefined ? Number(updatedFields.amount) : transactions[idx].amount,
        updatedAt: new Date().toISOString()
      };

      save(STORAGE_KEYS.TRANSACTIONS, transactions);
      notify('TRANSACTION_UPDATED', transactions[idx]);
      return transactions[idx];
    },

    deleteTransaction(id) {
      const idx = transactions.findIndex(t => t.id === id);
      if (idx === -1) return false;

      const deleted = transactions.splice(idx, 1)[0];
      save(STORAGE_KEYS.TRANSACTIONS, transactions);
      notify('TRANSACTION_DELETED', deleted);
      return true;
    },

    // --- CATEGORIES ---
    getCategories(type = 'all') {
      if (type === 'all') return [...categories];
      return categories.filter(c => (c.type || 'expense') === type);
    },

    getCategoryById(id) {
      return categories.find(c => c.id === id) || null;
    },

    addCategory(catData) {
      const newCat = {
        id: 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: catData.name,
        shortName: catData.shortName || catData.name,
        subtitle: catData.subtitle || '',
        icon: catData.icon || 'category',
        colorHex: catData.colorHex || '#006c49',
        bgColor: catData.bgColor || '#e5eeff',
        type: catData.type || 'expense',
        isDefault: false
      };
      categories.push(newCat);
      save(STORAGE_KEYS.CATEGORIES, categories);
      notify('CATEGORY_ADDED', newCat);
      return newCat;
    },

    updateCategory(id, updatedFields) {
      const idx = categories.findIndex(c => c.id === id);
      if (idx === -1) return null;

      categories[idx] = { ...categories[idx], ...updatedFields };
      save(STORAGE_KEYS.CATEGORIES, categories);

      // Update denormalized categoryName in transactions
      if (updatedFields.name) {
        transactions.forEach(t => {
          if (t.categoryId === id) t.categoryName = updatedFields.name;
        });
        save(STORAGE_KEYS.TRANSACTIONS, transactions);
      }

      notify('CATEGORY_UPDATED', categories[idx]);
      return categories[idx];
    },

    deleteCategory(id) {
      const idx = categories.findIndex(c => c.id === id);
      if (idx === -1) return false;
      const cat = categories[idx];
      if (cat.isDefault) {
        // Disallow deleting base default categories, but allow reset
        return false;
      }
      categories.splice(idx, 1);
      save(STORAGE_KEYS.CATEGORIES, categories);
      notify('CATEGORY_DELETED', cat);
      return true;
    },

    // --- BUDGET CONFIG ---
    getBudgetConfig() {
      return { ...budgetConfig };
    },

    updateBudgetConfig(newFields) {
      budgetConfig = { ...budgetConfig, ...newFields };
      save(STORAGE_KEYS.BUDGET, budgetConfig);
      notify('BUDGET_CONFIG_UPDATED', budgetConfig);
      return budgetConfig;
    },

    setCategoryLimit(categoryId, limitAmount) {
      if (!budgetConfig.categoryLimits) budgetConfig.categoryLimits = {};
      budgetConfig.categoryLimits[categoryId] = Number(limitAmount) || 0;
      save(STORAGE_KEYS.BUDGET, budgetConfig);
      notify('BUDGET_LIMIT_UPDATED', budgetConfig);
      return budgetConfig;
    },

    removeCategoryLimit(categoryId) {
      if (budgetConfig.categoryLimits && budgetConfig.categoryLimits[categoryId] !== undefined) {
        delete budgetConfig.categoryLimits[categoryId];
        save(STORAGE_KEYS.BUDGET, budgetConfig);
        notify('BUDGET_LIMIT_UPDATED', budgetConfig);
      }
      return budgetConfig;
    },

    // --- CSV EXPORT & BACKUP ---
    exportTransactionsCSV(filter = {}) {
      const list = this.getTransactions(filter);
      const headers = ['ID', 'Tanggal', 'Jenis', 'Kategori', 'Catatan', 'Nominal (Rp)', 'Metode Pembayaran'];
      const rows = list.map(t => [
        `"${t.id}"`,
        `"${t.date.replace('T', ' ')}"`,
        `"${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}"`,
        `"${(t.categoryName || '').replace(/"/g, '""')}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`,
        t.amount,
        `"${(t.paymentSource || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `FinFlow_Transaksi_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    exportBackupJSON() {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        transactions,
        categories,
        budgetConfig,
        userProfile
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `FinFlow_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    importBackupJSON(jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (data && Array.isArray(data.transactions) && Array.isArray(data.categories)) {
          transactions = data.transactions;
          categories = data.categories;
          budgetConfig = data.budgetConfig || budgetConfig;
          userProfile = data.userProfile || userProfile;

          save(STORAGE_KEYS.TRANSACTIONS, transactions);
          save(STORAGE_KEYS.CATEGORIES, categories);
          save(STORAGE_KEYS.BUDGET, budgetConfig);
          save(STORAGE_KEYS.USER, userProfile);

          notify('STATE_RESTORED', null);
          return true;
        }
      } catch (err) {
        console.error('Import error:', err);
      }
      return false;
    },

    clearAllTransactions() {
      transactions = [];
      save(STORAGE_KEYS.TRANSACTIONS, transactions);
      notify('STATE_RESET', null);
    },

    // Remote sync integration methods
    mergeRemoteTransactions(remoteTxs) {
      if (!Array.isArray(remoteTxs)) return;
      const map = new Map();
      transactions.forEach(t => map.set(t.id, t));
      remoteTxs.forEach(t => map.set(t.id, t));

      transactions = Array.from(map.values());
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      save(STORAGE_KEYS.TRANSACTIONS, transactions);
      notifyLocalOnly('REMOTE_TRANSACTIONS_MERGED', transactions);
    },

    mergeRemoteBudget(remoteBudget) {
      if (!remoteBudget || typeof remoteBudget !== 'object') return;
      budgetConfig = { ...budgetConfig, ...remoteBudget };
      save(STORAGE_KEYS.BUDGET, budgetConfig);
      notifyLocalOnly('REMOTE_BUDGET_MERGED', budgetConfig);
    },

    getTheme() {
      try {
        return localStorage.getItem(STORAGE_KEYS.THEME) || 'system';
      } catch (e) {
        return 'system';
      }
    },

    setTheme(theme) {
      try {
        localStorage.setItem(STORAGE_KEYS.THEME, theme);
        notifyLocalOnly('THEME_CHANGED', { theme });
      } catch (e) {
        console.error('Failed to save theme:', e);
      }
    }
  };
})();

if (typeof window !== 'undefined') {
  window.Store = Store;
}
