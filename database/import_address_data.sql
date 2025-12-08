-- ============================================
-- สคริปต์สำหรับ Import ข้อมูลที่อยู่ไทย
-- ============================================
-- วิธีใช้: mysql -u root -p ecommerce < import_address_data.sql
-- หรือใช้ MySQL Workbench, phpMyAdmin, etc.

-- ลบข้อมูลเก่า (ถ้ามี)
-- DELETE FROM subdistricts;
-- DELETE FROM districts;
-- DELETE FROM provinces;

-- ============================================
-- 1. PROVINCES (จังหวัด)
-- ============================================
-- โครงสร้าง: id, name_th, name_en
-- ตัวแปรที่ต้องมี:
--   - id: INT (Primary Key, Auto Increment หรือระบุเอง)
--   - name_th: VARCHAR(100) - ชื่อจังหวัดภาษาไทย
--   - name_en: VARCHAR(100) - ชื่อจังหวัดภาษาอังกฤษ

INSERT INTO provinces (id, name_th, name_en) VALUES
(1, 'กรุงเทพมหานคร', 'Bangkok'),
(2, 'สมุทรปราการ', 'Samut Prakan'),
(3, 'นนทบุรี', 'Nonthaburi'),
(4, 'ปทุมธานี', 'Pathum Thani'),
(5, 'พระนครศรีอยุธยา', 'Phra Nakhon Si Ayutthaya'),
(6, 'อ่างทอง', 'Ang Thong'),
(7, 'ลพบุรี', 'Lopburi'),
(8, 'สิงห์บุรี', 'Sing Buri'),
(9, 'ชัยนาท', 'Chai Nat'),
(10, 'สระบุรี', 'Saraburi'),
(11, 'ชลบุรี', 'Chon Buri'),
(12, 'ระยอง', 'Rayong'),
(13, 'จันทบุรี', 'Chanthaburi'),
(14, 'ตราด', 'Trat'),
(15, 'ฉะเชิงเทรา', 'Chachoengsao'),
(16, 'ปราจีนบุรี', 'Prachin Buri'),
(17, 'นครนายก', 'Nakhon Nayok'),
(18, 'สระแก้ว', 'Sa Kaeo'),
(19, 'นครราชสีมา', 'Nakhon Ratchasima'),
(20, 'บุรีรัมย์', 'Buri Ram'),
(21, 'สุรินทร์', 'Surin'),
(22, 'ศรีสะเกษ', 'Si Sa Ket'),
(23, 'อุบลราชธานี', 'Ubon Ratchathani'),
(24, 'ยโสธร', 'Yasothon'),
(25, 'ชัยภูมิ', 'Chaiyaphum'),
(26, 'อำนาจเจริญ', 'Amnat Charoen'),
(27, 'หนองบัวลำภู', 'Nong Bua Lam Phu'),
(28, 'ขอนแก่น', 'Khon Kaen'),
(29, 'อุดรธานี', 'Udon Thani'),
(30, 'เลย', 'Loei'),
(31, 'หนองคาย', 'Nong Khai'),
(32, 'มหาสารคาม', 'Maha Sarakham'),
(33, 'ร้อยเอ็ด', 'Roi Et'),
(34, 'กาฬสินธุ์', 'Kalasin'),
(35, 'สกลนคร', 'Sakon Nakhon'),
(36, 'นครพนม', 'Nakhon Phanom'),
(37, 'มุกดาหาร', 'Mukdahan'),
(38, 'เชียงใหม่', 'Chiang Mai'),
(39, 'ลำพูน', 'Lamphun'),
(40, 'ลำปาง', 'Lampang'),
(41, 'อุตรดิตถ์', 'Uttaradit'),
(42, 'แพร่', 'Phrae'),
(43, 'น่าน', 'Nan'),
(44, 'พะเยา', 'Phayao'),
(45, 'เชียงราย', 'Chiang Rai'),
(46, 'แม่ฮ่องสอน', 'Mae Hong Son'),
(47, 'นครสวรรค์', 'Nakhon Sawan'),
(48, 'อุทัยธานี', 'Uthai Thani'),
(49, 'กำแพงเพชร', 'Kamphaeng Phet'),
(50, 'ตาก', 'Tak'),
(51, 'สุโขทัย', 'Sukhothai'),
(52, 'พิษณุโลก', 'Phitsanulok'),
(53, 'พิจิตร', 'Phichit'),
(54, 'เพชรบูรณ์', 'Phetchabun'),
(55, 'ราชบุรี', 'Ratchaburi'),
(56, 'กาญจนบุรี', 'Kanchanaburi'),
(57, 'สุพรรณบุรี', 'Suphan Buri'),
(58, 'นครปฐม', 'Nakhon Pathom'),
(59, 'สมุทรสาคร', 'Samut Sakhon'),
(60, 'สมุทรสงคราม', 'Samut Songkhram'),
(61, 'เพชรบุรี', 'Phetchaburi'),
(62, 'ประจวบคีรีขันธ์', 'Prachuap Khiri Khan'),
(63, 'นครศรีธรรมราช', 'Nakhon Si Thammarat'),
(64, 'กระบี่', 'Krabi'),
(65, 'พังงา', 'Phangnga'),
(66, 'ภูเก็ต', 'Phuket'),
(67, 'สุราษฎร์ธานี', 'Surat Thani'),
(68, 'ระนอง', 'Ranong'),
(69, 'ชุมพร', 'Chumphon'),
(70, 'สงขลา', 'Songkhla'),
(71, 'สตูล', 'Satun'),
(72, 'ตรัง', 'Trang'),
(73, 'พัทลุง', 'Phatthalung'),
(74, 'ปัตตานี', 'Pattani'),
(75, 'ยะลา', 'Yala'),
(76, 'นราธิวาส', 'Narathiwat'),
(77, 'บึงกาฬ', 'Bueng Kan');

