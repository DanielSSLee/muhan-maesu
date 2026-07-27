# 📈 라오어 전략 통합 터미널 (Muhan Quant Terminal)

Alpaca Trading API를 연동하여 **라오어 무한매수법 V2.0 CLS** 및 **밸류 리밸런싱(Value Rebalancing)** 전략을 자동으로 계산하고 주문을 집행하는 실시간 퀀트 트레이딩 웹 터미널입니다.

---

## 💡 주요 기능 (Key Features)

### 1. 무한매수법 V2.0 CLS (Infinite Buy Strategy)
* **자동 주문 수량 계산**: 설정된 총 예산(Budget)과 분할 일수(Division)에 따라 당일 매수/매도 수량을 자동 산출합니다.
* **4중 LOC/GTC 분할 주문 자동 전송**:
  * 1️⃣ 평단가 기준 LOC 매수
  * 2️⃣ 평단가 +5% 인상 기준 LOC 매수
  * 3️⃣ 보유 수량 25% 분량 LOC 매도
  * 4️⃣ 나머지 75% 분량 지정가(GTC) 매도

### 2. 밸류 리밸런싱 (Value Rebalancing)
* **목표 밸류 패스 산출**: 목표 자산 가치(Target Value)와 현재 평가 금액 사이의 괴리(Gap)를 자동으로 계산합니다.
* **리밸런싱 주문 즉시 집행**: 필요 매수/매도 수량을 도출하여 손쉽게 오더를 전송합니다.

### 3. 수동 개별 오더 보드 (Manual Order Board)
* 티커, 수량, 한도 가격을 지정하여 Alpaca 실전 계좌로 **LOC 매수/매도** 및 **지정가(LIMIT GTC) 매수/매도** 주문을 직접 전송합니다.

### 4. 실시간 터미널 & 인터랙티브 UI
* **Alpaca 실시간 계좌 잔고 연동**: 구매력(Buying Power) 및 계좌 현황 실시간 조회.
* **TradingView 차트 연동**: 입력한 티커의 일봉 차트를 실시간으로 제공.
* **티커 자동완성 검색**: US Equity 종목 실시간 키워드 자동완성.
* **주문 히스토리 패널**: 최근 주문 상태(체결 완료, 대기중, 취소/거절 등) 및 아코디언 세부 명세 조회.
* **다크/라이트 모드 지원**: 헤더의 모드 전환 버튼으로 테마를 선택할 수 있으며 설정이 `localStorage`에 자동 저장됩니다.

---

## 🛠 기술 스택 (Tech Stack)

* **Backend**: Python 3.10+, FastAPI, Uvicorn, Alpaca Trade SDK (`alpaca-py`), `yfinance`, `python-dotenv`
* **Frontend**: HTML5, Vanilla JavaScript (ES6+), Modern CSS / Tailwind CSS, TradingView Financial Chart Widget
* **API**: Alpaca Trading API (US Equities)

---

## 🚀 시작하기 (Getting Started)

### 1. 레포지토리 클론 및 이동
```bash
git clone https://github.com/DanielSSLee/muhan-maesu.git
cd muhan-maesu
```

### 2. 의존성 패키지 설치
```bash
pip install fastapi uvicorn alpaca-py yfinance python-dotenv
```

### 3. 환경 변수 설정 (`.env`)
프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 Alpaca API 키를 입력합니다.

```env
LIVE_API_KEY=YOUR_ALPACA_LIVE_API_KEY
LIVE_SECRET_KEY=YOUR_ALPACA_LIVE_SECRET_KEY
```

> ⚠️ **보안 주의**: `.env` 파일에는 개인 API Secret Key가 포함되므로 절대로 Git 레포지토리에 커밋하지 마세요. (`.gitignore`에 추가되어 있습니다.)

### 4. 애플리케이션 실행
```bash
uvicorn app:app --reload --port 8000
```
웹 브라우저에서 `http://localhost:8000`에 접속하여 터미널을 이용합니다.

---

## 📂 프로젝트 구조 (Project Structure)

```text
muhan-maesu/
├── app.py              # FastAPI 백엔드 서버 및 Alpaca API 연동 뷰
├── index.html          # 메인 웹 터미널 HTML UI
├── static/
│   ├── style.css       # 퀀트 터미널 전용 스타일시트 (다크/라이트 모드)
│   └── script.js       # 자동완성, 주문 요청, 차트 렌더링 및 테마 토글 로직
├── .env                # Alpaca API Key 환경 변수 설정 파일 (Git 제외)
├── .gitignore          # Git 추적 제외 목록
└── README.md           # 프로젝트 문서
```

---

## ⚠️ 면책 조항 (Disclaimer)

본 프로그램은 개인 투자 참고용 퀀트 트레이딩 터미널입니다. 실제 주식 매매 주문이 Alpaca 실전 계좌로 전달되므로 사용으로 인한 투자 결과 및 손실에 대한 책임은 사용자 본인에게 있습니다.
