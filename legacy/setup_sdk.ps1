$sdkDir = "C:\Android\sdk"
$toolsDir = "C:\Android\cmdline-tools\latest"

Write-Host "Creating directories..."
New-Item -ItemType Directory -Force -Path $sdkDir | Out-Null
New-Item -ItemType Directory -Force -Path "C:\Android\cmdline-tools" | Out-Null

$zipPath = "$env:TEMP\cmdline-tools.zip"
Write-Host "Downloading Google Android Command Line Tools..."
curl.exe -L -o $zipPath https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip

Write-Host "Extracting Command Line Tools..."
Expand-Archive -Path $zipPath -DestinationPath "C:\Android\temp_tools" -Force
if (Test-Path $toolsDir) {
    Remove-Item -Recurse -Force $toolsDir
}
Move-Item -Path "C:\Android\temp_tools\cmdline-tools" -Destination $toolsDir -Force
Remove-Item -Recurse -Force "C:\Android\temp_tools", $zipPath

Write-Host "Verifying sdkmanager..."
if (Test-Path "C:\Android\cmdline-tools\latest\bin\sdkmanager.bat") {
    Write-Host "SUCCESS: sdkmanager is ready!"
} else {
    Write-Host "ERROR: sdkmanager.bat not found"
}
