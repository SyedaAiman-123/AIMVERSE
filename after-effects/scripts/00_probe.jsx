// Probe: proves ExtendScript runs inside After Effects and can create + save a project.
// Output evidence = the saved .aep next to this script's output folder.
(function () {
  app.newProject();
  var c = app.project.items.addComp("probe", 1920, 1080, 1, 5, 30);
  var t = c.layers.addText("AIMANVERSE probe");
  t.name = "probe-title";
  c.layers.addSolid([0.1, 0.1, 0.15], "bg", 1920, 1080, 1);
  var out = new File("C:/Users/saima/Documents/3d portfolio/after-effects/probe/probe.aep");
  out.parent.create();
  app.project.save(out);
  app.quit();
})();
