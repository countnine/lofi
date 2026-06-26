# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Lofi는 Electron + React + TypeScript로 만든 미니 Spotify 플레이어입니다. 자체적으로 음악을 재생하지 **않으며**, Spotify 데스크톱 앱과 함께 동작합니다. Spotify Web API를 통해 재생을 제어하고 "현재 재생 중" 상태를 읽어와, 앨범 아트를 작은 1:1 항상 위에 표시(always-on-top) 창에 보여주고 선택적으로 WebGL 시각화를 렌더링합니다.

## 명령어

**yarn**을 사용합니다(`yarn.lock`이 커밋되어 있음). 개발 시에는 두 개의 터미널을 동시에 실행해야 합니다:

```bash
yarn run development   # webpack --watch, 변경 시 pack/ 재빌드 (터미널 1)
yarn run start         # electron ./pack/main.bundle.js (터미널 2)
```

- `yarn install`은 `install` 스크립트를 통해 네이티브 빌드를 수행합니다(`node-gyp rebuild`로 Electron 헤더에 맞춰 빌드 + `genversion`으로 `version.generated.ts` 재생성). 이 과정에서 C++ 네이티브 애드온을 컴파일하며 node-gyp 툴체인(Python + OS SDK / Build Tools)이 필요합니다. `src/native/` 또는 `binding.gyp`를 수정한 뒤에는 `yarn run build`를 다시 실행하세요.
- `yarn run lint` / `yarn run lint:fix` — `.ts,.tsx`에 대해 `--max-warnings=0` 옵션으로 ESLint 실행. husky pre-commit 훅이 lint를 실행합니다.
- `yarn run production` — `pack/`에 일회성 프로덕션 webpack 빌드.
- `yarn run dist` — 전체 빌드 + `electron-builder` 설치 파일을 `dist/`에 생성. `yarn run pack`은 동일하지만 `--dir`(압축 해제 형태).

**테스트 스위트는 없습니다.**

## 아키텍처

### 두 개의 프로세스, 그러나 경계가 유독 얇음

`BrowserWindow`는 `nodeIntegration: true`, `contextIsolation: false`로 생성됩니다(`src/main/main.ts`). 이로 인해 다음 사항을 유의해야 합니다:

- **렌더러가 메인 프로세스 모듈을 직접 import**합니다. 예를 들어 `src/renderer/app/index.tsx`와 `src/renderer/api/spotify-api.ts`는 `src/main/auth.ts`에서 `refreshAccessToken` / `AuthData`를 import하며, 두 프로세스 모두 `electron-store`를 직접 생성합니다. `auth.ts`는 "메인 전용" 모듈이 아니며, 거기서 export된 함수들은 렌더러에서도 실행됩니다.
- IPC(`ipcRenderer` / `ipcMain`)는 메인 프로세스만 할 수 있는 작업에만 사용됩니다: 프레임 없는 창의 이동/크기 조절, 트레이, 자식 창 열기, 외부 링크 등. 모든 IPC 채널 이름은 `src/constants.ts`의 `IpcMessage` enum에 정의되어 있습니다. 새 채널을 추가할 때는 반드시 여기에 추가하고, 절대 raw 문자열을 쓰지 마세요.

### 설정(Settings)이 중심 상태이며, 영속화 및 공유됨

`Settings`(형태)와 `DEFAULT_SETTINGS`는 `src/models/settings.ts`에 있습니다. 동일한 설정 객체가 다음과 같이 사용됩니다:

- **electron-store**에 의해 `settings` 키 아래 디스크에 영속화 — *양쪽* 프로세스 모두에서;
- 메인 프로세스에서 시작 시 **zod** 스키마(`main.utils.ts`의 `settingsSchema`)로 검증 — 잘못된 설정은 `DEFAULT_SETTINGS`로 폴백;
- 렌더러에서는 reducer를 사용하는 `SettingsProvider`(`src/renderer/contexts/settings.context.tsx`)가 보관하며, 모든 상태 변경 시 `useEffect`로 스토어에 다시 기록.

렌더러가 설정을 저장하면, reducer에 dispatch하는 **동시에** `IpcMessage.SettingsChanged`를 전송하여 메인 프로세스가 창 수준의 효과(항상 위에 표시, 작업 표시줄 노출, 경계, 전체화면 시각화 경계)를 적용하도록 합니다. 설정을 추가할 때는 양쪽을 모두 동기화하세요.

