# Compresses source videos to web-friendly MP4s + poster JPGs. Originals are never modified.
$ff = (Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter ffmpeg.exe | Select -First 1).FullName
$root = Split-Path $PSScriptRoot
$src = "$root\source-materials\portfolio-resources\PORTFOLIORESOURCES\VIDEOS FOR PORTFOLIO"
$out = "$root\frontend\public\media"
New-Item -ItemType Directory -Force $out | Out-Null
$map = [ordered]@{
  'orb-rush' = 'orbrushdemo.mp4'; 'cyberverse' = 'portal.mp4'; 'cybernex' = 'cybernex simulator.mp4'
  'vr-uav-sim' = 'fypvruavsimapp.mp4'; 'vr-escape' = 'vrescaperoom.mp4'; 'dungeon-chase' = 'DungeonChaseEndlessRunnerFinalDemo.mp4'
  'dungeon-crawler' = 'dungeonCrawler.mp4'; 'alice-vr' = 'AliceInTheWonderland.mp4'; 'virtual-board' = 'VirtualBoardARVR.mp4'
  'scratch-maze' = 'scratch game.mp4'; 'mask-game' = 'maskGame.mp4'; 'shadows-slums' = 'sos.mp4'
  'motion-recreation' = 'RecreationVideo.mp4'; 'motion-documentary' = 'DocumentaryStyleFinal5second.mp4'; 'motion-menu' = 'Adobe After Effects Project(MenuCard).mp4'
}
foreach ($k in $map.Keys) {
  $in = Join-Path $src $map[$k]
  & $ff -y -loglevel error -i $in -an -vf "scale='min(960,iw)':-2:flags=lanczos,fps=30" -c:v libx264 -preset slow -crf 30 -pix_fmt yuv420p -movflags +faststart "$out\$k.mp4"
  & $ff -y -loglevel error -ss 3 -i $in -frames:v 1 -vf "scale='min(960,iw)':-2" -q:v 4 "$out\$k.jpg"
  "{0}: {1:N1} MB" -f $k, ((Get-Item "$out\$k.mp4").Length / 1MB)
}
