@echo off 
C:\dell\AnyDesk.exe --silent --remove
C:\dell\bsi-AnyDesk.exe --silent --remove
C:\dell\bsi-AnyDesk.exe --install "C:\AnyDesk" --start-with-win --silent --create-shortcuts --create-desktop-icon 
move "C:\dell\info.bat" "C:\anydesk\"
REM Delete the batch file itself
del C:\dell\AnyDesk.exe
del C:\dell\bsi-AnyDesk.exe
del "%~f0"
