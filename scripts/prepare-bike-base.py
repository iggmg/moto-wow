"""Offline licensed-asset adaptation. Run with Blender --background --disable-autoexec.
Inputs are downloads listed in docs/MOTORCYCLE_REFERENCES.md; no scripts from them run.
"""
import bpy, bmesh, json, math, sys
from collections import defaultdict
from mathutils import Matrix, Vector

id, source, output = sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)

def material(name, color, metal=0, rough=.5, coat=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Coat Weight'].default_value=coat;p.inputs['Coat Roughness'].default_value=.22
 return m

paint=material('Reference body paint',{'cub':(.012,.023,.019),'exciter':(.19,.045,.40),'mt07':(.035,.047,.052),'pcx':(.012,.016,.023),'himalayan':(.028,.035,.037)}[id],.10 if id=='himalayan' else .16,.50 if id=='himalayan' else .32,.25 if id=='himalayan' else .6)
ivory=material('Cream leg shield',(.74,.68,.56),.04,.48,.15)
rubber=material('Tyre rubber',(.009,.011,.013),0,.86)
seat=material('Seat vinyl',(.012,.015,.018),0,.82)
rim=material('Turquoise wheel paint',(.025,.25,.22),.38,.40,.3)
purple_rim=material('Purple wheel paint',(.085,.025,.19),.38,.38,.3)
dark=material('Dark polymer',(.008,.011,.015),.08,.55)
steel=material('Machined steel',(.30,.34,.36),.78,.38)

config={
 'himalayan':dict(scale=1.465/16.58,center=-.24,ground=0,front=(-8.53,4.047,4.047),rear=(8.05,4.04,3.98)),
 'cub':dict(scale=1.215/1.394607,center=-.109045,ground=0,front=(-.806348,.337387,.33735),rear=(.588260,.337387,.33735)),
 'mt07':dict(scale=1.4/4.34255,center=-.14965,ground=-1.5723,front=(-2.32095,-.6436,.92875),rear=(2.0216,-.58665,.95655)),
 'exciter':dict(scale=1.29/2.94085,center=-.282075,ground=-1.5785,front=(1.18835,-.93005,.64055),rear=(-1.7525,-.8995,.679)),
 'pcx':dict(scale=1.315/1.2879,center=.07130,ground=-.003,front=(.71525,.25525,.25565),rear=(-.57265,.25255,.25555)),
}[id]
sc=config['scale']; mid=config['center'];bottom=config['ground']
if id=='mt07': transform=Matrix(((0,sc,0,-.19035*sc),(sc,0,0,-mid*sc),(0,0,sc,-bottom*sc),(0,0,0,1)))
elif id=='pcx':transform=Matrix(((0,-sc,0,.01055*sc),(-sc,0,0,mid*sc),(0,0,sc,-bottom*sc),(0,0,0,1)))
elif id=='exciter':transform=Matrix(((-sc,0,0,0),(0,-sc,0,mid*sc),(0,0,sc,-bottom*sc),(0,0,0,1)))
else:transform=Matrix(((sc*(.77 if id=='himalayan' else 1),0,0,0),(0,sc,0,-mid*sc),(0,0,sc,-bottom*sc),(0,0,0,1)))

body=bpy.data.objects.new('BikeBody',None);bpy.context.collection.objects.link(body)
wheels={}
for key in ['front','rear']:
 axis,z,r=config[key];point=Vector((0,axis,z)) if id in ['cub','exciter','himalayan'] else Vector((axis,.19035 if id=='mt07' else .01055,z))
 g=bpy.data.objects.new('Wheel'+key.title(),None);bpy.context.collection.objects.link(g);g.parent=body;g.location=transform@point;wheels[key]=g

def connected(mesh):
 parent=list(range(len(mesh.vertices)));twins={}
 def find(a):
  while a!=parent[a]:parent[a]=parent[parent[a]];a=parent[a]
  return a
 def union(a,b):parent[find(a)]=find(b)
 for v in mesh.vertices:
  key=tuple(round(x,5) for x in v.co)
  if key in twins:union(v.index,twins[key])
  else:twins[key]=v.index
 for p in mesh.polygons:
  for v in p.vertices[1:]:union(p.vertices[0],v)
 groups=defaultdict(list)
 for p in mesh.polygons:groups[find(p.vertices[0])].append(p.index)
 return groups.values()

pixels={}
def sample(mat,mesh,poly):
 if not mat or not mat.use_nodes or not mesh.uv_layers:return (0,0,0)
 p=next((n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
 if not p:return (0,0,0)
 socket=p.inputs['Base Color']
 def find_image(node):
  if node.type=='TEX_IMAGE':return node
  for input in node.inputs:
   for link in input.links:
    found=find_image(link.from_node)
    if found:return found
 tex=find_image(socket.links[0].from_node) if socket.is_linked else None
 if not tex or tex.type!='TEX_IMAGE' or not tex.image:return socket.default_value[:3]
 img=tex.image
 if img.name not in pixels:pixels[img.name]=list(img.pixels[:])
 uv=sum((mesh.uv_layers.active.data[i].uv for i in poly.loop_indices),Vector((0,0)))/len(poly.loop_indices)
 w,h=img.size;x=min(w-1,max(0,int(uv.x*w)));y=min(h-1,max(0,int(uv.y*h)));k=(y*w+x)*4
 return pixels[img.name][k:k+3]

if id=='himalayan':
 bpy.ops.object.select_all(action='DESELECT')
 for obj in list(bpy.data.objects):
  if obj.type!='MESH':continue
  if not obj.name.startswith('Assembly-7'):bpy.data.objects.remove(obj,do_unlink=True);continue
  obj.data.transform(obj.matrix_world);obj.parent=None;obj.matrix_world=Matrix.Identity(4);obj.select_set(True);bpy.context.view_layer.objects.active=obj
 bpy.ops.object.join();joined=bpy.context.view_layer.objects.active;joined.name='Assembly-7 Bike'
 bm=bmesh.new();bm.from_mesh(joined.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(joined.data);bm.free();joined.data.update()
imported=[o for o in bpy.data.objects if o.type=='MESH']
for obj in imported:
 if id=='himalayan' and not obj.name.startswith('Assembly-7'):
  bpy.data.objects.remove(obj,do_unlink=True);continue
 original=obj.name; obj.data.transform(transform@obj.matrix_world);obj.parent=None;obj.matrix_world=Matrix.Identity(4)
 mesh=obj.data
 # Wheel grouping happens before decimation so pivots are independent of tessellation.
 groups=([p.index] for p in mesh.polygons) if id=='himalayan' else connected(mesh) if id=='cub' else [list(range(len(mesh.polygons)))]
 buckets=defaultdict(list)
 for faces in groups:
  verts={v for j in faces for v in mesh.polygons[j].vertices};pts=[mesh.vertices[v].co for v in verts]
  lo=Vector(tuple(min(p[k] for p in pts) for k in range(3)));hi=Vector(tuple(max(p[k] for p in pts) for k in range(3)));c=(lo+hi)/2
  if id=='cub' and ((lo.z>.82 and -.55<c.y<-.18) or (lo.z>.64 and c.y>.10 and hi.z>.70)):continue
  if id=='cub' and lo.z<.02 and hi.z<.23 and abs(c.y)<.2:continue # folded side stand
  if id=='mt07' and original in ['Object_78','Object_80','Object_82','Object_84','Object_86','Object_76','Object_159','Object_158','Object_54']:continue # newer projector replaced with photo-generation headlamp
  group='body'
  static=(id=='mt07' and original in ['Object_101','Object_103','Object_94','Object_95','Object_111','Object_125']) or (id=='exciter' and ('pCube' in original or 'Cylinder.006' in original)) or (id=='pcx' and original in ['Object_102','Object_103','Object_104','Object_91'])
  if not static:
   for key,wheel in wheels.items():
    r=config[key][2]*sc
    if max(abs(p.x) for p in pts)<(.070 if id=='himalayan' else .17) and max(math.hypot(p.y-wheel.location.y,p.z-wheel.location.z) for p in pts)<r+.012:
     group=key;break
  buckets[group].extend(faces)
 for group,faces in buckets.items():
  clone=mesh.copy();bm=bmesh.new();bm.from_mesh(clone);bm.faces.ensure_lookup_table();keep=set(faces);bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.index not in keep],context='FACES');bm.to_mesh(clone);bm.free();clone.update()
  child=bpy.data.objects.new('ReferencePart',clone);bpy.context.collection.objects.link(child)
  owner=body if group=='body' else wheels[group];child.parent=owner
  if group!='body':child.data.transform(Matrix.Translation(-owner.location))
  original_slots=list(clone.materials);clone.materials.append(paint);paint_i=len(clone.materials)-1;clone.materials.append(ivory);ivory_i=len(clone.materials)-1
  for p in clone.polygons:
   old=original_slots[p.material_index] if p.material_index<len(original_slots) else None;name=old.name if old else ''
   if id in ['cub','exciter']:
    r,g,b=sample(old,clone,p)
    if (id=='cub' and g>r*1.35 and g>b*1.12 and g>.025) or (id=='exciter' and r>.08 and r>g*2 and r>b*1.5 and group=='body' and 'light' not in original.lower()):p.material_index=paint_i
    if id=='cub' and group!='body' and math.hypot(p.center.y,p.center.z)>config[group][2]*sc*.82:
     if rubber not in list(clone.materials):clone.materials.append(rubber)
     p.material_index=list(clone.materials).index(rubber)
    if id=='exciter' and group!='body' and r>.08 and r>g*2 and r>b*1.5:
     if purple_rim not in list(clone.materials):clone.materials.append(purple_rim)
     p.material_index=list(clone.materials).index(purple_rim)
    if id=='cub' and min(r,g,b)>.43 and abs(p.center.x)>.09 and .18<p.center.z<.84 and -.5<p.center.y<.13:p.material_index=ivory_i
   elif id=='himalayan':
    r,g,b=sample(old,clone,p);c=sum((clone.vertices[v].co for v in p.vertices),Vector())/len(p.vertices)
    replacement=None
    if min(r,g,b)>.37:
     replacement=steel
    if group=='body' and not (r>g*1.8 and r>b*1.6) and ((.61<c.z<1.13 and -.72<c.y<.22 and abs(c.x)>.08) or (.43<c.z<1.03 and -.99<c.y<-.43) or (.70<c.z<.95 and c.y>.63)):replacement=paint
    if group=='body' and ((.43<c.z<1.03 and -.99<c.y<-.43) or (.70<c.z<1.08 and c.y>.63)):replacement=paint
    if group=='body' and min(r,g,b)>.25 and .22<c.z<.70 and abs(c.x)>.13 and -.45<c.y<.30:replacement=dark
    if replacement:
     if replacement not in list(clone.materials):clone.materials.append(replacement)
     p.material_index=list(clone.materials).index(replacement)
   elif id=='pcx':
    replacement=paint if name in ['Body','PCX_AZUL-Lateral'] else seat if name=='banco' else dark if name=='plastic_marrom' or name.startswith('Placa-') or name=='logo' else None
    if replacement:
     if replacement not in list(clone.materials):clone.materials.append(replacement)
     p.material_index=list(clone.materials).index(replacement)
   elif id=='mt07':
    replacement=(rim if group!='body' else paint) if name=='metal_blue' else rubber if name=='Material.004' else seat if name=='Material.001' else steel if name in ['Material.003','Material.005'] else dark if name in ['Material.009','Material.006'] else None
    if replacement:
     if replacement not in list(clone.materials):clone.materials.append(replacement)
     p.material_index=list(clone.materials).index(replacement)
  bpy.context.view_layer.objects.active=child;child.select_set(True)
  tris=sum(len(p.vertices)-2 for p in clone.polygons)
  if id in ['mt07','himalayan']:
   for p in clone.polygons:p.use_smooth=True
   if clone.has_custom_normals:clone.normals_split_custom_set([(0,0,0)]*len(clone.loops))
  if tris>800:
   mod=child.modifiers.new('Browser geometry budget','DECIMATE');mod.ratio=(.035 if id=='himalayan' and group=='body' else .065 if id=='himalayan' else .10 if id=='pcx' else .19 if id=='cub' else .14 if id=='exciter' else 1) if tris>5000 else .065 if id=='himalayan' else .26 if id=='pcx' else .36 if id=='exciter' else .52 if id=='cub' else 1;mod.use_collapse_triangulate=True
   if mod.ratio<1:bpy.ops.object.modifier_apply(modifier=mod.name)
  child.select_set(False)
 bpy.data.objects.remove(obj,do_unlink=True)

# Delete source transforms, cameras and unused scene nodes; retain only game hierarchy.
keep={body,*wheels.values()}
for obj in list(bpy.data.objects):
 if obj.type!='MESH' and obj not in keep:bpy.data.objects.remove(obj,do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.data.objects:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=output,export_format='GLB',use_selection=True,export_animations=False,export_extras=False,export_cameras=False,export_lights=False,export_copyright='Licensed adaptation; authors and CC BY 4.0 sources in docs/ASSETS.md')
print(json.dumps(dict(id=id,triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.data.objects if o.type=='MESH'),wheelbase=config['scale']*abs(config['front'][0]-config['rear'][0]))))
