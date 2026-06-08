# 🛠️ Rencana Implementasi Perbaikan — Genesis

**Dokumen:** Implementation Plan v1.0  
**Dibuat:** Juni 2026  
**Prinsip Utama:** Refactor tanpa mengubah UI/UX yang sudah ada  
**Total Estimasi:** ~4 minggu (tim 1–2 developer)

---

## Aturan Dasar

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

## Ringkasan Sprint

| Sprint | Fokus | Durasi | Risiko UI | Prioritas |
|---|---|---|---|---|
| Sprint 1 | Keamanan & Stabilitas | 3 hari | 🟢 Nol | 🔴 Kritis |
| Sprint 2 | Perbaikan Backend & Logic | 4 hari | 🟢 Nol | 🔴 Kritis |
| Sprint 3 | Refactoring Arsitektur | 1 minggu | 🟡 Rendah | 🟠 Tinggi |
| Sprint 4 | Fitur & Optimasi | 1 minggu | 🟡 Rendah | 🟡 Sedang |

---

## Sprint 1 — Keamanan & Stabilitas

> **Durasi:** 3 hari  
> **Risiko UI:** 🟢 Nol — hanya file API dan library  
> **Tujuan:** Menutup celah keamanan yang masih terbuka sebelum kode lain disentuh

---

### 1.1 Rate Limiting pada Semua Endpoint API

**File:** `lib/rate-limiter.ts`, `app/api/upload-image/route.ts`, `app/api/gemini-analysis/route.ts`, `app/api/image-analysis/route.ts`

**Masalah:** Rate limiter hanya ada di `/api/chat`. Tiga endpoint lain tidak terlindungi sama sekali.

- [ ] Tambahkan export `uploadRateLimiter` di `lib/rate-limiter.ts`
  ```typescript
  export const uploadRateLimiter = rateLimit({
    interval: 60_000,
    uniqueTokenPerInterval: 500,
  });
  export const analysisRateLimiter = rateLimit({
    interval: 60_000,
    uniqueTokenPerInterval: 500,
  });
  ```
- [ ] Tambahkan rate limit check di `app/api/upload-image/route.ts` (max 10/menit per IP)
- [ ] Tambahkan rate limit check di `app/api/gemini-analysis/route.ts` (max 15/menit per IP)
- [ ] Tambahkan rate limit check di `app/api/image-analysis/route.ts` (max 15/menit per IP)
- [ ] Pastikan format error response konsisten `{ error: '...', status: 429 }`
- [ ] Tambahkan header `Retry-After: 60` pada semua response 429

**Verifikasi:**
- [ ] Test manual: kirim >10 upload dalam 1 menit, pastikan dapat 429
- [ ] `bun run test:unit` tetap hijau

---

### 1.2 Bersihkan Debug Code

**File:** `app/api/upload-image/route.ts`, `app/api/gemini-analysis/route.ts`, `components/image/ImageAnalysis.tsx`, `hooks/useImageAnalysis.ts`

**Masalah:** Ada puluhan baris `// console.log` yang di-comment dan satu TODO aktif yang belum diselesaikan.

- [ ] Hapus semua blok `// console.log('=== THUMBSNAP UPLOAD DEBUG ===')` dan turunannya di `upload-image/route.ts`
- [ ] Hapus semua blok `// console.log('=== IMAGE ANALYSIS API DEBUG ===')` dan turunannya di `gemini-analysis/route.ts`
- [ ] Hapus `console.log('=== ANALYSIS RESPONSE DEBUG ===')` di `ImageAnalysis.tsx`
- [ ] Tinjau dan selesaikan atau hapus TODO di `hooks/useImageAnalysis.ts`:
  ```typescript
  // TODO: Replace with actual Google Cloud Vision API call
  ```
  Jika fitur ini belum direncanakan, ganti dengan komentar yang lebih jelas:
  ```typescript
  // NOTE: Saat ini menggunakan Gemini untuk analisis gambar.
  // Google Cloud Vision API dipertimbangkan untuk Sprint 5.
  ```
