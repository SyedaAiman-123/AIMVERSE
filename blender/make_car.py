# Authors an original stylised hatchback (no downloaded asset) and exports it as a GLB.
# Run: blender -b --python blender/make_car.py   -> frontend/public/models/car.glb
# Conventions: car faces +Z in the GLB (Blender -Y), width along X, wheels are separate nodes named Wheel_FL/FR/RL/RR (origin = wheel centre, axle = X).
import bpy, bmesh, math, os
bpy.ops.wm.read_factory_settings(use_empty=True)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'public', 'models', 'car.glb')

def mat(name, rgb, rough=0.4, metal=0.0, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = 2.0
    return m
PAINT = mat('Paint', (0.04, 0.32, 0.30), 0.28, 0.55); GLASS = mat('Glass', (0.03, 0.05, 0.07), 0.05, 0.2)
TYRE = mat('Tyre', (0.02, 0.02, 0.02), 0.9); RIM = mat('Rim', (0.75, 0.77, 0.8), 0.25, 0.9); TRIM = mat('Trim', (0.05, 0.05, 0.06), 0.6)
HEAD = mat('Headlight', (1, 0.95, 0.8), 0.2, 0, (1, 0.9, 0.6)); TAIL = mat('Taillight', (0.8, 0.02, 0.02), 0.3, 0, (1, 0.05, 0.05))

def box(name, size, loc, material, bevel=0.06, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.active_object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        m = o.modifiers.new('b', 'BEVEL'); m.width = bevel; m.segments = 3; bpy.ops.object.modifier_apply(modifier='b')
    bpy.ops.object.shade_smooth(); o.data.materials.append(material); return o

def body_shape():
    # lower body, cabin (tapered), bonnet/boot rounding via bevels
    low = box('Body', (1.78, 4.1, 0.62), (0, 0, 0.62), PAINT, 0.16)
    cab = box('Cabin', (1.56, 2.0, 0.58), (0, -0.25, 1.17), PAINT, 0.2)
    # taper roof: pull top verts inward
    bm = bmesh.new(); bm.from_mesh(cab.data)
    for v in bm.verts:
        if v.co.z > 0: v.co.x *= 0.88; v.co.y *= 0.85
    bm.to_mesh(cab.data); bm.free()
    glass = box('Windows', (1.6, 2.06, 0.4), (0, -0.25, 1.2), GLASS, 0.17)
    bm = bmesh.new(); bm.from_mesh(glass.data)
    for v in bm.verts:
        if v.co.z > 0: v.co.x *= 0.9; v.co.y *= 0.88
    bm.to_mesh(glass.data); bm.free()
    roof = box('Roof', (1.3, 1.55, 0.05), (0, -0.25, 1.46), PAINT, 0.02)
    box('Bumper_F', (1.74, 0.16, 0.22), (0, 2.04, 0.36), TRIM, 0.05); box('Bumper_R', (1.74, 0.16, 0.22), (0, -2.04, 0.36), TRIM, 0.05)
    box('Grille', (0.9, 0.05, 0.14), (0, 2.07, 0.62), TRIM, 0.02)
    for sx in (-1, 1):
        box('Head_%d' % sx, (0.34, 0.06, 0.13), (sx * 0.62, 2.06, 0.74), HEAD, 0.03)
        box('Tail_%d' % sx, (0.34, 0.06, 0.13), (sx * 0.64, -2.06, 0.78), TAIL, 0.03)
        box('Mirror_%d' % sx, (0.1, 0.16, 0.1), (sx * 0.95, 0.5, 1.02), PAINT, 0.03)
        box('Arch_%d' % sx, (0.06, 3.0, 0.1), (sx * 0.9, 0, 0.42), TRIM, 0.02)
    # sill + plate
    box('Plate_F', (0.4, 0.02, 0.1), (0, 2.09, 0.42), HEAD, 0.0)
body_shape()

def wheel(name, x, y):
    parts = []
    bpy.ops.mesh.primitive_cylinder_add(radius=0.34, depth=0.24, vertices=28, location=(x, y, 0.34), rotation=(0, math.pi / 2, 0)); t = bpy.context.active_object; t.name = name; t.data.materials.append(TYRE)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.21, depth=0.26, vertices=20, location=(x, y, 0.34), rotation=(0, math.pi / 2, 0)); r = bpy.context.active_object; r.data.materials.append(RIM)
    for k in range(5):  # spokes so rotation is visible
        a = k * math.tau / 5
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x + math.copysign(0.135, x), y + math.cos(a) * 0.11, 0.34 + math.sin(a) * 0.11), rotation=(a, 0, 0)); s = bpy.context.active_object; s.scale = (0.02, 0.05, 0.2); s.data.materials.append(TRIM)
        parts.append(s)
    for o in [t, r] + parts: o.select_set(True)
    bpy.context.view_layer.objects.active = t; bpy.ops.object.join(); w = bpy.context.active_object
    bpy.ops.object.shade_smooth()
    bpy.context.scene.cursor.location = (x, y, 0.34); bpy.ops.object.origin_set(type='ORIGIN_CURSOR'); w.name = name
for n, x, y in (('Wheel_FL', 0.86, 1.3), ('Wheel_FR', -0.86, 1.3), ('Wheel_RL', 0.86, -1.3), ('Wheel_RR', -0.86, -1.3)): wheel(n, x, y)

bpy.ops.object.select_all(action='DESELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True)
print('WROTE', os.path.abspath(OUT))
