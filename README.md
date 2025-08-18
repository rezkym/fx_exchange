# FX Calculator with Multi-Bank Account Management

Sistem kalkulator foreign exchange dengan fitur manajemen multiple bank accounts, virtual cards, dan transfer antar bank.

## Features

### Core FX Calculator
- Kalkulasi exchange rates real-time
- Fee calculation untuk Wise dan kartu debit Indonesia
- Route optimization untuk best rates
- Margin target IDR 1000-3000 per transaksi
- Minimum purchase constraints per currency

### Multi-Bank Account Management (NEW!)
- **Bank Provider Management**: CRUD untuk provider bank (Wise, dll)
- **Bank Account Management**: Multiple accounts dengan currency support
- **Virtual Card Management**: Cards one-time usage dengan address handling
- **Transfer System**: Transfer antar bank dengan currency conversion
- **Balance Management**: Auto-update balance saat transfer

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + MongoDB + Mongoose
- **Database**: MongoDB
- **Deployment**: Docker + Docker Compose

## Project Structure

```
SelfProject/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── config/         # Database config
│   │   └── seeders/        # Initial data
│   ├── Dockerfile
│   └── package.json
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml       # Docker services
└── api-endpoint.md          # API documentation
```

## Quick Start

### 1. Clone Repository
```bash
git clone <repository-url>
cd SelfProject
```

### 2. Start with Docker
```bash
docker-compose up
```

Services akan berjalan di:
- **Backend**: http://localhost:4000
- **Frontend**: http://localhost:5173
- **MongoDB**: localhost:27017

### 3. Access Application
- Frontend: http://localhost:5173
- Backend Health: http://localhost:4000/api/health

## API Documentation

Lihat file `api-endpoint.md` untuk dokumentasi lengkap semua endpoints.

### Key Endpoints

#### Bank Providers
- `GET /api/bank-providers` - List providers
- `POST /api/bank-providers` - Create provider

#### Bank Accounts
- `GET /api/bank-accounts` - List accounts
- `POST /api/bank-accounts` - Create account
- `GET /api/bank-accounts/:id/balance` - Get balance

#### Cards
- `GET /api/cards` - List cards
- `POST /api/cards` - Create card
- `POST /api/cards/:id/mark-used` - Mark card used

#### Transactions
- `POST /api/transactions/transfer` - Create transfer
- `GET /api/transactions/summary` - Get summary

## Development

### Backend Development
```bash
cd backend
npm install
npm run dev
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Database
MongoDB akan otomatis ter-seed dengan data awal:
- Wise provider dengan currencies: USD, EUR, GBP, IDR, AUD, SGD
- Sample USD account dengan balance $1000
- Sample virtual card

## Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb://admin:password123@mongodb:27017/fx_calculator?authSource=admin
PORT=4000
NODE_ENV=development
TZ=Asia/Jakarta
```

## Features in Detail

### Virtual Card System
- **One-time Usage**: Cards otomatis marked as "used" setelah transaksi
- **Address Handling**: Bisa pakai alamat account atau custom address
- **Status Management**: active → used → expired/blocked
- **Security**: CVV dan expired date validation

### Transfer System
- **Multi-currency**: Support transfer antar currency berbeda
- **Balance Management**: Auto-update source dan destination balance
- **Card Integration**: Optional card usage untuk tracking
- **Status Tracking**: pending → processing → completed/failed

### Bank Provider System
- **Flexible**: Bisa tambah provider baru (Wise, Revolut, dll)
- **Currency Support**: Setiap provider punya supported currencies
- **API Config**: Ready untuk integrasi dengan provider APIs

## Future Enhancements

- [ ] Integrasi real-time dengan rates API
- [ ] Fee calculation yang lebih sophisticated
- [ ] Webhook notifications
- [ ] Multi-user support
- [ ] Advanced reporting dan analytics
- [ ] Mobile app support

## Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License


