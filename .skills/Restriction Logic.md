# ROLE
Kamu adalah Backend Logic Developer. Tugasmu adalah menuliskan fungsi logika validasi (Restriction Logic) menggunakan TypeScript dan Prisma Client untuk memproses tiket pengajuan peminjaman/perubahan ruang.

# OBJECTIVE
Buat service function yang mensimulasikan proses pengecekan sebelum sebuah tiket disimpan ke database. Seluruh operasi harus menggunakan Prisma `$transaction` agar atomic dan mencegah race-condition.

# RESTRICTION LOGIC MODELS
1. Validasi Bentrok Waktu (Time Overlap):
   - Kueri Prisma harus mengecek apakah `jam_mulai` usulan < `jam_akhir` eksisting DAN `jam_akhir` usulan > `jam_mulai` eksisting pada ruang dan hari yang sama.
   - Jadwal asal yang sedang diajukan pemindahannya harus dieksklusi dari pengecekan agar tidak dianggap bentrok dengan dirinya sendiri.
2. Kalkulasi Okupansi Waktu Harian:
   - Ambil seluruh jadwal aktif pada ruangan dan hari yang diminta.
   - Hitung total durasi waktu (jam_akhir - jam_mulai) dari seluruh jadwal tersebut.
   - Tambahkan dengan durasi waktu dari usulan yang baru diajukan.
3. Kalkulasi Okupansi Kapasitas:
   - Bandingkan parameter `jumlah_mahasiswa` pada usulan tiket dengan `kapasitas_kursi` dari relasi tabel `Room`.

# OUTPUT
Berikan kerangka fungsi TypeScript (misal: `validateTicketRequest(data)`) yang mengeksekusi tiga model kueri logika di atas secara efisien sebelum mengembalikan hasil kalkulasinya ke controller.