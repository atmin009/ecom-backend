# Docker Setup สำหรับ Backend

## วิธีใช้งาน

### 1. สร้างไฟล์ .env
คัดลอก `.env.example` เป็น `.env` และแก้ไขค่าตามที่ต้องการ:

```bash
cp .env.example .env
```

### 2. ตั้งค่า MySQL Connection
ในไฟล์ `.env` ตั้งค่า:

- **สำหรับ Windows/Mac**: ใช้ `host.docker.internal` เพื่อเชื่อมต่อ MySQL ที่อยู่บน host machine
- **สำหรับ Linux**: อาจต้องใช้ IP address ของ host หรือแก้ไข `docker-compose.yml` ให้ใช้ `network_mode: "host"`

ตัวอย่าง:
```env
DB_HOST=host.docker.internal
DB_PORT=3306
DB_NAME=ecommerce
DB_USER=root
DB_PASSWORD=your_password
```

### 3. Build และ Run ด้วย Docker Compose

```bash
# Build และ start
docker-compose up -d

# ดู logs
docker-compose logs -f

# Stop
docker-compose down
```

### 4. หรือ Build และ Run ด้วย Docker โดยตรง

```bash
# Build image
docker build -t ecommerce-backend .

# Run container
docker run -d \
  --name ecommerce-backend \
  -p 3001:3001 \
  --add-host=host.docker.internal:host-gateway \
  --env-file .env \
  ecommerce-backend
```

## การเชื่อมต่อ MySQL จากภายนอก

Backend ใน Docker จะเชื่อมต่อ MySQL ที่อยู่บน host machine ผ่าน:
- **Windows/Mac**: `host.docker.internal` (อัตโนมัติ)
- **Linux**: ต้องเพิ่ม `extra_hosts` หรือใช้ `network_mode: "host"`

### สำหรับ Linux

ถ้าคุณใช้ Linux และ `host.docker.internal` ไม่ทำงาน ให้แก้ไข `docker-compose.yml`:

```yaml
services:
  backend:
    # ... other config ...
    network_mode: "host"
    # หรือใช้ extra_hosts แทน
    extra_hosts:
      - "host.docker.internal:172.17.0.1"  # ใช้ IP ของ Docker bridge
```

หรือใช้ IP address ของ host machine โดยตรง:
```env
DB_HOST=192.168.1.100  # แทนที่ด้วย IP จริงของ host
```

## ตรวจสอบการทำงาน

```bash
# ตรวจสอบ container
docker ps

# ดู logs
docker-compose logs backend

# เข้าไปใน container
docker exec -it ecommerce-backend sh
```

## Health Check

หลังจาก start แล้ว ตรวจสอบได้ที่:
```
http://localhost:3001/health
```
