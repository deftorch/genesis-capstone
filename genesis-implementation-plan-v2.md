# 🛠️ Rencana Implementasi Perbaikan — Genesis v2.0

**Dokumen:** Implementation Plan v2.0 — Revisi & Kelanjutan dari v1.0  
**Dibuat:** 5 Juni 2026  
**Berdasarkan:** Analisis mendalam codebase (144 files, ~14K LOC)  
**Prinsip Utama:** Refactor tanpa mengubah UI/UX yang sudah ada

---

## Status Plan v1.0

Berikut ringkasan progres dari plan sebelumnya sebelum memulai v2.0:

| Item | Status | Keterangan |
|---|---|---|
| 1.1 Rate limiting semua endpoint | ✅ Selesai | Semua 4 endpoint sudah terlindungi |
| 1.2 Bersihkan debug code | ⚠️ Parsial | `ImageAnalysis.tsx:86–89` masih ada `console.log` aktif |
| 1.3 Hapus sidebar duplikat | ✅ Selesai | `components/sidebar/` tidak ada |
| 2.1 Hubungkan chat summarizer | ✅ Selesai | `buildContextForAPI()` sudah terintegrasi |
| 2.2 Token count akurat | ❌ Belum | Masih `Math.ceil(length / 4)` di `useChatSubmit.ts:88` |
| 2.3 Ganti image hosting ke Supabase | ✅ Selesai | Upload sudah ke Supabase Storage |
| 2.4 Unit test gemini-client | ✅ Selesai | 169 baris test sudah ada |
| 3.x Refactoring ChatPanel | ❌ Belum | Masih 1.507 baris |
| 4.1 Streaming response | ✅ Selesai | SSE streaming sudah berjalan |
| 4.2 History artifact | ⚠️ Parsial | `useChatSubmit` OK, tapi `page.tsx` masih hapus sebelum tambah |
| 4.3 Test upload validation | ✅ Selesai | 5 test sudah ada (no file, wrong type, bad bytes, Supabase, sukses) |
| 4.4 Housekeeping | ⚠️ Parsial | README belum update, `.env.example` masih perlu perbaikan |

---

## Aturan Dasar (Berlaku untuk Semua Sprint)

> **Jangan ubah apa yang tidak rusak.**  
> Setiap perbaikan harus transparan bagi pengguna — tampilan, interaksi, dan perilaku UI tetap identik.

| ✅ Boleh Diubah | ❌ Tidak Boleh Disentuh |
|---|---|
| `app/api/*` | Semua class Tailwind CSS |
| `lib/*` | Layout dan struktur JSX |
| `hooks/*` | Warna, spacing, tipografi |
| `lib/store/*` | Animasi dan transisi |
| Struktur internal komponen | Interaksi dan behavior pengguna |

---

## Ringkasan Sprint v2.0

| Sprint | Fokus | Durasi | Risiko UI | Prioritas |
|---|---|---|---|---|
| **Sprint 0** | Hotfix Keamanan Kritis | **1 hari** | 🟢 Nol | 🔴 Kritis — lakukan segera |
| **Sprint 1** | Sisa v1.0 + Isu Medium Baru | 3 hari | 🟢 Nol | 🔴 Kritis |
| **Sprint 2** | Refactoring ChatPanel | 1 minggu | 🟡 Rendah | 🟠 Tinggi |
| **Sprint 3** | Peningkatan & Future | 1 minggu | 🟡 Rendah | 🟡 Sedang |

---

## Sprint 0 — Hotfix Keamanan Kritis

> **Durasi:** 1 hari (idealnya sebelum deploy berikutnya)  
> **Risiko UI:** 🟢 Nol — tidak ada perubahan komponen  
> **Tujuan:** Menutup 3 celah keamanan aktif yang ditemukan di luar scope plan v1.0

---

### 0.1 Hapus `NEXT_PUBLIC_*` API Keys dari File Contoh

**File:** `.env.local.example`

**Masalah:** File contoh menampilkan `NEXT_PUBLIC_OPENAI_API_KEY`, `NEXT_PUBLIC_GEMINI_API_KEY`, dll. Prefix `NEXT_PUBLIC_` meng-embed nilai tersebut ke dalam JavaScript bundle yang dikirim ke browser. Developer yang mengikutinya secara tidak sengaja akan mengekspos API key ke siapa pun yang membuka DevTools.

**Langkah:**

- [ ] Buka `.env.local.example`
- [ ] Hapus atau ganti 6 baris `NEXT_PUBLIC_*` berikut:
  ```
  # HAPUS ini:
  NEXT_PUBLIC_OPENAI_API_KEY=
  NEXT_PUBLIC_ANTHROPIC_API_KEY=
  NEXT_PUBLIC_GOOGLE_CLOUD_API_KEY=
  NEXT_PUBLIC_GEMINI_API_KEY=
  NEXT_PUBLIC_OPENROUTER_API_KEY=
  NEXT_PUBLIC_THUMBSNAP_API_KEY=
  ```
- [ ] Ganti dengan versi server-side beserta komentar peringatan:
  ```env
  # ================================================================
  # AI PROVIDER API KEYS — SERVER SIDE ONLY (jangan pakai NEXT_PUBLIC_)
  # Nilai ini TIDAK dikirim ke browser.
  # ================================================================
  GEMINI_API_KEY=your_gemini_api_key_here
  OPENAI_API_KEY=
  ANTHROPIC_API_KEY=
  OPENROUTER_API_KEY=
  ```