앱 시작 시 `settings.version`이 `version.generated.ts`와 일치하지 않으면 스토어가 **초기화**되고 기본값으로 리셋됩니다(로그인 토큰/clientId는 `rememberLogin`이 설정된 경우에만 보존). 즉, 버전 업데이트는 의도적으로 사용자 설정을 초기화합니다.

### 인증: 로컬 HTTP 서버를 통한 OAuth 2.0 PKCE

`src/main/auth.ts`가 전체 플로우를 구현합니다:

- `getAuthUrl()`이 PKCE `code_challenge`와 랜덤 `state`로 Spotify 인증 URL을 생성합니다.
- 일회용 `http.Server`가 포트 **41419**에서 Spotify의 리디렉션을 받습니다. `handleServerResponse`가 `state`를 검증하고, 코드를 토큰으로 교환한 뒤 `onTokenRetrieved` 콜백(렌더러가 `setTokenRetrievedCallback`으로 한 번 등록)을 호출합니다.
- 토큰은 `setRefreshTokenInterval`을 통해 만료 시간의 절반 시점에 자동 갱신됩니다.
- 사용자가 지정한 `spotifyClientId`(설정에서 지정)는 기본 `AUTH_CLIENT_ID`를 덮어씁니다. `getSpotifyClientId()`가 단일 진실 공급원(single source of truth)이며 모든 토큰 요청에서 사용됩니다. 기본 스코프는 `AUTH_SCOPES`이며, 갱신된 토큰의 스코프가 일치하지 않으면 거부됩니다.

`SpotifyApiInstance`(`src/renderer/api/spotify-api.ts`)는 모든 Web API 호출을 감싸는 싱글톤입니다. `401`(갱신 트리거)과 `429`(이후 호출이 준수하는 throttle 윈도우 설정)를 투명하게 처리합니다. Premium 전용 컨트롤: 무료 계정은 경고를 받고 재생 제어가 비활성화됩니다(`showFreemiumWarning`).

### 멀티 윈도우 모델

메인 창 외에 자식 창들이 있습니다: Settings, About, Track Info, Fullscreen Visualizer(`constants.ts`의 `WindowName` / `WindowTitle` enum). 이 창들은 렌더러에서 React의 `createPortal`을 `window.open` 대상에 사용하여 열립니다 — `src/renderer/components/window-portal.tsx` 참고(새 문서에 스타일시트를 복사하는 작업도 수행). 메인 프로세스는 `main.ts`의 `setWindowOpenHandler` / `did-create-window`에서 각 `window.open`을 가로채어, `frameName`을 기준으로 창별 `BrowserWindowConstructorOptions`(`main.utils.ts`에서)와 플랫폼별 조정을 적용합니다. `auth` 프레임은 창 대신 외부 브라우저에서 열리도록 특수 처리됩니다.

### 네이티브 애드온 (`src/native/`, `binding.gyp`로 빌드)

플랫폼별 `windows/`, `macos/`, `linux/` 하위에 두 개의 C++ N-API 모듈이 있습니다:

- **black-magic** — 저수준 창 관리(항상 위에 표시 동작 등). `main.ts` 상단에서 `build/Release/black-magic.node`로 import.
- **volume** — 시각화를 구동하기 위한 오디오 레벨 캡처.

이 모듈들은 webpack의 `native-ext-loader`를 통해 로드됩니다. 수정 시에는 webpack 리로드만으로는 안 되고 `node-gyp` 재빌드가 필요합니다.

### 시각화(Visualizations)

`src/visualizations/`의 WebGL 프래그먼트 셰이더 시각화(`blue-wave`, `rainbow-road`, `string-theory`, `seascape`)는 `src/visualizations/index.ts`의 `visualizations` 배열에 등록됩니다 — 새 시각화는 여기에 추가하세요. `VisualizationType`(None / Small / Big)은 None → 커버 내 작은 화면 → 전체화면 창 순으로 순환합니다.

## 컨벤션

- import 정렬과 스타일은 ESLint(airbnb 설정 + `simple-import-sort` + prettier)로 강제됩니다. 커밋 전 `lint:fix`를 실행하세요. pre-commit 훅이 경고가 있으면 커밋을 막습니다.
- `version.generated.ts`는 생성되는 파일이므로 직접 수정하지 마세요.
