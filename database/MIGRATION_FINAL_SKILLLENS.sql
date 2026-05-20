-- MIGRATION FINAL SKILLLENS BACKEND MATANG
-- Jalankan di database MySQL jika TYPEORM_SYNC=false.
-- Backup database terlebih dahulu sebelum eksekusi.

ALTER TABLE users
  MODIFY COLUMN role ENUM('superadmin','admin','admin_sekolah','guru','siswa') NOT NULL DEFAULT 'siswa';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS id_sekolah INT NULL,
  ADD COLUMN IF NOT EXISTS must_change_password TINYINT NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD INDEX IF NOT EXISTS idx_users_id_sekolah (id_sekolah);

-- Jika MySQL tidak mendukung ADD COLUMN IF NOT EXISTS / ADD INDEX IF NOT EXISTS,
-- jalankan ALTER TABLE secara manual hanya untuk kolom/index yang belum ada.

CREATE TABLE IF NOT EXISTS roadmap_master (
  id_roadmap INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  category VARCHAR(120) NULL,
  target_type ENUM('kuliah','kerja','wirausaha','umum') NOT NULL DEFAULT 'umum',
  recommended_for VARCHAR(120) NULL,
  is_active TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roadmap_step (
  id_roadmap_step INT AUTO_INCREMENT PRIMARY KEY,
  id_roadmap INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  step_order INT NOT NULL DEFAULT 1,
  estimated_duration VARCHAR(80) NULL,
  output_target VARCHAR(180) NULL,
  is_active TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_roadmap_step_master FOREIGN KEY (id_roadmap) REFERENCES roadmap_master(id_roadmap) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roadmap_step_detail (
  id_roadmap_step_detail INT AUTO_INCREMENT PRIMARY KEY,
  id_roadmap_step INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  reference_link TEXT NULL,
  reference_type VARCHAR(80) NULL,
  detail_order INT NOT NULL DEFAULT 1,
  is_active TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_roadmap_detail_step FOREIGN KEY (id_roadmap_step) REFERENCES roadmap_step(id_roadmap_step) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_roadmap (
  id_student_roadmap INT AUTO_INCREMENT PRIMARY KEY,
  id_siswa INT NOT NULL,
  id_roadmap INT NOT NULL,
  status ENUM('aktif','selesai','dibatalkan') NOT NULL DEFAULT 'aktif',
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_student_roadmap_siswa (id_siswa),
  INDEX idx_student_roadmap_roadmap (id_roadmap),
  CONSTRAINT fk_student_roadmap_siswa FOREIGN KEY (id_siswa) REFERENCES siswa(id_siswa) ON DELETE CASCADE,
  CONSTRAINT fk_student_roadmap_master FOREIGN KEY (id_roadmap) REFERENCES roadmap_master(id_roadmap)
);

CREATE TABLE IF NOT EXISTS student_roadmap_progress (
  id_student_roadmap_progress INT AUTO_INCREMENT PRIMARY KEY,
  id_student_roadmap INT NOT NULL,
  id_roadmap_step_detail INT NOT NULL,
  status ENUM('belum','proses','selesai') NOT NULL DEFAULT 'belum',
  progress_note TEXT NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_progress_detail (id_student_roadmap, id_roadmap_step_detail),
  CONSTRAINT fk_student_progress_roadmap FOREIGN KEY (id_student_roadmap) REFERENCES student_roadmap(id_student_roadmap) ON DELETE CASCADE,
  CONSTRAINT fk_student_progress_detail FOREIGN KEY (id_roadmap_step_detail) REFERENCES roadmap_step_detail(id_roadmap_step_detail)
);

CREATE TABLE IF NOT EXISTS roadmap_step_notes (
  id_roadmap_step_note INT AUTO_INCREMENT PRIMARY KEY,
  id_student_roadmap INT NOT NULL,
  id_roadmap_step INT NOT NULL,
  id_guru INT NOT NULL,
  title VARCHAR(160) NULL,
  note TEXT NOT NULL,
  follow_up TEXT NULL,
  visible_to_student TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_step_notes_student_roadmap (id_student_roadmap),
  INDEX idx_step_notes_step (id_roadmap_step),
  CONSTRAINT fk_step_note_student_roadmap FOREIGN KEY (id_student_roadmap) REFERENCES student_roadmap(id_student_roadmap) ON DELETE CASCADE,
  CONSTRAINT fk_step_note_step FOREIGN KEY (id_roadmap_step) REFERENCES roadmap_step(id_roadmap_step),
  CONSTRAINT fk_step_note_guru FOREIGN KEY (id_guru) REFERENCES guru(id_guru)
);

CREATE TABLE IF NOT EXISTS guidance_notes (
  id_guidance_note INT AUTO_INCREMENT PRIMARY KEY,
  id_siswa INT NOT NULL,
  id_guru INT NOT NULL,
  topic VARCHAR(160) NOT NULL,
  note TEXT NOT NULL,
  follow_up TEXT NULL,
  status ENUM('draft','aktif','selesai') NOT NULL DEFAULT 'aktif',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_guidance_notes_siswa (id_siswa),
  INDEX idx_guidance_notes_guru (id_guru),
  CONSTRAINT fk_guidance_note_siswa FOREIGN KEY (id_siswa) REFERENCES siswa(id_siswa) ON DELETE CASCADE,
  CONSTRAINT fk_guidance_note_guru FOREIGN KEY (id_guru) REFERENCES guru(id_guru)
);

CREATE TABLE IF NOT EXISTS recommendation_runs (
  id_recommendation_run INT AUTO_INCREMENT PRIMARY KEY,
  id_siswa INT NOT NULL,
  tujuan_karir VARCHAR(40) NOT NULL,
  jenis_sekolah VARCHAR(40) NOT NULL,
  jurusan_sekolah VARCHAR(80) NULL,
  payload JSON NOT NULL,
  raw_response JSON NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'success',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recommendation_runs_siswa (id_siswa),
  CONSTRAINT fk_recommendation_run_siswa FOREIGN KEY (id_siswa) REFERENCES siswa(id_siswa) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recommendation_results (
  id_recommendation_result INT AUTO_INCREMENT PRIMARY KEY,
  id_recommendation_run INT NOT NULL,
  rank_order INT NOT NULL DEFAULT 0,
  alternative_name VARCHAR(180) NOT NULL,
  alternative_type VARCHAR(80) NULL,
  score FLOAT NOT NULL DEFAULT 0,
  detail JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recommendation_results_run (id_recommendation_run),
  CONSTRAINT fk_recommendation_result_run FOREIGN KEY (id_recommendation_run) REFERENCES recommendation_runs(id_recommendation_run) ON DELETE CASCADE
);

-- Pastikan master_tags mendukung prestasi.
ALTER TABLE master_tags
  MODIFY COLUMN tipe VARCHAR(50) NOT NULL;