- [ ] Tambahkan komentar peringatan di bagian atas file:
  ```env
  # ⚠️  PENTING: Jangan pernah menggunakan prefix NEXT_PUBLIC_ untuk API keys.
  #    Prefix tersebut akan mengekspos key ke browser dan bisa dicuri siapa saja.
  ```
- [ ] Pastikan `.env.local.example` tidak pernah dikunjungi oleh `git add -A` secara tidak sengaja — verifikasi `.gitignore` sudah mengecualikan `.env.local` (bukan `.env.local.example`)

**Verifikasi:**

- [ ] `grep "NEXT_PUBLIC.*KEY" .env.local.example` mengembalikan 0 hasil
- [ ] File `.env.local.example` tetap memiliki semua variable yang dibutuhkan project
- [ ] `bun run build` sukses

---

### 0.2 Hapus Active `console.log` di `ImageAnalysis.tsx`

**File:** `components/image/ImageAnalysis.tsx`, baris 86–89

**Masalah:** Empat baris `console.log` yang **tidak dikomentari** akan mencetak seluruh objek response API ke browser console di produksi, mengekspos struktur data internal.

**Langkah:**

- [ ] Buka `components/image/ImageAnalysis.tsx`
- [ ] Temukan dan **hapus** 4 baris berikut (baris 86–89):
  ```typescript
  // HAPUS keempat baris ini:
  console.log('=== ANALYSIS RESPONSE DEBUG ===');
  console.log('Status:', analysisResponse.status);
  console.log('Response Data:', analysisData);
  console.log('================================');
  ```
- [ ] Jalankan scan menyeluruh untuk memastikan tidak ada `console.log` aktif lain:
  ```bash
  grep -rn "console\.log" app/ components/ hooks/ lib/ \
    --include="*.ts" --include="*.tsx" | grep -v "\.test\." | grep -v "// "
  ```