-- ============================================
-- 2. DISTRICTS (อำเภอ/เขต)
-- ============================================
-- โครงสร้าง: id, province_id, name_th, name_en
-- ตัวแปรที่ต้องมี:
--   - id: INT (Primary Key, Auto Increment หรือระบุเอง)
--   - province_id: INT (Foreign Key -> provinces.id)
--   - name_th: VARCHAR(100) - ชื่ออำเภอ/เขตภาษาไทย
--   - name_en: VARCHAR(100) - ชื่ออำเภอ/เขตภาษาอังกฤษ

-- ตัวอย่าง: กรุงเทพมหานคร (province_id = 1)
INSERT INTO districts (id, province_id, name_th, name_en) VALUES
(1, 1, 'เขตพระนคร', 'Phra Nakhon District'),
(2, 1, 'เขตดุสิต', 'Dusit District'),
(3, 1, 'เขตหนองจอก', 'Nong Chok District'),
(4, 1, 'เขตบางรัก', 'Bang Rak District'),
(5, 1, 'เขตบางเขน', 'Bang Khen District'),
(6, 1, 'เขตบางกะปิ', 'Bang Kapi District'),
(7, 1, 'เขตปทุมวัน', 'Pathum Wan District'),
(8, 1, 'เขตป้อมปราบศัตรูพ่าย', 'Pom Prap Sattru Phai District'),
(9, 1, 'เขตพระโขนง', 'Phra Khanong District'),
(10, 1, 'เขตมีนบุรี', 'Min Buri District'),
(11, 1, 'เขตลาดกระบัง', 'Lat Krabang District'),
(12, 1, 'เขตยานนาวา', 'Yan Nawa District'),
(13, 1, 'เขตสัมพันธวงศ์', 'Samphanthawong District'),
(14, 1, 'เขตพญาไท', 'Phaya Thai District'),
(15, 1, 'เขตธนบุรี', 'Thon Buri District'),
(16, 1, 'เขตบางกอกใหญ่', 'Bangkok Yai District'),
(17, 1, 'เขตห้วยขวาง', 'Huai Khwang District'),
(18, 1, 'เขตคลองสาน', 'Khlong San District'),
(19, 1, 'เขตตลิ่งชัน', 'Taling Chan District'),
(20, 1, 'เขตบางกอกน้อย', 'Bangkok Noi District'),
(21, 1, 'เขตบางขุนเทียน', 'Bang Khun Thian District'),
(22, 1, 'เขตภาษีเจริญ', 'Phasi Charoen District'),
(23, 1, 'เขตหนองแขม', 'Nong Khaem District'),
(24, 1, 'เขตราษฎร์บูรณะ', 'Rat Burana District'),
(25, 1, 'เขตบางพลัด', 'Bang Phlat District'),
(26, 1, 'เขตดินแดง', 'Din Daeng District'),
(27, 1, 'เขตบึงกุ่ม', 'Bueng Kum District'),
(28, 1, 'เขตสาทร', 'Sathon District'),
(29, 1, 'เขตบางซื่อ', 'Bang Sue District'),
(30, 1, 'เขตจตุจักร', 'Chatuchak District'),
(31, 1, 'เขตบางคอแหลม', 'Bang Kho Laem District'),
(32, 1, 'เขตประเวศ', 'Prawet District'),
(33, 1, 'เขตคลองเตย', 'Khlong Toei District'),
(34, 1, 'เขตสวนหลวง', 'Suan Luang District'),
(35, 1, 'เขตจอมทอง', 'Chom Thong District'),
(36, 1, 'เขตดอนเมือง', 'Don Mueang District'),
(37, 1, 'เขตราชเทวี', 'Ratchathewi District'),
(38, 1, 'เขตลาดพร้าว', 'Lat Phrao District'),
(39, 1, 'เขตวัฒนา', 'Watthana District'),
(40, 1, 'เขตบางแค', 'Bang Khae District'),
(41, 1, 'เขตหลักสี่', 'Lak Si District'),
(42, 1, 'เขตสายไหม', 'Sai Mai District'),
(43, 1, 'เขตคันนายาว', 'Khan Na Yao District'),
(44, 1, 'เขตสะพานสูง', 'Saphan Sung District'),
(45, 1, 'เขตวังทองหลาง', 'Wang Thonglang District'),
(46, 1, 'เขตคลองสามวา', 'Khlong Sam Wa District'),
(47, 1, 'เขตบางนา', 'Bang Na District'),
(48, 1, 'เขตทวีวัฒนา', 'Thawi Watthana District'),
(49, 1, 'เขตทุ่งครุ', 'Thung Khru District'),
(50, 1, 'เขตบางบอน', 'Bang Bon District');

