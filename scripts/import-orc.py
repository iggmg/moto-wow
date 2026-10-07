import bpy, json, zipfile
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parent.parent
source=root/'artifacts/orc-source/Orc'
if not source.exists():
    with zipfile.ZipFile(root/'assets/source/orc/orc.zip') as archive:
        for name in ['Orc/orc.blend','Orc/orc.png','Orc/warhammer.png']:archive.extract(name,root/'artifacts/orc-source')
bpy.ops.wm.open_mainfile(filepath=str(source/'orc.blend'))
print('MODEL_INFO',[(o.name,tuple(o.dimensions),tuple(o.rotation_euler),tuple(o.location),[(m.name if m else None) for m in o.data.materials]) for o in bpy.data.objects if o.type=='MESH'])
print('BONES',list(bpy.data.objects['armaorc'].data.bones.keys()))
print('EXPORT_PROPS',[(p.identifier,str(p.default)) for p in bpy.ops.export_scene.gltf.get_rna_type().properties if 'anim' in p.identifier or 'action' in p.identifier])
for o in list(bpy.data.objects):
    if o.type in {'CAMERA','LIGHT'}:bpy.data.objects.remove(o,do_unlink=True)
for name,image_file in [('orc','orc.png'),('warhammer','warhammer.png')]:
    obj=bpy.data.objects[name]
    material=bpy.data.materials.new(name+' textured');material.use_nodes=True
    bsdf=material.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.82
    tex=material.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(source/image_file),check_existing=True)
    material.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
    obj.data.materials.clear();obj.data.materials.append(material)
    for p in obj.data.polygons:p.material_index=0;p.use_smooth=True
# glTF includes the source rig and all actions; normalization stays on the game wrapper.
bpy.context.scene.frame_set(1)
bpy.ops.export_scene.gltf(filepath=str(root/'public/models/orc.glb'),export_format='GLB',export_animation_mode='ACTIONS',export_force_sampling=True,export_animations=True,export_cameras=False,export_lights=False)
