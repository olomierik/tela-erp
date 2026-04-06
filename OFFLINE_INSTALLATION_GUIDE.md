# Tela ERP: Offline Installation Guide for Africa & Asia

This package is designed for businesses in regions with limited or no internet connectivity. It bundles the Tela ERP application with a local database and server.

## 1. System Requirements
- **OS**: Windows 10/11, macOS, or Linux (Ubuntu/Debian recommended).
- **RAM**: Minimum 4GB.
- **Disk Space**: 500MB for the application + additional space for your data.
- **Software**: Node.js (v18 or later) installed on the machine.

## 2. Installation Steps

### Step A: Extract the Package
Unzip the `tela-erp-offline.zip` file to a folder on your computer (e.g., `C:\TelaERP` or `/home/user/tela-erp`).

### Step B: Install Dependencies (First time only)
Open a terminal or command prompt in the `offline-server` folder and run:
```bash
npm install
```

### Step C: Start the Application
Run the start script for your operating system:
- **Windows**: Double-click `start_offline.bat`
- **Linux/macOS**: Run `bash start_offline.sh`

### Step D: Access the ERP
Open your web browser and go to:
**`http://localhost:3000`**

---

## 3. Key Offline Features
- **Local Database**: All your data is stored on your computer in `tela_erp_offline.db`.
- **Mobile Money Support**: Even offline, you can record M-Pesa, Wave, and GCash transactions.
- **Zero Internet Required**: The app will not try to connect to the cloud unless you manually trigger a "Sync to Cloud" (feature coming soon).

## 4. Troubleshooting
- **Port Conflict**: If port 3000 is in use, edit `offline-server/index.js` and change `PORT = 3000` to another number (e.g., 8080).
- **Database Errors**: Ensure you have write permissions to the folder where the app is installed.

---
*Developed by Manus AI for Tela ERP*