-- ตัวอย่าง: นนทบุรี (province_id = 3)
INSERT INTO districts (id, province_id, name_th, name_en) VALUES
(51, 3, 'อำเภอเมืองนนทบุรี', 'Mueang Nonthaburi District'),
(52, 3, 'อำเภอบางกรวย', 'Bang Kruai District'),
(53, 3, 'อำเภอบางใหญ่', 'Bang Yai District'),
(54, 3, 'อำเภอบางบัวทอง', 'Bang Bua Thong District'),
(55, 3, 'อำเภอไทรน้อย', 'Sai Noi District'),
(56, 3, 'อำเภอปากเกร็ด', 'Pak Kret District');

-- ============================================
-- 3. SUBDISTRICTS (ตำบล/แขวง)
-- ============================================
-- โครงสร้าง: id, district_id, name_th, name_en, postal_code
-- ตัวแปรที่ต้องมี:
--   - id: INT (Primary Key, Auto Increment หรือระบุเอง)
--   - district_id: INT (Foreign Key -> districts.id)
--   - name_th: VARCHAR(100) - ชื่อตำบล/แขวงภาษาไทย
--   - name_en: VARCHAR(100) - ชื่อตำบล/แขวงภาษาอังกฤษ
--   - postal_code: VARCHAR(10) - รหัสไปรษณีย์ (5 หลัก)

-- ตัวอย่าง: เขตพระนคร (district_id = 1)
INSERT INTO subdistricts (id, district_id, name_th, name_en, postal_code) VALUES
(1, 1, 'แขวงพระบรมมหาราชวัง', 'Phra Borom Maha Ratchawang', '10200'),
(2, 1, 'แขวงวังบูรพาภิรมย์', 'Wang Burapha Phirom', '10200'),
(3, 1, 'แขวงวัดราชบพิธ', 'Wat Ratchabophit', '10200'),
(4, 1, 'แขวงสำราญราษฎร์', 'Samran Rat', '10200'),
(5, 1, 'แขวงศาลเจ้าพ่อเสือ', 'San Chao Pho Suea', '10200'),
(6, 1, 'แขวงเสาชิงช้า', 'Sao Chingcha', '10200'),
(7, 1, 'แขวงบวรนิเวศ', 'Bowon Niwet', '10200'),
(8, 1, 'แขวงตลาดยอด', 'Talat Yot', '10200'),
(9, 1, 'แขวงชนะสงคราม', 'Chana Songkhram', '10200'),
(10, 1, 'แขวงบ้านพานถม', 'Ban Phan Thom', '10200'),
(11, 1, 'แขวงบางขุนพรหม', 'Bang Khun Phrom', '10200'),
(12, 1, 'แขวงวัดสามพระยา', 'Wat Sam Phraya', '10200');

-- ตัวอย่าง: อำเภอเมืองนนทบุรี (district_id = 51)
INSERT INTO subdistricts (id, district_id, name_th, name_en, postal_code) VALUES
(13, 51, 'ตำบลสวนใหญ่', 'Suan Yai', '11000'),
(14, 51, 'ตำบลตลาดขวัญ', 'Talat Khwan', '11000'),
(15, 51, 'ตำบลบางเขน', 'Bang Khen', '11000'),
(16, 51, 'ตำบลบางกระสอ', 'Bang Kraso', '11000'),
(17, 51, 'ตำบลท่าทราย', 'Tha Sai', '11000'),
(18, 51, 'ตำบลบางไผ่', 'Bang Phai', '11000'),
(19, 51, 'ตำบลบางศรีเมือง', 'Bang Si Mueang', '11000'),
(20, 51, 'ตำบลบางกร่าง', 'Bang Krang', '11000'),
(21, 51, 'ตำบลไทรม้า', 'Sai Ma', '11000'),
(22, 51, 'ตำบลบางรักน้อย', 'Bang Rak Noi', '11000');

-- ============================================
-- หมายเหตุสำคัญ:
-- ============================================
-- 1. ต้อง import ตามลำดับ: provinces -> districts -> subdistricts
-- 2. province_id ใน districts ต้องอ้างอิงไปยัง provinces.id ที่มีอยู่
-- 3. district_id ใน subdistricts ต้องอ้างอิงไปยัง districts.id ที่มีอยู่
-- 4. รหัสไปรษณีย์ (postal_code) ต้องเป็น 5 หลัก
-- 5. ถ้าใช้ AUTO_INCREMENT สำหรับ id ไม่ต้องระบุ id ใน INSERT
-- 6. ข้อมูลจริงมีประมาณ:
--    - Provinces: 77 จังหวัด
--    - Districts: ~900 อำเภอ/เขต
--    - Subdistricts: ~7,000 ตำบล/แขวง

