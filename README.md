## SelfProject

Panduan singkat untuk menjalankan proyek dan mengakses endpoint web serta API.

### Menjalankan dengan Docker

Jalankan perintah berikut dari folder proyek ini:

```bash
docker compose up -d --build
```

- Kontainer akan otomatis melakukan hot-reload saat ada perubahan file di `backend/` dan `frontend/`.
- Untuk menghentikan: `docker compose down`

### Endpoint Web (Frontend)

- **URL**: `http://localhost:5173`
- Aplikasi React (Vite) akan berjalan di sini.

### Endpoint API (Backend)

- **Health Check**
  - **Method**: `GET`
  - **URL**: `http://localhost:4000/api/health`
  - **Response contoh**:
    ```json
    { "status": "ok", "service": "backend", "timestamp": "2025-01-01T00:00:00.000Z" }
    ```

### Proxy dari Frontend ke Backend

- Selama pengembangan, request ke path **`/api`** dari frontend akan otomatis diteruskan ke backend (`http://backend:4000`) lewat konfigurasi Vite proxy.
- Contoh pemanggilan di browser (dari frontend):
  ```js
  fetch('/api/health').then(r => r.json()).then(console.log)
  ```

### Catatan Hot-Reload

- Backend: `nodemon` menggunakan `legacy watch` agar andal di dalam Docker.
- Frontend: Vite di-set `--host` dan polling watch agar perubahan file terdeteksi.


