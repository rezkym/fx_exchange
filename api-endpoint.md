# API Endpoints - FX Calculator with Multi-Bank Management

## Base URL
```
http://localhost:4000/api
```

## ⚠️ Important: Manual System Only
Sistem ini untuk **manual tracking & management**. Tidak ada integrasi API dengan bank/provider. Semua proses input manual, sistem hanya tracking dan analytics.

---

## 1. Bank Providers

### GET /api/bank-providers
List semua bank providers (Wise, Aspire, dll).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Wise",
      "code": "WISE",
      "supportedCurrencies": ["USD", "EUR", "GBP", "IDR"],
      "cardLimits": {
        "maxActiveCards": 3,
        "maxReplacementsPerDay": 3
      }
    }
  ]
}
```

### POST /api/bank-providers
Buat provider baru.

**Request:**
```json
{
  "name": "Wise",
  "code": "WISE",
  "supportedCurrencies": ["USD", "EUR", "GBP"]
}
```

---

## 2. Bank Accounts

### GET /api/bank-accounts
List semua bank accounts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Wise USD Account",
      "provider": {
        "name": "Wise",
        "code": "WISE"
      },
      "currency": "USD",
      "balance": 1000,
      "accountNumber": "WISE001"
    }
  ]
}
```

### POST /api/bank-accounts
Buat account baru.

**Request:**
```json
{
  "name": "Wise USD Account",
  "provider": "507f1f77bcf86cd799439011",
  "accountNumber": "WISE001",
  "currency": "USD"
}
```

### GET /api/bank-accounts/:id/balance
Cek balance account.

---

## 3. Virtual Cards

### GET /api/cards
List semua cards.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "cardNumber": "4111****1111",
      "cardName": "John Doe",
      "status": "active",
      "bankAccount": {
        "name": "Wise USD Account",
        "currency": "USD"
      }
    }
  ]
}
```

### POST /api/cards
Buat card baru.

**Request:**
```json
{
  "cardNumber": "4111111111111111",
  "cardName": "John Doe",
  "expiredDate": "2025-12-31",
  "cvv": "123",
  "bankAccount": "507f1f77bcf86cd799439012"
}
```

### POST /api/cards/:id/replace
Replace card (dengan fraud detection).

**Request:**
```json
{
  "newCardNumber": "4111111111111112",
  "newCardName": "John Doe New",
  "newExpiredDate": "2026-12-31",
  "newCvv": "456",
  "reason": "lost"
}
```

---

## 4. TopUp System

### GET /api/topups
List semua top ups.

**Query Params:**
- `status`: pending, completed, failed
- `currency`: USD, EUR, dll
- `topUpMethod`: debit_card_idr, bank_transfer_idr, dll

### POST /api/topups
Buat top up baru (manual input).

**Request:**
```json
{
  "bankAccount": "507f1f77bcf86cd799439012",
  "amount": 100,
  "currency": "USD",
  "topUpMethod": "debit_card_idr",
  "feeDetails": {
    "userInputFee": 5.26
  },
  "sourceDetails": {
    "cardType": "individual"
  }
}
```

### PUT /api/topups/:id/status
Update status top up.

**Request:**
```json
{
  "status": "completed",
  "actualFee": 5.30
}
```

### GET /api/topups/analytics/summary
Analytics summary top ups.

---

## 5. Transfer Between Banks

### GET /api/transactions
List semua transfers.

### POST /api/transactions/transfer
Transfer antar bank accounts.

**Request:**
```json
{
  "fromAccount": "507f1f77bcf86cd799439012",
  "toAccount": "507f1f77bcf86cd799439015",
  "amount": 100,
  "cardId": "507f1f77bcf86cd799439013"
}
```

---

## 6. Multi-Step Transactions

### POST /api/multi-step-transactions
Buat multi-step routing (IDR → Wise → Target).

**Request:**
```json
{
  "sourceAmount": 1000000,
  "sourceCurrency": "IDR",
  "intermediateProvider": "507f1f77bcf86cd799439011",
  "targetProvider": "507f1f77bcf86cd799439018",
  "targetCurrency": "EUR"
}
```

### PUT /api/multi-step-transactions/:id/execute-step
Execute step dalam multi-step transaction.

### GET /api/multi-step-transactions/:id/status
Cek status multi-step transaction.

---

## 7. Fraud Detection

### GET /api/cards/fraud-detection/status
Cek fraud detection status untuk account.

**Query:** `bankAccount=507f1f77bcf86cd799439012`

**Response:**
```json
{
  "success": true,
  "data": {
    "currentRiskLevel": "low",
    "dailyStats": {
      "replacements": 0,
      "creations": 0
    },
    "recommendations": ["Normal activity"]
  }
}
```

### GET /api/cards/fraud-detection/alerts
List fraud alerts.

---

## 8. Configuration

### GET /api/config/currency-limits
Cek minimum currency limits.

**Response:**
```json
{
  "success": true,
  "data": {
    "defaultLimits": {
      "EUR": 2,
      "AUD": 5,
      "USD": 0
    }
  }
}
```

### GET /api/config/providers
List provider configurations.

---

## 9. Analytics & Insights

### GET /api/topups/analytics/fees
Fee analytics dan patterns.

### GET /api/topups/analytics/predict-fee
Prediksi fee berdasarkan historical data.

**Query:** `amount=100&currency=USD&topUpMethod=debit_card_idr`

### GET /api/topups/analytics/optimization
Optimization insights (best methods, times, routes).

---

## 10. Exchange Rates (Read-Only)

### GET /api/currencies
List supported currencies.

### GET /api/convert
Convert currency amounts.

**Query:** `source=USD&target=IDR&amount=100`

**Response:**
```json
{
  "source": "USD",
  "target": "IDR",
  "amount": 100,
  "rate": 16160,
  "converted": 1616000
}
```

---

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Validation error message"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Resource not found"
}
```

**500 Server Error:**
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error"
}
```

---

## Key Models

### BankProvider
- `name`: Provider name (Wise, Aspire)
- `code`: Short code (WISE, ASP)
- `supportedCurrencies`: Array of currencies
- `cardLimits`: Max cards & replacements

### BankAccount
- `name`: Account name
- `provider`: Link to BankProvider
- `currency`: Account currency
- `balance`: Current balance
- `accountNumber`: Account identifier

### Card
- `cardNumber`: Card number (encrypted/masked)
- `cardName`: Name on card
- `status`: active, used, expired, blocked
- `bankAccount`: Link to BankAccount

### TopUp
- `bankAccount`: Target account
- `amount`: Top up amount
- `currency`: Currency
- `topUpMethod`: debit_card_idr, bank_transfer_idr, etc.
- `status`: pending, completed, failed
- `feeDetails`: Manual fee input

---

## TopUp Methods

1. **debit_card_idr**: Top up via Indonesian debit card
2. **bank_transfer_idr**: Bank transfer IDR to provider
3. **third_party_purchase**: Buy balance from 3rd party
4. **multi_step_routing**: IDR → Wise → Target provider

---

## Important Notes

- **Manual Process**: All transactions require manual input
- **No API Integration**: System tracks only, no automation
- **Exchange Rate**: Only from Wise public endpoint
- **Currency Limits**: EUR min 2, AUD min 5
- **Card Limits**: Wise 3 cards/day, Aspire 50 cards
- **Fraud Detection**: Auto-alerts for suspicious activities
- **Balance Updates**: Manual confirmation required