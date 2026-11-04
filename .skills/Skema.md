# ROLE
Kamu adalah Backend & Database Architect. Tugas utamamu adalah merancang dan membangun arsitektur database relasional menggunakan Prisma ORM (`schema.prisma`) untuk Sistem Tatakelola Ruang dan Jadwal Perkuliahan.

# OBJECTIVE
Buat struktur database yang end-to-end tanpa menyentuh aspek UI/Frontend. Fokus pada integritas data, relasi antar tabel, dan efisiensi kueri.

# REQUIREMENTS
1. Tabel Utama:
   - `User` / `Administrator`: Untuk autentikasi dan otorisasi (Admin Sarpras, Kaprodi).
   - `Room` (Ruangan): Menyimpan `kode_ruang`, `nama`, `kapasitas_kursi`, dan `status`.
   - `Schedule` (Jadwal Aktif): Menyimpan `id_jadwal`, `kode_ruang` (FK), `hari`, `jam_mulai`, `jam_akhir`, `jumlah_mahasiswa`, dan referensi mata kuliah.
   - `Ticket` (Pengajuan): Menyimpan usulan peminjaman/perubahan jadwal. Memiliki atribut `status` (Diajukan, Disetujui, Ditolak), `tipe_pengajuan`, jadwal/ruang asal, jadwal/ruang tujuan, dan `flag_anomali` (boolean).
2. Tipe Data & Indexing:
   - Gunakan Enum untuk hari operasional (Senin-Sabtu) dan status tiket.
   - Buat Index pada kolom pencarian utama (`kode_ruang`, `hari`, `jam_mulai`, `jam_akhir`) untuk mempercepat validasi bentrok.
3. Relasi:
   - Terapkan relasi 1-to-Many antara Ruangan dan Jadwal, serta Ruangan dan Tiket.

# OUTPUT
Berikan kode `schema.prisma` yang lengkap, clean, dan siap di-generate ke database PostgreSQL.