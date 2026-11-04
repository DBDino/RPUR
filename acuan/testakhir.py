import pandas as pd

# 1. Baca data dari Excel
jadwal_file = 'jadwal_kuliah.xlsx'
ruang_file = 'ruangan_kuliah.xlsx'
df = pd.read_excel(jadwal_file, sheet_name=0)
df_ruang_master = pd.read_excel(ruang_file, sheet_name='list ruang', header=3)

# 2. Hapus spasi tersembunyi di awal/akhir nama kolom
df.columns = df.columns.astype(str).str.strip()
df_ruang_master.columns = df_ruang_master.columns.astype(str).str.strip()


# Fungsi pembantu pencarian nama kolom fleksibel
def get_column_name(df_target, name_targets):
  if isinstance(name_targets, str):
    name_targets = [name_targets]
  for target in name_targets:
    target_clean = target.lower().replace(' ', '')
    for col in df_target.columns:
      if col.lower().replace(' ', '') == target_clean:
        return col
  return None


# Deteksi kolom secara dinamis
col_ruang_kode = get_column_name(
    df, ['JadwalRuangKode', 'jadwalruangkode', 'ruangkode']
)
col_jadwal_kode = get_column_name(df, ['JadwalKode', 'jadwalkode'])
col_hari = get_column_name(df, ['hHari', 'hhari', 'Hari'])
col_jam_mulai = get_column_name(
    df, ['JadwalJadwalJamMulai', 'jam_mulai', 'JamMulai']
)
col_jam_akhir = get_column_name(
    df, ['JadwalJadwalJamAkhir', 'jadwaljadwaljamakhir', 'JamAkhir']
)
col_nama_ruang = get_column_name(
    df, ['RuanganNamaRuang', 'Nama Ruangan', 'NamaRuang']
)
col_jumlah_mhs = get_column_name(df, ['JumlahMhs', 'jumlahmhs', 'JadwalKuota'])
col_kapasitas = get_column_name(
    df, ['Kapasitas ruangan', 'KapasitasRuangan', 'Kapasitas']
)
col_mk_nama = get_column_name(df, ['MKNamaMataKuliah', 'MKNama', 'MataKuliah'])

if not col_ruang_kode:
  raise KeyError(
      'Kolom kode ruangan tidak ditemukan. Daftar kolom di Excel Anda:'
      f' {list(df.columns)}'
  )

# 3. Format kode ke String (mencegah format eksponensial E+14)
df[col_ruang_kode] = (
    df[col_ruang_kode].astype(str).str.replace(r'\.0$', '', regex=True)
)
if col_jadwal_kode:
  df[col_jadwal_kode] = (
      df[col_jadwal_kode].astype(str).str.replace(r'\.0$', '', regex=True)
  )

kolom_asli = list(df.columns)

# 4. Konversi jam ke datetime
df['jam_mulai_dt'] = pd.to_datetime(
    df[col_jam_mulai].astype(str), format='mixed'
)
df['jam_akhir_dt'] = pd.to_datetime(
    df[col_jam_akhir].astype(str), format='mixed'
)
df['durasi_jam'] = (
    df['jam_akhir_dt'] - df['jam_mulai_dt']
).dt.total_seconds() / 3600

# ==========================================
# FEATURE 1: DETEKSI JADWAL BENTROK
# ==========================================
df_reset = df.reset_index()
df_merged = df_reset.merge(
    df_reset, on=[col_ruang_kode, col_hari], suffixes=('_1', '_2')
)

kondisi_bentrok = (
    (df_merged['index_1'] != df_merged['index_2'])
    & (df_merged['jam_mulai_dt_1'] < df_merged['jam_akhir_dt_2'])
    & (df_merged['jam_akhir_dt_1'] > df_merged['jam_mulai_dt_2'])
)

index_bentrok = df_merged[kondisi_bentrok]['index_1'].unique()
df_bentrok = df.loc[index_bentrok, kolom_asli].copy()

