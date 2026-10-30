"""Independently authored UI geometry. Reads dimension/path inventory, never original pixels.
All production assets are built from the primitives below. No font or external artwork input.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json,math,hashlib
ROOT=Path(__file__).resolve().parent
INVENTORY=json.loads((ROOT/'inventory.json').read_text())
EXCLUDE={'ic_auto_color','ic_coolledu_frame_0','ic_no_frame','ic_banner_default'}
ALIASES={
'ic_emoji':'smiley','ic_add':'add','increase_iv':'plus','ic_decrease_iv':'minus','ic_add_draw':'add',
'ic_add_clock_program':'clock','ic_animations_program':'animation','ic_dynamic_text':'dynamic',
'ic_graffiti_program':'pencil','ic_material_program':'folder','ic_template':'layout','ic_text_program':'text',
'ic_copy_32':'copy','ic_copy_area':'copy','ic_edit_copy':'copy','ic_paste_area':'paste',
'ic_delete_32':'trash','ic_delete_area':'trash','ic_edit_delete':'trash','ic_delete_all_area':'broom','ic_clear_all_animation':'broom',
'ic_device':'bluetooth','ic_dialog_cancel':'cancel','ic_dialog_confirm':'check','ic_confirm':'check',
'ic_save_draw':'check','ic_save_choose_pattern':'check','ic_crop_confirm':'check',
'ic_discover_default':'compass','ic_discover_selected':'compass','ic_edit':'pencil','ic_edit_32':'pencil','ic_edit_edit':'pencil',
'ic_exit':'back','ic_back':'back','ic_enter_32':'forward','ic_import':'import','ic_material_default':'folder','ic_material_selected':'folder',
'ic_mode_32':'grid','ic_no_content':'empty','ic_power_off':'power','ic_power_on':'power','ic_save':'save',
'ic_settings_default':'settings','ic_settings_selected':'settings','ic_share':'share','ic_sort_32':'sort','ic_drag':'sort',
'ic_text_default':'document','ic_text_selected':'document','ic_text_item_default':'radio','ic_text_item_selected':'radio',
'ic_to_top_32':'top','ic_to_top':'top','ic_to_bottom_32':'bottom','ic_to_bottom':'bottom',
'ic_arrow_dialog':'triangle','ic_tool_area_arrow':'downtriangle','ic_choose_area':'select','ic_choose_area_selected':'select',
'ic_color_item_selected':'dot','ic_color_picker':'dropper','ic_color_picker_selected':'dropper','ic_color_thump':'thumb',
'ic_dragging':'move','ic_undragging':'move','ic_eraser_selected':'eraser','ic_eraser_unselected':'eraser',
'ic_fill_area_one':'bucket','ic_fill_area_two':'target','ic_input_area_text':'text','ic_input_text_show_color':'doubleforward',
'ic_mirror_one':'mirrorx','ic_mirror_two':'mirrory','ic_painting_ing':'palette','ic_painting_un':'palette',
'ic_redo':'redo','ic_undo':'undo','ic_rotate_area':'rotatebox','ic_show_all_color':'doubleforward',
'ic_text_bold_default':'bold','ic_text_bold_selected':'bold','ic_thump_32':'thumb','ic_tools_bg':'toolsbg',
'ic_zoomin':'zoomplus','ic_zoomout':'zoomminus','ic_about_us_32':'people','ic_app_info':'info',
'ic_box_default':'toggleoff','ic_box_selected':'toggleon','ic_email_32':'mail','ic_hard_update_32':'upload',
'ic_help_32':'help','ic_language_32':'globe','ic_language_selected':'check','ic_remote':'remote',
'ic_rotate_show':'rotatebox','ic_settings_page_bg':'pagebg','ic_show_device_id':'id','ic_version_32':'refresh',
'ic_animation_edit_empty':'emptyanimation','ic_bold_32':'bold','ic_click_to_add_animation':'addtile',
'ic_color_32':'palette','ic_font_type':'font','ic_frame_32':'framecontrol','ic_graffiti_edit_empty':'emptydraw',
'ic_keyboard':'keyboard','ic_moving_internal':'spacingbars','ic_rotate_32':'rotate','ic_switch_off':'toggleoff',
'ic_switch_on':'toggleon','ic_template_image':'landscape','ic_text_font_size':'size','ic_text_spacing':'spacing',
'ic_color_thumb':'ring','ic_left':'lefttriangle','ic_right':'righttriangle','ic_select_all':'selectall',
'ic_un_select_all':'unselectall','ic_animation_list_bg':'listbg','ic_animation_number_bg':'numberbg'}
def key(path):return Path(path).stem.removeprefix('drawable__').split('__')[0]
class Canvas:
 def __init__(self,w,h):
  self.w,self.h=w,h; self.s=4;self.im=Image.new('RGBA',(w*4,h*4));self.d=ImageDraw.Draw(self.im);self.scale=min(w,h)*4/100;self.ox=(w*4-100*self.scale)/2;self.oy=(h*4-100*self.scale)/2;self.ink='#f3f6fc'
 def xy(self,p):return (round(self.ox+p[0]*self.scale),round(self.oy+p[1]*self.scale))
 def box(self,p):return (*self.xy(p[:2]),*self.xy(p[2:]))
 def line(self,p,color=None,width=5):self.d.line([self.xy(q) for q in p],fill=color or self.ink,width=max(1,round(width*self.scale)),joint='curve')
 def rect(self,p,fill=None,outline=None,width=4,r=0):self.d.rounded_rectangle(self.box(p),radius=round(r*self.scale),fill=fill,outline=outline,width=max(1,round(width*self.scale)))
 def ellipse(self,p,fill=None,outline=None,width=4):self.d.ellipse(self.box(p),fill=fill,outline=outline,width=max(1,round(width*self.scale)))
 def poly(self,p,fill=None,outline=None,width=4):
  self.d.polygon([self.xy(q) for q in p],fill=fill)
  if outline:self.line(p+[p[0]],outline,width)
 def arc(self,p,start,end,width=5,color=None):self.d.arc(self.box(p),start,end,fill=color or self.ink,width=round(width*self.scale))
 def finish(self):return self.im.resize((self.w,self.h),Image.Resampling.LANCZOS)
ACCENT='#9b86ff'
def glyph(c,role):
 I=c.ink
 if role=='smiley':
  c.ellipse((17,17,83,83),outline=I);c.ellipse((33,34,41,44),fill=I);c.ellipse((59,34,67,44),fill=I);c.arc((31,35,69,70),10,170,width=4)
 elif role in ['add','plus','minus','addtile']:
  if role in ['add','addtile']:c.rect((17,17,83,83),outline=I,r=12)
  c.line([(32,50),(68,50)])
  if role!='minus':c.line([(50,32),(50,68)])
 elif role in ['check','cancel']:
  c.line([(24,51),(43,69),(78,29)]) if role=='check' else (c.line([(30,30),(70,70)]),c.line([(70,30),(30,70)]))
 elif role in ['back','forward','doubleforward']:
  pts=[(61,22),(34,50),(61,78)] if role=='back' else [(39,22),(66,50),(39,78)]
  c.line(pts)
  if role=='doubleforward':c.line([(24,22),(51,50),(24,78)])
 elif role in ['top','bottom']:
  pts=[(30,47),(50,27),(70,47),(59,47),(59,76),(41,76),(41,47)]
  if role=='bottom':pts=[(x,100-y) for x,y in pts]
  c.poly(pts,outline=I); y=15 if role=='top' else 85;c.line([(25,y),(75,y)])
 elif role in ['triangle','downtriangle','lefttriangle','righttriangle']:
  p={'triangle':[(20,80),(80,20),(80,80)],'downtriangle':[(20,28),(80,28),(50,75)],'lefttriangle':[(67,20),(27,50),(67,80)],'righttriangle':[(33,20),(73,50),(33,80)]}[role];c.poly(p,fill=I)
 elif role in ['pencil','emptydraw']:
  c.poly([(25,64),(61,28),(74,41),(38,77),(23,79)],outline=I);c.line([(55,34),(68,47)]);c.line([(25,64),(38,77)])
  if role=='emptydraw':c.rect((11,12,90,89),outline=ACCENT,r=9)
 elif role in ['copy','paste']:
  c.rect((20,20,64,67),outline=I,r=5);c.rect((35,35,80,82),fill='#252b36',outline=I,r=5);c.line([(46,49),(68,49)]);c.line([(46,61),(68,61)])
  if role=='paste':c.rect((44,27,69,39),fill=ACCENT,r=3)
 elif role in ['trash','broom']:
  if role=='trash':c.line([(23,28),(77,28)]);c.rect((31,28,69,80),outline=I,r=5);c.line([(42,18),(58,18)]);c.line([(43,42),(43,65)]);c.line([(57,42),(57,65)])
  else:c.line([(57,18),(47,48)],width=7);c.poly([(33,44),(64,52),(75,80),(20,80)],outline=I);c.line([(37,60),(32,77)]);c.line([(52,64),(51,78)]);c.line([(68,21),(78,21)],width=3)
 elif role=='bluetooth':
  c.line([(49,15),(49,85),(72,65),(28,31)]);c.line([(28,69),(72,35),(49,15)])
 elif role=='compass':
  c.ellipse((18,18,82,82),outline=I);c.poly([(64,32),(55,58),(31,69),(43,43)],outline=I);c.ellipse((46,46,54,54),fill=I)
 elif role=='folder':
  c.poly([(17,30),(39,30),(46,39),(83,39),(76,78),(20,78)],outline=I);c.line([(22,49),(75,49)])
 elif role=='grid':
  for x in [24,55]:
   for y in [24,55]:c.rect((x,y,x+21,y+21),fill=I,r=4)
 elif role in ['power','refresh','rotate','rotatebox']:
  if role=='power':c.arc((23,22,77,79),-55,235);c.line([(50,15),(50,49)])
  elif role=='rotatebox':c.rect((31,41,70,76),outline=I,r=3);c.arc((20,17,80,76),190,315);c.poly([(70,18),(82,35),(61,35)],fill=I)
  else:c.arc((23,23,77,77),-65,235);c.poly([(64,17),(80,31),(59,39)],fill=I)
 elif role=='save':
  c.poly([(23,18),(67,18),(80,31),(80,82),(20,82),(20,18)],outline=I);c.rect((33,20,63,40),outline=I,r=2);c.rect((32,55,68,80),outline=I,r=3)
 elif role=='settings':
  for deg in range(0,360,45):
   a=math.radians(deg);c.line([(50+25*math.cos(a),50+25*math.sin(a)),(50+36*math.cos(a),50+36*math.sin(a))],width=8)
  c.ellipse((25,25,75,75),outline=I);c.ellipse((41,41,59,59),outline=I,width=3)
 elif role=='share':
  for p in [(25,50),(72,25),(72,75)]:c.ellipse((p[0]-8,p[1]-8,p[0]+8,p[1]+8),outline=I,width=4)
  c.line([(33,46),(64,29)]);c.line([(33,54),(64,71)])
 elif role in ['sort','spacingbars']:
  if role=='sort':
   for y in [28,50,72]:c.line([(25,y),(75,y)])
  else:
   for x in [25,38,50,62,75]:c.line([(x,28),(x,72)],width=3)
 elif role in ['text','dynamic','size','font','bold','spacing']:
  if role=='bold':
   c.line([(31,22),(31,78)],width=8);c.line([(31,24),(56,24),(68,34),(56,48),(31,48)],width=7);c.line([(31,48),(60,48),(72,63),(61,77),(31,77)],width=7)
  else:
   c.line([(24,27),(70,27)],width=6);c.line([(47,27),(47,72)],width=6)
   if role=='dynamic':c.line([(59,57),(80,57)]);c.poly([(76,51),(85,57),(76,63)],fill=I)
   if role=='size':c.line([(67,47),(86,47)],width=4);c.line([(76,47),(76,76)],width=4)
   if role=='font':c.line([(65,72),(75,44),(85,72)],width=3);c.line([(69,62),(81,62)],width=3)
   if role=='spacing':c.line([(22,84),(78,84)],width=3);c.line([(28,78),(21,84),(28,90)],width=3);c.line([(72,78),(79,84),(72,90)],width=3)
 elif role in ['document','selectall','unselectall','id']:
  c.rect((24,17,76,83),outline=I,r=6)
  if role=='id':c.ellipse((35,29,47,41),outline=I,width=3);c.line([(31,56),(51,56)]);c.line([(57,34),(67,34)],width=3);c.line([(57,45),(67,45)],width=3)
  else:
   for y in [34,50,66]:
    if role=='selectall':c.line([(31,y),(35,y+4),(42,y-5)],width=3)
    c.line([(46 if role=='selectall' else 35,y),(66,y)],width=3)
   if role=='unselectall':c.ellipse((58,59,86,87),fill='#252b36',outline=I,width=3);c.line([(65,66),(79,80)],width=3);c.line([(79,66),(65,80)],width=3)
 elif role=='radio':c.ellipse((19,19,81,81),outline=I,width=5)
 elif role in ['thumb','dot','ring']:
  if role=='ring':c.ellipse((18,18,82,82),outline=I,width=7)
  else:c.ellipse((18,18,82,82),fill=I)
 elif role=='select':
  for x,y in [(23,23),(65,23),(23,65),(65,65)]:c.line([(x,y+12),(x,y),(x+12,y)],width=4)
  c.poly([(46,44),(48,78),(57,66),(69,73),(73,66),(61,60),(73,53)],fill=I)
 elif role=='dropper':
  c.poly([(30,61),(58,33),(69,44),(41,72),(25,77)],outline=I);c.line([(53,28),(75,50)],width=7);c.line([(65,22),(79,36)],width=9)
 elif role=='move':
  c.line([(50,18),(50,82)]);c.line([(18,50),(82,50)])
  for pts in [[(40,28),(50,18),(60,28)],[(40,72),(50,82),(60,72)],[(28,40),(18,50),(28,60)],[(72,40),(82,50),(72,60)]]:c.line(pts,width=4)
 elif role=='eraser':c.poly([(23,61),(57,24),(79,45),(47,78),(38,78)],outline=I);c.line([(37,46),(60,66)])
 elif role=='bucket':
  c.poly([(27,48),(53,22),(77,48),(51,74)],outline=I);c.line([(39,35),(31,19)]);c.line([(27,48),(77,48)],width=3);c.poly([(24,65),(17,78),(20,85),(28,84),(31,78)],fill=I)
 elif role=='target':c.ellipse((20,20,80,80),outline=I);c.ellipse((35,35,65,65),outline=I);c.ellipse((46,46,54,54),fill=I)
 elif role in ['mirrorx','mirrory']:
  def rotate(p):return [(y,x) for x,y in p] if role=='mirrory' else p
  c.line(rotate([(50,18),(50,82)]),width=3);c.poly(rotate([(22,28),(40,50),(22,72)]),outline=I);c.poly(rotate([(78,28),(60,50),(78,72)]),outline=I)
 elif role=='palette':
  c.ellipse((19,18,82,79),outline=I);c.ellipse((55,58,80,83),fill='#252b36');c.arc((55,58,80,83),160,310,width=4)
  for x,y,col in [(36,34,'#ffcd69'),(57,30,'#ff809c'),(70,46,'#87e4d0'),(32,54,'#94b5ff')]:c.ellipse((x-4,y-4,x+4,y+4),fill=col)
 elif role in ['undo','redo']:
  pts=[(33,27),(18,43),(33,57)];c.line(pts);c.line([(20,43),(57,43),(75,57),(75,76)])
  if role=='redo':c.im=c.im.transpose(Image.Transpose.FLIP_LEFT_RIGHT);c.d=ImageDraw.Draw(c.im)
 elif role in ['zoomplus','zoomminus']:
  c.ellipse((17,17,66,66),outline=I);c.line([(61,61),(83,83)],width=7);c.line([(29,41),(54,41)],width=4)
  if role=='zoomplus':c.line([(41,29),(41,54)],width=4)
 elif role=='people':
  c.ellipse((24,23,45,44),outline=I);c.ellipse((55,23,76,44),outline=I);c.arc((16,49,52,91),180,360);c.arc((48,49,84,91),180,360)
 elif role in ['info','help']:
  if role=='info':c.ellipse((46,23,54,31),fill=I);c.line([(50,43),(50,75)],width=6)
  else:c.arc((32,24,67,54),180,465);c.line([(50,52),(50,64)]);c.ellipse((47,75,53,81),fill=I)
 elif role=='mail':c.rect((20,30,80,73),outline=I,r=6);c.line([(22,33),(50,54),(78,33)],width=4)
 elif role=='upload':c.line([(26,70),(26,81),(76,81),(76,70)]);c.line([(50,67),(50,23)]);c.line([(32,41),(50,23),(68,41)])
 elif role=='globe':c.ellipse((19,19,81,81),outline=I);c.ellipse((35,19,65,81),outline=I,width=3);c.line([(21,50),(79,50)],width=3)
 elif role=='remote':
  c.rect((34,16,66,84),outline=I,r=10);c.ellipse((43,27,57,41),outline=I,width=3)
  for x in [43,57]:
   for y in [53,65,75]:c.ellipse((x-2,y-2,x+2,y+2),fill=I)
 elif role=='clock':c.ellipse((21,21,79,79),outline=I);c.line([(50,31),(50,50),(66,60)]);c.line([(50,21),(50,26)],width=3)
 elif role in ['animation','emptyanimation']:
  c.rect((19,26,81,77),outline=I,r=6);c.line([(23,39),(77,39)],width=3)
  for x in [30,47,64]:c.line([(x,27),(x+9,38)],width=3)
  c.poly([(43,47),(43,67),(62,57)],fill=I)
 elif role in ['layout','framecontrol']:
  c.rect((18,22,82,79),outline=I,r=5);c.line([(50,24),(50,77)],width=3);c.line([(52,50),(80,50)],width=3)
  if role=='framecontrol':c.poly([(52,70),(72,50),(80,58),(60,78)],fill=ACCENT,outline=I,width=2)
 elif role=='empty':
  c.rect((30,19,69,67),fill='#252b36',outline=ACCENT,r=6);c.line([(39,32),(60,32)],ACCENT,3);c.line([(39,43),(57,43)],ACCENT,3);c.poly([(21,59),(35,59),(41,69),(59,69),(65,59),(79,59),(79,83),(21,83)],fill='#252b36',outline=I);c.line([(78,22),(86,14)],ACCENT,3);c.line([(85,33),(94,33)],ACCENT,3)
 elif role in ['import','landscape']:
  c.rect((20,23,80,77),outline=I,r=5);c.ellipse((29,31,39,41),fill=I);c.line([(24,68),(42,48),(53,59),(64,45),(77,59)],width=4)
  if role=='import':c.rect((60,57,88,87),fill='#252b36',r=2);c.line([(74,84),(74,61)],width=4);c.line([(65,70),(74,61),(83,70)],width=4)
 elif role=='keyboard':
  c.rect((14,27,86,75),outline=I,r=7)
  for x in [27,42,57,72]:
   for y in [39,51]:c.rect((x-2,y-2,x+2,y+2),fill=I)
  c.line([(31,64),(69,64)],width=4)
 else:raise ValueError('Unhandled role '+role)

def render(item):
 name=key(item['path']);role=ALIASES[name];w,h=item['size'];c=Canvas(w,h)
 selected=(name.endswith('_selected') and not name.endswith('_unselected')) or name in ['ic_painting_ing','ic_dragging','ic_power_on','ic_switch_on']
 appbadge=('program' in name or name in ['ic_template','ic_dynamic_text'])
 settings=item['path'].startswith('native-coolled-settings/') and role not in ['back','forward','toggleoff','toggleon','check','pagebg']
 tool=item['path'].startswith('native-coolled-draw-assets/') and (w,h)==(96,96)
 colorbadge=name in ['ic_bold_32','ic_color_32','ic_font_type','ic_frame_32','ic_mode_32','ic_moving_internal','ic_rotate_32','ic_text_font_size','ic_text_spacing']
 if role=='pagebg':
  c.d.rectangle((0,0,w*4,h*4),fill='#141721')
  for y in range(h*4):
   t=y/(h*4);c.d.line([(0,y),(w*4,y)],fill=(round(26-8*t),round(25-4*t),round(43-12*t),255))
 elif role in ['toolsbg','listbg','numberbg']:
  bg={'toolsbg':(29,34,43,230),'listbg':(19,23,31,190),'numberbg':(32,38,51,210)}[role]
  c.d.rounded_rectangle((0,0,w*4-1,h*4-1),radius=min(h*2,24),fill=bg,outline=(104,113,137,255),width=4)
 elif role in ['toggleoff','toggleon']:
  # Wide native dimensions retained; thumb and track are separate authored geometry.
  track='#8b72ee' if role=='toggleon' else '#3d4553';c.d.rounded_rectangle((w*.06*4,h*.14*4,w*.94*4,h*.86*4),radius=h*.36*4,fill=track)
  cx=w*.73 if role=='toggleon' else w*.27;rad=h*.29;c.d.ellipse(((cx-rad)*4,(h/2-rad)*4,(cx+rad)*4,(h/2+rad)*4),fill='#f4f7ff')
 else:
  if appbadge:c.rect((5,5,95,95),fill='#293244',r=22);c.line([(18,86),(82,86)],ACCENT,5)
  elif settings or colorbadge:
   colors={'palette':'#9844ac','bold':'#b95439','font':'#a94b76','framecontrol':'#997024','grid':'#057c8c','spacingbars':'#7448af','rotate':'#6052aa','size':'#317d51','spacing':'#316daa'}
   c.ellipse((5,5,95,95),fill=colors.get(role,'#486398'))
  elif tool:c.rect((6,6,94,94),fill='#7159d5' if selected else '#292e38',r=15)
  elif name in ['ic_dialog_confirm','ic_confirm','ic_dialog_cancel']:c.d.rounded_rectangle((3*4,3*4,(w-3)*4,(h-3)*4),radius=12,fill='#7159d5' if role=='check' else '#424a58')
  if selected and not tool:c.ink=ACCENT
  if role=='radio':c.ink=ACCENT if selected else '#8992a6'
  if role=='dot':c.ink=(20,24,31,255)
  glyph(c,role)
  if role=='radio' and selected:c.ellipse((33,33,67,67),fill=ACCENT)
 im=c.finish()
 # Preserve original alpha extrema, without copying its mask or pixels.
 lo,hi=item['alpha_extrema']
 alpha=im.getchannel('A');actual_lo,actual_hi=alpha.getextrema()
 if (actual_lo,actual_hi)!=(lo,hi):
  im.putalpha(alpha.point(lambda a:lo+round((a-actual_lo)*(hi-lo)/max(1,actual_hi-actual_lo))))
 if item['path'].endswith('.jpg'):
  bg=Image.new('RGB',im.size,'#293244');bg.paste(im,mask=im.getchannel('A'));im=bg
 return im,role

def main():
 records=[];excluded=[]
 for item in INVENTORY:
  name=key(item['path'])
  if name in EXCLUDE:excluded.append({**item,'reason':'Complex photo banner: imagegen required, not replaced' if name=='ic_banner_default' else 'Outside slice: emoji/output-category asset'});continue
  im,role=render(item);dest=ROOT/'replacements'/item['path'];dest.parent.mkdir(parents=True,exist_ok=True)
  im.save(dest,**({'quality':95,'subsampling':0} if dest.suffix=='.jpg' else {}))
  records.append({**item,'role':role,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'origin':'Independently authored procedural geometry in generate.py; no raster inputs'})
 (ROOT/'replacement-manifest.json').write_text(json.dumps(records,indent=2)+'\n');(ROOT/'excluded.json').write_text(json.dumps(excluded,indent=2)+'\n')
 sheet=Image.new('RGB',(1280,math.ceil(len(records)/8)*112),'#202631');d=ImageDraw.Draw(sheet)
 for i,item in enumerate(records):
  im=Image.open(ROOT/'replacements'/item['path']).convert('RGBA');im.thumbnail((126,70));x=i%8*160;y=i//8*112;sheet.paste(im,(x+(160-im.width)//2,y),im);name=key(item['path']);d.text((x+2,y+73),f'{i} {name[:22]}',fill='white');d.text((x+2,y+87),name[22:44],fill='white')
 sheet.save(ROOT/'replacement-contact-sheet.png')
 print(json.dumps({'replacements':len(records),'roles':len(set(r['role'] for r in records)),'excluded':len(excluded)}))
if __name__=='__main__':main()