- [ ] Review semua file dengan `grep -rn "console.log\|// TODO\|// FIXME" app/ components/ hooks/ lib/` dan tangani satu per satu

**Verifikasi:**
- [ ] `grep -rn "// console.log" app/ components/ hooks/` mengembalikan 0 hasil
- [ ] `bun run build` sukses tanpa warning

---

### 1.3 Identifikasi dan Hapus Sidebar Duplikat

**File:** `components/layout/Sidebar.tsx`, `components/sidebar/Sidebar.tsx`

**Masalah:** Dua komponen Sidebar yang berbeda ada di codebase. Salah satunya tidak terpakai.

- [ ] Jalankan pencarian import untuk kedua file:
  ```bash
  grep -r "components/layout/Sidebar" app/ components/ --include="*.tsx"
  grep -r "components/sidebar/Sidebar" app/ components/ --include="*.tsx"
  ```
- [ ] Identifikasi file mana yang tidak memiliki hasil pencarian (tidak diimport)
- [ ] Review isi file yang tidak terpakai untuk memastikan tidak ada fitur unik yang perlu di-port
- [ ] Hapus file Sidebar yang tidak dipakai
- [ ] Hapus folder kosong yang ditinggalkan (jika ada)

**Verifikasi:**
- [ ] `bun run build` sukses
- [ ] Tampilan Sidebar di browser tidak berubah
- [ ] `bun run test:e2e` tetap hijau

---

### ✅ Definition of Done — Sprint 1

- [ ] Semua 4 endpoint API memiliki rate limiting
- [ ] Zero `// console.log` aktif maupun ter-comment di API routes
- [ ] Hanya ada satu komponen Sidebar di codebase
- [ ] `bun run build` sukses tanpa error
- [ ] `bun run test:unit` 100% hijau
- [ ] `bun run test:e2e` 100% hijau
- [ ] Tampilan browser identik dengan sebelum sprint (screenshot comparison)

---

## Sprint 2 — Perbaikan Backend & Logic

> **Durasi:** 4 hari  
> **Risiko UI:** 🟢 Nol — semua perubahan di layer API, hooks, dan store  
> **Tujuan:** Memperbaiki bug logika dan meningkatkan keandalan tanpa menyentuh UI

---

### 2.1 Hubungkan Chat Summarizer ke useChatSubmit

**File:** `hooks/useChatSubmit.ts`, `lib/chat-summarizer.ts`

**Masalah:** `buildContextForAPI()` sudah ditulis di `chat-summarizer.ts` tapi tidak pernah dipanggil. Semua pesan dikirim mentah, berpotensi overflow token pada percakapan panjang.

- [ ] Import fungsi-fungsi yang diperlukan di `hooks/useChatSubmit.ts`:
  ```typescript
  import {
    buildContextForAPI,
    shouldUpdateSummary,
    generateMessagesSummary,
  } from '@/lib/chat-summarizer';
  ```
- [ ] Ambil data chat aktif dari store sebelum fetch:
  ```typescript
  const currentChat = chatStore.chats.find(c => c.id === currentChatId);
  const storeMessages = currentChat?.messages ?? [];
  ```
- [ ] Tambahkan logika update summary sebelum mengirim request:
  ```typescript
  if (shouldUpdateSummary(storeMessages.length, currentChat?.lastSummarizedIndex)) {
    chatStore.updateChatSummary(currentChatId!);
  }
  ```
- [ ] Ganti payload `messages` di fetch dengan output dari `buildContextForAPI()`:
  ```typescript
  const optimizedMessages = buildContextForAPI(
    storeMessages,
    currentChat?.summary,
    currentChat?.lastSummarizedIndex
  );
  // Gunakan optimizedMessages sebagai ganti newMessages.map(...)
  ```
- [ ] Pastikan format `optimizedMessages` kompatibel dengan schema yang diterima `/api/chat`
- [ ] Tulis atau perbarui unit test untuk `useChatSubmit` yang memverifikasi summarizer terpanggil

