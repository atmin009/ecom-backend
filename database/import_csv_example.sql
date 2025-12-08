-- ============================================
-- ตัวอย่างการ Import จาก CSV
-- ============================================

-- หมายเหตุ: ต้อง enable LOAD DATA LOCAL INFILE
-- SET GLOBAL local_infile = 1;

-- ============================================
-- 1. Import Provinces จาก CSV
-- ============================================
-- ไฟล์: provinces.csv
-- รูปแบบ: id,name_th,name_en

LOAD DATA LOCAL INFILE '/path/to/provinces.csv'
INTO TABLE provinces
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(id, name_th, name_en);

-- ============================================
-- 2. Import Districts จาก CSV
-- ============================================
-- ไฟล์: districts.csv
-- รูปแบบ: id,province_id,name_th,name_en

LOAD DATA LOCAL INFILE '/path/to/districts.csv'
INTO TABLE districts
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(id, province_id, name_th, name_en);

-- ============================================
-- 3. Import Subdistricts จาก CSV
-- ============================================
-- ไฟล์: subdistricts.csv
-- รูปแบบ: id,district_id,name_th,name_en,postal_code

LOAD DATA LOCAL INFILE '/path/to/subdistricts.csv'
INTO TABLE subdistricts
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(id, district_id, name_th, name_en, postal_code);

-- ============================================
-- ตัวอย่าง CSV Files
-- ============================================

-- provinces.csv
-- id,name_th,name_en
-- 1,กรุงเทพมหานคร,Bangkok
-- 2,สมุทรปราการ,Samut Prakan
-- 3,นนทบุรี,Nonthaburi

-- districts.csv
-- id,province_id,name_th,name_en
-- 1,1,เขตพระนคร,Phra Nakhon District
-- 2,1,เขตดุสิต,Dusit District
-- 3,3,อำเภอเมืองนนทบุรี,Mueang Nonthaburi District

-- subdistricts.csv
-- id,district_id,name_th,name_en,postal_code
-- 1,1,แขวงพระบรมมหาราชวัง,Phra Borom Maha Ratchawang,10200
-- 2,1,แขวงวังบูรพาภิรมย์,Wang Burapha Phirom,10200
-- 3,3,ตำบลสวนใหญ่,Suan Yai,11000