- [ ] Untuk log yang *memang diperlukan* (mis. error handling di `lib/gemini-client.ts`), ganti ke log kondisional:
  ```typescript
  // Sebelum:
  console.log(`[Gemini Client] Attempting request with key ${i + 1}/${apiKeys.length}...`);
  
  // Sesudah:
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Gemini Client] Attempting request with key ${i + 1}/${apiKeys.length}...`);
  }
  ```

**Verifikasi:**

- [ ] `grep -rn "console\.log" components/image/ImageAnalysis.tsx` mengembalikan 0 hasil
- [ ] Buka aplikasi di browser → buka DevTools Console → lakukan analisis gambar → tidak ada output debug
- [ ] `bun run test:unit` tetap hijau

---

### 0.3 Hapus Query Parameter Token dari Endpoint Cleanup

**File:** `app/api/cleanup-images/route.ts`

**Masalah:** Endpoint menerima autentikasi via `?token=xxx` di URL. Token ini akan muncul di server logs (nginx/Apache), browser history, dan berpotensi di Referer header saat redirect. Best practice: gunakan header `Authorization` saja.

**Langkah:**

- [ ] Buka `app/api/cleanup-images/route.ts`
- [ ] Hapus baris yang membaca query parameter:
  ```typescript
  // HAPUS ini:
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  ```
- [ ] Update logika `isAuthorized` untuk header-only:
  ```typescript
  // SEBELUM:
  const isAuthorized =
    (authHeader === `Bearer ${cronToken}`) ||
    (queryToken === cronToken);
  
  // SESUDAH:
  const isAuthorized = authHeader === `Bearer ${cronToken}`;
  ```
- [ ] Update komentar/dokumentasi di file jika ada yang menyebut query param
- [ ] Update README atau deployment docs jika ada instruksi cron job yang menggunakan `?token=`

  Contoh cron job yang benar (cURL):
  ```bash
  # Benar — token di header, tidak di URL
  curl -X GET https://yourdomain.com/api/cleanup-images \
    -H "Authorization: Bearer your_cron_token_here"
  ```

**Verifikasi:**

- [ ] `GET /api/cleanup-images?token=xxx` mengembalikan 401
- [ ] `GET /api/cleanup-images` dengan header `Authorization: Bearer <token>` mengembalikan 200
- [ ] `bun run test:unit` hijau (update test jika ada yang menguji query param)

---

### ✅ Definition of Done — Sprint 0

- [x] Zero `NEXT_PUBLIC_*` key di `.env.local.example`
- [x] Zero `console.log` aktif (non-commented) di `components/` dan `app/`
- [x] `/api/cleanup-images` hanya menerima autentikasi via header `Authorization`
- [x] `bun run build` sukses tanpa error
- [x] `bun run test:unit` 100% hijau
- [x] Tidak ada perubahan visual di browser

---

## Sprint 1 — Sisa Plan v1.0 + Isu Medium Baru

> **Durasi:** 3 hari  
> **Risiko UI:** 🟢 Nol — hanya layer API, lib, dan konfigurasi  
> **Tujuan:** Tuntas semua item yang masih pending dari plan v1.0, sekaligus menutup isu medium yang ditemukan di analisis v2.0

---

### 1.1 Fix Token Counter — Gunakan `usageMetadata` dari Gemini

**File:** `hooks/useChatSubmit.ts`

**Masalah:** Baris 88 masih menggunakan `Math.ceil(messageToSend.length / 4)`. Estimasi ini tidak akurat untuk Bahasa Indonesia, kode sumber, atau teks campuran. Gemini API sudah mengembalikan token count real di `usageMetadata` pada streaming response akhir.

**Langkah:**

- [ ] Di `useChatSubmit.ts`, ubah inisialisasi token user message:
  ```typescript
  // SEBELUM — estimasi kasar:
  chatStore.addMessage(currentChatId, {
    role: 'user',
    content: messageToSend,
    tokens: Math.ceil(messageToSend.length / 4), // ❌
  });
  
  // SESUDAH — gunakan 0 dulu, update setelah dapat response:
  chatStore.addMessage(currentChatId, {
    role: 'user',
    content: messageToSend,
    tokens: 0,
  });
  ```
- [ ] Setelah stream selesai, ekstrak `usageMetadata` dari chunk terakhir SSE:

  ```typescript
  // Di dalam loop SSE parsing, tangkap usageMetadata dari chunk terakhir:
  let finalUsageMetadata: { promptTokenCount?: number; candidatesTokenCount?: number } | null = null;
  
  // Dalam loop parsing:
  const data = JSON.parse(dataStr);
  if (data.usageMetadata) {
    finalUsageMetadata = data.usageMetadata;
  }
  const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text;
  ```

- [ ] Update token count pesan setelah stream selesai:
  ```typescript
  // Setelah loop SSE selesai:
  if (finalUsageMetadata) {
    chatStore.updateMessage(currentChatId!, messageId, aiContent);
    // Update token pada pesan assistant
    const promptTokens = finalUsageMetadata.promptTokenCount ?? 0;
    const completionTokens = finalUsageMetadata.candidatesTokenCount ?? 0;
    // Opsional: update total tokens di chat
    chatStore.updateChatTokens(currentChatId!, promptTokens + completionTokens);
  }
  ```

- [ ] Tambahkan method `updateChatTokens` di `lib/store/chat-store.ts` jika belum ada:
  ```typescript
  updateChatTokens: (chatId: string, tokens: number) => {
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId
          ? { ...chat, totalTokens: chat.totalTokens + tokens }
          : chat
      ),
    }));
  },
  ```

- [ ] Fallback ke estimasi jika `usageMetadata` tidak tersedia (backward compatible)

**Verifikasi:**

- [ ] Kirim pesan panjang dalam Bahasa Indonesia → token count masuk akal
- [ ] Kirim snippet kode TypeScript 100 baris → token count tidak sama dengan `length/4`
- [ ] `bun run test:unit` hijau

---

### 1.2 Fix MIME Type Detection di Image Analysis

**File:** `app/api/image-analysis/route.ts`

**Masalah:** MIME type dikirim ke Gemini berdasarkan ekstensi URL (hanya `.png` dan `.webp` yang dicek, sisanya default `image/jpeg`). File GIF yang valid akan dikirim sebagai `image/jpeg`, berpotensi menyebabkan error atau analisis yang salah.

**Langkah:**

- [ ] Temukan blok deteksi MIME type (sekitar baris 62–78):
  ```typescript
  // SEBELUM — deteksi dari URL string, rapuh:
  mimeType = imageUrl.toLowerCase().endsWith('.png')
    ? 'image/png'
    : imageUrl.toLowerCase().endsWith('.webp')
    ? 'image/webp'
    : 'image/jpeg'; // ❌ GIF dan format lain salah klasifikasi
  ```
- [ ] Ganti dengan deteksi dari header `Content-Type` response:
  ```typescript
  // SESUDAH — gunakan header dari response HTTP:
  const contentTypeHeader = imageResponse.headers.get('content-type');
  const rawMime = contentTypeHeader?.split(';')[0].trim() ?? '';
  
  // Whitelist MIME type yang didukung Gemini:
  const SUPPORTED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  mimeType = SUPPORTED_MIMES.includes(rawMime) ? rawMime : 'image/jpeg';
  ```
- [ ] Tambahkan log warning jika MIME type tidak dikenali:
  ```typescript
  if (!SUPPORTED_MIMES.includes(rawMime)) {
    console.warn(`[image-analysis] Unrecognized MIME "${rawMime}", defaulting to image/jpeg`);
  }
  ```
- [ ] Tulis atau update test untuk kasus GIF:
  ```typescript
  it('should send correct MIME type for GIF images', async () => { ... });
  ```

**Verifikasi:**

- [ ] Upload dan analisis file GIF → tidak ada error MIME type
- [ ] Upload dan analisis file PNG → terdeteksi sebagai `image/png`
- [ ] Upload dan analisis file dari URL Supabase tanpa ekstensi → terdeteksi dari header
- [ ] `bun run test:unit` hijau

---

### 1.3 Unify Sistem Environment Variable

**File:** `lib/env.ts`, `config/constants.ts`

**Masalah:** Dua sistem env yang tidak sinkron. `lib/env.ts` mendefinisikan validasi lengkap dengan support OpenAI/Anthropic/Google, tapi runtime aktual menggunakan `config/constants.ts` dan `getGeminiApiKeys()`. Developer baru tidak tahu mana yang "benar".

**Langkah:**

- [ ] **Tentukan satu sumber kebenaran:** Karena `config/constants.ts` yang dipakai runtime, jadikan itu primary source.
- [ ] Di `lib/env.ts`, hapus semua logika validasi OpenAI/Anthropic yang tidak dipakai:
  ```typescript
  // HAPUS bagian ini — OpenAI dan Anthropic tidak digunakan di runtime:
  openai: getEnvVar('OPENAI_API_KEY', '', false),
  anthropic: getEnvVar('ANTHROPIC_API_KEY', '', false),
  ```
- [ ] Ubah `lib/env.ts` menjadi wrapper tipis yang mengarah ke `config/constants.ts`:
  ```typescript
  // lib/env.ts — sekarang hanya re-export untuk backward compat
  export { getGeminiApiKeys } from '@/config/constants';
  
  export const env = {
    app: {
      name: process.env.NEXT_PUBLIC_APP_NAME || 'Genesis',
      env: process.env.NODE_ENV || 'development',
    },
    features: {
      enableImageAnalysis: true,
      enableMultipleModels: true,
    },
  };
  ```
- [ ] Cari semua import dari `lib/env.ts` dan update jika perlu:
  ```bash
  grep -rn "from '@/lib/env'" app/ components/ hooks/ lib/
  ```
- [ ] Update `validateEnv()` untuk hanya memvalidasi Gemini key:
  ```typescript
  export const validateEnv = () => {
    const keys = getGeminiApiKeys();
    if (keys.length === 0) {
      return { valid: false, errors: ['GEMINI_API_KEY tidak dikonfigurasi'] };
    }
    return { valid: true, errors: [] };
  };
  ```

**Verifikasi:**

- [ ] `grep -rn "from '@/lib/env'" app/ components/ hooks/ lib/` — semua import masih berfungsi
- [ ] `bun run build` sukses
- [ ] `bun run test:unit` hijau

---

### 1.4 Fix Artifact History di `page.tsx`

**File:** `app/page.tsx`, `hooks/useArtifactManager.ts`

**Masalah:** `useArtifactManager.addArtifact()` menghapus artifact lama sebelum menambah yang baru (ditemukan di baris `if (existing) chatStore.deleteArtifact(existing.id)`). `useChatSubmit.ts` sudah benar (langsung `addArtifact` tanpa delete), tapi `page.tsx` masih menggunakan `useArtifactManager` yang mengoverwrite history.

**Langkah:**

- [ ] Buka `hooks/useArtifactManager.ts`
- [ ] **Hapus** logika delete sebelum add:
  ```typescript
  // SEBELUM — menghapus history:
  const addArtifact = useCallback((...) => {
    const existing = chatStore.artifacts.find(
      (a) => a.chatId === chatId && a.renderer === renderer,
    );
    if (existing) {
      chatStore.deleteArtifact(existing.id); // ❌ Hapus history lama
    }
    chatStore.addArtifact({ ... });
  }, [chatStore]);
  
  // SESUDAH — simpan semua artifact:
  const addArtifact = useCallback((...) => {
    chatStore.addArtifact({
      chatId,
      chatTitle,
      code,
      renderer,
    });
  }, [chatStore]);
  ```
- [ ] Pastikan `ArtifactPanel` dan komponen yang menampilkan artifact mengambil yang **terbaru**:
  ```typescript
  // Di komponen yang perlu artifact terbaru:
  const latestArtifact = artifacts
    .filter((a) => a.chatId === currentChatId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  ```
- [ ] Pastikan `deleteChat` masih menghapus semua artifact terkait (sudah benar di `chat-store.ts`)

**Verifikasi:**

- [ ] Generate kode p5.js → tampil normal
- [ ] Kirim request modifikasi → kode baru tampil, kode lama masih ada di store
- [ ] Hapus chat → semua artifact terkait terhapus
- [ ] `bun run test:unit` hijau

---

### 1.5 Nonaktifkan `eslint: ignoreDuringBuilds`

**File:** `next.config.js`

**Masalah:** Setting `eslint: { ignoreDuringBuilds: true }` memungkinkan kode dengan ESLint error masuk ke produksi tanpa terdeteksi.

**Langkah:**

- [ ] Buka `next.config.js`
- [ ] Ubah atau hapus baris tersebut:
  ```javascript
  // SEBELUM:
  eslint: {
    ignoreDuringBuilds: true, // ❌
  },
  
  // SESUDAH — hapus seluruh blok eslint atau set ke false:
  // (hapus blok eslint sepenuhnya — default Next.js sudah strict)
  ```
- [ ] Jalankan `bun run lint` dan perbaiki semua error yang muncul:
  ```bash
  bun run lint 2>&1 | tee lint-output.txt
  # Perbaiki satu per satu sampai output bersih
  ```
- [ ] Untuk warning `@typescript-eslint/no-explicit-any` yang banyak, pertimbangkan:
  ```json
  // .eslintrc.json — tambahkan rule yang lebih permisif jika dibutuhkan:
  {
    "rules": {
      "@typescript-eslint/no-explicit-any": "warn" // warn bukan error selama transisi
    }
  }
  ```
- [ ] Pastikan CI pipeline (`ci.yml`) tetap berjalan dengan `bun run lint`

**Verifikasi:**

- [ ] `bun run lint` mengembalikan 0 error (warning diperbolehkan sementara)
- [ ] `bun run build` sukses tanpa melewati ESLint
- [ ] CI pipeline hijau

---

### 1.6 Bersihkan `.htaccess` dan Komentar URL Produksi

**File:** `.htaccess`, `.env.example`

**Masalah:** `.htaccess` berisi `Access-Control-Allow-Origin: *` yang tidak relevan untuk Next.js standalone dan berpotensi konflik dengan Apache reverse proxy. `.env.example` juga mengekspos URL produksi `https://chat.fsu.my.id`.

**Langkah:**

- [ ] Buka `.htaccess` dan hapus header CORS wildcard:
  ```apache
  # HAPUS blok ini sepenuhnya:
  <IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type, Authorization"
  </IfModule>
  ```
- [ ] Pertahankan hanya bagian rewrite rule (jika masih diperlukan untuk deployment via Apache proxy):
  ```apache
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
  ```
- [ ] Jika deployment tidak menggunakan Apache sama sekali, pertimbangkan menghapus file `.htaccess` seluruhnya dan menambahkan ke `.gitignore`
- [ ] Di `.env.example`, ganti URL produksi dengan placeholder:
  ```env
  # SEBELUM:
  NEXT_PUBLIC_SITE_URL=https://chat.fsu.my.id
  
  # SESUDAH:
  NEXT_PUBLIC_SITE_URL=https://your-domain.com
  ```

**Verifikasi:**

- [ ] `bun run build` sukses
- [ ] Jika menggunakan Apache proxy: test request ke aplikasi masih berfungsi
- [ ] `grep "chat.fsu.my.id" .env.example .env.local.example` mengembalikan 0 hasil

---

### ✅ Definition of Done — Sprint 1

- [x] Token count menggunakan `usageMetadata` dari Gemini API (dengan fallback)
- [x] MIME type GIF dikirim ke Gemini dengan benar
- [x] `lib/env.ts` dan `config/constants.ts` tidak lagi duplikat — satu sumber kebenaran
- [x] Artifact history tidak dihapus saat generate kode baru
- [x] `bun run lint` mengembalikan 0 error
- [x] URL produksi tidak tersimpan di file contoh yang masuk version control
- [x] `bun run build` sukses
- [x] `bun run test:unit` 100% hijau
- [x] `bun run test:e2e` 100% hijau

---

## Sprint 2 — Refactoring ChatPanel

> **Durasi:** 1 minggu  
> **Risiko UI:** 🟡 Rendah — ekstrak komponen, output visual identik  
> **Tujuan:** Memecah god component 1.507 baris menjadi unit-unit yang dapat ditest dan dimaintain

---

### 2.1 Persiapan — Audit dan Peta ChatPanel

**Sebelum mulai, petakan semua tanggung jawab ChatPanel saat ini:**

- [ ] Buat dokumen singkat (komentar di PR atau file sementara) yang mendaftar semua "section" di `ChatPanel.tsx`:
  - Daftar pesan (render loop `messages.map(...)`)
  - Item satu pesan (render satu bubble)
  - Input area (ChatInput atau inline?)
  - Image preview queue
  - Export menu (dropdown/modal export)
  - Chat header (judul, tombol rename, delete)
  - Keyboard shortcuts handler
  - Scroll-to-bottom logic
- [ ] Verifikasi tidak ada state yang akan "putus" saat dipisah (identifikasi semua `useState`, `useRef`, `useCallback` dan ke mana mereka dipakai)
- [ ] Buat branch Git baru: `git checkout -b refactor/chat-panel-decompose`

---

### 2.2 Ekstrak `MessageList`

**File:** `components/chat/MessageList.tsx` *(baru)*

- [ ] Buat file `components/chat/MessageList.tsx`
- [ ] Definisikan interface props yang tepat:
  ```typescript
  interface MessageListProps {
    messages: Message[];
    isLoading: boolean;
    currentChatId: string | null;
    onRegenerate: (messageId: string) => void;
    onCopy: (content: string) => void;
    onEdit: (messageId: string, content: string) => void;
    onDelete: (messageId: string) => void;
    onSwitchVersion: (messageId: string, versionIdx: number) => void;
  }
  ```
- [ ] Salin **seluruh JSX render loop** pesan dari `ChatPanel.tsx` ke `MessageList.tsx` — **tanpa mengubah satu class CSS pun**
- [ ] Salin semua `useRef` yang berkaitan dengan scroll behavior
- [ ] Salin `useEffect` untuk auto-scroll to bottom
- [ ] Import dan gunakan `<MessageList />` di `ChatPanel.tsx` di posisi yang sama persis
- [ ] Hapus JSX yang sudah dipindahkan dari `ChatPanel.tsx`
- [ ] Tulis unit test dasar:
  ```typescript
  // components/chat/MessageList.test.tsx
  it('renders empty state when no messages')
  it('renders correct number of message items')
  it('auto-scrolls to bottom when new message added')
  ```

**Verifikasi:**

- [ ] Daftar pesan muncul identik di browser
- [ ] Scroll behavior tidak berubah (auto-scroll, manual scroll)
- [ ] `bun run test:unit` hijau

---

### 2.3 Ekstrak `MessageItem`

**File:** `components/chat/MessageItem.tsx` *(baru)*

- [ ] Buat file `components/chat/MessageItem.tsx`
- [ ] Definisikan interface props:
  ```typescript
  interface MessageItemProps {
    message: Message;
    isLast: boolean;
    isLoading: boolean;
    onRegenerate: () => void;
    onCopy: () => void;
    onEdit: (content: string) => void;
    onDelete: () => void;
    onSwitchVersion: (versionIdx: number) => void;
  }
  ```
- [ ] Salin JSX render satu pesan (bubble, avatar, timestamp, action buttons) — **tanpa mengubah class CSS**
- [ ] Import dan gunakan `<MessageItem />` di dalam `MessageList.tsx`
- [ ] Tulis unit test:
  ```typescript
  it('renders user message with correct styling')
  it('renders assistant message with correct styling')
  it('calls onCopy when copy button clicked')
  it('calls onRegenerate when regenerate button clicked')
  it('shows version navigator when message has multiple versions')
  it('calls onSwitchVersion when version arrow clicked')
  ```

**Verifikasi:**

- [ ] Setiap pesan tampil identik
- [ ] Hover state dan action buttons tidak berubah
- [ ] Copy button berfungsi
- [ ] Version navigator berfungsi
- [ ] `bun run test:unit` hijau

---

### 2.4 Ekstrak `ChatImagePreview`

**File:** `components/chat/ChatImagePreview.tsx` *(mungkin sudah ada — verifikasi dulu)*

- [ ] Cek apakah `components/chat/ChatImagePreview.tsx` sudah ada:
  ```bash
  ls components/chat/ChatImagePreview.tsx
  ```
- [ ] Jika sudah ada, verifikasi apakah sudah dipakai di `ChatPanel.tsx` atau masih ada duplikasi logika
- [ ] Jika belum, buat dengan props:
  ```typescript
  interface ChatImagePreviewProps {
    images: ImageAttachment[];
    onRemove: (imageId: string) => void;
  }
  ```
- [ ] Salin JSX image preview queue **tanpa mengubah class CSS**
- [ ] Import dan gunakan di `ChatPanel.tsx` / `ChatInput.tsx`
- [ ] Test: tombol hapus gambar preview berfungsi

**Verifikasi:**

- [ ] Preview gambar yang akan dikirim muncul di posisi yang sama
- [ ] Tombol hapus gambar berfungsi
- [ ] `bun run test:unit` hijau

---

### 2.5 Ekstrak `ChatExportMenu`

**File:** `components/chat/ChatExportMenu.tsx` *(baru)*

- [ ] Buat file `components/chat/ChatExportMenu.tsx`
- [ ] Identifikasi semua state terkait export di `ChatPanel.tsx`:
  ```bash
  grep -n "export\|Export\|pdf\|markdown\|json\|text" components/chat/ChatPanel.tsx
  ```
- [ ] Pindahkan state dan handler export ke komponen baru:
  ```typescript
  interface ChatExportMenuProps {
    chat: Chat;
    isOpen: boolean;
    onClose: () => void;
  }
  ```
- [ ] Salin JSX dropdown/menu export — **tanpa mengubah class CSS**
- [ ] Import dan gunakan di `ChatPanel.tsx`
- [ ] Test semua format export: PDF, Markdown, JSON, Text

**Verifikasi:**

- [ ] Menu export muncul di posisi yang sama
- [ ] Semua 4 format export menghasilkan file yang benar
- [ ] `bun run test:unit` hijau

---

### 2.6 Verifikasi Akhir Refactoring

- [ ] Hitung baris `ChatPanel.tsx` setelah refactoring:
  ```bash
  wc -l components/chat/ChatPanel.tsx
  # Target: < 400 baris
  ```
- [ ] Verifikasi tidak ada logika bisnis tersisa di `ChatPanel.tsx` — hanya komposisi komponen
- [ ] Jalankan full test suite:
  ```bash
  bun run test:unit && bun run test:e2e
  ```
- [ ] Bandingkan screenshot browser sebelum dan sesudah (verifikasi manual semua halaman)

---

### ✅ Definition of Done — Sprint 2

- [x] `ChatPanel.tsx` ≤ 400 baris (298 baris)
- [x] Komponen baru: `MessageList`, `MessageItem`, `ChatExportMenu` (+ verifikasi `ChatImagePreview`)
- [x] Setiap komponen baru memiliki minimal 3 unit test
- [x] Zero perubahan class Tailwind CSS di file manapun
- [x] `bun run build` sukses
- [x] `bun run test:unit` 100% hijau
- [x] `bun run test:e2e` 100% hijau
- [x] Screenshot before/after identik (verifikasi manual)

---

## Sprint 3 — Peningkatan & Future

> **Durasi:** 1 minggu  
> **Risiko UI:** 🟡 Rendah  
> **Tujuan:** Peningkatan kualitas dan ketangguhan jangka panjang

---

### 3.1 Tambah Zod Validation di Semua API Route

**File:** `app/api/chat/route.ts`, `app/api/image-analysis/route.ts`, `app/api/gemini-analysis/route.ts`

**Masalah:** Request body dari client diterima tanpa validasi schema. Input tidak terduga bisa menyebabkan error tersembunyi atau behavior yang tidak diprediksi.

- [ ] Install Zod sudah ada di `package.json` — tidak perlu install ulang
- [ ] Buat schema untuk `/api/chat`:
  ```typescript
  import { z } from 'zod';
  
  const ChatRequestSchema = z.object({
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().max(4000),
    })).min(1).max(100),
    model: z.string().optional(),
    currentCode: z.string().max(50000).optional(),
    images: z.array(z.object({
      base64: z.string().optional(),
      mimeType: z.string().optional(),
      url: z.string().url().optional(),
    })).max(5).optional(),
  });
  ```
- [ ] Tambahkan parse di awal handler:
  ```typescript
  const parseResult = ChatRequestSchema.safeParse(await req.json());
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }
  const { messages, model, currentCode, images } = parseResult.data;
  ```
- [ ] Lakukan hal yang sama untuk `/api/image-analysis` dan `/api/gemini-analysis`
- [ ] Tulis test untuk edge case:
  - [ ] Request dengan `messages: []` → 400
  - [ ] Request dengan `messages` melebihi 100 item → 400
  - [ ] Request dengan `content` > 4000 karakter → 400

**Verifikasi:**

- [ ] Valid request tetap diproses dengan benar
- [ ] Invalid request mengembalikan 400 dengan pesan error yang jelas
- [ ] `bun run test:unit` hijau

---

### 3.2 Implementasi Redis Rate Limiter (Opsional untuk Produksi Skala Menengah)

**File:** `lib/rate-limiter.ts`

**Masalah:** Rate limiter in-memory reset setiap restart dan tidak berfungsi di deployment multi-instance (PM2 cluster).

> ⚠️ **Catatan:** Task ini hanya perlu dilakukan jika deployment menggunakan PM2 cluster mode atau multiple pods. Untuk single-instance deployment, rate limiter saat ini sudah cukup.

- [ ] Tentukan apakah deployment membutuhkan Redis:
  - Single process PM2 → skip task ini
  - PM2 cluster mode atau multi-pod → lanjutkan
- [ ] Tambahkan `ioredis` ke dependencies:
  ```bash
  bun add ioredis
  ```
- [ ] Buat `lib/redis-client.ts`:
  ```typescript
  import Redis from 'ioredis';
  
  let redis: Redis | null = null;
  
  export function getRedis(): Redis | null {
    if (!process.env.REDIS_URL) return null;
    if (!redis) {
      redis = new Redis(process.env.REDIS_URL);
    }
    return redis;
  }
  ```
- [ ] Update `lib/rate-limiter.ts` untuk fallback ke Redis jika tersedia:
  ```typescript
  export function rateLimit(options?: Options) {
    // Jika Redis tersedia, gunakan Redis. Jika tidak, fallback ke LRU Cache.
    const redis = getRedis();
    
    return {
      check: async (limit: number, token: string) => {
        if (redis) {
          // Redis sliding window implementation
          const key = `rl:${token}`;
          const count = await redis.incr(key);
          if (count === 1) await redis.expire(key, 60);
          if (count > limit) throw new Error('Rate limit exceeded');
        } else {
          // Fallback ke LRU Cache (existing logic)
          inMemoryCheck(limit, token);
        }
      },
    };
  }
  ```
- [ ] Tambahkan `REDIS_URL` ke `.env.example`:
  ```env
  # Optional: Redis untuk rate limiting di deployment multi-instance
  # REDIS_URL=redis://localhost:6379
  ```

**Verifikasi:**

- [ ] Tanpa `REDIS_URL`: fallback ke in-memory, behavior identik
- [ ] Dengan `REDIS_URL`: rate limit tetap bekerja setelah server restart
- [ ] `bun run test:unit` hijau

---

### 3.3 Finalkan atau Hapus Fitur Autentikasi

**File:** `components/auth/AuthModal.tsx`, `lib/store/auth-store.ts`, `lib/supabaseClient.ts`

**Masalah:** Kode autentikasi Supabase sudah ditulis lengkap tapi tidak jelas apakah diaktifkan dalam alur aplikasi. Kode setengah-jadi ini membebani bundle size dan membingungkan developer baru.

- [ ] **Buat keputusan eksplisit**: apakah autentikasi akan diimplementasikan dalam 3 bulan ke depan?

  **Jika YA (lanjutkan fitur auth):**
  - [ ] Integrasikan `useAuthStore.initialize()` di `app/providers.tsx` atau `app/layout.tsx`
  - [ ] Tampilkan `AuthModal` di kondisi yang tepat (user belum login, API key tidak ada, dll.)
  - [ ] Hubungkan chat store dengan user session agar data terpisah per user
  - [ ] Test flow: register → login → chat → logout
  - [ ] Tambahkan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` ke semua env example

  **Jika TIDAK (hapus):**
  - [ ] Hapus `components/auth/AuthModal.tsx`
  - [ ] Hapus `lib/store/auth-store.ts`
  - [ ] Simpan `lib/supabaseClient.ts` (masih dipakai untuk storage)
  - [ ] Cek apakah ada import `auth-store` atau `AuthModal` yang perlu dihapus:
    ```bash
    grep -rn "auth-store\|AuthModal" app/ components/ hooks/
    ```
  - [ ] `bun run build` sukses setelah penghapusan

**Verifikasi:**

- [ ] Build sukses
- [ ] Tidak ada komponen yang mengimport file yang sudah dihapus
- [ ] `bun run test:unit` hijau

---

### 3.4 Tambah Structured Logging

**File:** `lib/logger.ts` *(baru)*, semua API routes

**Masalah:** `console.log`, `console.error`, dan `console.warn` tersebar di banyak tempat tanpa format yang konsisten. Sulit untuk monitoring dan pencarian log di produksi.

- [ ] Buat `lib/logger.ts`:
  ```typescript
  type LogLevel = 'debug' | 'info' | 'warn' | 'error';
  
  function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const isDev = process.env.NODE_ENV !== 'production';
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(meta && { meta }),
    };
    
    if (level === 'error') {
      console.error(JSON.stringify(entry));
    } else if (isDev) {
      // Di development, format yang mudah dibaca
      console.log(`[${level.toUpperCase()}] ${message}`, meta ?? '');
    } else {
      // Di production, JSON untuk log aggregator
      console.log(JSON.stringify(entry));
    }
  }
  
  export const logger = {
    debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
  };
  ```
- [ ] Ganti `console.error` dan `console.warn` di semua API routes dengan `logger.error`/`logger.warn`:
  ```typescript
  // Sebelum:
  console.error('Chat API error:', error);
  
  // Sesudah:
  logger.error('Chat API error', { error: error.message, stack: error.stack });
  ```
- [ ] Ganti log key rotation di `gemini-client.ts` dengan `logger.debug` (hanya muncul di development)

**Verifikasi:**

- [ ] Di `NODE_ENV=development`: log muncul di console dengan format readable
- [ ] Di `NODE_ENV=production`: log muncul dalam format JSON
- [ ] Tidak ada `console.log` manual baru yang ditambahkan di luar `logger`
- [ ] `bun run test:unit` hijau

---

### 3.5 Tingkatkan Test Coverage Komponen Utama

**Prioritas berdasarkan ukuran dan risiko:**

- [ ] **`ArtifactPanel.tsx`** — tulis minimal 3 test:
  - [ ] Render panel dengan kode p5.js
  - [ ] Switch antar renderer (p5 → D3 → SVG → Mermaid)
  - [ ] Download kode berfungsi
- [ ] **`Sidebar.tsx`** — tulis minimal 3 test:
  - [ ] Render daftar chat
  - [ ] Search chat berfungsi
  - [ ] Star/unstar chat berfungsi
- [ ] **`SettingsModal.tsx`** — tulis minimal 2 test:
  - [ ] Modal terbuka dan menutup
  - [ ] Save settings memanggil store yang benar
- [ ] Update `test:coverage` script dan set threshold minimum:
  ```typescript
  // vitest.config.ts — tambahkan coverage config:
  coverage: {
    provider: 'v8',
    thresholds: {
      lines: 60,
      branches: 50,
      functions: 60,
    },
  }
  ```

**Verifikasi:**

- [ ] `bun run test:coverage` menampilkan coverage ≥ 60% untuk file-file tersebut
- [ ] `bun run test:unit` hijau

---

### ✅ Definition of Done — Sprint 3

- [x] Semua API route menggunakan Zod validation
- [x] Keputusan auth sudah dibuat dan dieksekusi (lanjut atau hapus) — code auth sudah dihapus
- [x] `lib/logger.ts` ada dan dipakai di semua API routes
- [x] Coverage ArtifactPanel, Sidebar, SettingsModal minimal 3 test masing-masing
- [x] `bun run build` sukses
- [x] `bun run test:unit` 100% hijau
- [x] `bun run test:e2e` 100% hijau

---

## Checklist Verifikasi Visual (Jalankan Setiap Akhir Sprint)

Lakukan pengecekan manual ini di browser sebelum menandai sprint selesai:

- [ ] Halaman utama (`/`) tampil normal, tidak ada layout shift
- [ ] Mengirim pesan baru dan menerima respons AI berfungsi
- [ ] Respons AI muncul streaming (teks muncul bertahap)
- [ ] Kode visual ter-render: p5.js, D3.js, SVG, Mermaid masing-masing dicoba sekali
- [ ] Upload gambar berfungsi dan gambar muncul di chat
- [ ] Analisis gambar berfungsi
- [ ] Sidebar: buka chat lama, buat chat baru, hapus chat
- [ ] Settings modal terbuka, save settings, tutup
- [ ] Export chat dalam format Markdown berfungsi
- [ ] Keyboard shortcut tidak rusak
- [ ] Dark/light mode toggle berfungsi (jika ada)
- [ ] **Zero console error** di browser DevTools
- [ ] **Zero console warning** yang baru muncul

---

## Prosedur Rollback

Jika ada masalah setelah task, ikuti langkah berikut:

```bash
# Lihat riwayat commit
git log --oneline -10

