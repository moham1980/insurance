# Cement Dashboard Windows Services

این مستند نحوه نصب و مدیریت سرویس‌های ویندوز برای Cement Dashboard را توضیح می‌دهد.

## سرویس‌ها

### 1. Backend Service (CementDashboardBackend)
- **توضیح:** Spring Boot API backend
- **پورت:** 9091
- **URL:** http://localhost:9091/api
- **Health Check:** http://localhost:9091/api/actuator/health

### 2. Frontend Service (CementDashboardFrontend)
- **توضیح:** React frontend served by Node.js/Express
- **پورت:** 3003
- **Host:** 0.0.0.0 (accessible from all network interfaces)
- **URL:** http://localhost:3003
- **Health Check:** http://localhost:3003/health

## نصب سرویس‌ها

### پیش‌نیازها
- Java 17 (نصب شده در `D:\Program Files\Amazon Corretto\jdk17.0.17_10`)
- Node.js (نصب شده در `C:\Program Files\nodejs`)
- Maven (نصب شده در `D:\Program Files\apache-maven-3.9.9`)
- دسترسی Administrator برای نصب سرویس‌ها

### نصب تمام سرویس‌ها
```batch
cd c:\Users\Administrator\CascadeProjects\cement-dashboard\scripts
install-all-services.bat
```

### نصب جداگانه

#### نصب Backend Service
```batch
cd c:\Users\Administrator\CascadeProjects\cement-dashboard\scripts
install-backend-service.bat
```

#### نصب Frontend Service
```batch
cd c:\Users\Administrator\CascadeProjects\cement-dashboard\scripts
install-frontend-service.bat
```

## مدیریت سرویس‌ها

### مشاهده وضعیت سرویس‌ها
```batch
cd c:\Users\Administrator\CascadeProjects\cement-dashboard\scripts
service-status.bat
```

### مدیریت از طریق Windows Services
1. کلیدهای `Win + R` را فشار دهید
2. `services.msc` را تایپ کرده و Enter بزنید
3. سرویس‌های زیر را پیدا کنید:
   - `Cement Dashboard Backend Service`
   - `Cement Dashboard Frontend Service`

### دستورات مدیریت سرویس‌ها

#### Start/Stop Backend
```batch
net start CementDashboardBackend
net stop CementDashboardBackend
```

#### Start/Stop Frontend
```batch
net start CementDashboardFrontend
net stop CementDashboardFrontend
```

## حذف سرویس‌ها

### حذف تمام سرویس‌ها
```batch
cd c:\Users\Administrator\CascadeProjects\cement-dashboard\scripts
uninstall-all-services.bat
```

### حذف جداگانه
```batch
uninstall-backend-service.bat
uninstall-frontend-service.bat
```

## لاگ‌ها

### محل لاگ‌ها
```
c:\cement-dashboard\logs\
├── service.log              (Backend logs)
└── frontend-service.log     (Frontend logs)
```

### مشاهده لاگ‌ها
```batch
# مشاهده ۱۰ خط آخر لاگ backend
powershell "Get-Content 'c:\cement-dashboard\logs\service.log' -Tail 10"

# مشاهده ۱۰ خط آخر لاگ frontend
powershell "Get-Content 'c:\cement-dashboard\logs\frontend-service.log' -Tail 10"
```

## عیب‌یابی

### سرویس شروع نمی‌شود
1. لاگ‌ها را در `c:\cement-dashboard\logs\` بررسی کنید
2. Windows Event Viewer را برای خطاهای سرویس بررسی کنید
3. مطمئن شوید پورت‌های 9091 و 3003 آزاد هستند

### پورت‌های اشغال شده
```batch
# بررسی پورت‌های در حال استفاده
netstat -ano | findstr :9091
netstat -ano | findstr :3003

# آزاد کردن پورت (PID را از دستور بالا پیدا کنید)
taskkill /PID <PID> /F
```

### بازبینی سرویس‌ها
سرویس‌ها به طور خودکار در صورت خطا ری‌استارت می‌شوند:
- اولین تلاش: ۵ ثانیه بعد
- دومین تلاش: ۱۰ ثانیه بعد  
- سومین تلاش: ۲۰ ثانیه بعد

## آپدیت سرویس‌ها

### آپدیت Backend
1. سرویس را متوقف کنید: `net stop CementDashboardBackend`
2. کد را آپدیت کنید
3. اسکریپت نصب را دوباره اجرا کنید: `install-backend-service.bat`

### آپدیت Frontend
1. سرویس را متوقف کنید: `net stop CementDashboardFrontend`
2. کد را آپدیت کنید
3. اسکریپت نصب را دوباره اجرا کنید: `install-frontend-service.bat`

## پیکربندی

### Backend Configuration
فایل پیکربندی: `backend\src\main\resources\application.yml`

### Frontend Configuration
- پورت پیش‌فرض: 3003 (قابل تغییر از طریق متغیر محیطی PORT)
- Host پیش‌فرض: 0.0.0.0 (قابل تغییر از طریق متغیر محیطی HOST)
- متغیرهای محیطی:
  - `PORT`: تغییر پورت (مثال: `set PORT=8080`)
  - `HOST`: تغییر host (مثال: `set HOST=127.0.0.1`)

## امنیت

سرویس‌ها با حساب LocalSystem اجرا می‌شوند. برای محیط‌های تولیدی،考虑:
- ایجاد یک سرویس اکانت جداگانه با حداقل دسترسی‌ها
- تنظیم proper file permissions برای لاگ‌ها
-启用 HTTPS برای frontend
