# Phase 1A command record

Executed October 30, 2026, America/New_York, from `.` unless another working directory is stated. This records the substantive inspection, download, installation and compilation commands. Documentation reads/writes and progress polls are not installation or build commands. Installation/download/build processes used approved elevated execution; no automatic approval rejection occurred.

## Initial inspection

```powershell
Get-Location
Get-ChildItem -Force -Name
rg --files -g AGENTS.md -g ENVIRONMENT.md -g PHASE0.md
Get-Content -LiteralPath docs/PHASE0.md -Tail 65
$toolNames = 'node','npm','git','rustup','rustc','cargo','cargo-near','near','cl','link','clang','cmake','winget'
Get-Command $toolNames -ErrorAction SilentlyContinue | Select-Object Name,Source
node --version
npm --version
git --version
$rustBin = Join-Path $env:USERPROFILE '.cargo\bin'
$vsLocator = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
[pscustomobject]@{OS=[System.Environment]::OSVersion.VersionString;Architecture=$env:PROCESSOR_ARCHITECTURE;PowerShell=$PSVersionTable.PSVersion.ToString();RustupExists=(Test-Path -LiteralPath (Join-Path $rustBin 'rustup.exe'));RustcExists=(Test-Path -LiteralPath (Join-Path $rustBin 'rustc.exe'));VswhereExists=(Test-Path -LiteralPath $vsLocator)} | ConvertTo-Json
if (Test-Path -LiteralPath $vsLocator) { & $vsLocator -products '*' -all -format json }
git status --short --branch
$sdkRoot = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10'
$msvcRoot = Join-Path ${env:ProgramFiles} 'Microsoft Visual Studio'
$msvcRootX86 = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio'
[pscustomobject]@{WindowsKitsRootExists=(Test-Path -LiteralPath $sdkRoot);VisualStudio64RootExists=(Test-Path -LiteralPath $msvcRoot);VisualStudio32RootExists=(Test-Path -LiteralPath $msvcRootX86)} | ConvertTo-Json
if (Test-Path -LiteralPath $sdkRoot) { Get-ChildItem -LiteralPath (Join-Path $sdkRoot 'Lib') -Directory -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name }
$ErrorActionPreference = 'Stop'
try { & cargo --version } catch { Write-Output $_.Exception.Message; exit 1 }
```

Results: Node 24.19.0, npm 11.17.0, Git 2.55.0.windows.3; Rust and Microsoft toolchain unavailable initially. `git status` failed because no repository exists. Initial Cargo version probe failed because Cargo was not installed.

## Microsoft installation, after approval

```powershell
$setupDir = Join-Path $env:TEMP 'MandateLock-Phase1A'
New-Item -ItemType Directory -Path $setupDir -Force | Out-Null
$vsSetup = Join-Path $setupDir 'vs_buildtools.exe'
Invoke-WebRequest -Uri 'https://aka.ms/vs/17/release/vs_buildtools.exe' -OutFile $vsSetup
Get-AuthenticodeSignature -LiteralPath $vsSetup | Select-Object Status,@{Name='Signer';Expression={$_.SignerCertificate.Subject}} | ConvertTo-Json
$vsProcess = Start-Process -FilePath $vsSetup -ArgumentList '--quiet','--wait','--norestart','--nocache','--add','Microsoft.VisualStudio.Component.VC.Tools.x86.x64','--add','Microsoft.VisualStudio.Component.Windows11SDK.22621','--addProductLang','en-US' -WindowStyle Hidden -PassThru -Wait
Write-Output ('VisualStudioInstallerExitCode=' + $vsProcess.ExitCode)
```

Result: valid Microsoft signature; installer exit 0; complete/launchable VS Build Tools 17.14.37827.9, product display 17.14.44, no reboot required.

## Rustup download and checksum verification

```powershell
$setupDir = Join-Path $env:TEMP 'MandateLock-Phase1A'
$rustSetup = Join-Path $setupDir 'rustup-init.exe'
Invoke-WebRequest -Uri 'https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe' -OutFile $rustSetup
Get-FileHash -LiteralPath $rustSetup -Algorithm SHA256 | Select-Object Path,Hash | ConvertTo-Json
```

The first verification script assigned `.Content` directly, split it as text, and raised a checksum mismatch before reaching installer execution:

```powershell
$checksumText = (Invoke-WebRequest -Uri 'https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe.sha256').Content
$expectedHash = ($checksumText -split '\s+')[0]
$actualHash = (Get-FileHash -LiteralPath $rustSetup -Algorithm SHA256).Hash
if ($actualHash -ne $expectedHash) { throw 'Official rustup checksum mismatch' }
```

