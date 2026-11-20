"""Renders transparent PNGs of the supplied avatar for the After Effects promo.
Run (headless, original .blend is only READ, never saved):
  blender -b blender/Aiman_Avatar_Rigged.blend --python after-effects/scripts/render_avatar.py -- <out_dir> <first> <last> <step> <action>
"""
import bpy, sys, os, math
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
out_dir, first, last, step, action = argv[0], int(argv[1]), int(argv[2]), int(argv[3]), argv[4]
os.makedirs(out_dir, exist_ok=True)

sc = bpy.context.scene
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mesh = next(o for o in bpy.data.objects if o.type == 'MESH')
if arm.animation_data is None:
    arm.animation_data_create()
arm.animation_data.action = bpy.data.actions[action]

# framing: fit the whole figure, slightly off-centre room for motion
bb = [mesh.matrix_world @ Vector(c) for c in mesh.bound_box]
mn = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb)))
mx = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
ctr = (mn + mx) / 2
h = mx.z - mn.z
cam = bpy.data.objects['Camera']
cam.data.type = 'PERSP'
cam.data.lens = 70
cam.data.sensor_width = 36
dist = h * 1.25 * (70 / 36) / 1.0 * 0.86
cam.location = Vector((ctr.x, mn.y - dist * 1.0 - 0.0, ctr.z + h * 0.03))
direction = Vector((ctr.x, ctr.y, ctr.z + h * 0.02)) - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
sc.camera = cam

sc.render.engine = 'BLENDER_EEVEE_NEXT'
sc.render.film_transparent = True
sc.render.resolution_x = 900
sc.render.resolution_y = 1350
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.eevee.taa_render_samples = 48
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'AgX - High Contrast'
sc.view_settings.exposure = -0.9
for o in bpy.data.objects:
    if o.type == 'LIGHT' and o.name.endswith('RimLight'):
        o.data.color = (1.0, 0.35, 0.2)
        o.data.energy *= 1.6

for f in range(first, last + 1, step):
    sc.frame_set(f)
    sc.render.filepath = os.path.join(out_dir, f'{action}_{f:04d}.png')
    bpy.ops.render.render(write_still=True)
print('DONE', first, last, step, out_dir)
