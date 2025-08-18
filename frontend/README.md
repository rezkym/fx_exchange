# FX Dashboard Frontend

Dashboard frontend untuk monitoring nilai tukar mata uang real-time dengan visualisasi chart yang indah.

## Fitur

- **Real-time Updates**: Data live rate diperbarui setiap 60 detik
- **Interactive Charts**: Visualisasi history menggunakan Recharts dengan animasi smooth
- **Glass UI Design**: Desain modern dengan efek glass (backdrop-blur, transparansi)
- **Responsive Layout**: Optimal di desktop dan mobile
- **Currency Selection**: Dropdown untuk memilih source dan target currency
- **Time Range**: Pilihan periode 1, 7, 14, atau 30 hari
- **Metrics Cards**: Current rate, 24h change, dan last update time

## Teknologi

- **React 18** + **Vite** - Framework dan build tool
- **TailwindCSS** - Styling dengan glass morphism design
- **Recharts** - Library chart untuk visualisasi data
- **Lucide React** - Icon library
- **Date-fns** - Utility untuk formatting tanggal

## API Integration

Dashboard mengkonsumsi 3 endpoint backend:

1. `GET /api/currencies` - Daftar mata uang yang tersedia
2. `GET /api/rates/live?source=EUR&target=IDR` - Nilai tukar real-time
3. `GET /api/rates/history?source=EUR&target=IDR&length=30&unit=day&resolution=hourly` - Data historis

## Struktur Komponen

```
src/
├── App.jsx                 # Main dashboard component
├── services/
│   └── api.js             # API service functions
└── components/
    ├── Chart.jsx          # Recharts line chart wrapper
    ├── Controls.jsx       # Currency & time range controls
    ├── StatCard.jsx       # Metric display cards
    └── Alert.jsx          # Error notification component
```

## Environment Variables

- `VITE_API_BASE` - Base URL untuk API (default: `/api`)

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Docker Deployment

```bash
# Build image
docker build -t fx-dashboard-frontend .

# Run container
docker run -p 5173:5173 fx-dashboard-frontend
```

## Fitur Real-time

- **Auto-refresh**: Live data diambil setiap 60 detik
- **Smart Updates**: Hanya menambah data baru ke chart jika timestamp lebih baru
- **Error Handling**: Notifikasi error dengan glass alert component
- **Loading States**: Skeleton loading untuk semua komponen

## Glass UI Design

Semua komponen menggunakan glass morphism design dengan:
- `bg-white/30` - Background semi-transparan
- `backdrop-blur-md` - Blur effect
- `border border-white/20` - Border halus
- `rounded-2xl` - Rounded corners
- `shadow-lg` - Drop shadow