Response-type inspection and corrected verification/install:

```powershell
$checksumResponse = Invoke-WebRequest -Uri 'https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe.sha256'
$checksumValue = $checksumResponse.Content
Write-Output $checksumValue.GetType().FullName
if ($checksumValue -is [byte[]]) { Write-Output ([Text.Encoding]::UTF8.GetString($checksumValue)) } else { Write-Output $checksumValue }
$setupDir = Join-Path $env:TEMP 'MandateLock-Phase1A'
$rustSetup = Join-Path $setupDir 'rustup-init.exe'
$checksumValue = (Invoke-WebRequest -Uri 'https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe.sha256').Content
$checksumText = if ($checksumValue -is [byte[]]) { [Text.Encoding]::UTF8.GetString($checksumValue) } else { [string]$checksumValue }
$expectedHash = ($checksumText.Trim() -split '\s+')[0]
$actualHash = (Get-FileHash -LiteralPath $rustSetup -Algorithm SHA256).Hash
if ($actualHash -ne $expectedHash) { throw 'Official rustup checksum mismatch' }
Write-Output 'Official rustup checksum verified'
& $rustSetup -y --default-host x86_64-pc-windows-msvc --default-toolchain 1.93.0 --profile minimal --component rustfmt --component clippy --target wasm32-unknown-unknown
exit $LASTEXITCODE
```

Result: checksum matched after byte-body decoding; official rustup installed successfully. Rustup warned that MSVC prerequisites were not yet complete while Microsoft's installer was running; final verification follows below.

## Official cargo-near installation

```powershell
$nearInstaller = Join-Path $env:TEMP 'MandateLock-Phase1A\cargo-near-installer.ps1'
Invoke-WebRequest -Uri 'https://github.com/near/cargo-near/releases/download/cargo-near-v0.22.0/cargo-near-installer.ps1' -OutFile $nearInstaller
Get-Content -LiteralPath $nearInstaller -TotalCount 100
Select-String -LiteralPath $nearInstaller -Pattern 'param\(|InstallDir|INSTALL_DIR|CARGO_HOME|checksum|sha256|EnvironmentVariable'
& $nearInstaller -NoModifyPath
exit $LASTEXITCODE
```

Result: official Windows x64 binary 0.22.0 installed into the user's Cargo bin directory. No global npm package or source build of the CLI was needed.

## Version and Microsoft verification

```powershell
$rustBin = Join-Path $env:USERPROFILE '.cargo\bin'
& (Join-Path $rustBin 'rustup.exe') show
& (Join-Path $rustBin 'rustc.exe') --version --verbose
& (Join-Path $rustBin 'cargo.exe') --version
& (Join-Path $rustBin 'rustup.exe') target list --installed
& (Join-Path $rustBin 'rustup.exe') component list --installed
$vsLocator = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
& $vsLocator -products '*' -all -format json
$vsInstall = & $vsLocator -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
$msvcVersion = (Get-Content -LiteralPath (Join-Path $vsInstall 'VC\Auxiliary\Build\Microsoft.VCToolsVersion.default.txt')).Trim()
& (Join-Path $vsInstall ('VC\Tools\MSVC\' + $msvcVersion + '\bin\Hostx64\x64\cl.exe')) 2>&1 | Select-Object -First 3
$sdkLib = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\Lib\10.0.22621.0\um\x64'
Get-Item -LiteralPath (Join-Path $sdkLib 'dbghelp.lib'),(Join-Path $sdkLib 'kernel32.lib') | Select-Object FullName,Length | ConvertTo-Json
& (Join-Path $rustBin 'rustup.exe') --version
& (Join-Path $rustBin 'cargo.exe') fmt --version
& (Join-Path $rustBin 'cargo.exe') clippy --version
```

## Testing-framework manifest verification

The browser source fetch for this tagged root manifest was unavailable, so the public official file was read directly:

```powershell
$manifestUri = 'https://raw.githubusercontent.com/near/near-workspaces-rs/near-workspaces-v0.23.0/Cargo.toml'
$manifestValue = (Invoke-WebRequest -Uri $manifestUri).Content
if ($manifestValue -is [byte[]]) { [Text.Encoding]::UTF8.GetString($manifestValue) } else { [string]$manifestValue }
```

Result: tagged root declares `rust-version = "1.93"`.

## Smoke compilation

Working directory: `.\.phase1a-smoke`. Source files were written with apply_patch, not a downloaded project generator. No other-project source was used.

