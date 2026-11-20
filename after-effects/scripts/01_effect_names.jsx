// Diagnostic: lists the property names/matchNames of the effects used by build_promo.jsx and stores them in a comp comment.
(function () {
  app.newProject();
  var c = app.project.items.addComp("diag", 640, 360, 1, 2, 30);
  var s = c.layers.addSolid([0, 0, 0], "s", 640, 360, 1, 2);
  var out = [];
  var names = ["ADBE Grid", "ADBE Ramp", "ADBE Glo2", "ADBE Drop Shadow", "ADBE Fractal Noise"];
  function probe(n) {
    var fx = s.property("ADBE Effect Parade").addProperty(n);
    var line = n + " => " + fx.name + " :: ";
    var cnt = fx.numProperties;
    for (var p = 1; p <= cnt; p++) {
      var pr = fx.property(p);
      line += "[" + p + "] " + pr.name + " {" + pr.matchName + "} ; ";
    }
    return line;
  }
  for (var i = 0; i < names.length; i++) {
    var r;
    try { r = probe(names[i]); } catch (e) { r = names[i] + " ERR " + e.toString(); }
    out.push(r);
  }
  c.comment = "DIAGNOSTIC:: " + out.join(" || ") + " ::END";
  app.project.save(new File("C:/Users/saima/Documents/3d portfolio/after-effects/probe/effect_names.aep"));
  app.quit();
})();
