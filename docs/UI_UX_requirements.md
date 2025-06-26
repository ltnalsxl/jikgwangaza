# 직관가자 앱 UI/UX 요구사항 명세서

아래 내용은 직관가자 앱의 최신 화면 설계와 개선 사항을 모두 반영한 완성형 UI/UX 요구사항 명세서입니다.

## 1. 개요

- **앱 이름**: 직관가자
- **목적**: 사용자가 KBO 경기 일정에 따라 응원가를 쉽게 탐색하고 라인업을 확인하며 재생 및 공유할 수 있는 직관 도우미 앱
- **지원 디바이스**: 모바일 우선(반응형 포함)
- **사용자 시나리오**
  1. 원하는 날짜의 경기를 선택
  2. 두산 베어스 외 타 구단으로 팀 변경
  3. 해당 경기의 라인업 및 응원가 확인
  4. 전체 응원가 재생 또는 선수별 재생
  5. SNS 공유 또는 친구와 링크 공유

## 2. 전체 레이아웃 및 스타일

| 항목 | 내용 |
| --- | --- |
| 전체 프레임 | `max-w-md mx-auto`, 반응형 `w-full md:max-w-2xl` |
| 배경 | `bg-gradient-to-br from-blue-50 to-indigo-50` |
| 폰트 | 시스템 기본(sans-serif) |
| 주요 색상 | 주 색상: `blue-600`, 서브: `gray-600`, 강조: `blue-100`, `white` |
| 효과 | 모든 카드/버튼에 `rounded-xl`, `shadow-sm`, `hover` 효과 적용 |

## 3. 상단 헤더 영역

| 항목 | 내용 |
| --- | --- |
| 배경 | `bg-white/90`, `backdrop-blur-xl`, `border-b`, `shadow-sm` |
| 좌측 | 팀 로고 원형(두), 앱 이름 "직관가자", 현재 선택된 팀 + 날짜 |
| 우측 아이콘 | 회전(`RotateCcw`), 다크모드 토글(검은 원), 설정(`Settings`) |
| 아이콘 스타일 | `p-2`, `rounded-full`, `hover:bg-gray-100`, `w-4 h-4` |

## 4. 날짜 및 팀 선택 섹션

### 날짜 선택 버튼

- 텍스트: `⚾ 6월 24일 (화)`
- 스타일: `rounded-xl`, `border`, `shadow-sm`, `hover:border-blue-300`

### 캘린더 드롭다운

| 항목 | 설명 |
| --- | --- |
| 헤더 | `<년>년 <월>` 가운데 정렬, 좌우 화살표(`ChevronLeft`, `ChevronRight`)로 월 이동 |
| 요일 | 일~토, 상단 표시(`text-xs`) |
| 날짜 그리드 | 7열 그리드(일요일 시작), 게임 없으면 선택 가능하지만 비활성화 스타일 |
| 오늘 날짜 | 선택된 날짜는 `bg-blue-600 text-white` |
| 경기 있는 날짜 | `●` 점 표시, `hover:bg-blue-100`, `border-blue-200` |
| 경기 없는 날짜 | `cursor-not-allowed text-gray-400` + 안내 메시지(예: "이 날은 경기가 없습니다") |

### 팀 선택 드롭다운 (개선)

| 항목 | 설명 |
| --- | --- |
| 버튼 | `rounded-xl`, `px-4 py-3`, `border`, `hover:border-blue-300` |
| 텍스트 | `truncate`, `text-gray-900`, 오른쪽 `ChevronDown` 아이콘 |
| 기능 | 드롭다운 클릭 시 팀 리스트 노출 → 선택 시 `selectedTeam` 변경 |
| 드롭다운 옵션 | 두산 베어스, LG 트윈스, SSG 랜더스 등 모든 KBO 구단 |

## 5. 탭 네비게이션 바

| 항목 | 설명 |
| --- | --- |
| 탭 종류 | 라인업, 팀응원가, 탐색 |
| 선택 스타일 | `text-blue-600`, `border-b-2` |
| 비선택 | `text-gray-600`, `hover:text-gray-900` |
| 아이콘 | Lucide-react 사용(`Users`, `Trophy`, `Search`) |
| 개선 | 아이콘과 텍스트 간격 `space-y-2`, 아이콘 크기 `w-6 h-6` 확대 |

