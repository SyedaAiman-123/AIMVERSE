# Shows After Effects' windows (to spot a blocking dialog) and saves a screenshot. Optionally dismisses dialogs with -CloseDialogs.
param([string]$Shot = "$env:TEMP\ae_status.png", [switch]$CloseDialogs)
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices; using System.Collections.Generic;
public class AEW { public delegate bool EnumProc(IntPtr h, IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc p, IntPtr l);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, int m, IntPtr w, IntPtr l);
 public static List<IntPtr> Vis(uint pid){ var r=new List<IntPtr>(); EnumWindows((h,l)=>{ uint p; GetWindowThreadProcessId(h,out p); if(p==pid && IsWindowVisible(h)) r.Add(h); return true; }, IntPtr.Zero); return r; } }
"@
$p = Get-Process AfterFX -ErrorAction SilentlyContinue
if (-not $p) { "AfterFX not running"; return }
"pid $($p.Id) responding=$($p.Responding) cpu=$([math]::Round($p.CPU,1))"
foreach ($h in [AEW]::Vis($p.Id)) {
  $t = New-Object System.Text.StringBuilder 512; $c = New-Object System.Text.StringBuilder 256
  [void][AEW]::GetWindowText($h, $t, 512); [void][AEW]::GetClassName($h, $c, 256)
  "window class=$c title='$t'"
  if ($c.ToString() -eq '#32770') { [void][AEW]::SetForegroundWindow($h); if ($CloseDialogs) { [void][AEW]::SendMessage($h, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero); "  -> closed dialog" } }
}
Start-Sleep 1
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
$b = [System.Windows.Forms.SystemInformation]::VirtualScreen
$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
$g = [System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($b.Left, $b.Top, 0, 0, $bmp.Size)
$bmp.Save($Shot); "screenshot: $Shot"
