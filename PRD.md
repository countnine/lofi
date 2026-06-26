# Lofi 제품 요구사항 정의서 (PRD)

| 항목 | 내용 |
| --- | --- |
| 제품명 | Lofi — 미니 Spotify 플레이어 |
| 버전 | 2.0.2 |
| 플랫폼 | Windows / macOS / Linux (데스크톱) |
| 기술 스택 | Electron, React, TypeScript, WebGL, C++ N-API 네이티브 애드온 |
| 라이선스 | MIT |
| 작성일 | 2026-06-26 |

---

## 1. 개요

Lofi는 Spotify 데스크톱 앱과 **함께 동작하는** 작은 데스크톱 위젯형 플레이어입니다. 자체적으로 음악을 재생하지 않으며, Spotify Web API를 통해 재생을 제어하고 현재 재생 중인 곡 정보를 읽어옵니다. 앨범 아트를 작은 1:1 항상-위에-표시(always-on-top) 창에 보여주고, 선택적으로 WebGL 기반 오디오 시각화를 렌더링합니다.

핵심 컨셉은 "Spotify 미니 모드" — 풀 데스크톱 앱을 대체하는 것이 아니라, 자주 쓰는 기능에 더 직관적이고 보기 좋은 접근 경험을 제공하는 보조 위젯입니다.

## 2. 목표 및 비목표

### 2.1 제품 목표
- 항상 화면 위에 떠 있는 작고 미니멀한 앨범 아트 위젯 제공
- 데스크톱 앱을 전환하지 않고 자주 쓰는 재생 컨트롤(재생/일시정지, 곡 이동, 좋아요)에 접근
- 시각적으로 매력적인 WebGL 오디오 시각화 제공
- 멀티 모니터 환경 지원
- Windows/macOS/Linux 크로스 플랫폼 지원
- 가벼운 리소스 사용량 (목표: 메모리 ≤ 100MB)

### 2.2 비목표 (Non-Goals)
- 독립적인 음악 재생 엔진 — Spotify 데스크톱 앱이 실제 재생을 담당
- 음악 라이브러리/플레이리스트 관리 등 Spotify 풀 클라이언트 기능
- 무료(Free) 계정에 대한 재생 제어 (Spotify API 정책상 Premium 전용)

## 3. 대상 사용자

- Spotify Premium 사용자로, 작업 중 백그라운드에서 음악을 즐기는 사람
- 데스크톱 앱 전체 창을 띄우지 않고 "지금 무슨 곡인지" + 간단한 컨트롤만 원하는 사람
- 시각화/앨범 아트를 데스크톱 위젯처럼 두고 싶은 사용자

## 4. 핵심 기능 요구사항

### 4.1 인증 (로그인)
- **OAuth 2.0 PKCE 플로우**로 Spotify 계정 로그인
- 인증 시 로컬 HTTP 서버(포트 `41419`)가 리디렉션을 수신
- 인증 URL은 외부 기본 브라우저에서 열림
- 액세스 토큰은 만료 시간의 절반 시점에 **자동 갱신**
- `rememberLogin` 설정 시 토큰을 디스크에 보존하여 재시작 시 자동 로그인
- 사용자가 **자신의 Spotify Client ID**를 지정 가능 (기본 공유 clientId 대체)
- 로그아웃 기능 제공 (설정 창)

요구 스코프: `user-read-playback-state`, `user-modify-playback-state`, `user-read-currently-playing`, `user-read-private`, `user-library-read`, `user-library-modify`, `user-read-email`

### 4.2 현재 재생 정보 표시
- 현재 재생 중인 곡의 앨범 아트를 1:1 커버로 표시
- 곡 진행 상태(progress bar) 표시 (옵션)
- 트랙 정보(곡명/아티스트) 표시
  - 항상 표시 / 트랙 변경 시 일시 표시(초 단위 지정) / 숨김 선택 가능
- 곡 정보 새로고침 주기 설정 가능

### 4.3 재생 컨트롤 (Premium 전용)
- 재생 / 일시정지 토글
- 이전 곡 / 다음 곡 스킵
- `Ctrl`/`Cmd` + 스킵 시 곡 내 구간 이동(앞/뒤로 N초, 지정 가능)
- 현재 곡 좋아요 / 좋아요 취소 (라이브러리 추가/제거)
- 볼륨 조절 (증감 단위 설정 가능)
- **무료 계정**: 재생 컨트롤 비활성화 + 경고 메시지 표시(끌 수 있음)

