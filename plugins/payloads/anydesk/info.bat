@echo off
if "%~1"=="get-id" (
    for /f "delims=" %%i in ('"C:\AnyDesk\AnyDesk-ad_3f1b7be6.exe" --get-id') do echo %%i
) else if "%~1"=="get-alias" (
    for /f "delims=" %%i in ('"C:\AnyDesk\AnyDesk-ad_3f1b7be6.exe" --get-alias') do echo %%i
) else if "%~1"=="get-status" (
    for /f "delims=" %%i in ('"C:\AnyDesk\AnyDesk-ad_3f1b7be6.exe" --get-status') do echo %%i
) else if "%~1"=="version" (
    for /f "delims=" %%i in ('"C:\AnyDesk\AnyDesk-ad_3f1b7be6.exe" --version') do echo %%i
) else (
    echo Invalid command
)
