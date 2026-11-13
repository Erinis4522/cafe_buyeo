"""Index inspected outputs and archive unused candidates without deleting them."""
import hashlib
import html
import json
from pathlib import Path
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CHARACTERS = [('luka', '루카'), ('bruno', '브루노'), ('cain', '케인'), ('noel', '노엘'),
              ('cherry', '체리'), ('owen', '오웬'), ('mina', '미나'), ('rio', '리오')]
EXPRESSIONS = [('neutral', '기본'), ('delight', '기쁨'), ('sad', '슬픔')]
SELECTED = [
    ('backgrounds/counter_v01.png', '카운터 실내', '배경', 'counter_v01'),
    ('backgrounds/workbench_v05.png', '음료 제조대', '배경', 'workbench_v05'),
    ('backgrounds/art_station_v03.png', '라떼 아트 작업대', '배경', 'art_station_v03'),
    ('props/counter_front_v03.png', '카운터 전경', '소품', 'counter_front_v03'),
    ('props/cup_empty_v04.png', '빈 컵', '소품', 'cup_empty_v04'),
    ('props/cup_foam_top_v02.png', '라떼 아트용 컵 윗면', '소품', 'cup_foam_top_v02'),
    ('ingredients/espresso_v02.png', '에스프레소', '재료', 'ingredient_espresso_v02'),
    ('ingredients/milk_v02.png', '우유', '재료', 'ingredient_milk_v02'),
    ('ingredients/syrup_v02.png', '시럽', '재료', 'ingredient_syrup_v02'),
    ('ingredients/chocolate_v02.png', '초콜릿 소스', '재료', 'ingredient_chocolate_v02'),
    ('ingredients/caramel_v01.png', '캐러멜 소스', '재료', 'ingredient_caramel_v01'),
    ('ingredients/hazelnut_v01.png', '헤이즐넛 시럽', '재료', 'ingredient_hazelnut_v01'),
    ('ingredients/strawberry_v01.png', '딸기 청', '재료', 'ingredient_strawberry_v01'),
    ('ingredients/matcha_v01.png', '녹차 가루', '재료', 'ingredient_matcha_v01'),
    ('ingredients/cinnamon_v01.png', '시나몬 가루', '재료', 'ingredient_cinnamon_v01'),
    ('ingredients/honey_v01.png', '꿀', '재료', 'ingredient_honey_v01'),
] + [('characters/' + name + '_' + expression + '.png', label + ' · ' + emotion, '인물', name + '_' + expression + '_cutout')
     for name, label in CHARACTERS for expression, emotion in EXPRESSIONS]


def info(relative, label, category, asset_id):
    path = ROOT / relative
    with Image.open(path) as im:
        im.load()
        alpha = im.getchannel('A') if 'A' in im.getbands() else None
        metadata = {'width': im.width, 'height': im.height, 'mode': im.mode,
                    'has_transparency': alpha is not None and alpha.getextrema()[0] < 255}
    if category != '배경' and not metadata['has_transparency']:
        raise ValueError('Missing transparency: ' + relative)
    record_path = ROOT / 'workflows' / (asset_id + '.record.json')
    record = json.loads(record_path.read_text(encoding='utf-8'))
    record['review_status'] = 'selected_first_draft'
    record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
    return {'path': relative, 'name': label, 'category': category, **metadata,
            'origin': 'existing_portrait_background_removed' if category == '인물' else 'generated_with_comfyui',
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'workflow': 'workflows/' + asset_id + '.workflow.json',
            'record': 'workflows/' + asset_id + '.record.json'}


def card(item):
    path, title = html.escape(item['path']), html.escape(item['name'])
    return f'<figure><a class="tile" href="{path}" target="_blank"><img src="{path}" alt="{title}" loading="lazy"></a><figcaption><b>{title}</b><small>{item["width"]} × {item["height"]} · {"투명 PNG" if item["has_transparency"] else "PNG"}</small></figcaption></figure>'


