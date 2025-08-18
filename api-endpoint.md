# API Endpoints - FX Calculator with Multi-Bank Management

## Base URL
```
http://localhost:4000/api
```

## ⚠️ Important: Manual System Only
Sistem ini untuk **manual tracking & management**. Tidak ada integrasi API dengan bank/provider. Semua proses input manual, sistem hanya tracking dan analytics.

---

## 1. BIN Lookup API

### GET /api/bin-lookup/lookup/:cardNumber
Lookup BIN information for a card number

**Parameters:**
- `cardNumber` (path): Card number to lookup

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "bin_lookup_id",
    "bin": "457173",
    "scheme": "visa",
    "type": "debit",
    "brand": "Visa/Dankort",
    "prepaid": false,
    "country": {
      "numeric": "208",
      "alpha2": "DK",
      "name": "Denmark",
      "emoji": "🇩🇰",
      "currency": "DKK",
      "latitude": 56,
      "longitude": 10
    },
    "bank": {
      "name": "Jyske Bank",
      "url": "www.jyskebank.dk",
      "phone": "+4589893300",
      "city": "Hjørring"
    },
    "lookupCount": 5,
    "lastLookupAt": "2024-01-15T10:30:00Z",
    "riskLevel": "low",
    "isPopular": false
  }
}
```

### POST /api/bin-lookup/batch
Batch lookup multiple card numbers (max 50)

**Request Body:**
```json
{
  "cardNumbers": ["4571736000000000", "5555555555554444"]
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "cardNumber": "4571736000000000",
      "success": true,
      "data": { }
    },
    {
      "cardNumber": "5555555555554444",
      "success": false,
      "error": "BIN not found"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 1,
    "failed": 1
  }
}
```

### GET /api/bin-lookup/statistics
Get comprehensive BIN lookup statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalBins": 150,
      "totalLookups": 1250,
      "averageLookupsPerBin": 8.3
    },
    "byScheme": [
      { "scheme": "visa", "count": 80, "lookups": 650 }
    ],
    "byCountry": [
      { "country": "United States", "count": 45, "lookups": 380 }
    ],
    "byType": [
      { "type": "debit", "count": 90, "lookups": 750 }
    ],
    "popularBins": [],
    "recentLookups": []
  }
}
```

### GET /api/bin-lookup/search
Search BINs with filters

**Query Parameters:**
- `scheme`, `type`, `country`, `bankName`, `prepaid`, `riskLevel`
- `page`, `limit` for pagination

### GET /api/bin-lookup/:id
Get specific BIN lookup by ID

### DELETE /api/bin-lookup/:id
Soft delete BIN lookup

### PUT /api/bin-lookup/:id/refresh
Refresh BIN data from external API

---

## 2. Bank Providers

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
Buat account baru dengan multi-currency wallets.

**Request:**
```json
{
  "name": "Wise Multi-Currency Account",
  "provider": "507f1f77bcf86cd799439011", 
  "accountNumber": "WISE001",
  "currencies": ["USD", "EUR", "GBP"]
}
```

### GET /api/bank-accounts/:id/balance
Cek balance semua wallets dalam account.

**Response:**
```json
{
  "success": true,
  "data": {
    "accountId": "507f1f77bcf86cd799439012",
    "accountName": "Wise Multi-Currency Account",
    "wallets": [
      {"currency": "USD", "balance": 1000, "isActive": true},
      {"currency": "EUR", "balance": 500, "isActive": true}
    ],
    "totalBalanceUSD": 1000,
    "provider": {"name": "Wise", "code": "WISE"}
  }
}
```

### POST /api/bank-accounts/:id/currencies
Tambah currency baru ke account.

**Request:**
```json
{
  "currency": "GBP"
}
```

### PUT /api/bank-accounts/:id/wallets/:currency/balance
Update balance wallet tertentu.

**Request:**
```json
{
  "amount": 100,
  "operation": "add"
}
```

### PUT /api/bank-accounts/:id
Update account details (name, account number, address).

