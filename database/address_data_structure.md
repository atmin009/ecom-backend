# โครงสร้างข้อมูลที่อยู่ไทยสำหรับ Import

## 1. ตาราง Provinces (จังหวัด)

### โครงสร้างตาราง
```sql
CREATE TABLE provinces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name_th VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL
);
```

### ตัวแปรที่ต้องมี
| ตัวแปร | ประเภท | คำอธิบาย | ตัวอย่าง |
|--------|--------|----------|----------|
| `id` | INT | รหัสจังหวัด (Primary Key) | 1, 2, 3 |
| `name_th` | VARCHAR(100) | ชื่อจังหวัดภาษาไทย | กรุงเทพมหานคร |
| `name_en` | VARCHAR(100) | ชื่อจังหวัดภาษาอังกฤษ | Bangkok |

### ตัวอย่างข้อมูล (CSV)
```csv
id,name_th,name_en
1,กรุงเทพมหานคร,Bangkok
2,สมุทรปราการ,Samut Prakan
3,นนทบุรี,Nonthaburi
```

### ตัวอย่างข้อมูล (SQL)
```sql
INSERT INTO provinces (id, name_th, name_en) VALUES
(1, 'กรุงเทพมหานคร', 'Bangkok'),
(2, 'สมุทรปราการ', 'Samut Prakan'),
(3, 'นนทบุรี', 'Nonthaburi');
```

---

## 2. ตาราง Districts (อำเภอ/เขต)

### โครงสร้างตาราง
```sql
CREATE TABLE districts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  province_id INT NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  FOREIGN KEY (province_id) REFERENCES provinces(id)
);
```

### ตัวแปรที่ต้องมี
| ตัวแปร | ประเภท | คำอธิบาย | ตัวอย่าง |
|--------|--------|----------|----------|
| `id` | INT | รหัสอำเภอ/เขต (Primary Key) | 1, 2, 3 |
| `province_id` | INT | รหัสจังหวัด (Foreign Key) | 1 (กรุงเทพมหานคร) |
| `name_th` | VARCHAR(100) | ชื่ออำเภอ/เขตภาษาไทย | เขตพระนคร |
| `name_en` | VARCHAR(100) | ชื่ออำเภอ/เขตภาษาอังกฤษ | Phra Nakhon District |

### ตัวอย่างข้อมูล (CSV)
```csv
id,province_id,name_th,name_en
1,1,เขตพระนคร,Phra Nakhon District
2,1,เขตดุสิต,Dusit District
3,3,อำเภอเมืองนนทบุรี,Mueang Nonthaburi District
```

### ตัวอย่างข้อมูล (SQL)
```sql
INSERT INTO districts (id, province_id, name_th, name_en) VALUES
(1, 1, 'เขตพระนคร', 'Phra Nakhon District'),
(2, 1, 'เขตดุสิต', 'Dusit District'),
(3, 3, 'อำเภอเมืองนนทบุรี', 'Mueang Nonthaburi District');
```

---

## 3. ตาราง Subdistricts (ตำบล/แขวง)

### โครงสร้างตาราง
```sql
CREATE TABLE subdistricts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  district_id INT NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  FOREIGN KEY (district_id) REFERENCES districts(id)
);
```

### ตัวแปรที่ต้องมี
| ตัวแปร | ประเภท | คำอธิบาย | ตัวอย่าง |
|--------|--------|----------|----------|
| `id` | INT | รหัสตำบล/แขวง (Primary Key) | 1, 2, 3 |
| `district_id` | INT | รหัสอำเภอ/เขต (Foreign Key) | 1 (เขตพระนคร) |
| `name_th` | VARCHAR(100) | ชื่อตำบล/แขวงภาษาไทย | แขวงพระบรมมหาราชวัง |
| `name_en` | VARCHAR(100) | ชื่อตำบล/แขวงภาษาอังกฤษ | Phra Borom Maha Ratchawang |
| `postal_code` | VARCHAR(10) | รหัสไปรษณีย์ (5 หลัก) | 10200 |

