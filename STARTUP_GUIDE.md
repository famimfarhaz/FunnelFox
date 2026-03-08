# FunnelFox - Local Setup & Startup Guide

Follow these steps in the exact order shown. You will need two separate terminal windows.

---

## 1. Backend Proxy Setup
**Terminal 1** - Run these from the **ROOT** directory (`d:\Under Development Projects\FunnelFox`).

1.  **Navigate to Root**:
    ```bash
    cd "d:\Under Development Projects\FunnelFox"
    ```
2.  **Create/Start Virtual Environment**:
    ```bash
    python -m venv .venv
    .venv\Scripts\activate  # Windows
    # source .venv/bin/activate (for macOS/Linux)
    ```
3.  **Install Proxy Dependencies**:
    ```bash
    pip install fastapi uvicorn httpx python-dotenv
    ```
4.  **Configure API Keys**:
    Verify that `backend/.env` exists in the root and contains your keys.
5.  **Start the Proxy**:
    ```bash
    # Run this command while still in the ROOT directory
    python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000
    ```
    *Keep this terminal open.*

---

## 2. Frontend Setup
**Terminal 2** - Run these from the **FRONTEND** directory.

1.  **Navigate to Frontend**:
    ```bash
    cd "d:\Under Development Projects\FunnelFox\frontend"
    ```
2.  **Install UI Dependencies**:
    ```bash
    npm install
    ```
3.  **Start the UI**:
    ```bash
    npm start
    ```

---

## 3. Summary of Links
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Proxy Backend**: [http://localhost:8000](http://localhost:8000) (Must be running for searches to work)
- **Data Storage**: Your browser's `localStorage` (No database needed!)
