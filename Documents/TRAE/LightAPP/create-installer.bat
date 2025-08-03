@echo off
echo Creating LightIPTV Player Installer...
echo.

:: Check if the portable app exists
if not exist "dist\lightiptv-player-win32-x64\lightiptv-player.exe" (
    echo Error: Portable application not found!
    echo Please run 'npm run build-win' first to create the portable app.
    pause
    exit /b 1
)

:: Create installer directory
if exist "installer" rmdir /s /q "installer"
mkdir "installer"

:: Copy the portable app
echo Copying application files...
xcopy "dist\lightiptv-player-win32-x64\*" "installer\LightIPTV-Player\" /E /I /H /Y

:: Create installation script
echo Creating installation script...
(
echo @echo off
echo title LightIPTV Player Installer
echo echo.
echo echo ========================================
echo echo    LightIPTV Player Installation
echo echo ========================================
echo echo.
echo echo This will install LightIPTV Player on your computer.
echo echo.
echo pause
echo.
echo :: Get installation directory
echo set "INSTALL_DIR=%%PROGRAMFILES%%\LightIPTV Player"
echo echo Installing to: %%INSTALL_DIR%%
echo echo.
echo.
echo :: Create installation directory
echo if not exist "%%INSTALL_DIR%%" mkdir "%%INSTALL_DIR%%"
echo.
echo :: Copy files
echo echo Copying files...
echo xcopy "%%~dp0LightIPTV-Player\*" "%%INSTALL_DIR%%\" /E /I /H /Y ^>nul
echo.
echo :: Create desktop shortcut
echo echo Creating desktop shortcut...
echo powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%%USERPROFILE%%\Desktop\LightIPTV Player.lnk'^); $Shortcut.TargetPath = '%%INSTALL_DIR%%\lightiptv-player.exe'; $Shortcut.WorkingDirectory = '%%INSTALL_DIR%%'; $Shortcut.IconLocation = '%%INSTALL_DIR%%\lightiptv-player.exe'; $Shortcut.Save(^)"
echo.
echo :: Create start menu shortcut
echo echo Creating start menu shortcut...
echo if not exist "%%APPDATA%%\Microsoft\Windows\Start Menu\Programs\LightIPTV Player" mkdir "%%APPDATA%%\Microsoft\Windows\Start Menu\Programs\LightIPTV Player"
echo powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%%APPDATA%%\Microsoft\Windows\Start Menu\Programs\LightIPTV Player\LightIPTV Player.lnk'^); $Shortcut.TargetPath = '%%INSTALL_DIR%%\lightiptv-player.exe'; $Shortcut.WorkingDirectory = '%%INSTALL_DIR%%'; $Shortcut.IconLocation = '%%INSTALL_DIR%%\lightiptv-player.exe'; $Shortcut.Save(^)"
echo.
echo :: Create uninstaller
echo echo Creating uninstaller...
echo (
echo echo @echo off
echo echo title LightIPTV Player Uninstaller
echo echo.
echo echo This will remove LightIPTV Player from your computer.
echo echo.
echo echo pause
echo echo.
echo echo Removing files...
echo echo rmdir /s /q "%%INSTALL_DIR%%"
echo echo del "%%USERPROFILE%%\Desktop\LightIPTV Player.lnk" 2^>nul
echo echo rmdir /s /q "%%APPDATA%%\Microsoft\Windows\Start Menu\Programs\LightIPTV Player" 2^>nul
echo echo.
echo echo LightIPTV Player has been uninstalled.
echo echo pause
echo ^) ^> "%%INSTALL_DIR%%\Uninstall.bat"
echo.
echo echo.
echo echo ========================================
echo echo   Installation completed successfully!
echo echo ========================================
echo echo.
echo echo LightIPTV Player has been installed to:
echo echo %%INSTALL_DIR%%
echo echo.
echo echo You can now:
echo echo - Use the desktop shortcut
echo echo - Find it in the Start Menu
echo echo - Run the uninstaller from the installation folder
echo echo.
echo pause
) > "installer\Install-LightIPTV-Player.bat"

:: Create README for the installer
echo Creating installer README...
(
echo LightIPTV Player - Windows Installer Package
echo =============================================
echo.
echo This package contains everything needed to install LightIPTV Player on Windows.
echo.
echo INSTALLATION:
echo 1. Run "Install-LightIPTV-Player.bat" as Administrator
echo 2. Follow the on-screen instructions
echo 3. The application will be installed to Program Files
echo 4. Desktop and Start Menu shortcuts will be created
echo.
echo UNINSTALLATION:
echo - Run "Uninstall.bat" from the installation folder
echo - Or manually delete the installation folder and shortcuts
echo.
echo PORTABLE USE:
echo - You can also run the application directly from the LightIPTV-Player folder
echo - No installation required for portable use
echo.
echo SYSTEM REQUIREMENTS:
echo - Windows 10 or later
echo - 4GB RAM minimum
echo - Internet connection for IPTV streaming
echo.
echo For support and updates, visit: https://github.com/lightiptv/player
) > "installer\README.txt"

echo.
echo ========================================
echo   Installer created successfully!
echo ========================================
echo.
echo The installer package is ready in the 'installer' folder:
echo.
echo - Install-LightIPTV-Player.bat  (Run this to install)
echo - LightIPTV-Player\             (Application files)
echo - README.txt                    (Installation instructions)
echo.
echo To distribute: Copy the entire 'installer' folder
echo.
echo Users should run 'Install-LightIPTV-Player.bat' as Administrator
echo.
pause