**Verifikasi:**
- [ ] Percakapan pendek (<10 pesan): perilaku identik dengan sebelumnya
- [ ] Percakapan panjang (>20 pesan): tidak error, context terkompresi dengan benar
- [ ] `bun run test:unit` tetap hijau

---

### 2.2 Gunakan Token Count Akurat dari Gemini API

**File:** `app/api/chat/route.ts`

**Masalah:** Estimasi token menggunakan `Math.ceil(length / 4)` yang tidak akurat untuk Bahasa Indonesia dan kode sumber. Gemini API sudah mengembalikan jumlah token real di `usageMetadata`.

- [ ] Identifikasi field `usageMetadata` di response Gemini:
  ```typescript
  // data.usageMetadata.promptTokenCount
  // data.usageMetadata.candidatesTokenCount
  // data.usageMetadata.totalTokenCount
  ```
- [ ] Ganti kalkulasi token di `route.ts`:
  ```typescript
  // HAPUS ini:
  const estimatedPromptLength = messages.reduce(...) + systemPrompt.length;
  const promptTokens = Math.ceil(estimatedPromptLength / 4);
  const completionTokens = Math.ceil(responseText.length / 4);

  // GANTI dengan ini:
  const promptTokens = data.usageMetadata?.promptTokenCount
    ?? Math.ceil(systemPrompt.length / 4);
  const completionTokens = data.usageMetadata?.candidatesTokenCount
    ?? Math.ceil(responseText.length / 4);
  const totalTokens = data.usageMetadata?.totalTokenCount
    ?? (promptTokens + completionTokens);
  ```
- [ ] Update return value untuk menggunakan `totalTokens` yang baru
- [ ] Tambahkan fallback ke estimasi lama jika `usageMetadata` tidak tersedia (backward compatible)

**Verifikasi:**
- [ ] Kirim pesan dalam Bahasa Indonesia dan verifikasi token count masuk akal
- [ ] Kirim kode TypeScript panjang dan verifikasi token count akurat
- [ ] `bun run test:unit` tetap hijau

---

### 2.3 Ganti Image Hosting ke Supabase Storage

**File:** `app/api/upload-image/route.ts`, `lib/supabaseClient.ts`

**Masalah:** Gambar pengguna dikirim ke ThumbSnap dan qu.ax (pihak ketiga). Privasi tidak terjamin dan bergantung ketersediaan layanan eksternal.

- [ ] Buat bucket `chat-images` di Supabase dashboard (set sebagai public)
- [ ] Tambahkan environment variable `SUPABASE_URL` dan `SUPABASE_ANON_KEY` ke `.env.local` dan `.env.example`
- [ ] Update `lib/supabaseClient.ts` untuk memastikan client sudah terkonfigurasi dengan benar untuk storage
- [ ] Tambahkan fungsi upload ke Supabase di `app/api/upload-image/route.ts`:
  ```typescript
  import { supabase } from '@/lib/supabaseClient';

  const fileExt = file.name.split('.').pop() ?? 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('chat-images')
    .upload(fileName, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('chat-images')
    .getPublicUrl(fileName);
  ```
- [ ] Pastikan response shape tetap sama persis: `{ success: true, url, filename, provider }`
- [ ] Hapus dependency ke ThumbSnap dan qu.ax dari kode (tapi biarkan di `API_CONFIG` untuk backward compat sementara)
- [ ] Update `.env.example` dan `.env.local.example` dengan komentar yang jelas

**Verifikasi:**
- [ ] Upload gambar berhasil dan URL dapat diakses
- [ ] UI upload tidak berubah sama sekali
- [ ] Magic byte validation tetap berjalan sebelum upload
- [ ] Rate limit tetap berjalan

---

### 2.4 Tambahkan Unit Test untuk Gemini Client

**File:** `lib/gemini-client.test.ts` *(file baru)*

**Masalah:** `lib/gemini-client.ts` — logika key rotation yang paling kritis — tidak memiliki unit test sama sekali.

