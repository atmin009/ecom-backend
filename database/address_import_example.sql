-- ============================================
-- ตัวอย่างโครงสร้างข้อมูลสำหรับ Import ข้อมูลที่อยู่ไทย
-- ============================================

-- วิธีที่ 1: ใช้ SQL INSERT Statements
-- ============================================

-- 1. Provinces (จังหวัด)
-- โครงสร้าง: id, name_th, name_en
INSERT INTO provinces (id, name_th, name_en) VALUES
(1, 'กรุงเทพมหานคร', 'Bangkok'),
(2, 'เชียงใหม่', 'Chiang Mai'),
(3, 'นนทบุรี', 'Nonthaburi'),
(4, 'ปทุมธานี', 'Pathum Thani'),
(5, 'สมุทรปราการ', 'Samut Prakan');

-- 2. Districts (อำเภอ/เขต)
-- โครงสร้าง: id, province_id, name_th, name_en
-- หมายเหตุ: province_id ต้องอ้างอิงไปยัง provinces.id ที่มีอยู่
INSERT INTO districts (id, province_id, name_th, name_en) VALUES
(1, 1, 'เขตพระนคร', 'Phra Nakhon District'),
(2, 1, 'เขตดุสิต', 'Dusit District'),
(3, 1, 'เขตหนองจอก', 'Nong Chok District'),
(4, 1, 'เขตบางรัก', 'Bang Rak District'),
(5, 1, 'เขตบางเขน', 'Bang Khen District'),
(6, 3, 'อำเภอเมืองนนทบุรี', 'Mueang Nonthaburi District'),
(7, 3, 'อำเภอบางกรวย', 'Bang Kruai District'),
(8, 3, 'อำเภอบางใหญ่', 'Bang Yai District');

-- 3. Subdistricts (ตำบล/แขวง)
-- โครงสร้าง: id, district_id, name_th, name_en, postal_code
-- หมายเหตุ: district_id ต้องอ้างอิงไปยัง districts.id ที่มีอยู่
INSERT INTO subdistricts (id, district_id, name_th, name_en, postal_code) VALUES
(1, 1, 'แขวงพระบรมมหาราชวัง', 'Phra Borom Maha Ratchawang', '10200'),
(2, 1, 'แขวงวังบูรพาภิรมย์', 'Wang Burapha Phirom', '10200'),
(3, 4, 'แขวงสีลม', 'Si Lom', '10500'),
(4, 4, 'แขวงสุริยวงศ์', 'Suriyawong', '10500'),
(5, 6, 'ตำบลสวนใหญ่', 'Suan Yai', '11000'),
(6, 6, 'ตำบลตลาดขวัญ', 'Talat Khwan', '11000');

-- ============================================
-- วิธีที่ 2: ใช้ CSV Format
-- ============================================

-- provinces.csv
-- id,name_th,name_en
-- 1,กรุงเทพมหานคร,Bangkok
-- 2,เชียงใหม่,Chiang Mai
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

-- ============================================
-- วิธีที่ 3: ใช้ JSON Format
-- ============================================

-- address_data.json
-- {
--   "provinces": [
--     { "id": 1, "name_th": "กรุงเทพมหานคร", "name_en": "Bangkok" },
--     { "id": 2, "name_th": "เชียงใหม่", "name_en": "Chiang Mai" }
--   ],
--   "districts": [
--     { "id": 1, "province_id": 1, "name_th": "เขตพระนคร", "name_en": "Phra Nakhon District" },
--     { "id": 2, "province_id": 1, "name_th": "เขตดุสิต", "name_en": "Dusit District" }
--   ],
--   "subdistricts": [
--     { "id": 1, "district_id": 1, "name_th": "แขวงพระบรมมหาราชวัง", "name_en": "Phra Borom Maha Ratchawang", "postal_code": "10200" },
--     { "id": 2, "district_id": 1, "name_th": "แขวงวังบูรพาภิรมย์", "name_en": "Wang Burapha Phirom", "postal_code": "10200" }
--   ]
-- }

