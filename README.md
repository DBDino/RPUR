# RPUR

Dashboard tata kelola roster perkuliahan dan utilisasi ruangan untuk Universitas Padjadjaran.

## Persyaratan

- Node.js 20 atau lebih baru
- Database PostgreSQL, direkomendasikan Neon

## Setup database Neon

1. Buat database PostgreSQL di Neon.
2. Salin `.env.example` menjadi `.env.local`.
3. Isi `DATABASE_URL` dengan connection string pooled Neon (host berakhiran `-pooler`) dan `DIRECT_URL` dengan connection string direct untuk migrasi.
4. Jalankan:

```powershell
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:deploy
npm.cmd run db:seed
npm.cmd run dev
```

## Jalankan aplikasi

Untuk menjalankan pertama kali setelah clone:

```powershell
Set-Location "lokasi-folder-RPUR"
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:deploy
npm.cmd run db:seed
npm.cmd run dev
```

Buka `http://localhost:3000`.

## Akun pengujian

Semua akun demo menggunakan password berikut:

```text
password123
```

| Peran | Email |
|---|---|
| Administrator Sarpras | `admin@unpad.ac.id` |
| Kaprodi | `kaprodi@unpad.ac.id` |
| Pengelola Sarpras Fakultas | `sarpras@unpad.ac.id` |

Setelah migrasi, masuk sebagai admin dan buka menu **Pengguna** untuk menetapkan fakultas ke akun Kaprodi/PJ dan Sarpras. Ruangan lama belum memiliki fakultas; edit data tersebut dari **Inventaris Ruang** dan tetapkan fakultasnya. Akun pengelola yang belum memiliki fakultas tidak akan melihat data lintas fakultas. Pengguna baru masih memakai password demo `password123`, sesuai mekanisme autentikasi aplikasi saat ini.

Untuk pengecekan sebelum push:

```powershell
npm.cmd run lint
npm.cmd run build
```

Migrasi Prisma tersimpan di `prisma/migrations` dan dapat dijalankan ulang ketika repository di-clone atau saat deployment Vercel.

Tambahkan environment variable yang sama pada project Vercel. Untuk Neon, gunakan URL direct (non-`-pooler`) pada `DIRECT_URL`; jangan gunakan URL pooled untuk migrasi.

Fungsi Vercel dipin ke region Singapura (`sin1`) melalui `vercel.json`, sejalan dengan region database Neon `aws-ap-southeast-1`. Pengaturan autosuspend Neon saat ini nonaktif; biarkan demikian jika prioritasnya menghindari cold start, dengan mempertimbangkan biaya compute.

Sinkronisasi permintaan ruangan kedaluwarsa berjalan setelah ada pengajuan baru dan melalui cron setiap 10 menit; halaman Master Jadwal tidak menunggu sinkronisasi ini saat dibuka.

## Matriks akses berdasarkan FSD

| Modul | ADMIN | KAPRODI | SARPRAS | VIEWER / PJ |
|---|---|---|---|---|
| Dashboard dan analitik | Lihat, sinkronisasi | Lihat | Lihat | Lihat |
| Master ruangan | Tambah, ubah, hapus semua fakultas | Lihat fakultasnya | Lihat dan perbarui ruangan fakultasnya | Lihat |
| Master jadwal | Tambah, ubah, hapus semua fakultas | Lihat fakultasnya | Lihat fakultasnya | Lihat |
| Pengajuan ruang | Lihat semua; putuskan; hapus | Buat dan lihat miliknya | Ajukan untuk fakultas mana pun; lihat pengajuan sendiri dan permintaan fakultasnya; hapus miliknya; putuskan permintaan fakultasnya | Buat dan lihat miliknya |
| Tiket perbaikan | Kelola dan hapus semua | Buat dan lihat miliknya | Ajukan untuk fakultas mana pun; lihat tiket sendiri dan fakultasnya; hapus miliknya; proses tiket fakultasnya | Buat dan lihat miliknya |
| Bentrok dan analisis | Lihat; tindak lanjuti | Lihat | Lihat; tindak lanjuti ruang | Lihat read-only |
| Pengguna | Kelola akun dan penetapan fakultas | — | — | — |

Sarpras dapat mengajukan permintaan ruangan dan tiket perbaikan ke fakultas mana pun. Sarpras hanya melihat pengajuan sendiri serta permintaan/tiket fakultas yang diurusnya; miliknya sendiri hanya dapat dihapus, sedangkan permintaan/tiket fakultasnya dapat diproses tanpa dihapus. Sarpras tidak dapat menyetujui atau menolak pengajuan ruangan sendiri. Jam mulai dan selesai pada pengajuan ditampilkan sebagai field berlabel. Jadwal kuliah dapat diedit lewat dropdown pada setiap baris jadwal; jadwal yang dibuat dari tiket dikelola melalui tiketnya.

Data ruangan, jadwal, analitik, konflik, dan antrean Sarpras lainnya tetap dibatasi sesuai fakultas yang diurus. Admin dapat melihat seluruh fakultas dan mengelola akun serta penetapan fakultas.

Untuk meninjau dan mendorong perubahan kode ke GitHub setelah pengecekan:

```powershell
git status --short
git add README.md app components lib prisma/schema.prisma prisma/migrations vercel.json
git diff --cached --check
git commit -m "Scope Sarpras requests and improve schedule editing" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git push origin main
```

Jangan `git add` workbook jika perubahan Excel tersebut tidak dimaksudkan untuk dipush.