def main():
    chosen = {x[0] for x in SELECTED}
    for folder in ('backgrounds', 'props', 'ingredients'):
        for path in (ROOT / folder).glob('*.png'):
            relative = path.relative_to(ROOT).as_posix()
            if relative in chosen:
                continue
            dest = ROOT / 'drafts' / folder / path.name
            if not path.resolve().is_relative_to(ROOT.resolve()) or not dest.resolve().is_relative_to(ROOT.resolve()):
                raise ValueError('Archive path outside art folder')
            dest.parent.mkdir(parents=True, exist_ok=True)
            if dest.exists():
                raise FileExistsError(dest)
            shutil.move(str(path), str(dest))
            for record_path in (ROOT / 'workflows').glob('*.record.json'):
                record = json.loads(record_path.read_text(encoding='utf-8'))
                if record.get('output') == str(path):
                    record.update(output=str(dest), review_status='unused_candidate')
                    record_path.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')
    assets = [info(*entry) for entry in SELECTED]
    manifest = {'project': 'cafe_buyeo', 'stage': 'ingredients_completed', 'date': '2026-11-13',
                'generator': 'local ComfyUI at 127.0.0.1:8188', 'asset_count': len(assets),
                'new_generated_designs': 16, 'processed_existing_portraits': 24, 'assets': assets}
    for asset in assets:
        if asset['path'].startswith('ingredients/'):
            key = Path(asset['path']).stem.rsplit('_v', 1)[0]
            ready = 'ingredients/game_ready/' + key + '.png'
            if (ROOT / ready).exists():
                asset['game_ready'] = ready
                asset['game_path'] = '../game/assets/ing/' + key + '.png'
    (ROOT / 'assets.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    preview_titles = [('counter_scene', '카운터 배치'), ('workbench_scene', '음료 제조 배치'),
                      ('latte_art_scene', '라떼 아트 배치'), ('characters_overview', '알바생 후보 8명'),
                      ('new_ingredients_overview', '추가 재료 6종: 캐러멜 · 헤이즐넛 · 딸기 / 녹차 · 시나몬 · 꿀')]
    previews = ''.join(f'<figure><a href="previews/{key}.png" target="_blank"><img class="scene" src="previews/{key}.png" alt="{title}"></a><figcaption><b>{title}</b></figcaption></figure>' for key, title in preview_titles)
    sections = ''.join(f'<section id="{key}"><h2>{title}</h2><div class="grid {key}">{"".join(card(a) for a in assets if a["category"] in categories)}</div></section>'
                       for key, title, categories in [('backgrounds', '배경 3종', ['배경']),
                                                       ('objects', '컵과 카운터 · 재료', ['소품', '재료']),
                                                       ('characters', '기존 캐릭터 8명 × 3표정', ['인물'])])
    page = '''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>cafe_buyeo 아트 미리보기</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5efe5;color:#3b2c24;font:16px/1.65 "Segoe UI","Malgun Gothic",sans-serif}main{max-width:1280px;margin:auto;padding:40px 28px 80px}h1{font-size:34px;margin:4px 0 12px}h2{font-size:24px;margin:44px 0 18px}p{max-width:850px;color:#746252}nav{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0 32px}nav a{background:#fff9ef;border:1px solid #d8c4a7;border-radius:24px;padding:8px 18px;text-decoration:none;color:inherit}figure{margin:0;background:#fffaf1;border:1px solid #e3d4be;border-radius:14px;overflow:hidden}figure a{display:block}img{display:block;width:100%}.scene{height:auto}figcaption{padding:14px 18px}small{display:block;color:#8b7765;font-size:12px;margin-top:5px}.scenes{display:grid;grid-template-columns:1fr 1fr;gap:20px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.backgrounds{grid-template-columns:repeat(3,1fr)}.tile{aspect-ratio:1;background-color:#eee6d8;background-image:linear-gradient(45deg,#e2d8c6 25%,transparent 25%),linear-gradient(-45deg,#e2d8c6 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2d8c6 75%),linear-gradient(-45deg,transparent 75%,#e2d8c6 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}.tile img{height:100%;object-fit:contain}.backgrounds .tile{aspect-ratio:1.75}.characters .tile{aspect-ratio:0.75}footer{margin-top:42px;border-top:1px solid #d8c4a7;padding-top:20px;color:#8b7765}a{color:#8c4f31}@media(max-width:800px){.scenes,.backgrounds{grid-template-columns:1fr}.grid{grid-template-columns:repeat(2,1fr)}main{padding:24px 16px}}
</style><main><small>CAFE BUYEO · ART DRAFT 01 · 2026.11.13</small><h1>카페에서 함께 일할 준비</h1>
<p>ComfyUI로 만든 배경·소품·재료 16종과 기존 원화의 배경을 제거한 캐릭터 24장입니다. 추가 재료 6종은 게임용 투명 PNG로도 저장했습니다. 아래 배치 그림은 개별 에셋을 겹쳐 본 시안입니다. 그림을 누르면 원본 크기로 볼 수 있습니다.</p>
<nav><a href="#scenes">화면 배치</a><a href="#backgrounds">배경</a><a href="#objects">컵과 재료</a><a href="#characters">캐릭터</a><a href="README.md">파일 안내</a></nav>
<section id="scenes"><h2>화면에 배치해 보기</h2><div class="scenes">''' + previews + '</div></section>' + sections + '''
<footer>선별한 에셋은 backgrounds · props · ingredients · characters에 있습니다. 재료는 총 10종이며, 추가 6종의 게임용 파일은 ingredients/game_ready에 있습니다. 프롬프트와 ComfyUI 워크플로는 workflows, 생성 원본은 sources, 채택하지 않은 후보는 drafts에 보관했습니다.</footer></main></html>'''
    (ROOT / '미리보기.html').write_text(page, encoding='utf-8')
    print(json.dumps({'selected_assets': len(assets), 'transparent_assets': sum(a['has_transparency'] for a in assets),
                      'gallery': str(ROOT / '미리보기.html')}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
