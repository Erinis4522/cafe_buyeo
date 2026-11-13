# cafe buyeo 아트

2026년 11월 13일, 실행 중인 로컬 ComfyUI로 만든 아트다. 새 배경·소품·재료 16종, 기존 캐릭터 원화 24장의 투명 배경 가공본을 포함한다. `미리보기.html`을 열면 화면 배치와 개별 그림을 함께 볼 수 있다.

## 파일 구성

| 폴더 또는 파일 | 내용 |
| --- | --- |
| `backgrounds` | 카운터 실내, 음료 제조대, 라떼 아트 작업대의 배경 3장 |
| `props` | 카운터 전경, 빈 컵, 아트 작업용 컵 윗면의 투명 PNG 3장 |
| `ingredients` | 에스프레소, 우유, 바닐라 시럽, 초콜릿 소스 및 추가 재료 6종의 투명 PNG 10장 |
| `ingredients/game_ready` | 추가 재료 6종의 여백을 자른 게임용 투명 PNG, 긴 변 300px |
| `characters` | 기존 인물 8명 × 기본·기쁨·슬픔 3표정의 투명 PNG 24장 |
| `previews` | 카운터·제조·아트 작업 화면의 배치 예시와 인물 8명 모음 |
| `workflows` | 전체 프롬프트, 시드, 모델, 실행 기록, ComfyUI 워크플로 |
| `sources` | 새로 생성한 소품의 배경 제거 전 원본 |
| `drafts` | 선별 과정에서 채택하지 않은 후보와 가공 전 비교본 |
| `assets.json` | 선별 에셋의 경로, 크기, 투명도 여부, 해시, 워크플로 경로 |

## 선별한 배경과 소품

- 카운터 실내: `backgrounds/counter_v01.png`
- 제조대: `backgrounds/workbench_v05.png`
- 아트 작업대: `backgrounds/art_station_v03.png`
- 카운터 전경: `props/counter_front_v03.png`
- 빈 컵: `props/cup_empty_v04.png`
- 컵 윗면: `props/cup_foam_top_v02.png`
- 기존 재료: `ingredients` 안의 `v02` 파일 4종
- 추가 재료: `caramel_v01.png`, `hazelnut_v01.png`, `strawberry_v01.png`, `matcha_v01.png`, `cinnamon_v01.png`, `honey_v01.png`

배경은 1344 × 768 픽셀이다. 컵과 재료는 1024 × 1024 픽셀 안에 여백을 두었고, 카운터 전경은 1344 × 512 픽셀이다. 인물은 원화 크기를 유지했다. 화면 배치 예시는 투명 배경과 크기 조합을 확인하기 위한 그림이다.

## 제작 방식

실행 도구는 `http://127.0.0.1:8188`의 로컬 ComfyUI다. 선별한 카운터 실내에는 설치된 `waiIllustriousSDXL_v170.safetensors`, 그 외 새 에셋에는 `anima-base-v1.0.safetensors`를 사용했다. Anima는 로컬 `qwen_3_06b_base.safetensors` 텍스트 인코더와 `qwen_image_vae.safetensors`를 연결했다.

캐릭터는 기존 마을게임 원화를 다시 그리지 않고 BEN2 배경 제거 노드로 가공했다. 가장자리에 남는 옅은 배경을 줄이는 마스크 보정도 적용했다. 빈 컵은 내부의 흰 바닥까지 투명해지는 문제를 마스크 보정으로 수정했다. 모든 합성 미리보기도 ComfyUI 노드로 만들었다.

기존 캐릭터 원본 위치는 `C:\Users\ksb\Desktop\school-main\village_game\village_sim\assets\characters`이다. 이 폴더의 원본은 변경하지 않았다.

## 다시 생성하거나 수정하기

`workflows`의 `*.workflow.json` 파일은 ComfyUI에서 열어 노드를 수정할 수 있는 형식이다. `*.api.json`은 API 실행용 그래프이며, `*.record.json`에는 실행 ID와 실제 생성 설정이 있다. 최종 프롬프트 전문은 각 그래프의 텍스트 입력과 `specs_*.json`에 저장했다.

선별 파일과 워크플로의 대응은 `assets.json`에서 확인한다. 빈 컵은 `cup_empty_v03`이 생성 단계이고 `cup_empty_v04`가 최종 투명도 보정 단계다. 캐릭터의 워크플로 이름은 `캐릭터ID_표정_cutout` 형식이다.

반복 생성용 `generate_comfy.py`는 지정한 사양 파일을 읽어 로컬 ComfyUI에 작업을 제출하고 결과를 이 `art` 폴더로 복사한다. 이미 같은 출력 파일이 있으면 건너뛴다. 새 버전은 새 ID와 파일명으로 추가하면 된다. ComfyUI의 원래 출력 폴더에도 생성 결과가 남아 있다.

## 추가 재료 6종

수정된 게임에서 비어 있던 캐러멜 소스, 헤이즐넛 시럽, 딸기 청, 녹차 가루, 시나몬 가루, 꿀을 추가했다. 모두 Anima 모델과 BEN2 배경 제거를 사용했으며, 생성 설정은 `workflows/specs_missing_ingredients.json`에 있다.

`workflows/prepare_missing_ingredients.py`가 ComfyUI 노드로 여백을 자르고 긴 변을 300px로 맞춘다. 결과는 `ingredients/game_ready`에 보관하고 동일한 파일을 `../game/assets/ing`에 복사했다. 게임 코드의 기존 파일명과 일치하므로 코드 수정 없이 불러온다. `previews/new_ingredients_overview.png`는 투명 배경을 확인하기 위한 6종 모음이다.

## 다음 아트 작업에서 정할 것

현재 그림은 화풍과 화면 구도를 보기 위한 시안이다. 게임에 등록된 재료 10종의 그림을 갖췄으며, 음료별 중간 상태와 붓기 애니메이션은 아직 만들지 않았다. 제조용 컵과 윗면 컵의 비율·손잡이 위치는 실제 화면 전환에 맞춰 다듬을 수 있다.

추가 고민 표정, 앞치마 복장, 라떼 아트 템플릿, 시작 화면 제목과 버튼, 게임용 대화 UI는 다음 범위다. 최종 화면 해상도를 정하면 그에 맞춰 에셋의 크기와 선 굵기를 조정한다.