```powershell
$rustBin = Join-Path $env:USERPROFILE '.cargo\bin'
$env:Path = $rustBin + [IO.Path]::PathSeparator + $env:Path
cargo near --version
cargo near build non-reproducible-wasm --help
```

First compilation, while SDK installation was still completing:

```powershell
$rustBin = Join-Path $env:USERPROFILE '.cargo\bin'
$env:Path = $rustBin + [IO.Path]::PathSeparator + $env:Path
cargo near build non-reproducible-wasm --no-abi 2>&1 | Tee-Object -FilePath build.log
exit $LASTEXITCODE
```

Result: Rust compatibility check accepted 1.93.0 for SDK protocol minimum 84; host linking failed with LNK1181 missing `dbghelp.lib` before SDK installation completed. Dependencies resolved and Cargo.lock was created. No Wasm success claimed from this attempt.

Locked retry after Microsoft installer exited 0 and required libraries were verified:

```powershell
Copy-Item -LiteralPath build.log -Destination build-first-attempt.log
$rustBin = Join-Path $env:USERPROFILE '.cargo\bin'
$env:Path = $rustBin + [IO.Path]::PathSeparator + $env:Path
cargo near build non-reproducible-wasm --no-abi --locked 2>&1 | Tee-Object -FilePath build.log
exit $LASTEXITCODE
```

Result: PASS in 23 seconds; output 18,221 bytes, SHA-256 `6dec779bbdb16dd962e6ddd37fc34741c310b38e532280136d81cf575d4c1b3c`.

## Standard ABI build and lint verification

Same smoke working directory:

```powershell
$rustBin = Join-Path $env:USERPROFILE '.cargo\bin'
$env:Path = $rustBin + [IO.Path]::PathSeparator + $env:Path
cargo near build non-reproducible-wasm --locked 2>&1 | Tee-Object -FilePath build-with-abi.log
exit $LASTEXITCODE
```

Result: FAIL in native ABI DLL linking, LNK2019/LNK1120 with 50 unresolved NEAR host symbols. This did not replace the successful no-ABI artifact. ABI generation is an explicit Windows compatibility limitation.

```powershell
$rustBin = Join-Path $env:USERPROFILE '.cargo\bin'
$env:Path = $rustBin + [IO.Path]::PathSeparator + $env:Path
cargo fmt --all -- --check
```

Result: PASS.

```powershell
$rustBin = Join-Path $env:USERPROFILE '.cargo\bin'
$env:Path = $rustBin + [IO.Path]::PathSeparator + $env:Path
cargo near check --clippy --locked 2>&1 | Tee-Object -FilePath clippy.log
exit $LASTEXITCODE
```

Result: PASS, Wasm target, 7 seconds.

Static Wasm inspection (first executed without file output, then with `verification.json` output as below; neither instantiated nor invoked the module):

```powershell
node -e 'const fs=require("node:fs"); const crypto=require("node:crypto"); const p="target/near/mandatelock_environment_smoke.wasm"; const b=fs.readFileSync(p); const m=new WebAssembly.Module(b); const r={path:p,bytes:b.length,sha256:crypto.createHash("sha256").update(b).digest("hex"),magic:b.subarray(0,8).toString("hex"),exports:WebAssembly.Module.exports(m),imports:WebAssembly.Module.imports(m)}; fs.writeFileSync("verification.json",JSON.stringify(r,null,2)+"\n"); console.log(JSON.stringify(r,null,2));'
Get-FileHash -LiteralPath Cargo.lock -Algorithm SHA256 | Select-Object Hash | ConvertTo-Json
rg -n 'name = "near-sdk"|name = "near-sys"|version = "5.29.1"|version = "0.2.14"' Cargo.lock
```

Final linker and PATH checks from workspace root:

```powershell
$vsInstall = 'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools'
$msvcVersion = (Get-Content -LiteralPath (Join-Path $vsInstall 'VC\Auxiliary\Build\Microsoft.VCToolsVersion.default.txt')).Trim()
Get-Item -LiteralPath (Join-Path $vsInstall ('VC\Tools\MSVC\' + $msvcVersion + '\bin\Hostx64\x64\link.exe')) | Select-Object FullName,@{Name='FileVersion';Expression={$_.VersionInfo.FileVersion}} | ConvertTo-Json
$rustBin = Join-Path $env:USERPROFILE '.cargo\bin'
[pscustomobject]@{UserPathContainsCargo=([Environment]::GetEnvironmentVariable('Path','User').Split(';') -contains $rustBin)} | ConvertTo-Json
```

Result: linker 14.44.35229.0; approved Cargo user-PATH entry present. No `near deploy`, account creation or transaction command has been executed.