- [ ] Buat file `lib/gemini-client.test.ts`
- [ ] Mock `fetch` menggunakan Vitest
- [ ] Tulis test: berhasil dengan key pertama
  ```typescript
  it('should succeed with first key', async () => { ... });
  ```
- [ ] Tulis test: fallback ke key kedua jika key pertama gagal
  ```typescript
  it('should rotate to second key if first fails', async () => { ... });
  ```
- [ ] Tulis test: throw error 429 jika semua key exhausted
  ```typescript
  it('should throw quota error if all keys exhausted', async () => { ... });
  ```
- [ ] Tulis test: throw error umum jika bukan error quota
  ```typescript
  it('should throw standard error for non-quota failures', async () => { ... });
  ```
- [ ] Tulis test: tidak crash jika tidak ada key dikonfigurasi
  ```typescript
  it('should throw if no API keys configured', async () => { ... });
  ```

**Verifikasi:**
- [ ] `bun run test:unit` menampilkan semua test baru sebagai hijau
- [ ] Coverage `lib/gemini-client.ts` mencapai minimal 80%

---

### ✅ Definition of Done — Sprint 2

- [ ] Chat summarizer terhubung dan aktif di `useChatSubmit.ts`
- [ ] Token count menggunakan data real dari `usageMetadata` Gemini
- [ ] Gambar diupload ke Supabase Storage, bukan layanan pihak ketiga
- [ ] `lib/gemini-client.ts` memiliki minimal 5 unit test
- [ ] `bun run test:unit` 100% hijau
- [ ] `bun run test:e2e` 100% hijau
- [ ] Tidak ada perubahan visual yang terdeteksi di browser

---

## Sprint 3 — Refactoring Arsitektur

> **Durasi:** 1 minggu  
> **Risiko UI:** 🟡 Rendah — ekstrak komponen, output visual identik  
> **Tujuan:** Memecah god component tanpa mengubah satu pixel pun tampilan

---

### 3.1 Ekstrak MessageList dari ChatPanel

**File:** `components/chat/MessageList.tsx` *(baru)*, `components/chat/ChatPanel.tsx`

**Masalah:** Logika render daftar pesan tertanam di `ChatPanel.tsx` yang 1.533 baris.

- [ ] Buat file `components/chat/MessageList.tsx`
- [ ] Definisikan interface props yang tepat:
  ```typescript
  interface MessageListProps {
    messages: Message[];
    isLoading: boolean;
    onRegenerate: (messageId: string) => void;
    onCopy: (content: string) => void;
    onEdit: (messageId: string, content: string) => void;
    onDeleteMessage: (messageId: string) => void;
    onSwitchVersion: (messageId: string, idx: number) => void;
  }
  ```
- [ ] Salin JSX bagian render pesan dari `ChatPanel.tsx` ke `MessageList.tsx` **tanpa mengubah satu class CSS pun**
- [ ] Import dan gunakan `MessageList` di `ChatPanel.tsx` di posisi yang sama persis
- [ ] Hapus JSX yang sudah dipindahkan dari `ChatPanel.tsx`
- [ ] Pastikan semua props tersambung dengan benar

**Verifikasi:**
- [ ] Tampilan daftar pesan identik sebelum dan sesudah
- [ ] Scroll behavior tidak berubah
- [ ] Regenerate, copy, edit, delete pesan masih berfungsi
- [ ] `bun run test:e2e` hijau

---

### 3.2 Ekstrak MessageItem dari ChatPanel/MessageList

**File:** `components/chat/MessageItem.tsx` *(baru)*

**Masalah:** Render satu pesan beserta action buttons-nya masih bercampur dalam file yang sama.

- [ ] Buat file `components/chat/MessageItem.tsx`
- [ ] Definisikan interface props:
  ```typescript
  interface MessageItemProps {
    message: Message;
    isLast: boolean;
    onRegenerate: () => void;
    onCopy: () => void;
    onEdit: (content: string) => void;
    onDelete: () => void;
    onSwitchVersion: (idx: number) => void;
  }
  ```