# ==========================================
# FEATURE 2: OKUPANSI WAKTU (SENIN - SABTU)
# ==========================================
daftar_hari = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
group_cols_ruang = [c for c in [col_ruang_kode, col_nama_ruang] if c]
ruangan_unique = df[group_cols_ruang].drop_duplicates()
grid_lengkap = ruangan_unique.merge(
    pd.DataFrame({col_hari: daftar_hari}), how='cross'
)

rekap_ada = df.groupby(group_cols_ruang + [col_hari], as_index=False)[
    'durasi_jam'
].sum()

rekap_waktu = pd.merge(
    grid_lengkap, rekap_ada, on=group_cols_ruang + [col_hari], how='left'
).fillna({'durasi_jam': 0})

JAM_OPERASIONAL_HARIAN = 6.0
rekap_waktu['occupation_rate_waktu_%'] = (
    rekap_waktu['durasi_jam'] / JAM_OPERASIONAL_HARIAN
) * 100
rekap_waktu[col_hari] = pd.Categorical(
    rekap_waktu[col_hari], categories=daftar_hari, ordered=True
)
rekap_waktu = rekap_waktu.sort_values([col_ruang_kode, col_hari]).round(2)

# ==========================================
# FEATURE 3: OKUPANSI KAPASITAS (PER JADWALKODE)
# ==========================================
if col_jumlah_mhs and col_kapasitas:
  df[col_jumlah_mhs] = pd.to_numeric(
      df[col_jumlah_mhs], errors='coerce'
  ).fillna(0)
  df[col_kapasitas] = pd.to_numeric(
      df[col_kapasitas], errors='coerce'
  ).fillna(0)
  df['okupansi_kapasitas_%'] = (
      df[col_jumlah_mhs] / df[col_kapasitas].replace(0, pd.NA)
  ) * 100
  df['okupansi_kapasitas_%'] = df['okupansi_kapasitas_%'].fillna(0).round(2)

kolom_kapasitas_detail = [
    c
    for c in [
        col_jadwal_kode,
        col_ruang_kode,
        col_nama_ruang,
        col_hari,
        col_jam_mulai,
        col_jam_akhir,
        col_mk_nama,
        col_kapasitas,
        col_jumlah_mhs,
        'okupansi_kapasitas_%',
    ]
    if c in df.columns
]
df_okupansi_kapasitas = df[kolom_kapasitas_detail].copy()

# ==========================================
# FEATURE 4: RUANGAN TIDAK TERPAKAI
# ==========================================
col_master_ruang = (
    get_column_name(
        df_ruang_master, ['ruangkode', 'JadwalRuangKode', 'KodeRuang', 'KODE RUANG']
    )
    or df_ruang_master.columns[0]
)
df_ruang_master[col_master_ruang] = (
    df_ruang_master[col_master_ruang]
    .astype(str)
    .str.replace(r'\.0$', '', regex=True)
)

ruangan_terpakai = df[col_ruang_kode].dropna().unique()
df_tidak_terpakai = df_ruang_master[
    ~df_ruang_master[col_master_ruang].isin(ruangan_terpakai)
].copy()

# ==========================================
# EKSPOR KE MULTI-SHEET EXCEL
# ==========================================
with pd.ExcelWriter(
    'hasil_analisis_jadwal_lengkap.xlsx', engine='openpyxl'
) as writer:
  rekap_waktu.to_excel(writer, sheet_name='Okupansi_Waktu', index=False)
  df_bentrok.to_excel(writer, sheet_name='Jadwal_Bentrok', index=False)
  df_okupansi_kapasitas.to_excel(
      writer, sheet_name='Okupansi_Kapasitas', index=False
  )
  df_tidak_terpakai.to_excel(
      writer, sheet_name='Ruangan_Tidak_Terpakai', index=False
  )

print(
    'Proses analisis selesai! File hasil_analisis_jadwal_lengkap.xlsx berhasil'
    ' dibuat.'
)