### 4.4 시각화 (Visualization)
- WebGL 프래그먼트 셰이더 기반 시각화 4종: Blue Wave, Rainbow Road, String Theory, Seascape
- 시각화 표시 모드 3단계 순환: **None → Small(커버 내) → Big(전체화면 창)**
- 시각화 종류 순환(이전/다음) 선택
- 전체화면 시각화를 표시할 모니터 선택 (멀티 모니터)
- 시각화 투명도(opacity) 조절
- 오디오 레벨은 네이티브 **volume** 모듈로 캡처하여 시각화 구동

### 4.5 창(Window) 관리
- 프레임 없는(frameless) 1:1 창, 드래그로 이동
- 크기 조절 가능 (최소 115px ~ 최대 1440px, 정사각형 유지)
- 항상 위에 표시(always-on-top) on/off
- 작업 표시줄 노출 여부 설정
- 모서리 둥글기(corner radius) 조절
- 위치/크기를 저장하고 재시작 시 복원, 화면 밖이면 중앙 정렬
- 시스템 트레이 아이콘 + 컨텍스트 메뉴(Settings / About / Exit), 좋아요 시 트레이 아이콘 변경

### 4.6 설정 (Settings)
탭 구성: **Window / Track Info / Visualization / Audio / Advanced**
- 모든 설정은 디스크에 영속화되며 앱 재시작 시 유지
- 설정 초기화(Reset) 기능 (로그인 토큰은 보존)
- 폰트, 바 색상/두께, 트랙 정보 색상/배경/투명도/폰트 크기 등 외형 커스터마이즈
- 하드웨어 가속 사용 여부, 디버그 모드 등 고급 옵션

### 4.7 멀티 윈도우
- 메인 창 외 자식 창: Settings, About, Track Info, Fullscreen Visualizer

## 5. 비기능 요구사항

| 구분 | 요구사항 |
| --- | --- |
| 성능 | 메모리 사용량 ≤ 100MB 목표 |
| 호환성 | Windows, macOS, Linux 지원 |
| 화면 | 멀티 모니터 환경에서 정상 동작 |
| 신뢰성 | API 호출 401(토큰 갱신)·429(rate limit throttle) 자동 처리 |
| 보안 | OAuth PKCE 사용(클라이언트 시크릿 없음), 토큰은 로컬 저장소에만 보관 |
| 단일 인스턴스 | 앱 중복 실행 방지(single instance lock) |

## 6. 기술 아키텍처 (요약)

- **Electron 메인 프로세스** (`src/main/`): 창/트레이 관리, IPC, OAuth 서버
- **렌더러 프로세스** (`src/renderer/`): React UI, Spotify Web API 클라이언트
  - `nodeIntegration: true`, `contextIsolation: false` — 렌더러가 메인 모듈을 직접 import
- **상태 관리**: `Settings` 객체가 중심 상태. electron-store로 영속화, zod로 검증, React reducer로 관리
- **IPC**: `IpcMessage` enum으로 채널 정의 (창 이동/크기, 트레이, 외부 링크 등)
- **네이티브 애드온** (`src/native/`, C++ N-API): `black-magic`(저수준 창 관리), `volume`(오디오 캡처)
- **시각화** (`src/visualizations/`): WebGL 셰이더
- 버전 변경 시 설정 스토어 초기화(로그인 정보는 `rememberLogin` 시 보존)

자세한 개발/빌드 안내는 [`CLAUDE.md`](./CLAUDE.md) 참고.

## 7. 제약사항 및 의존성

- **Spotify 데스크톱 앱이 반드시 함께 실행**되어야 재생 제어 가능 (Lofi는 재생 디바이스가 아님)
- **Spotify Premium** 계정 필요 (재생 제어 기능)
- Spotify Web API 가용성 및 rate limit에 종속
- 네이티브 모듈 빌드를 위해 node-gyp 툴체인(Python + OS SDK / Build Tools) 필요

## 8. 향후 고려사항 (Open Questions)

- 추가 시각화 셰이더 확장
- 전역 단축키(global hotkey) 지원 여부
- 가사(lyrics) 표시 기능 검토
- 테스트 스위트 부재 — 자동화 테스트 도입 검토
