# Renders single preview frames of the MAIN comp with aerender (Lossless AVI) and converts them to PNG with ffmpeg.
# Usage: render_stills.ps1 -Times 1.5,6,12  (seconds)
param([double[]]$Times = @(1.5, 6, 12, 22, 30, 36, 42, 47.5),
      [string]$Proj = "C:\Users\saima\Documents\3d portfolio\after-effects\AIMVERSE_Promo.aep",
      [string]$Out = "C:\Users\saima\Documents\3d portfolio\after-effects\probe\frames")
$ae = "C:\Users\saima\After Effects\Adobe After Effects 2021\Support Files\aerender.exe"
New-Item -ItemType Directory -Force $Out | Out-Null
foreach ($t in $Times) {
  $f = [int]([math]::Round($t * 30)); $name = "t{0:000}" -f $f
  Remove-Item "$Out\$name.avi", "$Out\$name.png" -ErrorAction SilentlyContinue
  & $ae -project $Proj -comp "MAIN $([char]0x2014) AIMVERSE Promo" -s $f -e $f -OMtemplate "Lossless" -output "$Out\$name.avi" | Out-Null
  ffmpeg -y -loglevel error -i "$Out\$name.avi" -frames:v 1 "$Out\$name.png"
  Remove-Item "$Out\$name.avi" -ErrorAction SilentlyContinue
  "$name -> $(Test-Path "$Out\$name.png")"
}
