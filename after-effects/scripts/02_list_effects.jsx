// Diagnostic: lists installed effects (display name => matchName) so build_promo.jsx only uses ones that exist.
(function () {
  try { app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES); } catch (e0) {}
  app.newProject();
  var c = app.project.items.addComp("diag", 640, 360, 1, 2, 30);
  var out = [];
  var fx = app.effects;
  for (var i = 0; i < fx.length; i++) {
    out.push(fx[i].displayName + "=" + fx[i].matchName);
  }
  c.comment = "EFFECTS:: " + out.join(" || ") + " ::END";
  app.project.save(new File("C:/Users/saima/Documents/3d portfolio/after-effects/probe/effects_list.aep"));
  app.quit();
})();
