$sdkRoot = "C:\Android\sdk"
$licensesDir = "$sdkRoot\licenses"
New-Item -ItemType Directory -Force -Path $licensesDir | Out-Null

$androidSdkLicense = @"
8933bad161af4178b1185d1a37fbf41ea5269c55
d56f5187479451eabf01fb78af6dfcb131a6481e
24333f8a63b6825ea9c5514f83c2829b004d1fee
"@

$androidPreviewLicense = @"
84831b9409646a918e30573bab4c9c91346d8abd
"@

Set-Content -Path "$licensesDir\android-sdk-license" -Value $androidSdkLicense -NoNewline
Set-Content -Path "$licensesDir\android-sdk-preview-license" -Value $androidPreviewLicense -NoNewline

Write-Host "Licenses pre-accepted successfully!"

$sdkManager = "C:\Android\cmdline-tools\latest\bin\sdkmanager.bat"
$env:JAVA_HOME = "C:\Program Files\Java\jdk-20"

Write-Host "Installing platforms;android-34, build-tools;34.0.0, platform-tools..."
& $sdkManager --sdk_root=$sdkRoot "platforms;android-34" "build-tools;34.0.0" "platform-tools"