### ตัวอย่างข้อมูล (CSV)
```csv
id,district_id,name_th,name_en,postal_code
1,1,แขวงพระบรมมหาราชวัง,Phra Borom Maha Ratchawang,10200
2,1,แขวงวังบูรพาภิรมย์,Wang Burapha Phirom,10200
3,3,ตำบลสวนใหญ่,Suan Yai,11000
```

### ตัวอย่างข้อมูล (SQL)
```sql
INSERT INTO subdistricts (id, district_id, name_th, name_en, postal_code) VALUES
(1, 1, 'แขวงพระบรมมหาราชวัง', 'Phra Borom Maha Ratchawang', '10200'),
(2, 1, 'แขวงวังบูรพาภิรมย์', 'Wang Burapha Phirom', '10200'),
(3, 3, 'ตำบลสวนใหญ่', 'Suan Yai', '11000');
```

---

## 4. JSON Format

### โครงสร้าง JSON
```json
{
  "provinces": [
    {
      "id": 1,
      "name_th": "กรุงเทพมหานคร",
      "name_en": "Bangkok"
    }
  ],
  "districts": [
    {
      "id": 1,
      "province_id": 1,
      "name_th": "เขตพระนคร",
      "name_en": "Phra Nakhon District"
    }
  ],
  "subdistricts": [
    {
      "id": 1,
      "district_id": 1,
      "name_th": "แขวงพระบรมมหาราชวัง",
      "name_en": "Phra Borom Maha Ratchawang",
      "postal_code": "10200"
    }
  ]
}
```

---

## 5. วิธีการ Import

### วิธีที่ 1: ใช้ SQL File
```bash
mysql -u root -p ecommerce < import_address_data.sql
```

### วิธีที่ 2: ใช้ CSV (MySQL)
```sql
LOAD DATA INFILE '/path/to/provinces.csv'
INTO TABLE provinces
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(id, name_th, name_en);
```

### วิธีที่ 3: ใช้ MySQL Workbench
1. เปิด MySQL Workbench
2. เลือก database `ecommerce`
3. ไปที่ Data Import/Restore
4. เลือกไฟล์ SQL หรือ CSV
5. กด Start Import

### วิธีที่ 4: ใช้ phpMyAdmin
1. เปิด phpMyAdmin
2. เลือก database `ecommerce`
3. ไปที่ tab Import
4. เลือกไฟล์ SQL หรือ CSV
5. กด Go

---

## 6. ข้อมูลจริงที่ต้องมี

### จำนวนข้อมูลโดยประมาณ:
- **Provinces**: 77 จังหวัด
- **Districts**: ~900 อำเภอ/เขต
- **Subdistricts**: ~7,000 ตำบล/แขวง

### แหล่งข้อมูล:
1. **GitHub**: https://github.com/thailand-geography-data
2. **API**: https://thaiaddressapi.com
3. **ข้อมูลราชการ**: กรมการปกครอง กระทรวงมหาดไทย

---

## 7. ข้อควรระวัง

1. **ลำดับการ Import**: ต้อง import ตามลำดับ
   - Provinces ก่อน
   - Districts ตาม
   - Subdistricts สุดท้าย

2. **Foreign Key**: 
   - `province_id` ใน districts ต้องมีใน provinces.id
   - `district_id` ใน subdistricts ต้องมีใน districts.id

3. **Encoding**: ใช้ UTF-8 สำหรับภาษาไทย

4. **AUTO_INCREMENT**: 
   - ถ้าใช้ AUTO_INCREMENT ไม่ต้องระบุ id
   - ถ้าระบุ id เอง ต้องระวังไม่ให้ซ้ำ

5. **Postal Code**: 
   - ต้องเป็น 5 หลัก
   - บางตำบลอาจมีหลายรหัสไปรษณีย์ (ใช้รหัสหลัก)

