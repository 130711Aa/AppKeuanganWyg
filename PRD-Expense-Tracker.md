# PRD: Expense Tracker App
**Versi:** 0.1 (Draft)
**Author:** Wayang
**Tanggal:** 5 September 2026

---

## 1. Ringkasan Produk

Aplikasi personal expense tracker yang memungkinkan user mencatat pengeluaran, mengelompokkannya ke kategori, dan menetapkan batas anggaran (budget limit) untuk periode waktu tertentu (default: bulanan). Backend menggunakan Firebase/Firestore (free tier — Spark plan).

**Yang BUKAN scope MVP ini:** multi-user shared budgeting, integrasi bank/e-wallet otomatis, multi-currency. Ini murni single-user, manual entry.

---

## 2. Masalah yang Diselesaikan

User gak punya visibility real-time soal berapa banyak yang udah dihabiskan vs budget yang ditetapkan, sehingga baru sadar overspend setelah kejadian (akhir bulan/cek mutasi rekening). App ini kasih *feedback loop* langsung: catat pengeluaran → lihat sisa budget → dapat warning kalau mendekati/melewati limit.

---

## 3. Target User & Asumsi

- **Single user, dipakai sendiri** (dikonfirmasi) — bukan shared/multi-user budgeting. Autentikasi via Firebase Auth tetap dipakai untuk isolasi data, bukan untuk multi-akun collaborative.
- User terbiasa input manual, bukan auto-sync dari bank.
- 1 mata uang (default IDR), tidak ada multi-currency di MVP.
- **Periode budget yang paling sering dipakai: mingguan** (dikonfirmasi) — jadi default UI sebaiknya langsung ke "Weekly" saat pertama kali setup budget, bukan "Monthly". Opsi bulanan/custom tetap ada tapi bukan default.

---

## 4. Fitur Inti (MVP)

### 4.1 Transaction Tracking
- Tambah/edit/hapus transaksi: jumlah, kategori, tanggal, catatan opsional, (opsional) foto struk.
- List transaksi dengan filter (tanggal, kategori) dan search.
- Kategori default (Makanan, Transport, Tagihan, Hiburan, Belanja, Lainnya) + custom kategori buatan user.

### 4.2 Budget Limit per Periode
- User set limit budget total per periode (bulanan default) dan/atau limit per kategori.
- Periode bisa dikonfigurasi: mingguan, bulanan, atau custom (tanggal mulai–selesai).
- Sistem otomatis reset/rollover budget di awal periode baru.
- Progress bar / indikator visual: berapa % budget terpakai.
- Notifikasi/warning saat mendekati (misal 80%) atau melewati limit — minimal in-app banner; push notification jadi nice-to-have (butuh Cloud Messaging, di luar scope Firestore murni).

### 4.3 Dashboard & Laporan
- Ringkasan periode berjalan: total spend, sisa budget, breakdown per kategori (pie/bar chart).
- Riwayat periode sebelumnya (bandingkan bulan-ke-bulan).

### 4.4 Autentikasi & Data Ownership
- Firebase Auth untuk isolasi data per user.
- Firestore Security Rules: user hanya bisa akses dokumen miliknya sendiri (`request.auth.uid == resource.data.userId`).

---

## 5. Data Model (Firestore)

```
/users/{userId}
  - displayName, email, defaultCurrency, createdAt

/users/{userId}/categories/{categoryId}
  - name, icon, colorHex, isDefault

/users/{userId}/transactions/{transactionId}
  - amount: number
  - categoryId: string
  - date: timestamp
  - note: string (optional)
  - receiptUrl: string (optional, Firebase Storage)
  - createdAt: timestamp

/users/{userId}/budgets/{budgetId}
  - periodType: "weekly" | "monthly" | "custom"
  - startDate: timestamp
  - endDate: timestamp
  - totalLimit: number
  - categoryLimits: map<categoryId, number>  // opsional, per-kategori
  - createdAt: timestamp
```

**Catatan desain penting:**
- Denormalisasi ringan disarankan: simpan `categoryName` di transaksi juga (selain `categoryId`) supaya query list gak perlu join manual tiap render — Firestore gak punya JOIN native.
- Query "total spend periode berjalan" sebaiknya di-cache di client atau pakai Cloud Function (Firestore trigger) yang update field `currentSpend` di dokumen budget setiap ada transaksi baru — jangan hitung ulang dari semua transaksi tiap kali dashboard dibuka, itu boros read quota dan lambat begitu data numpuk.

---

## 6. Non-Functional Requirements

| Aspek | Requirement |
|---|---|
| Cost | Harus tetap dalam Firestore Spark (free) tier — 50K read/20K write/hari cukup untuk single-user, tapi hindari pola query yang re-fetch seluruh koleksi transaksi tiap load |
| Security | Firestore Security Rules wajib, jangan andalkan client-side filtering saja |
| Offline | Firestore punya offline persistence built-in — manfaatkan supaya app tetap bisa dipakai tanpa koneksi, sync saat online lagi |
| Performance | Pagination pada list transaksi (jangan fetch semua sekaligus kalau data udah ratusan/ribuan entri) |

---

## 7. Tech Stack (Diputuskan)

- **Platform: PWA (Progressive Web App)** — dipilih dibanding native app (React Native/Flutter — overkill untuk single-user, nambah biaya App Store & build pipeline yang gak sepadan) dan web app biasa tanpa PWA (friksi tinggi untuk quick-entry harian karena harus buka browser tiap kali). PWA kasih: installable ke homescreen, offline-first (selaras sama Firestore offline persistence), nol biaya distribusi (deploy ke Firebase Hosting, masih Spark plan/gratis).
  - **Known limitation:** push notification di iOS Safari baru didukung dari iOS 16.4+ dan behaviornya kurang konsisten. Kalau budget-alert notification krusial dan lo pakai iOS, ini perlu diperhitungkan; kalau Android atau cek manual cukup, bukan masalah.
- **Frontend framework:** React (dengan service worker + web app manifest untuk PWA capability).
- **Backend/DB:** Firebase Firestore + Firebase Auth.
- **Storage:** Firebase Storage (kalau fitur foto struk dipakai) — perhatian: ini limit free tier terpisah (5GB, 1GB/hari download).
- **Otomasi budget:** Cloud Functions (butuh Blaze plan pay-as-you-go untuk outbound network kalau mau trigger function — cek ulang, karena ini bisa nabrak asumsi "gratis" lo. Alternatif: hitung ulang di client tanpa Cloud Function, tetap gratis tapi kurang efisien).

---

## 8. Risiko & Open Questions

1. **Cloud Functions butuh Blaze plan** untuk sebagian besar trigger (outbound HTTP) — kalau lo strict mau 100% gratis, logic update `currentSpend` harus dilakukan di client-side, bukan server-side. Ini trade-off yang perlu lo putuskan sebelum mulai coding, bukan pas udah setengah jalan.
2. Definisi "periode" custom butuh UI/UX yang jelas biar gak bingung user (mis. gimana kalau ganti tanggal mulai budget di tengah periode berjalan?).
3. Belum ada keputusan soal push notification (butuh FCM + izin notifikasi OS) — kalau penting, masukkan ke MVP; kalau bisa nunggu, taruh di fase 2.

---

## 9. Roadmap Singkat

- **Fase 1 (MVP):** Auth, transaction CRUD, kategori, budget per periode (hitung client-side), dashboard dasar.
- **Fase 2:** Notifikasi, laporan perbandingan antar-periode, foto struk.
- **Fase 3:** Export data (CSV), widget home screen (kalau mobile).