# Rollback satu commit terakhir
git revert HEAD

# Rollback beberapa commit (hati-hati)
git revert HEAD~2..HEAD

# Push rollback
git push origin main

# Verifikasi
bun run build && bun run test:unit
```

> **Aturan:** Setiap task di-commit secara terpisah. Jangan squash seluruh sprint menjadi satu commit. Selalu jalankan `bun run build` sebelum push.

---

## Ringkasan Estimasi Waktu v2.0

| Sprint | Task | Estimasi |
|---|---|---|
| **Sprint 0** | 0.1 Hapus NEXT_PUBLIC keys | 30 menit |
| | 0.2 Hapus console.log aktif | 30 menit |
| | 0.3 Hapus query param token | 30 menit |
| | **Sprint 0 Total** | **~2 jam** |
| **Sprint 1** | 1.1 Token counter akurat | 2 jam |
| | 1.2 Fix MIME type detection | 1 jam |
| | 1.3 Unify env system | 2 jam |
| | 1.4 Fix artifact history (page.tsx) | 1 jam |
| | 1.5 Nonaktifkan eslint ignoreDuringBuilds | 2 jam |
| | 1.6 Bersihkan .htaccess dan URL produksi | 30 menit |
| | **Sprint 1 Total** | **~9 jam** |
| **Sprint 2** | 2.1 Audit ChatPanel | 2 jam |
| | 2.2 Ekstrak MessageList | 4 jam |
| | 2.3 Ekstrak MessageItem | 3 jam |
| | 2.4 Ekstrak ChatImagePreview | 2 jam |
| | 2.5 Ekstrak ChatExportMenu | 2 jam |
| | 2.6 Verifikasi akhir | 1 jam |
| | **Sprint 2 Total** | **~14 jam** |
| **Sprint 3** | 3.1 Zod validation API routes | 4 jam |
| | 3.2 Redis rate limiter (opsional) | 4 jam |
| | 3.3 Finalkan/hapus fitur auth | 4 jam |
| | 3.4 Structured logging | 3 jam |
| | 3.5 Tingkatkan test coverage | 4 jam |
| | **Sprint 3 Total** | **~19 jam** |
| | **GRAND TOTAL** | **~44 jam (~5-6 hari kerja)** |

---

## Quick Reference — Perintah Berguna

```bash
# Cari semua console.log aktif (non-commented)
grep -rn "console\.log" app/ components/ hooks/ lib/ \
  --include="*.ts" --include="*.tsx" | grep -v "\.test\." | grep -v "// "

# Cari semua NEXT_PUBLIC variable
grep -rn "NEXT_PUBLIC" app/ components/ --include="*.ts" --include="*.tsx"

# Hitung baris semua komponen besar
find components/ -name "*.tsx" | xargs wc -l | sort -rn | head -10

# Jalankan semua test
bun run test:all

# Jalankan hanya unit test dengan coverage
bun run test:coverage

# Build dan verifikasi
bun run build && echo "✅ Build sukses"

# Lint check
bun run lint
```