- [ ] Salin JSX render satu pesan dari `MessageList.tsx` ke `MessageItem.tsx` **tanpa mengubah class CSS**
- [ ] Import dan gunakan `MessageItem` di `MessageList.tsx`
- [ ] Tulis unit test dasar untuk `MessageItem.tsx`:
  - [ ] Test render pesan user
  - [ ] Test render pesan assistant
  - [ ] Test tombol copy terpanggil

**Verifikasi:**
- [ ] Tampilan setiap pesan identik
- [ ] Hover state dan action buttons tidak berubah
- [ ] `bun run test:unit` hijau

---

### 3.3 Ekstrak ChatImagePreview

**File:** `components/chat/ChatImagePreview.tsx` *(baru)*

**Masalah:** Logika preview gambar yang akan dikirim masih tertanam di `ChatPanel.tsx`.

- [ ] Buat file `components/chat/ChatImagePreview.tsx`
- [ ] Definisikan interface props:
  ```typescript
  interface ChatImagePreviewProps {
    images: ImageAttachment[];
    onRemove: (imageId: string) => void;
  }
  ```
- [ ] Salin JSX preview gambar dari `ChatPanel.tsx` **tanpa mengubah class CSS**
- [ ] Import dan gunakan di `ChatPanel.tsx`

**Verifikasi:**
- [ ] Preview gambar muncul di posisi yang sama
- [ ] Tombol hapus gambar masih berfungsi
- [ ] Drag & drop atau paste gambar tidak terpengaruh

---

### 3.4 Ekstrak ChatExportMenu

**File:** `components/chat/ChatExportMenu.tsx` *(baru)*

**Masalah:** Logika export chat (PDF, Markdown, JSON, Text) tertanam di `ChatPanel.tsx`.

- [ ] Buat file `components/chat/ChatExportMenu.tsx`
- [ ] Pindahkan state dan handler yang berkaitan dengan export
- [ ] Salin JSX dropdown/menu export **tanpa mengubah class CSS**
- [ ] Import dan gunakan di `ChatPanel.tsx`

**Verifikasi:**
- [ ] Menu export muncul dan berfungsi seperti sebelumnya
- [ ] Semua format export (PDF, Markdown, JSON, Text) menghasilkan file yang benar

---

### 3.5 Validasi Ukuran ChatPanel Setelah Refactoring

- [ ] Verifikasi `ChatPanel.tsx` sekarang berukuran <400 baris
- [ ] Verifikasi tidak ada logika bisnis tersisa di `ChatPanel.tsx` — hanya komposisi komponen
- [ ] Jalankan full test suite
- [ ] Bandingkan screenshot browser sebelum dan sesudah

---

### ✅ Definition of Done — Sprint 3

- [ ] `ChatPanel.tsx` ≤ 400 baris
- [ ] Komponen baru: `MessageList.tsx`, `MessageItem.tsx`, `ChatImagePreview.tsx`, `ChatExportMenu.tsx`
- [ ] Setiap komponen baru memiliki minimal 2 unit test
- [ ] Zero perubahan class Tailwind CSS di file manapun
- [ ] `bun run build` sukses
- [ ] `bun run test:unit` 100% hijau
- [ ] `bun run test:e2e` 100% hijau
- [ ] Screenshot before/after identik (verifikasi manual)

---

## Sprint 4 — Fitur & Optimasi

> **Durasi:** 1 minggu  
> **Risiko UI:** 🟡 Rendah — UX sedikit berubah (teks streaming), tampilan tidak berubah  
> **Tujuan:** Meningkatkan pengalaman pengguna tanpa mengubah desain visual

---

### 4.1 Implementasi Streaming Response Gemini

**File:** `app/api/chat/route.ts`, `hooks/useChatSubmit.ts`

**Masalah:** Pengguna menunggu seluruh respons selesai baru tampil. Untuk respons panjang ini sangat lambat.

**Catatan:** Ini satu-satunya perubahan yang mengubah *perilaku* (teks muncul bertahap), tapi tidak mengubah tampilan elemen UI sama sekali.

