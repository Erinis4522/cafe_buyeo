"""Compose saved cafe assets with ComfyUI nodes; does not redraw assets."""
import time
import shutil
import sys
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_comfy import api, save_json, make_ui, node, ROOT, COMFY


class Scene:
    def __init__(self):
        self.graph = {}

    def add(self, kind, **inputs):
        key = str(len(self.graph) + 1)
        self.graph[key] = node(kind, **inputs)
        return key

    def load(self, relative):
        source = ROOT / relative
        staged = COMFY / 'input' / 'cafe_buyeo_preview' / source.name
        staged.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, staged)
        key = self.add('LoadImage', image='cafe_buyeo_preview/' + source.name)
        return key

    def layer(self, destination, relative, x, y, max_width, max_height):
        source_file = ROOT / relative
        with Image.open(source_file) as im:
            if 'A' in im.getbands():
                box = im.getchannel('A').point(lambda v: 255 if v > 64 else 0).getbbox()
            else:
                box = (0, 0, im.width, im.height)
        if not box:
            raise ValueError('Empty layer ' + relative)
        left, top, right, bottom = box
        width, height = right - left, bottom - top
        ratio = min(max_width / width, max_height / height)
        tw, th = round(width * ratio), round(height * ratio)
        source = self.load(relative)
        rgb_crop = self.add('ImageCrop', image=[source, 0], x=left, y=top, width=width, height=height)
        rgb = self.add('ImageScale', image=[rgb_crop, 0], width=tw, height=th, upscale_method='lanczos', crop='disabled')
        mask = self.add('InvertMask', mask=[source, 1])
        mask_image = self.add('MaskToImage', mask=[mask, 0])
        mask_crop = self.add('ImageCrop', image=[mask_image, 0], x=left, y=top, width=width, height=height)
        mask_scale = self.add('ImageScale', image=[mask_crop, 0], width=tw, height=th, upscale_method='lanczos', crop='disabled')
        final_mask = self.add('ImageToMask', image=[mask_scale, 0], channel='red')
        dest = self.add('ImageCompositeMasked', destination=[destination, 0], source=[rgb, 0],
                        x=x + (max_width - tw)//2, y=y + (max_height - th)//2,
                        resize_source=False, mask=[final_mask, 0])
        return dest

    def render(self, last, name):
        save_id = self.add('SaveImage', images=[last, 0], filename_prefix='cafe_buyeo/previews/' + name)
        ui = make_ui(self.graph, api('/object_info'))
        for i, n in enumerate(ui['nodes']):
            n['pos'] = [(i % 8) * 360, (i // 8) * 430]
        save_json(ROOT / 'workflows' / (name + '.api.json'), self.graph)
        save_json(ROOT / 'workflows' / (name + '.workflow.json'), ui)
        result = api('/prompt', {'prompt': self.graph, 'extra_data': {'extra_pnginfo': {'workflow': ui}}})
        pid = result['prompt_id']
        deadline = time.monotonic() + 300
        while time.monotonic() < deadline:
            result = api('/history/' + pid).get(pid)
            if result:
                if result.get('status', {}).get('status_str') == 'error':
                    raise RuntimeError(result['status'])
                for item in result.get('outputs', {}).get(save_id, {}).get('images', []):
                    source = COMFY / item['type'] / item.get('subfolder', '') / item['filename']
                    dest = ROOT / 'previews' / (name + '.png')
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source, dest)
                    print('SAVED ' + str(dest), flush=True)
                    return
            time.sleep(2)
        raise TimeoutError(pid)


def main():
    s = Scene()
    base = s.load('backgrounds/counter_v01.png')
    base = s.layer(base, 'characters/luka_neutral.png', 433, 44, 478, 698)
    base = s.layer(base, 'props/counter_front_v03.png', 0, 556, 1344, 366)
    s.render(base, 'counter_scene')

    s = Scene()
    base = s.load('backgrounds/workbench_v05.png')
    base = s.layer(base, 'props/cup_empty_v04.png', 510, 280, 320, 330)
    for relative, x in [('espresso_v02.png', 110), ('milk_v02.png', 320), ('syrup_v02.png', 830), ('chocolate_v02.png', 1050)]:
        base = s.layer(base, 'ingredients/' + relative, x, 480, 160, 210)
    s.render(base, 'workbench_scene')

    s = Scene()
    base = s.load('backgrounds/art_station_v03.png')
    base = s.layer(base, 'props/cup_foam_top_v02.png', 370, 96, 604, 580)
    s.render(base, 'latte_art_scene')

    s = Scene()
    base = s.add('EmptyImage', width=1600, height=1200, batch_size=1, color=0xE9E0D1)
    ids = ['luka', 'bruno', 'cain', 'noel', 'cherry', 'owen', 'mina', 'rio']
    for index, name in enumerate(ids):
        base = s.layer(base, 'characters/' + name + '_neutral.png',
                       (index % 4)*400+15, (index//4)*600+20, 370, 560)
    s.render(base, 'characters_overview')


if __name__ == '__main__':
    main()
