"""Prints the armature, bone hierarchy (rest orientation) and existing actions of the avatar .blend.
Run: blender -b blender/Aiman_Avatar_Rigged.blend --python blender/inspect_rig.py"""
import bpy
sc = bpy.context.scene
print('FPS', sc.render.fps, 'frames', sc.frame_start, sc.frame_end)
for o in bpy.data.objects:
    print('OBJ', o.name, o.type, tuple(round(v, 3) for v in o.location), tuple(round(v, 3) for v in o.scale), 'parent', o.parent.name if o.parent else None)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
print('ARMATURE', arm.name, 'rotation_mode of bones:', {b.rotation_mode for b in arm.pose.bones})
def walk(b, d=0):
    print('  ' * d + b.name, 'head', tuple(round(v, 3) for v in b.head_local), 'tail', tuple(round(v, 3) for v in b.tail_local), 'roll-axis y', tuple(round(v, 2) for v in (b.matrix_local.to_3x3() @ __import__('mathutils').Vector((0, 1, 0)))))
    for c in b.children: walk(c, d + 1)
for b in arm.data.bones:
    if b.parent is None: walk(b)
for a in bpy.data.actions:
    print('ACTION', a.name, 'frames', tuple(a.frame_range), 'fcurves', len(a.fcurves), 'sample', [f.data_path for f in list(a.fcurves)[:3]])
print('ANIM', arm.animation_data.action.name if arm.animation_data and arm.animation_data.action else None)