- [ ] **Backend — ubah ke streaming endpoint:**
  ```typescript
  // Ganti :generateContent → :streamGenerateContent?alt=sse
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${key}&alt=sse`,
    { method: 'POST', ... }
  );
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
  ```
- [ ] Update `callGeminiWithRotation()` di `lib/gemini-client.ts` untuk mendukung streaming
- [ ] **Frontend — baca SSE stream di `useChatSubmit.ts`:**
  - [ ] Tambahkan pesan assistant kosong ke store sebelum stream dimulai
  - [ ] Akumulasi teks dari setiap chunk SSE
  - [ ] Update pesan di store menggunakan `chatStore.updateMessage()` per chunk
  - [ ] Tandai selesai saat stream done
- [ ] Pastikan `stopGeneration()` (AbortController) tetap berfungsi untuk streaming
- [ ] Update `extractCode()` dipanggil setelah stream selesai penuh, bukan per-chunk
- [ ] Tambahkan fallback ke non-streaming jika SSE gagal

**Verifikasi:**
- [ ] Teks respons muncul bertahap (streaming terlihat)
- [ ] Tombol stop generation masih berfungsi di tengah stream
- [ ] Kode visual (p5/D3/SVG/Mermaid) tetap ter-render dengan benar setelah stream selesai
- [ ] Loading indicator behavior tidak berubah visual
- [ ] `bun run test:e2e` hijau

---

### 4.2 Simpan History Artifact per Chat

**File:** `lib/store/chat-store.ts`, `hooks/useChatSubmit.ts`

**Masalah:** Setiap kode baru yang di-generate menimpa artifact lama. Pengguna tidak bisa melihat evolusi kode.

**Catatan:** Perubahan ini tidak mengubah UI yang ada — hanya menyimpan lebih banyak data. Fitur tampilan history bisa ditambahkan di sprint berikutnya.

- [ ] Hapus logika `deleteArtifact` sebelum `addArtifact` di `useChatSubmit.ts`:
  ```typescript
  // HAPUS ini:
  const existingArtifact = chatStore.artifacts.find(a => a.chatId === currentChatId);
  if (existingArtifact) {
    chatStore.deleteArtifact(existingArtifact.id);
  }
  
  // Langsung addArtifact tanpa hapus yang lama
  chatStore.addArtifact({ ... });
  ```
- [ ] Pastikan `ArtifactPanel` masih mengambil artifact terbaru dengan benar:
  ```typescript
  const latestArtifact = chatStore.artifacts
    .filter(a => a.chatId === currentChatId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  ```
- [ ] Update `deleteChat` di `chat-store.ts` untuk tetap menghapus semua artifact terkait

**Verifikasi:**
- [ ] Generate kode pertama: tampil normal
- [ ] Generate kode kedua: kode baru tampil, artifact lama tersimpan di store
- [ ] Hapus chat: semua artifact terkait terhapus
- [ ] `bun run test:unit` hijau

---

### 4.3 Tambahkan Test untuk Upload Validation

**File:** `app/api/upload-image/route.test.ts` *(perbarui atau buat baru)*

**Masalah:** Magic byte validation adalah security feature penting tapi tidak ada test yang memverifikasinya.

- [ ] Tulis test: upload JPEG valid → berhasil
- [ ] Tulis test: upload PNG valid → berhasil
- [ ] Tulis test: upload GIF valid → berhasil
- [ ] Tulis test: upload WebP valid → berhasil
- [ ] Tulis test: upload file dengan ekstensi `.jpg` tapi isi bukan JPEG → ditolak 400
- [ ] Tulis test: upload file kosong → ditolak 400
- [ ] Tulis test: upload file melebihi 10MB → ditolak 400
- [ ] Tulis test: upload tanpa file → ditolak 400
- [ ] Tulis test: upload ke endpoint tanpa auth di luar limit → ditolak 429

**Verifikasi:**
- [ ] Semua 9 test baru hijau
- [ ] `bun run test:unit` total 100% hijau

---

### 4.4 Perbaikan Minor dan Housekeeping

- [ ] Tambahkan `lastSummarizedIndex` ke type `Chat` jika belum ada di `types/index.ts`
- [ ] Pastikan `updateChatSummary` di `chat-store.ts` memperbarui `lastSummarizedIndex` dengan benar
- [ ] Verifikasi `THUMBSNAP_API_KEY` di `config/constants.ts` tidak ter-expose ke client side
  - [ ] Cek bahwa `API_CONFIG` tidak diimport di file `'use client'`
  - [ ] Jika ada, pindahkan ke server-only module
- [ ] Update `README.md` untuk mencerminkan Supabase Storage sebagai provider gambar
- [ ] Update `.env.example` dengan semua variable yang diperlukan dan komentar yang jelas

---

### ✅ Definition of Done — Sprint 4

- [ ] Streaming response berjalan dan terlihat oleh pengguna
- [ ] Stop generation berfungsi di tengah stream
- [ ] Artifact history tersimpan (tidak overwrite)
- [ ] Upload validation memiliki 9 test yang hijau
- [ ] README dan `.env.example` up-to-date
- [ ] `bun run build` sukses
- [ ] `bun run test:unit` 100% hijau
- [ ] `bun run test:e2e` 100% hijau

---

## Prosedur Rollback

Jika ada masalah setelah setiap task, ikuti langkah berikut:

```bash
# 1. Lihat commit sebelumnya
git log --oneline -10

# 2. Rollback ke commit sebelum task bermasalah
git revert HEAD

# ATAU, jika perlu rollback lebih dari satu commit:
git revert HEAD~2..HEAD

# 3. Push rollback
git push origin main

# 4. Verifikasi build masih hijau
bun run build && bun run test:unit
```

**Aturan rollback:**
- Setiap task di-commit secara terpisah sehingga rollback bisa dilakukan per-task
- Jangan pernah squash semua perubahan dalam satu sprint ke satu commit
- Selalu jalankan `bun run build` dan `bun run test:unit` sebelum push

---

## Checklist Verifikasi Visual (Setiap Akhir Sprint)

Lakukan pengecekan manual ini di browser sebelum menandai sprint selesai:

- [ ] Halaman utama (`/`) tampil identik dengan sebelum sprint
- [ ] Mengirim pesan baru berfungsi normal
- [ ] Respons AI muncul dengan benar
- [ ] Kode visual (p5/D3/SVG/Mermaid) ter-render di ArtifactPanel
- [ ] Upload gambar berfungsi
- [ ] Sidebar dan navigasi chat tidak berubah
- [ ] Settings modal terbuka dan berfungsi
- [ ] Dark mode / light mode toggle berfungsi
- [ ] Tidak ada console error di browser developer tools
- [ ] Tidak ada layout shift atau broken styling

---

## Ringkasan Estimasi Waktu

| Task | Estimasi |
|---|---|
| 1.1 Rate limit semua endpoint | 2 jam |
| 1.2 Bersihkan debug code | 1 jam |
| 1.3 Hapus sidebar duplikat | 1 jam |
| 2.1 Hubungkan chat summarizer | 3 jam |
| 2.2 Token count akurat | 1 jam |
| 2.3 Ganti image hosting ke Supabase | 4 jam |
| 2.4 Unit test gemini-client | 3 jam |
| 3.1 Ekstrak MessageList | 4 jam |
| 3.2 Ekstrak MessageItem | 3 jam |
| 3.3 Ekstrak ChatImagePreview | 2 jam |
| 3.4 Ekstrak ChatExportMenu | 2 jam |
| 3.5 Validasi ChatPanel | 1 jam |
| 4.1 Implementasi streaming | 6 jam |
| 4.2 History artifact | 2 jam |
| 4.3 Test upload validation | 3 jam |
| 4.4 Housekeeping | 2 jam |
| **Total** | **~40 jam (~1 developer, 1 minggu penuh)** |