**Request:**
```json
{
  "name": "Updated Account Name",
  "accountNumber": "WISE002",
  "address": {
    "street": "123 New Street",
    "city": "Jakarta",
    "country": "Indonesia",
    "postalCode": "12345"
  }
}
```

### DELETE /api/bank-accounts/:id
Smart delete dengan validasi saldo dan kartu.

**Request Body:**
```json
{
  "action": "check",
  "deleteCards": false,
  "freezeCards": false
}
```

**Actions:**
- `check`: Cek kondisi account (default)
- `force_deactivate`: Deactivate account 
- `delete_cards`: Hapus semua kartu dan account
- `freeze_cards`: Freeze kartu dan deactivate account

**Response scenarios:**

**1. Permanent delete (no balance, no cards):**
```json
{
  "success": true,
  "message": "Bank account permanently deleted",
  "action": "permanent_delete"
}
```

**2. Has balance + cards (cannot delete):**
```json
{
  "success": false,
  "message": "Akun tidak dapat dihapus karena masih memiliki saldo aktif",
  "reason": "has_balance_and_cards",
  "data": {
    "totalBalance": 1000,
    "activeCards": 2,
    "wallets": [...]
  }
}
```

**3. Has cards only (user choice required):**
```json
{
  "success": false,
  "message": "Akun memiliki kartu aktif",
  "reason": "has_cards_only",
  "data": {
    "activeCards": 2,
    "cards": [...]
  },
  "actions": {
    "deleteCards": "Hapus semua kartu dan akun",
    "freezeCards": "Freeze semua kartu dan deactivate akun"
  }
}
```

---

## 3. Virtual Cards

### GET /api/cards
List semua cards dengan search, filter, dan pagination.

**Query Parameters:**
- `search`: Search by card number or name
- `status`: Filter by status (active, used, expired, blocked)
- `provider`: Filter by provider code
- `bankAccount`: Filter by bank account ID
- `currency`: Filter by currency
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `sortBy`: Sort field (default: createdAt)
- `sortOrder`: Sort order (asc/desc, default: desc)

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
        "currency": "USD",
        "provider": {
          "name": "Wise",
          "code": "WISE"
        }
      },
      "usageCount": 5,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "fraudFlags": {
        "isHighRisk": false,
        "riskScore": 25
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 25,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "filters": {
    "search": "John",
    "status": "active",
    "sortBy": "createdAt",
    "sortOrder": "desc"
  }
}
```

### GET /api/cards/:id
Get single card dengan detailed analytics.

**Response:**
```json
{
  "success": true,
  "data": {
    "card": {
      "basicInfo": {
        "id": "507f1f77bcf86cd799439013",
        "cardNumber": "4111111111111111",
        "cardName": "John Doe",
        "status": "active",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "expiredDate": "2025-12-31T23:59:59.999Z",
        "usageCount": 5,
        "creationSource": "initial"
      },
      "bankAccount": {
        "name": "Wise USD Account",
        "accountNumber": "WISE001",
        "currency": "USD",
        "provider": {
          "name": "Wise",
          "code": "WISE"
        }
      },
      "fraudAnalytics": {
        "isHighRisk": false,
        "riskScore": 25,
        "replacementCount": 1,
        "flaggedReasons": []
      },
      "usageAnalytics": {
        "totalUsage": 5,
        "daysSinceCreation": 30,
        "daysSinceLastUse": 2,
        "averageUsagePerDay": 0.17,
        "isExpired": false,
        "daysUntilExpiry": 335
      }
    },
    "relatedTransactions": [],
    "fraudActivities": [],
    "auditTrail": [],
    "comparisonMetrics": {
      "accountTotalCards": 3,
      "rankByUsage": 1,
      "usagePercentile": 100,
      "riskComparison": "below_average"
    }
  }
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
  "bankAccount": "507f1f77bcf86cd799439012",
  "address": {
    "street": "123 Main St",
    "city": "Jakarta",
    "country": "Indonesia",
    "postalCode": "12345"
  },
  "useAccountAddress": false
}
```

### PUT /api/cards/:id
Update card information.

**Request:**
```json
{
  "cardName": "John Doe Updated",
  "expiredDate": "2026-12-31",
  "cvv": "456",
  "status": "active",
  "address": {
    "street": "456 New St",
    "city": "Jakarta",
    "country": "Indonesia"
  }
}
```

### DELETE /api/cards/:id
Delete card (soft delete by setting status to blocked).

**Response:**
```json
{
  "success": true,
  "message": "Card blocked successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "status": "blocked"
  }
}
```

### POST /api/cards/:id/mark-used
Mark card as used.

**Response:**
```json
{
  "success": true,
  "message": "Card marked as used successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "status": "used",
    "lastUsedAt": "2024-01-15T10:30:00.000Z",
    "usageCount": 6
  }
}
```

### GET /api/cards/available/:bankAccountId
Get available cards for a bank account.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "cardNumber": "4111****1111",
      "status": "active"
    }
  ],
  "count": 1
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
  "reason": "lost",
  "notes": "Card was lost during travel"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Card replaced successfully",
  "data": {
    "newCard": {
      "_id": "507f1f77bcf86cd799439014",
      "cardNumber": "4111****1112",
      "status": "active"
    },
    "oldCardId": "507f1f77bcf86cd799439013",
    "riskAssessment": {
      "riskLevel": "low",
      "riskScore": 15,
      "alertTriggered": false
    },
    "fraudAlert": null,
    "warnings": []
  }
}
```

