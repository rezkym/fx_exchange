# Backend - Multi-Bank Account Management System

## Overview
Backend system untuk mengelola multiple bank accounts dengan card management dan transfer antar bank.

## Features
- **Bank Provider Management**: CRUD untuk provider bank (Wise, dll)
- **Bank Account Management**: CRUD untuk akun bank dengan currency support
- **Card Management**: CRUD untuk kartu one-time usage
- **Transfer System**: Transfer antar bank dengan currency conversion
- **MongoDB Integration**: Database dengan Mongoose ODM

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Buat file `.env` di root backend dengan konfigurasi:
```env
# MongoDB Configuration
MONGODB_URI=mongodb://admin:password123@mongodb:27017/fx_calculator?authSource=admin

# Server Configuration
PORT=4000
NODE_ENV=development

# Timezone
TZ=Asia/Jakarta
```

### 3. Run with Docker
```bash
# From project root
docker-compose up
```

### 4. Run Locally
```bash
npm run dev
```

## API Endpoints

### Bank Providers
- `GET /api/bank-providers` - List semua providers
- `POST /api/bank-providers` - Buat provider baru
- `PUT /api/bank-providers/:id` - Update provider
- `DELETE /api/bank-providers/:id` - Deactivate provider

### Bank Accounts
- `GET /api/bank-accounts` - List semua accounts
- `POST /api/bank-accounts` - Buat account baru
- `PUT /api/bank-accounts/:id` - Update account
- `DELETE /api/bank-accounts/:id` - Deactivate account

### Cards
- `GET /api/cards` - List semua cards
- `POST /api/cards` - Buat card baru
- `PUT /api/cards/:id` - Update card
- `DELETE /api/cards/:id` - Block card
- `POST /api/cards/:id/mark-used` - Mark card sebagai used

### Transactions
- `GET /api/transactions` - List semua transactions
- `POST /api/transactions/transfer` - Buat transfer baru
- `PUT /api/transactions/:id/status` - Update status transaction

## Database Models

### BankProvider
- Provider bank (Wise, dll)
- Supported currencies
- API configuration

### BankAccount
- Akun bank dengan currency
- Balance management
- Address information

### Card
- Virtual card untuk transaksi
- One-time usage
- Address handling (account or custom)

### Transaction
- Transfer antar bank
- Currency conversion
- Status tracking

## Notes
- Cards bersifat one-time usage
- Balance otomatis diupdate saat transfer
- Soft delete untuk semua entities
- Currency validation berdasarkan provider support
