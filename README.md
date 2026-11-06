# RPUR

Dashboard tata kelola roster perkuliahan dan utilisasi ruangan untuk Universitas Padjadjaran.

## Persyaratan

- Node.js 20 atau lebih baru
- Database PostgreSQL, direkomendasikan Neon

## Setup database Neon

1. Buat database PostgreSQL di Neon.
2. Salin `.env.example` menjadi `.env.local`.
3. Isi `DATABASE_URL` dan `DIRECT_URL`.
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

Untuk pengecekan sebelum push:

```powershell
npm.cmd run lint
npm.cmd run build
```

Migrasi Prisma tersimpan di `prisma/migrations` dan dapat dijalankan ulang ketika repository di-clone atau saat deployment Vercel.

Tambahkan environment variable yang sama pada project Vercel. `DIRECT_URL` dapat sama dengan `DATABASE_URL` untuk akun Neon awal.

## Matriks akses berdasarkan FSD

| Modul | ADMIN | KAPRODI | SARPRAS | VIEWER / PJ |
|---|---|---|---|---|
| Dashboard dan analitik | Lihat, sinkronisasi | Lihat | Lihat | Lihat |
| Master ruangan | Tambah, ubah, hapus | Lihat | Lihat; perbarui data operasional | Lihat |
| Master jadwal | Tambah, ubah, hapus | Lihat lingkup prodi | Lihat | Lihat |
| Pengajuan ruang | Lihat semua; putuskan; hapus | Buat dan lihat miliknya | Buat, lihat, dan putuskan | Buat dan lihat miliknya |
| Tiket perbaikan | Kelola dan hapus semua | Buat dan lihat miliknya | Kelola | Buat dan lihat miliknya |
| Bentrok dan analisis | Lihat; tindak lanjuti | Lihat | Lihat; tindak lanjuti ruang | Lihat read-only |