## 6. 경기 정보 카드

| 항목 | 설명 |
| --- | --- |
| 위치 | 콘텐츠 최상단 |
| 배경 | `bg-white`, `rounded-xl`, `p-4`, `shadow-sm`, `border` |
| 내용 | "두산 vs KIA / 6월 24일 (화) / 18:30" |
| 버튼 | 전체 재생 버튼(`bg-blue-600 text-white`, `rounded-lg`) |
| 개선 | 모바일 뷰에서 하단 고정(sticky bottom) 버튼 고려 가능 |

## 7. 오늘의 라인업 섹션

### 상단 바

| 항목 | 설명 |
| --- | --- |
| 제목 | 오늘의 라인업, `text-lg font-bold` |
| 공유 버튼 | `Share` + "공유하기", `bg-blue-50 hover:bg-blue-100`, `text-sm` |
| 새로고침 | `RotateCcw`, `hover:bg-gray-100` |

### 리스트 항목

| 항목 | 설명 |
| --- | --- |
| 번호 원형 | `w-10 h-10`, `bg-blue-600`, `text-white`, 중앙정렬 |
| 이름 | `font-bold text-gray-900` |
| 포지션 | `text-sm text-gray-600` |
| 오른쪽 버튼 | `Play` 아이콘, 파란 원형 버튼(`hover:bg-blue-700`) |
| 리스트 행 | `hover:bg-gray-50`, `border-b`, `p-4`, `flex justify-between` |
| 개선 | 타순, 성적 등 Badge 추가 가능(예: 타율 .345, 3번타자) |
| 접근성 | 각 플레이 버튼에 `aria-label="정수빈 응원가 재생"` 추가 |

## 8. 공유 기능 확장

| 항목 | 설명 |
| --- | --- |
| 현재 | 공유 버튼 UI만 있음 |
| 개선 | 클릭 시 아래 기능 제공: |
| 1. | `navigator.clipboard.writeText`로 링크 복사 |
| 2. | SNS 공유: 카카오톡, 트위터, 텔레그램 등 버튼 |
| 3. | 공유 완료 후 “복사되었습니다” 피드백 Toast 메시지 |

## 9. 다크모드 (추후)

| 항목 | 설명 |
| --- | --- |
| 아이콘 | 다크모드 토글 버튼 존재(현재 미구현) |
| 개선 | Tailwind `dark:` 클래스로 전체 테마 적용 가능 |
| 예시 | `dark:bg-gray-900`, `dark:text-gray-100`, `dark:border-gray-700` 등 활용 |

## 10. 개발 구조/기술 스펙 제안

| 항목 | 제안 |
| --- | --- |
| 컴포넌트 분리 | `Header`, `DateSelector`, `TeamSelector`, `Calendar`, `TabNav`, `LineupList`, `GameCard`, `PlayerRow` 등으로 분리 |
| 상태관리 | `selectedDate`, `selectedTeam`, `activeTab`은 `useContext`로 공유 추천 |
| 데이터 구조 | `gameData`를 배열로 변경하여 `map()` 기반 렌더링 및 필터 용이 |
| 날짜 포맷 | `dayjs` 또는 `Intl.DateTimeFormat`으로 일관성 있게 처리 |
| API 확장성 | Firestore/JSON 등으로 선수 라인업 및 응원가 데이터 동기화 |

## 11. 우선순위 높은 개선 항목 요약

| 우선순위 | 개선 항목 | 설명 |
| --- | --- | --- |
| 🥇 | 팀 선택 드롭다운 | 실제 팀 변경 기능 구현 필요 |
| 🥈 | 경기 없는 날 안내 | 클릭 가능하게 하고 “경기 없음” 메시지 표시 |
| 🥉 | 응원가 공유 기능 확장 | 링크 복사 + SNS 공유 지원 |
| 4 | 전체 재생 버튼 위치 개선 | 작은 화면에서는 하단 고정 추천 |
| 5 | 라인업 데이터 확장 | 타순, 타율 등 간단 지표 표시 고려 |