### GET /api/cards/analytics/summary
Get cards analytics summary.

**Query Parameters:**
- `bankAccount`: Filter by bank account ID
- `provider`: Filter by provider code
- `startDate`: Start date filter
- `endDate`: End date filter

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCards": 25,
    "byStatus": {
      "active": 15,
      "used": 8,
      "expired": 1,
      "blocked": 1
    },
    "byProvider": {
      "Wise": 15,
      "Aspire": 10
    },
    "byCurrency": {
      "USD": 20,
      "EUR": 5
    },
    "fraudStats": {
      "highRiskCards": 2,
      "totalReplacements": 3,
      "averageRiskScore": 25.5
    },
    "usageStats": {
      "totalUsageCount": 125,
      "averageUsagePerCard": 5.0,
      "mostUsedCard": {
        "_id": "507f1f77bcf86cd799439013",
        "cardNumber": "4111****1111",
        "usageCount": 15
      },
      "lastActivity": "2024-01-15T10:30:00.000Z"
    },
    "timeline": [
      {
        "date": "2024-01-01",
        "count": 3
      }
    ]
  }
}
```

### GET /api/cards/analytics/providers
Get cards analytics by provider.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "Wise",
      "providerCode": "WISE",
      "totalCards": 15,
      "activeCards": 12,
      "usedCards": 2,
      "expiredCards": 1,
      "blockedCards": 0,
      "totalUsage": 75,
      "totalReplacements": 2,
      "averageRiskScore": 20.5
    }
  ]
}
```

### GET /api/cards/analytics/usage
Get cards usage analytics.

**Query Parameters:**
- `timeRange`: Time range (7d, 30d, 90d, 1y, default: 30d)
- `bankAccount`: Filter by bank account ID

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCardsUsed": 20,
    "totalUsage": 100,
    "averageUsagePerCard": 5.0,
    "topUsedCards": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "cardNumber": "4111****1111",
        "usageCount": 15,
        "lastUsedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "usageByStatus": {
      "active": 60,
      "used": 40
    },
    "dailyUsage": [
      {
        "date": "2024-01-01",
        "usage": 5
      }
    ]
  },
  "timeRange": "30d",
  "dateRange": {
    "startDate": "2023-12-16T00:00:00.000Z",
    "endDate": "2024-01-15T23:59:59.999Z"
  }
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
- `wallets`: Array of currency wallets [{currency, balance, isActive}]
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