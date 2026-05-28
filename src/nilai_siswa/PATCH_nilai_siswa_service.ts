// // PATCH untuk src/nilai_siswa/nilai_siswa.service.ts
// // Pakai patch ini kalau file kamu belum punya ensureNilaiKategoriForSiswa().

// // 1) Saat import Excel, jangan create nilai_kategori_siswa dulu.
// // Di persistImportResults(), hapus / comment blok ini:
// //
// // for (const student of students) {
// //   const siswa = siswaByNisn.get(student.nisn)!;
// //   const result = resultByNisn.get(student.nisn)!;
// //
// //   await this.upsertNilaiKategori(manager, siswa, result, stats);
// //   persistedResults.push(result);
// // }
// //
// // Ganti menjadi:
// for (const student of students) {
//   const result = resultByNisn.get(student.nisn)!;
//   persistedResults.push(result);
// }

// // 2) Ubah pesan import supaya jelas:
// // Import nilai berhasil. Data siswa, mapel, kurikulum, dan nilai mentah sudah diproses. Nilai kategori akademik akan disiapkan saat siswa login.

// // 3) Tambahkan method ini di dalam class NilaiSiswaService:
// async ensureNilaiKategoriForSiswa(
//   idSiswa: number,
//   force = false,
// ): Promise<{
//   status: 'created' | 'updated' | 'skipped';
//   created: number;
//   updated: number;
// }> {
//   if (!idSiswa) {
//     throw new BadRequestException('ID siswa tidak valid.');
//   }

//   const existingCount = await this.kategoriRepo.count({
//     where: { id_siswa: idSiswa },
//   });

//   if (!force && existingCount >= NILAI_AKADEMIK_CATEGORIES.length) {
//     return {
//       status: 'skipped',
//       created: 0,
//       updated: 0,
//     };
//   }

//   const nilaiRepo = this.dataSource.getRepository(NilaiSiswa);
//   const siswaRepo = this.dataSource.getRepository(Siswa);

//   const siswa = await siswaRepo.findOne({
//     where: { id_siswa: idSiswa },
//   });

//   if (!siswa) {
//     throw new NotFoundException('Data siswa tidak ditemukan.');
//   }

//   const rawRows = await nilaiRepo.find({
//     where: { id_siswa: idSiswa },
//     relations: [
//       'kurikulum_mapel',
//       'kurikulum_mapel.mata_pelajaran',
//       'kurikulum_mapel.semester',
//     ],
//   });

//   if (!rawRows.length) {
//     throw new NotFoundException(
//       'Nilai mentah siswa belum tersedia. Import nilai terlebih dahulu.',
//     );
//   }

//   const { weights: semesterWeights } = parseSemesterWeights();
//   const buckets: Record<number, Record<AcademicCategory, CategoryBucket>> = {};

//   rawRows.forEach((row) => {
//     const mapel = row.kurikulum_mapel?.mata_pelajaran;
//     const semesterEntity = row.kurikulum_mapel?.semester;

//     const semester =
//       this.parseSemesterNumberFromName(semesterEntity?.nama_semester) ||
//       mapel?.semester ||
//       1;

//     const kategori =
//       (mapel?.kategori as AcademicCategory | null) ||
//       classifySubject(mapel?.nama_mapel || '').kategori;

//     if (!buckets[semester]) {
//       buckets[semester] = this.createEmptyBuckets();
//     }

//     const bucket = buckets[semester][kategori];
//     bucket.sum += Number(row.nilai || 0);
//     bucket.count += 1;
//     bucket.mapel.add(mapel?.nama_mapel || 'Mapel tidak diketahui');
//   });

//   let created = 0;
//   let updated = 0;

//   await this.dataSource.transaction(async (manager) => {
//     const kategoriRepo = manager.getRepository(NilaiKategoriSiswa);

//     for (const category of NILAI_AKADEMIK_CATEGORIES) {
//       const detail: FinalCategoryDetail[] = [];
//       let numerator = 0;
//       let denominator = 0;

//       Object.entries(buckets)
//         .sort(([a], [b]) => Number(a) - Number(b))
//         .forEach(([semesterKey, categoryBuckets]) => {
//           const semester = Number(semesterKey);
//           const bucket = categoryBuckets[category];

//           if (!bucket?.count) return;

//           const average = bucket.sum / bucket.count;
//           const weight = semesterWeights[semester] ?? 1;

//           numerator += average * weight;
//           denominator += weight;

//           detail.push({
//             semester,
//             bobot: weight,
//             rata_rata: roundScore(average),
//             jumlah_mapel: bucket.count,
//             mapel: Array.from(bucket.mapel.values()).sort(),
//           });
//         });

//       let row = await kategoriRepo.findOne({
//         where: {
//           id_siswa: idSiswa,
//           kategori: category,
//         },
//       });

//       if (!row) {
//         row = kategoriRepo.create({
//           id_siswa: idSiswa,
//           siswa,
//           kategori: category,
//         });
//         created += 1;
//       } else {
//         updated += 1;
//       }

//       const totalMapel = detail.reduce(
//         (sum, item) => sum + item.jumlah_mapel,
//         0,
//       );
//       const totalBobot = detail.reduce((sum, item) => sum + item.bobot, 0);

//       row.nilai = denominator ? roundScore(numerator / denominator) : 0;
//       row.total_bobot_terpakai = roundScore(totalBobot, 4);
//       row.jumlah_mapel_terpakai = totalMapel;
//       row.rincian_semester = detail;

//       await kategoriRepo.save(row);
//     }
//   });

//   return {
//     status: created ? 'created' : updated ? 'updated' : 'skipped',
//     created,
//     updated,
//   };
// }

// // 4) Tambahkan helper ini kalau belum ada:
// private parseSemesterNumberFromName(value?: string | null): number | null {
//   const match = String(value || '').match(/(\d+)/);
//   const semester = Number(match?.[1] || 0);

//   return Number.isFinite(semester) && semester > 0 ? semester : null;
// }
