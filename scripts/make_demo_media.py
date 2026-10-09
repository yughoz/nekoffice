"""Build local media fixtures; this is not the production video worker.

Uses the generated office art, deterministic title cards, and local Indonesian
narration. Image generation itself belongs to the user-selected Bumi adapter.
"""
import base64
import io
import json
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
assets = root / 'public/assets'
source = Image.open(assets / 'office.png').convert('RGB')
font = '/System/Library/Fonts/Supplemental/Arial.ttf'
bold = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
slides = root / 'assets/generated/demo-slides'
slides.mkdir(parents=True, exist_ok=True)
chapters = [
    ('01', ['Meja yang rapi.', 'Pikiran yang jernih.'], 'Mulai dari satu hal kecil.', (80, 35, 695, 465)),
    ('02', ['Satu pekerjaan.', 'Sepuluh menit.'], 'Tutup tab yang tidak kamu pakai.', (835, 35, 1490, 465)),
    ('03', ['Jeda sebentar.', 'Lanjut lebih tenang.'], 'Beri ruang sebelum sesi berikutnya.', (60, 585, 680, 985)),
    ('04', ['Kebiasaan kecil.', 'Lebih fokus.'], 'Mulai hari ini, dari satu hal yang penting.', (840, 590, 1490, 980)),
]
for number, lines, caption, crop in chapters:
    slide = Image.new('RGB', (1280, 720), '#edf0df')
    draw = ImageDraw.Draw(slide)
    for x in range(0, 1280, 24): draw.line((x, 0, x, 720), fill='#e4e9d5')
    for y in range(0, 720, 24): draw.line((0, y, 1280, y), fill='#e4e9d5')
    draw.rounded_rectangle((68, 60, 269, 95), radius=8, fill='#dce5c1')
    draw.text((83, 70), 'LITTLE OFFICE  /  DEMO', fill='#819665', font=ImageFont.truetype(bold, 13))
    draw.text((66, 164), number, fill='#9cb47a', font=ImageFont.truetype(bold, 93))
    for index, line in enumerate(lines): draw.text((69, 308+index*72), line, fill='#405436', font=ImageFont.truetype(bold, 45))
    draw.rounded_rectangle((74, 482, 206, 489), radius=3, fill='#c0ce9d')
    draw.text((74, 539), caption, fill='#8c9a7b', font=ImageFont.truetype(font, 20))
    photo = source.crop(crop)
    ratio = max(474/photo.width, 518/photo.height)
    photo = photo.resize((int(photo.width*ratio), int(photo.height*ratio)), Image.Resampling.NEAREST)
    left=(photo.width-474)//2;top=(photo.height-518)//2
    photo=photo.crop((left,top,left+474,top+518))
    mask=Image.new('L',photo.size,0);ImageDraw.Draw(mask).rounded_rectangle((0,0,473,517),radius=20,fill=255)
    slide.paste(photo,(726,89),mask)
    draw.rounded_rectangle((900,559,1175,592),radius=16,fill='#fafbea')
    draw.text((926,570),'COZY WORKSPACE',fill='#8a9b73',font=ImageFont.truetype(bold,13))
    draw.text((74,661),'Contoh media lokal · bukan hasil run agent nyata',fill='#a2ad92',font=ImageFont.truetype(font,15))
    slide.save(slides / f'{number}.png')

# SVG used as an <img> cannot load external bitmap references; embed this one.
thumb = assets / 'demo-thumbnail.svg'
svg = thumb.read_text()
if 'href="office.png"' in svg:
    preview = source.resize((768,512), Image.Resampling.NEAREST)
    buffer = io.BytesIO(); preview.save(buffer, format='PNG', optimize=True)
    svg = svg.replace('href="office.png"', 'href="data:image/png;base64,'+base64.b64encode(buffer.getvalue()).decode()+'"')
    thumb.write_text(svg)

ffmpeg='/opt/homebrew/bin/ffmpeg'
for number, *_ in chapters:
    subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-loop','1','-i',str(slides/f'{number}.png'),'-t','5.2','-vf','scale=1920:1080:flags=neighbor,fade=t=in:st=0:d=0.2,fade=t=out:st=4.95:d=0.25','-r','24','-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p',str(slides/f'{number}.mp4')],check=True)
concat=slides/'concat.txt'
concat.write_text('\n'.join(f"file '{number}.mp4'" for number,*_ in chapters))
subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(concat),'-i',str(assets/'demo-narration.wav'),'-c:v','copy','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',str(assets/'demo-video.mp4')],check=True)
print(json.dumps({'status':'saved','video':str(assets/'demo-video.mp4'),'fixture':True}))
