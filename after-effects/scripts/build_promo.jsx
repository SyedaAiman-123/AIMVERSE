// AIMANVERSE — promo video builder (ExtendScript for After Effects 2021)
// Builds an EDITABLE project: organised folders, one comp per scene (precomps), live text layers, keyframed motion,
// expressions, effects, beat markers and the original soundtrack. All media are Aiman's real project assets.
// Run via after-effects/scripts/run_ae.ps1 (copies this file to a space-free path because AfterFX.exe -r cannot take spaces).
(function () {
  var ROOT = "C:/Users/saima/Documents/3d portfolio/after-effects/";
  var OUT = ROOT + "AIMANVERSE_Promo.aep";
  var W = 1920, H = 1080, FPS = 30;
  var BPM = 116, BEAT = 60 / BPM, BAR = BEAT * 4;
  var SCENE_BARS = [2, 3, 3, 6, 2, 3, 3, 2];            // 24 bars ≈ 49.66 s
  var SCENE_NAMES = ["GATEWAY", "HELLO", "SKILLS", "PROJECTS", "MOTION", "THE WORLD", "AI & QUEST", "CONTACT"];
  var log = [];
  function L(m) { log.push(m); }

  // ---------- palette ----------
  function hex(h) { return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255]; }
  var INK = hex("#08090d"), BONE = hex("#ECE7DB"), RED = hex("#FF4A1C"), YEL = hex("#FFC53D"), MINT = hex("#4DF3C8"),
      LIL = hex("#A58BFF"), LIME = hex("#B8FF3D"), PINK = hex("#FF3D8B"), BLUE = hex("#6BB8FF"), ORG = hex("#FF8A3D"), MUT = hex("#9a968c");

  // ---------- project scaffolding ----------
  try { app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES); } catch (e0) {}
  app.newProject();
  var P = app.project;
  var fComps = P.items.addFolder("01 Comps"), fScenes = P.items.addFolder("02 Scenes"), fTiles = P.items.addFolder("03 Tiles (precomps)"),
      fFoot = P.items.addFolder("04 Footage — project clips"), fStill = P.items.addFolder("05 Stills — site screenshots"),
      fAva = P.items.addFolder("06 Avatar — Blender renders"), fAud = P.items.addFolder("07 Audio");

  function imp(path, folder, seq) {
    var f = new File(ROOT + path);
    if (!f.exists) { L("MISSING " + path); return null; }
    var io = new ImportOptions(f);
    if (seq) { io.sequence = true; io.forceAlphabetical = true; }
    var it = P.importFile(io);
    it.parentFolder = folder;
    return it;
  }
  var clip = {}, still = {};
  var clipNames = ["orb-rush", "cyberverse", "vr-escape", "dungeon-chase", "virtual-board", "alice-vr", "motion-recreation", "motion-documentary", "motion-menu"];
  for (var i = 0; i < clipNames.length; i++) clip[clipNames[i]] = imp("assets/footage/" + clipNames[i] + ".mp4", fFoot);
  var stillNames = ["gateway", "about", "cyber", "skills", "journey", "quest", "chat", "contact"];
  for (i = 0; i < stillNames.length; i++) still[stillNames[i]] = imp("assets/screens/site_" + stillNames[i] + ".jpg", fStill);
  var wave = imp("assets/avatar/wave/Aiman_Greeting_Wave_0001.png", fAva, true);
  if (wave) { wave.name = "Aiman wave (60 frames)"; wave.mainSource.conformFrameRate = 12; }
  var idle = imp("assets/avatar/idle/Aiman_Idle_0030.png", fAva);
  var music = imp("assets/audio/aimanverse_promo_theme.wav", fAud);

  // ---------- helpers ----------
  function mkComp(name, w, h, dur, folder) {
    var c = P.items.addComp(name, w, h, 1, dur, FPS);
    c.parentFolder = folder;
    c.bgColor = INK;
    return c;
  }
  function ease(prop) {
    try {
      for (var k = 1; k <= prop.numKeys; k++) {
        var n = prop.isSpatial ? 1 : (prop.value instanceof Array ? prop.value.length : 1);
        var arr = [];
        for (var d = 0; d < n; d++) arr.push(new KeyframeEase(0, 75));
        prop.setTemporalEaseAtKey(k, arr, arr);
      }
    } catch (e) { L("ease: " + e); }
  }
  function keys(prop, times, vals) {
    for (var i = 0; i < times.length; i++) prop.setValueAtTime(times[i], vals[i]);
    ease(prop);
  }
  function solid(comp, name, color, w, h) { return comp.layers.addSolid(color, name, w || comp.width, h || comp.height, 1, comp.duration); }
  function tf(layer) { return layer.property("Transform"); }

  // text: o = {x,y,size,color,font,just:"L"|"C"|"R",track,stroke,strokeW,fill,name,lead}
  function T(comp, str, o) {
    var t = comp.layers.addText(str);
    var tp = t.property("Source Text");
    var td = tp.value;
    td.resetCharStyle();
    td.font = o.font || "Impact";
    td.fontSize = o.size || 60;
    td.applyFill = o.fill !== false;
    td.fillColor = o.color || BONE;
    td.applyStroke = !!o.stroke;
    if (o.stroke) { td.strokeColor = o.stroke; td.strokeWidth = o.strokeW || 3; td.strokeOverFill = false; }
    td.tracking = o.track || 0;
    if (o.lead) td.leading = o.lead;
    td.justification = o.just === "C" ? ParagraphJustification.CENTER_JUSTIFY : (o.just === "R" ? ParagraphJustification.RIGHT_JUSTIFY : ParagraphJustification.LEFT_JUSTIFY);
    tp.setValue(td);
    t.name = o.name || str.replace(/[\r\n]+/g, " ").substr(0, 28);
    // anchor at the middle of the text (left/centre/right edge per justification) so scale/rotation pivot sensibly
    var r = t.sourceRectAtTime(0, false);
    var ax = o.just === "C" ? r.left + r.width / 2 : (o.just === "R" ? r.left + r.width : r.left);
    tf(t).property("Anchor Point").setValue([ax, r.top + r.height / 2]);
    tf(t).property("Position").setValue([o.x, o.y]);
    return t;
  }
  function span(layer, t0, t1) { layer.startTime = 0; layer.inPoint = t0; layer.outPoint = t1; }
  function slideIn(layer, t0, dy, dur, dx) {
    var p = tf(layer).property("Position"), v = p.value, o = tf(layer).property("Opacity");
    dur = dur || 0.55;
    keys(p, [t0, t0 + dur], [[v[0] + (dx || 0), v[1] + dy], v]);
    keys(o, [t0, t0 + dur * 0.7], [0, 100]);
  }
  function popIn(layer, t0, from, dur) {
    var s = tf(layer).property("Scale"), o = tf(layer).property("Opacity");
    dur = dur || 0.45;
    keys(s, [t0, t0 + dur], [[from, from], [100, 100]]);
    keys(o, [t0, t0 + dur * 0.6], [0, 100]);
  }
  function fadeOut(layer, t1, dur) {
    var o = tf(layer).property("Opacity");
    dur = dur || 0.3;
    o.setValueAtTime(t1 - dur, o.valueAtTime(t1 - dur, false));
    o.setValueAtTime(t1, 0);
    ease(o);
  }
  function glow(layer, thr, rad, inten) {
    try {
      var g = layer.property("Effects").addProperty("ADBE Glo2");
      g.property("Glow Threshold").setValue(thr || 40);
      g.property("Glow Radius").setValue(rad || 40);
      g.property("Glow Intensity").setValue(inten || 1.2);
    } catch (e) { L("glow: " + e); }
  }
  // drop shadow / glow-like halo using the installed "Photoshop Drop Shadow"; properties are set by display name (robust)
  function shadow(layer, color, opacity, size) {
    try {
      var fx = layer.property("Effects").addProperty("ADBE PSL Drop Shadow");
      for (var k = 1; k <= fx.numProperties; k++) {
        var pr = fx.property(k), nm = String(pr.name).toLowerCase();
        try {
          if (nm === "color") pr.setValue(color);
          else if (nm === "opacity") pr.setValue(opacity);
          else if (nm === "distance") pr.setValue(0);
          else if (nm === "size") pr.setValue(size);
          else if (nm === "spread") pr.setValue(10);
        } catch (e1) {}
      }
    } catch (e) { L("shadow: " + e); }
  }
  function label(layer, n) { try { layer.label = n; } catch (e) {} }

  // background: ink + scrolling grid + accent glow orb + vignette (all live effects, editable)
  function bg(comp, accent, orbX, orbY) {
    var base = solid(comp, "BG ink", INK); label(base, 0);
    // scrolling grid: two shape layers (vertical + horizontal hairlines made with Rectangle + Repeater)
    function gridLines(nm, rw, rh, copies, step, scroll) {
      try {
        var sl = comp.layers.addShape(); sl.name = nm;
        var grp = sl.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var cont = grp.property("ADBE Vectors Group");
        var rc = cont.addProperty("ADBE Vector Shape - Rect");
        rc.property("ADBE Vector Rect Size").setValue([rw, rh]);
        var fl = cont.addProperty("ADBE Vector Graphic - Fill");
        fl.property("ADBE Vector Fill Color").setValue(accent);
        var rp = sl.property("ADBE Root Vectors Group").addProperty("ADBE Vector Filter - Repeater");
        rp.property("ADBE Vector Repeater Copies").setValue(copies);
        rp.property("ADBE Vector Repeater Transform").property("ADBE Vector Repeater Position").setValue(step);
        tf(sl).property("Opacity").setValue(14);
        sl.blendingMode = BlendingMode.ADD;
        return sl;
      } catch (e) { L("grid " + nm + ": " + e); return null; }
    }
    var gv = gridLines("BG grid vertical", 2, H + 300, 24, [90, 0], false);
    if (gv) tf(gv).property("Position").setValue([-90, H / 2]);
    var gh = gridLines("BG grid horizontal", W + 300, 2, 15, [0, 90], true);
    if (gh) { tf(gh).property("Position").expression = "[" + (W / 2) + ", -90 + (time*36)%90]"; }
    try {
      var o = solid(comp, "BG glow", INK);
      var r = o.property("Effects").addProperty("ADBE Ramp");
      r.property("Ramp Shape").setValue(2);
      r.property("Start of Ramp").setValue([orbX || 1300, orbY || 480]);
      r.property("End of Ramp").setValue([(orbX || 1300) + 900, (orbY || 480)]);
      r.property("Start Color").setValue([accent[0] * 0.55, accent[1] * 0.55, accent[2] * 0.55]);
      r.property("End Color").setValue(INK);
      o.blendingMode = BlendingMode.ADD;
      tf(o).property("Opacity").setValue(70);
      o.property("Effects").property(1).property("Start of Ramp").expression = "value + [Math.sin(time*0.9)*60, Math.cos(time*0.7)*40]";
    } catch (e) { L("orb: " + e); }
    try {
      var v = solid(comp, "Vignette", [0, 0, 0]);
      var m = v.property("Masks").addProperty("ADBE Mask Atom");
      var sh = new Shape();
      sh.vertices = [[260, 150], [1660, 150], [1660, 930], [260, 930]];
      sh.closed = true;
      m.property("ADBE Mask Shape").setValue(sh);
      m.inverted = true;
      m.property("ADBE Mask Feather").setValue([420, 420]);
      tf(v).property("Opacity").setValue(75);
    } catch (e) { L("vignette: " + e); }
  }

  // tile precomp: footage cropped "cover" into w×h, starting at `startAt` seconds into the clip
  // `offs` = time in the parent scene at which this tile appears (the parent layer starts at 0, so the tile comp
  // must be as long as the scene and the footage must be time-shifted to land on `startAt` at that moment)
  function tile(name, item, w, h, dur, startAt, offs, onFor) {
    var c = mkComp(name, w, h, dur, fTiles);
    if (!item) { L("tile without item " + name); return c; }
    offs = offs || 0;
    var l = c.layers.add(item);
    var s = Math.max(w / item.width, h / item.height) * 100;
    tf(l).property("Scale").setValue([s, s]);
    tf(l).property("Position").setValue([w / 2, h / 2]);
    l.startTime = offs - (startAt || 0);
    l.inPoint = offs; l.outPoint = Math.min(dur, offs + (onFor || (dur - offs)));
    return c;
  }
  // framed card: accent border + tile/still inside, returns the array of created layers [border, content]
  function card(comp, item, cx, cy, w, h, accent, name, isComp) {
    var bd = solid(comp, name + " border", accent, w + 12, h + 12);
    tf(bd).property("Position").setValue([cx, cy]);
    var l = comp.layers.add(item);
    var iw = item.width, ih = item.height;
    var s = Math.max(w / iw, h / ih) * 100;
    tf(l).property("Scale").setValue([s, s]);
    tf(l).property("Position").setValue([cx, cy]);
    l.name = name;
    return [bd, l];
  }

  // ===================================================================================
  // SCENE 1 — GATEWAY (opening): kinetic title letters, riser, flash into the drop
  // ===================================================================================
  var starts = [0], acc = 0;
  for (var si = 0; si < SCENE_BARS.length; si++) { acc += SCENE_BARS[si] * BAR; starts.push(acc); }
  var TOTAL = acc;
  function sceneComp(i) { return mkComp("S" + (i + 1) + " " + SCENE_NAMES[i], W, H, SCENE_BARS[i] * BAR, fScenes); }

  var S1 = sceneComp(0), d1 = S1.duration;
  bg(S1, RED, 960, 540);
  (function () {
    var word = "AIMANVERSE", x = 0, items = [], size = 250, gap = 6;
    // measure each letter so the word is perfectly centred with tight tracking
    for (var i = 0; i < word.length; i++) {
      var tl = T(S1, word.charAt(i), { x: 0, y: 540, size: size, color: BONE, font: "Impact", name: "letter " + word.charAt(i) + (i + 1) });
      var r = tl.sourceRectAtTime(0, false);
      items.push({ l: tl, w: r.width, left: r.left, top: r.top, h: r.height });
    }
    var total = 0;
    for (i = 0; i < items.length; i++) total += items[i].w + gap;
    total -= gap;
    x = 960 - total / 2;
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      tf(it.l).property("Anchor Point").setValue([it.left + it.w / 2, it.top + it.h / 2]);
      var cx = x + it.w / 2;
      tf(it.l).property("Position").setValue([cx, 520]);
      x += it.w + gap;
      var t0 = 0.30 + i * 0.075;
      var p = tf(it.l).property("Position");
      keys(p, [t0, t0 + 0.5], [[cx, 520 + 90], [cx, 520]]);
      keys(tf(it.l).property("Opacity"), [t0, t0 + 0.3], [0, 100]);
      keys(tf(it.l).property("Scale"), [t0, t0 + 0.5, d1], [[135, 135], [100, 100], [106, 106]]);
      if (i >= 6) it.l.property("Transform").property("Opacity"); // (keeps structure; colour split below)
    }
    // "VERSE" half in the accent colour
    for (i = 5; i < items.length; i++) {
      var tp = items[i].l.property("Source Text"), td = tp.value;
      td.fillColor = RED; tp.setValue(td);
    }
    for (i = 0; i < items.length; i++) glow(items[i].l, 85, 50, 0.25);
  })();
  var tag = T(S1, "BEYOND THE PORTFOLIO. INTO THE EXPERIENCE.", { x: 960, y: 722, size: 36, color: BONE, font: "Consolas", just: "C", track: 280, name: "Tagline" });
  slideIn(tag, 1.55, 24, 0.6);
  var tag2 = T(S1, "A PORTFOLIO YOU CAN FLY THROUGH", { x: 960, y: 790, size: 24, color: MUT, font: "Consolas", just: "C", track: 380, name: "Sub-tagline" });
  slideIn(tag2, 2.0, 18, 0.6);
  var ln = solid(S1, "title rule", RED, 760, 4);
  tf(ln).property("Position").setValue([960, 650]);
  keys(tf(ln).property("Scale"), [1.1, 1.9], [[0, 100], [100, 100]]);
  // riser energy: a ring that expands and fades, then a white flash right on the drop (bar 3 downbeat)
  var ring = solid(S1, "riser ring", RED, 40, 40);
  tf(ring).property("Position").setValue([960, 540]);
  try {
    var rm = ring.property("Masks").addProperty("ADBE Mask Atom");
    var rs = new Shape(); var pts = [], n = 28;
    for (var k = 0; k < n; k++) { var a = k / n * Math.PI * 2; pts.push([20 + 20 * Math.cos(a), 20 + 20 * Math.sin(a)]); }
    rs.vertices = pts; rs.closed = true; rm.property("ADBE Mask Shape").setValue(rs);
  } catch (e) { L("ring: " + e); }
  keys(tf(ring).property("Scale"), [2.6, d1], [[100, 100], [3600, 3600]]);
  keys(tf(ring).property("Opacity"), [2.6, 3.0, d1], [0, 60, 0]);
  var flash = solid(S1, "DROP flash", BONE);
  keys(tf(flash).property("Opacity"), [d1 - 0.22, d1 - 0.04, d1], [0, 85, 100]);
  keys(tf(S1.layers.byName("BG glow")).property("Opacity"), [0, d1], [40, 100]);

  // ===================================================================================
  // SCENE 2 — HELLO: Blender avatar wave + kinetic intro
  // ===================================================================================
  var S2 = sceneComp(1), d2 = S2.duration;
  bg(S2, RED, 1400, 560);
  var disc = solid(S2, "avatar halo", RED, 900, 900);
  tf(disc).property("Position").setValue([1450, 590]);
  try {
    var dm = disc.property("Masks").addProperty("ADBE Mask Atom");
    var ds = new Shape(); var dp = []; for (k = 0; k < 40; k++) { a = k / 40 * Math.PI * 2; dp.push([450 + 300 * Math.cos(a), 450 + 300 * Math.sin(a)]); }
    ds.vertices = dp; ds.closed = true; dm.property("ADBE Mask Shape").setValue(ds);
    dm.property("ADBE Mask Feather").setValue([220, 220]);
  } catch (e) { L("halo: " + e); }
  tf(disc).property("Opacity").setValue(38);
  disc.blendingMode = BlendingMode.ADD;
  keys(tf(disc).property("Scale"), [0, 1.2], [[60, 60], [100, 100]]);
  if (wave) {
    var av = S2.layers.add(wave);
    av.name = "Aiman — greeting wave (Blender)";
    var sc = 1000 / wave.height * 100;
    tf(av).property("Scale").setValue([sc * 1.06, sc * 1.06]);
    tf(av).property("Position").setValue([1450, 575]);
    keys(tf(av).property("Opacity"), [0.15, 0.7], [0, 100]);
    slideIn(av, 0.15, 70, 0.9, 120);
    glow(av, 70, 60, 0.6);
  }
  var hello = T(S2, "HELLO,", { x: 140, y: 330, size: 330, color: BONE, name: "HELLO," }); slideIn(hello, 0.3, 120, 0.65);
  var iam = T(S2, "I'M AIMAN.", { x: 140, y: 610, size: 330, color: RED, name: "I'M AIMAN." }); slideIn(iam, 0.52, 120, 0.65);
  glow(iam, 85, 40, 0.25);
  var sub = T(S2, "SYEDA AIMAN MUNAWAR", { x: 148, y: 840, size: 40, color: BONE, font: "Consolas", track: 220, name: "Full name" }); slideIn(sub, 1.2, 22, 0.55);
  var sub2 = T(S2, "GAME DEVELOPER · 3D & INTERACTIVE · NED UNIVERSITY", { x: 148, y: 900, size: 26, color: MUT, font: "Consolas", track: 140, name: "Role line" }); slideIn(sub2, 1.5, 22, 0.55);
  var chip = solid(S2, "accent bar", RED, 120, 8); tf(chip).property("Position").setValue([208, 788]);
  keys(tf(chip).property("Scale"), [1.0, 1.5], [[0, 100], [100, 100]]);

  // ===================================================================================
  // SCENE 3 — SKILLS: three counter-moving marquee rows (real CV skills) + category chips
  // ===================================================================================
  var S3 = sceneComp(2), d3 = S3.duration;
  bg(S3, YEL, 960, 540);
  var rows = [
    { y: 330, txt: "UNITY  ✦  UNREAL ENGINE 5  ✦  XR INTERACTION TOOLKIT  ✦  UNITY  ✦  UNREAL ENGINE 5  ✦  XR INTERACTION TOOLKIT  ✦  ", dir: -1, fill: false, col: BONE, spd: 230 },
    { y: 560, txt: "THREE.JS  ✦  WEBGL  ✦  GLSL  ✦  REACT NATIVE  ✦  THREE.JS  ✦  WEBGL  ✦  GLSL  ✦  REACT NATIVE  ✦  ", dir: 1, fill: true, col: YEL, spd: 260 },
    { y: 790, txt: "OPENCV  ✦  C#  ✦  C++  ✦  PYTHON  ✦  NODE.JS  ✦  OPENCV  ✦  C#  ✦  C++  ✦  PYTHON  ✦  NODE.JS  ✦  ", dir: -1, fill: false, col: BONE, spd: 300 }
  ];
  for (i = 0; i < rows.length; i++) {
    var rw = T(S3, rows[i].txt, { x: 0, y: rows[i].y, size: 200, color: rows[i].col, fill: rows[i].fill, stroke: rows[i].fill ? null : BONE, strokeW: 3, font: "Impact", name: "marquee " + (i + 1) });
    tf(rw).property("Anchor Point").setValue([0, tf(rw).property("Anchor Point").value[1]]);
    var startX = rows[i].dir < 0 ? 60 : -2600 + 60;
    tf(rw).property("Position").expression = "[" + startX + " + (" + rows[i].dir + ")*time*" + rows[i].spd + ", " + rows[i].y + "]";
    keys(tf(rw).property("Opacity"), [0.1 + i * 0.12, 0.6 + i * 0.12], [0, 100]);
    if (rows[i].fill) glow(rw, 55, 45, 0.7);
  }
  var cap = solid(S3, "caption band", INK, W, 260); tf(cap).property("Position").setValue([960, 940]); tf(cap).property("Opacity").setValue(90);
  var kick = T(S3, "FROM GAMES  →  TO VR  →  TO THE WEB", { x: 960, y: 905, size: 58, color: BONE, just: "C", name: "Skills headline" }); slideIn(kick, 0.4, 40, 0.6);
  var cats = ["GAME & IMMERSIVE", "PROGRAMMING", "3D & WEB", "AI & COMPUTER VISION", "BACKEND & DATABASES", "CREATIVE & TOOLS"];
  var cc = [YEL, MINT, LIL, LIME, PINK, BLUE];
  var cx0 = 175;
  for (i = 0; i < cats.length; i++) {
    var ct = T(S3, "● " + cats[i], { x: cx0, y: 985, size: 22, color: cc[i], font: "Consolas", track: 100, name: "cat " + cats[i] });
    var rr = ct.sourceRectAtTime(0, false);
    tf(ct).property("Anchor Point").setValue([rr.left, rr.top + rr.height / 2]);
    tf(ct).property("Position").setValue([cx0, 985]);
    cx0 += rr.width + 38;
    popIn(ct, 1.0 + i * BEAT, 60, 0.3);
  }

  // ===================================================================================
  // SCENE 4 — PROJECTS: four real project clips, one per 1.5 bars
  // ===================================================================================
  var S4 = sceneComp(3), d4 = S4.duration;
  bg(S4, MINT, 1200, 540);
  var proj = [
    { id: "orb-rush", name: "ORB RUSH", tag: "3D WEB GAME · THREE.JS\rEXPRESS · MONGODB", yr: "2026 · SOLO", col: YEL, at: 22, num: "01" },
    { id: "cyberverse", name: "CYBERVERSE", tag: "FIRST-PERSON 3D · WEBGL\rGLSL PORTAL SHADER", yr: "2026 · SOLO", col: MINT, at: 12, num: "02" },
    { id: "vr-escape", name: "VR ESCAPE", tag: "UNITY · C#\rXR INTERACTION TOOLKIT", yr: "2026 · TEAM", col: LIL, at: 38, num: "03" },
    { id: "dungeon-chase", name: "DUNGEON CHASE", tag: "UNREAL ENGINE 5\rENDLESS RUNNER", yr: "2026 · TEAM", col: PINK, at: 14, num: "04" }
  ];
  var slot = BAR * 1.5;
  for (i = 0; i < proj.length; i++) {
    var pj = proj[i], t0 = i * slot, t1 = (i === proj.length - 1) ? d4 : (i + 1) * slot;
    var tl = tile("tile " + pj.name, clip[pj.id], 1160, 653, d4, pj.at, t0, slot + 0.5);
    var cd = card(S4, tl, 700, 520, 1160, 653, pj.col, "clip " + pj.name);
    var layersHere = [cd[0], cd[1]];
    for (var q = 0; q < 2; q++) { span(layersHere[q], t0, t1); slideIn(layersHere[q], t0 + 0.02, 0, 0.5, -260); fadeOut(layersHere[q], t1, 0.25); }
    var num = T(S4, pj.num, { x: 1388, y: 250, size: 300, color: pj.col, fill: false, stroke: pj.col, strokeW: 3, font: "Impact", name: "num " + pj.num });
    var nm = T(S4, pj.name, { x: 1388, y: 540, size: pj.name.length > 9 ? 100 : 150, color: BONE, name: "title " + pj.name });
    var nmw = nm.sourceRectAtTime(0, false).width;
    if (nmw > 480) { var nsc = 480 / nmw * 100; tf(nm).property("Scale").setValue([nsc, nsc]); }
    var tg = T(S4, pj.tag, { x: 1392, y: 645, size: 24, color: pj.col, font: "Consolas", track: 60, lead: 34, name: "tag " + pj.name });
    var yr = T(S4, pj.yr, { x: 1392, y: 745, size: 30, color: BONE, font: "Consolas", track: 200, name: "year " + pj.name });
    var arr = [num, nm, tg, yr];
    for (q = 0; q < arr.length; q++) { span(arr[q], t0, t1); slideIn(arr[q], t0 + 0.12 + q * 0.08, 36, 0.5, 80); fadeOut(arr[q], t1, 0.25); }
    glow(nm, 60, 40, 0.6);
    // clip tiles get a subtle push-in while on screen
    keys(tf(cd[1]).property("Scale"), [t0, t1], [tf(cd[1]).property("Scale").value, [tf(cd[1]).property("Scale").value[0] * 1.06, tf(cd[1]).property("Scale").value[1] * 1.06]]);
  }
  var cnt = T(S4, "SELECTED PROJECTS", { x: 100, y: 130, size: 30, color: MUT, font: "Consolas", track: 380, name: "section label" }); slideIn(cnt, 0.1, 20, 0.5);

  // ===================================================================================
  // SCENE 5 — MOTION: three After Effects pieces
  // ===================================================================================
  var S5 = sceneComp(4), d5 = S5.duration;
  bg(S5, PINK, 960, 540);
  var mt = [
    { id: "motion-recreation", cap: "AGENCY VIDEO RECREATION", at: 3.5, w: 700, h: 394 },
    { id: "motion-documentary", cap: "BADSHAHI MOSQUE · DOCUMENTARY STYLE", at: 0, w: 700, h: 394 },
    { id: "motion-menu", cap: "CHEF'S SPECIAL · ANIMATED MENU CARD", at: 3, w: 700, h: 394 }
  ];
  for (i = 0; i < mt.length; i++) {
    var tt = tile("tile " + mt[i].id, clip[mt[i].id], mt[i].w, mt[i].h, d5 + 0.5, mt[i].at);
    var mx = 360 + i * 600, my = 330 + (i === 1 ? -25 : 15);
    var mc = card(S5, tt, mx, my, 560, 315, PINK, "motion " + (i + 1));
    for (q = 0; q < 2; q++) slideIn(mc[q], 0.2 + i * 0.18, 90, 0.6);
    var mcap = T(S5, mt[i].cap, { x: mx, y: my + 205, size: 20, color: BONE, font: "Consolas", just: "C", track: 60, name: "caption " + (i + 1) });
    slideIn(mcap, 0.6 + i * 0.18, 20, 0.5);
  }
  var mh = T(S5, "CREATIVE MOTION", { x: 100, y: 770, size: 150, color: BONE, name: "CREATIVE MOTION" }); slideIn(mh, 0.2, 60, 0.6);
  glow(mh, 80, 40, 0.3);
  var mh2 = T(S5, "MADE IN ADOBE AFTER EFFECTS", { x: 106, y: 905, size: 30, color: PINK, font: "Consolas", track: 260, name: "AE credit" }); slideIn(mh2, 0.6, 24, 0.5);

  // ===================================================================================
  // SCENE 6 — THE WORLD: real screenshots of AIMANVERSE in parallax cards
  // ===================================================================================
  var S6 = sceneComp(5), d6 = S6.duration;
  bg(S6, BLUE, 960, 540);
  var shots = [
    { id: "gateway", cap: "THE GATEWAY", x: 400, y: 690, w: 600, col: ORG },
    { id: "skills", cap: "SKILL CONSTELLATION", x: 1000, y: 740, w: 600, col: BLUE },
    { id: "journey", cap: "THE JOURNEY", x: 1540, y: 690, w: 600, col: ORG }
  ];
  for (i = 0; i < shots.length; i++) {
    var st = still[shots[i].id];
    var h6 = Math.round(shots[i].w * st.height / st.width);
    var sc6 = card(S6, st, shots[i].x, shots[i].y, shots[i].w, h6, shots[i].col, "screen " + shots[i].id);
    for (q = 0; q < 2; q++) {
      slideIn(sc6[q], 0.15 + i * 0.2, 120, 0.65, 0);
      var p6 = tf(sc6[q]).property("Position"), pv = p6.value;
      p6.expression = "value + [Math.sin(time*0.8+" + i + ")*14, Math.cos(time*0.7+" + i + ")*10]";
    }
    var c6 = T(S6, shots[i].cap, { x: shots[i].x, y: shots[i].y + h6 / 2 + 54, size: 26, color: shots[i].col, font: "Consolas", just: "C", track: 200, name: "caption " + shots[i].id });
    slideIn(c6, 0.5 + i * 0.2, 20, 0.5);
  }
  var h6a = T(S6, "A 3D UNIVERSE", { x: 100, y: 190, size: 105, color: BONE, name: "A 3D UNIVERSE" }); slideIn(h6a, 0.1, 50, 0.6);
  var h6b = T(S6, "YOU CAN FLY THROUGH", { x: 100, y: 305, size: 105, color: BLUE, name: "YOU CAN FLY THROUGH" }); slideIn(h6b, 0.3, 50, 0.6);
  glow(h6b, 80, 40, 0.3);
  var h6c = T(S6, "THREE.JS  ·  REACT THREE FIBER  ·  CUSTOM SHADERS  ·  REAL-TIME", { x: 106, y: 392, size: 22, color: MUT, font: "Consolas", track: 160, name: "stack" }); slideIn(h6c, 0.7, 18, 0.5);

  // ===================================================================================
  // SCENE 7 — AI & QUEST
  // ===================================================================================
  var S7 = sceneComp(6), d7 = S7.duration;
  bg(S7, LIME, 1500, 520);
  var a1 = T(S7, "ASK AIMAN AI", { x: 110, y: 260, size: 118, color: BONE, name: "ASK AIMAN AI" }); slideIn(a1, 0.15, 80, 0.6);
  glow(a1, 85, 40, 0.25);
  var a2 = T(S7, "Answers only from her CV, projects and documents —\rcited, and honest when it doesn't know.", { x: 116, y: 365, size: 23, color: LIME, font: "Consolas", track: 0, lead: 36, name: "AI promise" }); slideIn(a2, 0.5, 24, 0.55);
  var q1 = T(S7, "AIMANVERSE QUEST", { x: 110, y: 630, size: 82, color: BONE, name: "AIMANVERSE QUEST" }); slideIn(q1, 1.0, 70, 0.6);
  var q2 = T(S7, "EXPLORE.  DISCOVER.  UNLOCK.", { x: 116, y: 705, size: 30, color: PINK, font: "Consolas", track: 100, name: "Explore Discover Unlock" }); slideIn(q2, 1.4, 24, 0.55);
  var xp = T(S7, "LVL 1 · 0 XP", { x: 116, y: 790, size: 38, color: BONE, font: "Consolas", track: 120, name: "XP counter (expression)" });
  xp.property("Source Text").expression = "var v = Math.round(ease(time, 1.6, 4.8, 0, 275)); 'LVL ' + (v >= 250 ? 3 : (v >= 100 ? 2 : 1)) + '  ·  ' + v + ' XP'";
  slideIn(xp, 1.6, 18, 0.5);
  var chat = still["chat"], quest = still["quest"];
  var cH = 760, cW = Math.round(cH * chat.width / chat.height);
  var cc7 = card(S7, chat, 1210, 520, cW, cH, LIME, "screen chat");
  var qH = 700, qW = Math.round(qH * quest.width / quest.height);
  var qc7 = card(S7, quest, 1640, 560, qW, qH, PINK, "screen quest");
  for (q = 0; q < 2; q++) { slideIn(cc7[q], 0.3, 140, 0.65); slideIn(qc7[q], 0.7, 140, 0.65); }
  tf(cc7[1]).property("Rotation").setValue(-2); tf(cc7[0]).property("Rotation").setValue(-2);
  tf(qc7[1]).property("Rotation").setValue(2.5); tf(qc7[0]).property("Rotation").setValue(2.5);

  // ===================================================================================
  // SCENE 8 — CONTACT / END CARD
  // ===================================================================================
  var S8 = sceneComp(7), d8 = S8.duration;
  bg(S8, RED, 1380, 560);
  if (idle) {
    var av8 = S8.layers.add(idle); av8.name = "Aiman — idle pose (Blender)";
    var s8 = 1010 / idle.height * 100;
    tf(av8).property("Scale").setValue([s8, s8]);
    tf(av8).property("Position").setValue([1460, 600]);
    slideIn(av8, 0.1, 60, 0.8, 90);
    glow(av8, 70, 60, 0.6);
  }
  var e1 = T(S8, "SYEDA AIMAN", { x: 110, y: 320, size: 210, color: BONE, name: "SYEDA AIMAN" }); slideIn(e1, 0.2, 90, 0.65);
  var e2 = T(S8, "MUNAWAR", { x: 110, y: 510, size: 210, color: RED, name: "MUNAWAR" }); slideIn(e2, 0.38, 90, 0.65);
  glow(e2, 85, 40, 0.25);
  var e3 = T(S8, "BEYOND THE PORTFOLIO. INTO THE EXPERIENCE.", { x: 116, y: 690, size: 30, color: BONE, font: "Consolas", track: 140, name: "Tagline" }); slideIn(e3, 0.9, 20, 0.55);
  var e4 = T(S8, "linkedin.com/in/syeda-aiman-munawar-46108a2ba", { x: 116, y: 780, size: 34, color: MUT, font: "Consolas", track: 40, name: "LinkedIn" }); slideIn(e4, 1.2, 20, 0.55);
  var e5 = T(S8, "DOWNLOAD CV   ·   ASK AIMAN AI   ·   SEND A MESSAGE", { x: 116, y: 855, size: 28, color: RED, font: "Consolas", track: 120, name: "Calls to action" }); slideIn(e5, 1.5, 20, 0.55);
  var e6 = T(S8, "NED UNIVERSITY · CTGA-003", { x: 116, y: 920, size: 22, color: MUT, font: "Consolas", track: 240, name: "University" }); slideIn(e6, 1.8, 14, 0.5);
  fadeOutAll(S8);
  function fadeOutAll(c) {
    var s = solid(c, "END fade to black", [0, 0, 0]);
    keys(tf(s).property("Opacity"), [c.duration - 1.1, c.duration - 0.05], [0, 100]);
  }

  // ===================================================================================
  // MAIN — sequence of scenes + transitions + HUD + grain + audio + beat markers
  // ===================================================================================
  var MAIN = mkComp("MAIN — AIMANVERSE Promo", W, H, TOTAL, fComps);
  var scenes = [S1, S2, S3, S4, S5, S6, S7, S8];
  var accents = [RED, RED, YEL, MINT, PINK, BLUE, LIME, RED];
  for (i = 0; i < scenes.length; i++) {
    var sl = MAIN.layers.add(scenes[i]);
    sl.startTime = starts[i];
    sl.name = "S" + (i + 1) + " " + SCENE_NAMES[i];
    label(sl, 1 + i);
  }
  // HUD
  var wm = T(MAIN, "AIMANVERSE", { x: 70, y: 74, size: 30, color: BONE, font: "Impact", track: 220, name: "HUD wordmark" });
  var secLabels = [];
  for (i = 0; i < scenes.length; i++) {
    var sT = T(MAIN, "0" + (i + 1) + " — " + SCENE_NAMES[i], { x: 1850, y: 74, size: 24, color: accents[i], font: "Consolas", just: "R", track: 200, name: "HUD section " + (i + 1) });
    span(sT, starts[i] + 0.2, starts[i] + SCENE_BARS[i] * BAR);
    if (i === 0) tf(sT).property("Opacity").setValue(0);
  }
  var prog = solid(MAIN, "HUD progress", RED, W, 6);
  tf(prog).property("Position").setValue([0, H - 3]);
  tf(prog).property("Anchor Point").setValue([0, 3]);
  keys(tf(prog).property("Scale"), [0, TOTAL], [[0, 100], [100, 100]]);
  // wipes on every cut (the cut itself happens under the wipe)
  for (i = 1; i < scenes.length; i++) {
    var tc = starts[i];
    var wp = solid(MAIN, "WIPE " + i, accents[i]);
    keys(tf(wp).property("Position"), [tc - 0.27, tc, tc + 0.27], [[2880, 540], [960, 540], [-960, 540]]);
    wp.inPoint = tc - 0.3; wp.outPoint = tc + 0.3;
    var wp2 = solid(MAIN, "WIPE " + i + " white", BONE);
    keys(tf(wp2).property("Position"), [tc - 0.2, tc + 0.02, tc + 0.3], [[2880, 540], [960, 540], [-960, 540]]);
    wp2.inPoint = tc - 0.3; wp2.outPoint = tc + 0.35;
    tf(wp2).property("Opacity").setValue(55);
  }
  // film grain (live Fractal Noise, overlay)
  try {
    var gr = solid(MAIN, "Film grain", INK);
    var fn = gr.property("Effects").addProperty("ADBE Noise");
    for (var nk = 1; nk <= fn.numProperties; nk++) { try { if (/amount/i.test(fn.property(nk).name)) fn.property(nk).setValue(60); } catch (e2) {} }
    gr.blendingMode = BlendingMode.OVERLAY;
    tf(gr).property("Opacity").setValue(18);
  } catch (e) { L("grain: " + e); }
  // beat markers (one per bar) so the edit stays on the music if anything is re-timed
  for (i = 0; i < 24; i++) MAIN.markerProperty.setValueAtTime(i * BAR, new MarkerValue("BAR " + (i + 1) + (i === 2 ? " — DROP" : "")));
  // soundtrack
  if (music) {
    var au = MAIN.layers.add(music);
    au.name = "Soundtrack — original synth theme (116 BPM)";
    au.startTime = 0; au.outPoint = TOTAL;
    var al = au.audio.audioLevels;
    al.setValueAtTime(0, [-48, -48]); al.setValueAtTime(0.35, [0, 0]);
    al.setValueAtTime(TOTAL - 2.0, [0, 0]); al.setValueAtTime(TOTAL, [-48, -48]);
    label(au, 9);
  }
  MAIN.openInViewer();

  // organise: move the main comp to the top of the project panel order is implicit; save
  var f = new File(OUT);
  P.save(f);
  var summary = "saved " + OUT + " | comps=" + P.numItems + " | log=" + (log.length ? log.join(" ; ") : "clean");
  MAIN.comment = summary;
  P.save(f);
  app.quit();
})();
