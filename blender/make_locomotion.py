"""Authors in-place WALK and RUN loops on the existing avatar rig (no change to mesh, materials or rest pose), optionally renders a
side-view contact sheet for checking, and exports an animation-only GLB (the armature with its actions) for use in the site.

Run (from the project root):
  blender -b blender/Aiman_Avatar_Rigged.blend --python blender/make_locomotion.py -- <out_dir> [preview]

Conventions of this rig: Z up, the character faces -Y, 24 fps. For a bone that points DOWN (thigh, shin, upper arm) a positive
rotation about world X swings it BACKWARD; for a bone pointing UP (spine) a positive rotation about world X leans it FORWARD.
All rotations are applied about the bone's own head in world axes, so the maths below reads like a gait diagram."""
import math, os, sys
import bpy
from mathutils import Euler, Matrix

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else os.path.join(os.path.dirname(bpy.data.filepath), '..', 'after-effects', 'assets', 'avatar', 'locomotion')
PREVIEW = 'preview' in argv
os.makedirs(OUT, exist_ok=True)

arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
arm.animation_data_create()
bones = arm.pose.bones

order = []
def collect(b):
    order.append(b.name)
    for c in b.children: collect(c)
for b in arm.data.bones:
    if b.parent is None: collect(b)

def pose(spec):
    """spec: bone name -> (rx, ry, rz) degrees, rotation about the bone head in world axes (parents first)."""
    for pb in bones: pb.rotation_mode = 'XYZ'; pb.rotation_euler = (0, 0, 0)
    bpy.context.view_layer.update()
    for name in order:
        if name not in spec: continue
        pb = bones[name]; M = pb.matrix.copy(); H = M.translation.copy()
        R = Euler([math.radians(a) for a in spec[name]], 'XYZ').to_matrix().to_4x4()
        pb.matrix = Matrix.Translation(H) @ R @ Matrix.Translation(-H) @ M
        bpy.context.view_layer.update()

def gait(ph, p):
    """phase ph in [0,1); p = gait parameters. Returns the pose spec."""
    w = 2 * math.pi * ph; s = math.sin(w)
    def knee(side):  # knee bends most while that leg swings forward
        v = math.sin(w + (0 if side == 'L' else math.pi))  # +ve = leg swinging forward? (L forward when cos>0)
        c = math.cos(w if side == 'L' else w + math.pi)
        return p['K0'] + p['K'] * max(0.0, c) ** 1.4
    thL, thR = -p['A'] * s, p['A'] * s
    kL, kR = knee('L'), knee('R')
    sp = {
        'hips': (0, p['roll'] * s, p['tw'] * s),
        'spine': (p['lean'] * 0.5, -p['roll'] * 0.6 * s, -p['tw'] * 1.1 * s),
        'chest': (p['lean'] * 0.5, 0, -p['tw'] * 0.6 * s),
        'head': (-p['lean'] * 0.7, 0, p['tw'] * 0.7 * s),
        'thigh.L': (thL, 0, 0), 'thigh.R': (thR, 0, 0),
        'shin.L': (kL, 0, 0), 'shin.R': (kR, 0, 0),
        'foot.L': (-(thL + kL) * 0.8, 0, 0), 'foot.R': (-(thR + kR) * 0.8, 0, 0),
        'upper_arm.L': (p['B'] * s, 0, 0), 'upper_arm.R': (-p['B'] * s, 0, 0),
        'forearm.L': (-(p['E0'] + p['E1'] * max(0.0, -s)), 0, 0), 'forearm.R': (-(p['E0'] + p['E1'] * max(0.0, s)), 0, 0),
    }
    return sp

WALK = dict(A=17, K0=4, K=20, B=15, E0=6, E1=12, tw=4.0, roll=2.0, lean=2)
RUN = dict(A=31, K0=10, K=46, B=36, E0=48, E1=20, tw=7, roll=2.5, lean=11)

def author(name, p, frames):
    act = bpy.data.actions.new(name); arm.animation_data.action = act
    for f in range(frames + 1):  # last key == first key so the loop is seamless
        pose(gait((f % frames) / frames, p))
        for n in ('hips', 'spine', 'chest', 'head', 'thigh.L', 'thigh.R', 'shin.L', 'shin.R', 'foot.L', 'foot.R', 'upper_arm.L', 'upper_arm.R', 'forearm.L', 'forearm.R'):
            bones[n].keyframe_insert('rotation_euler', frame=1 + f)
    for fc in act.fcurves:
        for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'
    act.use_fake_user = True
    return act

walk = author('Aiman_Walk', WALK, 24)    # 1.0 s cycle (two steps)
run = author('Aiman_Run', RUN, 16)       # 0.667 s cycle
print('AUTHORED', walk.name, tuple(walk.frame_range), run.name, tuple(run.frame_range))

if PREVIEW:
    sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.resolution_x = 360; sc.render.resolution_y = 560
    sc.display.shading.light = 'STUDIO'; sc.display.shading.color_type = 'MATERIAL'; sc.render.film_transparent = False
    cam = bpy.data.objects.new('PrevCam', bpy.data.cameras.new('PrevCam')); sc.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = 2.3; cam.location = (4, 0, 0); cam.rotation_euler = (math.radians(90), 0, math.radians(90)); sc.camera = cam
    mesh = next(o for o in bpy.data.objects if o.type == 'MESH')
    for name, act, n in (('walk', walk, 24), ('run', run, 16)):
        arm.animation_data.action = act
        for k in range(8):
            f = 1 + round(k * n / 8); sc.frame_set(f); sc.render.filepath = os.path.join(OUT, f'prev_{name}_{k}.png'); bpy.ops.render.render(write_still=True)
    print('PREVIEW_DONE')

# export only the armature + the two new actions (animation-only GLB; the site applies the clips to the existing optimised avatar)
for a in list(bpy.data.actions):
    if a.name not in ('Aiman_Walk', 'Aiman_Run'): bpy.data.actions.remove(a)
for o in bpy.data.objects: o.select_set(False)
arm.select_set(True); bpy.context.view_layer.objects.active = arm
for ch in arm.children: ch.select_set(False)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'aiman-locomotion.glb'), export_format='GLB', use_selection=True, export_animations=True,
                          export_animation_mode='ACTIONS', export_force_sampling=True, export_optimize_animation_size=True, export_skins=True, export_apply=False)
print('EXPORTED', os.path.join(OUT, 'aiman-locomotion.glb'))
