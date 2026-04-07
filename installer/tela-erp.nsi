; Tela ERP Installer Script (NSIS)
; This script creates a professional Windows installer for Tela ERP

!include "MUI2.nsh"
!include "x64.nsh"

; Basic Settings
Name "Tela ERP"
OutFile "TelaERP-Setup.exe"
InstallDir "$PROGRAMFILES\TelaERP"
InstallDirRegKey HKCU "Software\TelaERP" "InstallDir"

; Request admin privileges
RequestExecutionLevel admin

; MUI Settings
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

; Installer Sections
Section "Install"
  SetOutPath "$INSTDIR"
  
  ; Copy application files
  File /r "dist\*.*"
  File "package.json"
  File "README.md"
  
  ; Copy offline server
  SetOutPath "$INSTDIR\offline-server"
  File /r "offline-server\*.*"
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\TelaERP"
  CreateShortCut "$SMPROGRAMS\TelaERP\Tela ERP.lnk" "$INSTDIR\start_offline.bat" "" "$INSTDIR\tela-erp-logo.ico"
  CreateShortCut "$SMPROGRAMS\TelaERP\Uninstall.lnk" "$INSTDIR\uninstall.exe"
  
  ; Write registry keys
  WriteRegStr HKCU "Software\TelaERP" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\TelaERP" "DisplayName" "Tela ERP"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\TelaERP" "UninstallString" "$INSTDIR\uninstall.exe"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

; Uninstaller Section
Section "Uninstall"
  RMDir /r "$INSTDIR"
  RMDir /r "$SMPROGRAMS\TelaERP"
  DeleteRegKey HKCU "Software\TelaERP"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\TelaERP"
SectionEnd
