TELA ERP — Desktop Package
==========================

REQUIREMENTS
  - Windows 10/11 (64-bit or 32-bit)
  - Node.js v18 or later  →  https://nodejs.org/en/download

QUICK START (Windows)
  1. Install Node.js from https://nodejs.org/en/download  (LTS version)
  2. Double-click  setup.bat  (run once — installs dependencies)
  3. Double-click  start.bat  (starts the server + opens your browser)

QUICK START (macOS / Linux)
  1. Install Node.js  →  https://nodejs.org/en/download
  2. Run:  bash start.sh

FIRST USE
  The app will ask you to set up your company name and admin account.
  All data is stored locally on your computer — no internet required.

DATA LOCATION
  Windows:  C:\Users\<YourName>\.tela-erp\
  macOS:    /Users/<YourName>/.tela-erp/
  Linux:    /home/<YourName>/.tela-erp/

BACKUP
  Copy the file  tela.db  from the data location above to back up all your data.

STOPPING
  Close the command-prompt / terminal window, or press Ctrl+C.

TROUBLESHOOTING
  Q: The app does not open in my browser.
  A: Manually open  http://localhost:4321  in Chrome, Edge, or Firefox.

  Q: "setup.bat" shows an error about build tools.
  A: Install Visual Studio Build Tools from
     https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
     Then run setup.bat again.

  Q: Port 4321 is already in use.
  A: Close the other app using that port, or edit PORT in server.cjs.

---
TELA ERP  •  All data stored locally  •  No cloud required
