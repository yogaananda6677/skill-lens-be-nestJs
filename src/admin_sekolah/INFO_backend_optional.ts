// OPSIONAL: admin_sekolah.service.ts
// Endpoint getNilaiSiswa kamu sudah cukup karena mengambil nilai berdasarkan siswa.
// Penyebab data SMA kosong ada di frontend: filter kelas masih memakai siswa.kelas.
// Karena query SQL kamu ada hasilnya, backend tidak wajib diubah untuk kasus ini.
//
// Kalau ingin memperkuat semester, di bagian getNilaiSiswa, pakai semester dari kurikulum.semester dulu:
//
// const semester =
//   parseSemesterName(kurikulum?.semester?.nama_semester) ??
//   mapel?.semester ??
//   0;
//
// Tapi perbaikan utama tetap di AdminSchoolDataNilai.tsx.
