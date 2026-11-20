# Runs an ExtendScript (.jsx) inside After Effects 2021.
# AfterFX.exe -r cannot take a path containing spaces, so the script is copied to a space-free temp folder first.
# This install shows modal "plugin is missing" warnings on every launch (Warp Stabilizer, 3D Camera Tracker...),
# which block script execution; while waiting, this script presses Enter on any such 'After Effects' dialog.
# (Scripts must therefore never leave an unsaved project open: they call project.close(DO_NOT_SAVE_CHANGES) first.)
param([Parameter(Mandatory=$true)][string]$Script,
      [string]$AE = "C:\Users\saima\After Effects\Adobe After Effects 2021\Support Files\AfterFX.exe",
      [string]$Marker = "",           # file whose appearance means "done" (e.g. the saved .aep)
      [int]$TimeoutSec = 300)
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System; using System.Runtime.InteropServices;
public class RAE { [DllImport("user32.dll")] public static extern IntPtr FindWindow(string c,string t); [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); }
"@
$tmp = Join-Path $env:TEMP "ae_run"
New-Item -ItemType Directory -Force $tmp | Out-Null
$dst = Join-Path $tmp ([IO.Path]::GetFileName($Script))
Copy-Item $Script $dst -Force
if ($Marker) { Remove-Item $Marker -ErrorAction SilentlyContinue }
$p = Start-Process -FilePath $AE -ArgumentList @('-r', $dst) -PassThru
$t = 0; $dismissed = 0
while ($t -lt $TimeoutSec) {
  Start-Sleep 3; $t += 3
  if ($Marker -and (Test-Path $Marker)) { break }
  if (-not $Marker -and $p.HasExited) { break }
  $d = [RAE]::FindWindow("#32770", "After Effects")
  if ($d -ne [IntPtr]::Zero) { [void][RAE]::SetForegroundWindow($d); Start-Sleep -Milliseconds 700; [System.Windows.Forms.SendKeys]::SendWait("{ENTER}"); $dismissed++ }
}
"waited ${t}s; dialogs dismissed: $dismissed; marker exists: $([bool]($Marker -and (Test-Path $Marker)))"
Start-Sleep 6
"AfterFX still running: $([bool](Get-Process AfterFX -ErrorAction SilentlyContinue))"
