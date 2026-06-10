# 🏨 GASKEUN HOTEL ANALYSIS (Bali Hotel DSS & ML Insights)

GASKEUN HOTEL ANALYSIS adalah platform **Sistem Pendukung Keputusan (Decision Support System - DSS)** dan analitik data tingkat lanjut yang dirancang untuk mengeksplorasi, menganalisis, serta menentukan pilihan hotel terbaik di Bali. Platform ini mengintegrasikan dataset Traveloka sebanyak **1.012 hotel** dengan mesin keputusan matematika **TOPSIS** dan modul **Machine Learning** untuk segmentasi serta estimasi harga hotel.

---

## 🌟 Fitur Utama (Key Features)

### 1. 📊 Overview Dashboard (Eksplorasi Real-Time)
- **Visualisasi Agregasi Data**: Rangkuman Key Performance Indicators (KPI) interaktif meliputi jumlah total hotel, rata-rata harga, rata-rata rating, dan rata-rata persentase diskon.
- **Top Locations Cost Chart**: Grafik dinamis (Recharts) yang mengurutkan wilayah Bali berdasarkan rata-rata harga hotel tertinggi (misal: Seminyak, Kuta, Nusa Dua).
- **Rating Distribution Bins**: Grafik area interaktif untuk melihat sebaran kualitas hotel di seluruh Bali.
- **Advanced Explore Table**: Cari hotel secara instan, filter berdasarkan lokasi, dan batasi rating minimum menggunakan slider interaktif.

### 2. 🎛️ TOPSIS Decision Support Solver (Sistem Pendukung Keputusan)
Mengimplementasikan model keputusan multi-kriteria **TOPSIS** (*Technique for Order of Preference by Similarity to Ideal Solution*):
- Pengguna dapat menyesuaikan bobot (kepentingan) untuk kriteria **Harga** (diminimalkan), **Rating** (dimaksimalkan), dan **Persentase Diskon** (dimaksimalkan).
- Sistem secara instan mengalkulasi kedekatan relatif setiap hotel dengan opsi ideal (skor 0.0 - 1.0) dan menyusun peringkat 50 hotel paling optimal secara real-time.

### 3. 🧠 Machine Learning Insights
- **K-Means Clustering (Segmentasi Pasar)**: Mengelompokkan hotel secara dinamis berdasarkan rating dan harga menjadi beberapa profil segmen (*Luxury Retreats, Premium Value Deals, Budget Friendly, Mid-range Standard*). Ditampilkan dalam *Scatter Plot* interaktif (Rating vs Price).
- **Linear Regression Price Predictor (Forecasting)**: Memprediksi harga hotel wajar berdasarkan input lokasi dan target rating yang diinginkan pengguna untuk membantu penganggaran pariwisata.

### 4. 🕷️ Dynamic Web Data Harvester (Web Scraper)
- Menyediakan modul scraper otomatis menggunakan **BeautifulSoup4** dan rotasi *User-Agent* di backend untuk merayap (*crawl*) data hotel baru dan menggabungkannya secara real-time ke dalam dataset aktif.

### 5. 📱 Responsive UI & Theme Switcher (Dark/Light Mode)
- **Desain Glassmorphism Premium**: Antarmuka visual kelas atas yang mendukung perpindahan tema **Dark Mode** dan **Light Mode** secara mulus.
- **Mobile First Responsive**: Sidebar navigasi yang otomatis berubah menjadi *sliding drawer menu* pada perangkat *mobile* dan tablet.

---

## 🛠️ Teknologi yang Digunakan (Tech Stack)

### Backend
- **FastAPI** (Python) - Kerangka kerja API RESTful berkinerja tinggi.
- **Pandas** & **NumPy** - Pengolahan, pembersihan, dan manipulasi data.
- **Scikit-Learn** - Algoritma K-Means Clustering dan model Linear Regression.
- **BeautifulSoup4** & **Requests** - Modul web scraping data harvester.
- **Uvicorn** - Server ASGI untuk menjalankan backend.

### Frontend
- **React.js (TypeScript)** - Library UI komponen.
- **Vite** - Bundler frontend super cepat.
- **Recharts** - Library grafik data visual yang responsif.
- **Lucide React** - Set ikon modern.
- **Vanilla CSS** - Kustomisasi style glassmorphism dan layout dinamis.

---

## 📁 Struktur Properti Proyek (Project Directory)

```text
GASKEUN_TEAM/
├── backend/
│   ├── __init__.py
│   ├── main.py                # Router API, Middleware CORS, & Controllers
│   ├── ml_utils.py            # Logika K-Means, Linear Regression, & TOPSIS
│   ├── scraper.py             # Harvester Web Scraper (BeautifulSoup)
│   └── hotels_harvested.csv   # Database lokal hasil scraping (auto-generated)
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # View Utama (Dashboard, TOPSIS, ML)
│   │   ├── index.css          # Desain sistem & Theme Switcher CSS
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── requirements.txt           # Dependensi Python
└── README.md
```

---

## ⚙️ Cara Menjalankan Aplikasi Secara Lokal (Setup Guide)

### Prasyarat
- Python 3.10 ke atas
- Node.js (v18 ke atas) & npm

### Langkah 1: Kloning Repositori
```bash
git clone -b updated-version-1.1 https://github.com/BagusLanangP/Gaskeun-team-sickathon2023.git
cd Gaskeun-team-sickathon2023/GASKEUN_TEAM
```

### Langkah 2: Setup & Jalankan Backend (FastAPI)
1. Buat virtual environment Python:
   ```bash
   python3 -m venv .venv
   ```
2. Aktifkan virtual environment:
   - **macOS/Linux**:
     ```bash
     source .venv/bin/activate
     ```
   - **Windows (CMD)**:
     ```cmd
     .venv\Scripts\activate
     ```
3. Instal semua paket dependensi:
   ```bash
   pip install -r requirements.txt
   pip install fastapi uvicorn beautifulsoup4
   ```
4. Jalankan server FastAPI:
   ```bash
   uvicorn backend.main:app --port 8000 --reload
   ```
   *Backend akan berjalan di: **http://localhost:8000*** (Dokumentasi Swagger API interaktif dapat diakses di `/docs`).

### Langkah 3: Setup & Jalankan Frontend (React + Vite)
1. Buka terminal baru dan masuk ke direktori frontend:
   ```bash
   cd frontend
   ```
2. Instal semua dependensi npm:
   ```bash
   npm install
   ```
3. Jalankan server dev Vite:
   ```bash
   npm run dev
   ```
   *Frontend akan berjalan di: **http://localhost:5173***

---

## 🎯 Use Cases (Skenario Pengguna)

1. **Wisatawan (*Backpacker / Smart Traveler*)**:
   Menggunakan tab **TOPSIS Solver** untuk memprioritaskan anggaran (harga rendah) namun tetap menginginkan kepuasan menginap yang baik (rating tinggi). Aplikasi secara cerdas merekomendasikan hotel terbaik berdasarkan bobot preferensinya.
2. **Agen Perjalanan (*Tour & Travel Agent*)**:
   Menggunakan tab **Overview Dashboard** dengan filter instan untuk menyusun daftar 10 hotel berkualitas di lokasi pariwisata utama guna dimasukkan dalam proposal paket liburan.
3. **Analis/Pemilik Properti (*Hotel Business Analyst*)**:
   Menggunakan tab **ML Insights** untuk melakukan analisis kelayakan harga pasar hotel baru di Seminyak/Ubud berdasarkan target rating menggunakan modul regresi linier.
