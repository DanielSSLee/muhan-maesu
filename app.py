import os
import math
import traceback
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
from alpaca.trading.client import TradingClient
from alpaca.trading.requests import LimitOrderRequest, GetOrdersRequest, MarketOrderRequest
from alpaca.trading.enums import OrderSide, TimeInForce, QueryOrderStatus
from alpaca.common.enums import Sort  # 💡 Sort를 common 모듈에서 따로 빼서 임포트합니다.
from alpaca.trading.requests import GetAssetsRequest
from alpaca.trading.enums import AssetClass, AssetStatus
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockLatestQuoteRequest
import yfinance as yf
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# 💡 secret.env 파일명 지정 (기존 설정 유지)
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = FastAPI(title="Laoer Strategy Live Terminal")

INDEX_HTML_PATH = os.path.join(BASE_DIR, "index.html")
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

ACCOUNTS = {
    "live": {
        "name": "실전 거래 계정 (REAL)",
        "API_KEY": os.getenv("LIVE_API_KEY", ""),
        "SECRET_KEY": os.getenv("LIVE_SECRET_KEY", ""),
        "is_live": True
    }
}

ALL_ASSETS_CACHE = []

def get_env_status():
    env_path = os.path.join(BASE_DIR, ".env")
    has_env = os.path.exists(env_path)
    if has_env:
        load_dotenv(env_path, override=True)
        if "live" in ACCOUNTS:
            ACCOUNTS["live"]["API_KEY"] = os.getenv("LIVE_API_KEY", "")
            ACCOUNTS["live"]["SECRET_KEY"] = os.getenv("LIVE_SECRET_KEY", "")
    api_key = os.getenv("LIVE_API_KEY", "").strip() if has_env else ""
    secret_key = os.getenv("LIVE_SECRET_KEY", "").strip() if has_env else ""
    has_keys = bool(api_key and secret_key)
    return {
        "has_env": has_env,
        "has_keys": has_keys,
        "valid": has_env and has_keys
    }

@app.get("/api/check-env")
def check_env_endpoint():
    return get_env_status()

@app.post("/api/save-env")
def save_env(data: dict):
    api_key = data.get("api_key", "").strip()
    secret_key = data.get("secret_key", "").strip()
    if not api_key or not secret_key:
        raise HTTPException(status_code=400, detail="API Key와 Secret Key를 모두 입력해야 합니다.")
    
    env_path = os.path.join(BASE_DIR, ".env")
    env_content = f"# Alpaca Live Account Credentials\nLIVE_API_KEY={api_key}\nLIVE_SECRET_KEY={secret_key}\n"
    
    try:
        with open(env_path, "w", encoding="utf-8") as f:
            f.write(env_content)
        
        load_dotenv(env_path, override=True)
        if "live" in ACCOUNTS:
            ACCOUNTS["live"]["API_KEY"] = api_key
            ACCOUNTS["live"]["SECRET_KEY"] = secret_key
            
        return {"status": "success", "message": "API Key가 성공적으로 .env 파일에 저장 및 연동되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f".env 저장 실패: {str(e)}")

def get_alpaca_clients(account_type: str):
    if account_type not in ACCOUNTS:
        raise HTTPException(status_code=400, detail="유효하지 않은 계좌 타입입니다.")
    env_status = get_env_status()
    if not env_status["has_env"]:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "MISSING_ENV",
                "message": "Alpaca 계좌 연동을 위한 .env 파일이 없습니다. API Key와 Secret Key를 연결해 주세요.",
                "docs_url": "https://alpaca.markets/docs/trading/getting-started/"
            }
        )
    acc = ACCOUNTS[account_type]
    if not acc["API_KEY"].strip() or not acc["SECRET_KEY"].strip():
        raise HTTPException(
            status_code=400,
            detail={
                "error": "MISSING_ENV",
                "message": "Alpaca API Key 또는 Secret Key가 .env 파일에 설정되지 않았습니다.",
                "docs_url": "https://alpaca.markets/docs/trading/getting-started/"
            }
        )
    trade = TradingClient(acc["API_KEY"].strip(), acc["SECRET_KEY"].strip(), paper=not acc["is_live"])
    data = StockHistoricalDataClient(acc["API_KEY"].strip(), acc["SECRET_KEY"].strip())
    return trade, data

@app.get("/api/account/{account_type}")
def get_account_info(account_type: str):
    try:
        trade_client, _ = get_alpaca_clients(account_type)
        acc = trade_client.get_account()
        return {
            "buying_power": float(acc.buying_power),
            "cash": float(acc.cash),
            "portfolio_value": float(acc.portfolio_value),
            "equity": float(acc.equity),
            "currency": acc.currency
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"계좌 정보 조회 실패: {str(e)}")

@app.get("/api/search")
def search_tickers(q: str = ""):
    global ALL_ASSETS_CACHE
    q = q.strip().upper()
    if not q: return []
    if not ALL_ASSETS_CACHE:
        try:
            trade_client, _ = get_alpaca_clients("live")
            req = GetAssetsRequest(asset_class=AssetClass.US_EQUITY, status=AssetStatus.ACTIVE)
            assets = trade_client.get_assets(req)
            ALL_ASSETS_CACHE = [{"symbol": a.symbol, "name": a.name} for a in assets if a.tradable]
        except Exception:
            ALL_ASSETS_CACHE = [
                {"symbol": "TQQQ", "name": "ProShares UltraPro QQQ 3x"},
                {"symbol": "SOXL", "name": "Direxion Daily Semiconductor Bull 3x"}
            ]
    matches = [a for a in ALL_ASSETS_CACHE if a["symbol"].startswith(q)]
    if len(matches) < 10:
        contains_matches = [a for a in ALL_ASSETS_CACHE if q in a["symbol"] and not a["symbol"].startswith(q)]
        matches.extend(contains_matches)
    return matches[:10]

@app.get("/api/status/ibm/{account_type}/{ticker}/{budget}/{division}")
def get_ibm_status(account_type: str, ticker: str, budget: float, division: int):
    try:
        trade_client, data_client = get_alpaca_clients(account_type)
        try:
            yf_ticker = yf.Ticker(ticker)
            current_price = yf_ticker.fast_info['last_price']
        except Exception:
            quote = data_client.get_stock_latest_quote(StockLatestQuoteRequest(symbol_or_symbols=ticker))
            raw_quote = quote[ticker]
            current_price = raw_quote.ask_price if (raw_quote.ask_price and raw_quote.ask_price > 0) else raw_quote.bid_price

        if not current_price or current_price <= 0:
            raise ValueError("주가 데이터를 가져올 수 없습니다.")
        
        one_interval = budget / division
        shares_per_half = math.floor((one_interval / 2) / current_price)
        if shares_per_half < 1: shares_per_half = 1

        avg_entry_price = current_price
        current_qty = 0.0
        try:
            pos = trade_client.get_open_position(ticker)
            avg_entry_price = float(pos.avg_entry_price)
            current_qty = float(pos.qty)
        except: pass

        return {
            "current_price": round(current_price, 2),
            "avg_entry_price": round(avg_entry_price, 2),
            "current_qty": current_qty,
            "shares_per_half": shares_per_half,
            "sell_target": round(avg_entry_price * 1.1, 2)
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/order/auto")
def send_auto_orders(data: dict):
    try:
        account_type = data.get("account_type")
        ticker = data.get("ticker")
        budget = float(data.get("budget"))
        division = int(data.get("division", 40))
        
        trade_client, _ = get_alpaca_clients(account_type)
        status = get_ibm_status(account_type, ticker, budget, division)
        
        buy_qty = status["shares_per_half"]
        current_price = status["current_price"]
        avg_entry_price = status["avg_entry_price"]
        current_qty = status["current_qty"]

        order_filter = GetOrdersRequest(status=QueryOrderStatus.OPEN, symbols=[ticker], side=OrderSide.SELL)
        open_sell_orders = trade_client.get_orders(order_filter)
        for order in open_sell_orders: 
            trade_client.cancel_order_by_id(order.id)

        loc_avg_price = round(avg_entry_price, 2)
        loc_avg_order = LimitOrderRequest(
            symbol=ticker, qty=buy_qty, limit_price=loc_avg_price, 
            side=OrderSide.BUY, time_in_force=TimeInForce.CLS
        )
        trade_client.submit_order(loc_avg_order)

        loc_high_price = round(avg_entry_price * 1.05, 2)
        loc_high_order = LimitOrderRequest(
            symbol=ticker, qty=buy_qty, limit_price=loc_high_price, 
            side=OrderSide.BUY, time_in_force=TimeInForce.CLS
        )
        trade_client.submit_order(loc_high_order)

        msg = f"첫 진입 매수 LOC 2건 전송 완료! (현재 보유 수량 없음)"
        
        if current_qty > 0:
            sell_qty_25 = math.floor(current_qty * 0.25)
            sell_qty_75 = int(current_qty - sell_qty_25)
            orders_desc = []

            if sell_qty_25 > 0:
                sell_price_25 = round((avg_entry_price * 1.05) + 0.01, 2)
                sell_order_25 = LimitOrderRequest(
                    symbol=ticker, qty=sell_qty_25, limit_price=sell_price_25,
                    side=OrderSide.SELL, time_in_force=TimeInForce.CLS
                )
                trade_client.submit_order(sell_order_25)
                orders_desc.append(f"25% LOC 매도({sell_qty_25}주, ${sell_price_25:.2f})")

            if sell_qty_75 > 0:
                sell_price_75 = round(avg_entry_price * 1.105, 2)
                sell_order_75 = LimitOrderRequest(
                    symbol=ticker, qty=sell_qty_75, limit_price=sell_price_75,
                    side=OrderSide.SELL, time_in_force=TimeInForce.DAY
                )
                trade_client.submit_order(sell_order_75)
                orders_desc.append(f"75% 지정가 매도({sell_qty_75}주, ${sell_price_75:.2f})")
            
            msg = f"매수 2건 및 전략 분할 매도 배치 완료! ({' / '.join(orders_desc)})"

        return {"status": "success", "message": msg}
    except HTTPException:
        raise
    except Exception as e: 
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/status/vr/{account_type}/{ticker}/{target_value}")
def get_vr_status(account_type: str, ticker: str, target_value: float):
    try:
        trade_client, data_client = get_alpaca_clients(account_type)
        try:
            yf_ticker = yf.Ticker(ticker)
            current_price = yf_ticker.fast_info['last_price']
        except Exception:
            quote = data_client.get_stock_latest_quote(StockLatestQuoteRequest(symbol_or_symbols=ticker))
            raw_quote = quote[ticker]
            current_price = raw_quote.ask_price if (raw_quote.ask_price and raw_quote.ask_price > 0) else raw_quote.bid_price
        
        if not current_price or current_price <= 0:
            raise ValueError("주가 데이터를 가져올 수 없습니다.")

        current_qty = 0.0
        try:
            pos = trade_client.get_open_position(ticker)
            current_qty = float(pos.qty)
        except: pass

        current_portfolio_value = current_qty * current_price
        gap = target_value - current_portfolio_value
        required_qty = round(abs(gap) / current_price, 2)

        return {
            "current_price": round(current_price, 2),
            "current_qty": current_qty,
            "current_value": round(current_portfolio_value, 2),
            "gap": round(gap, 2),
            "required_qty": required_qty,
            "action": "BUY" if gap > 0 else "SELL"
        }
    except HTTPException:
        raise
    except Exception as e: 
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/order/vr")
def send_vr_order(data: dict):
    try:
        trade_client, _ = get_alpaca_clients(data['account_type'])
        ticker = data['ticker']
        qty = float(data['qty'])
        side = OrderSide.BUY if data['action'] == "BUY" else OrderSide.SELL
        
        order = MarketOrderRequest(symbol=ticker, qty=qty, side=side, time_in_force=TimeInForce.DAY)
        trade_client.submit_order(order)
        return {"message": f"VR {data['action']} {qty}주 주문 성공"}
    except HTTPException:
        raise
    except Exception as e: 
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/order/manual")
def send_manual_order(data: dict):
    try:
        account_type = data.get("account_type")
        ticker = data.get("ticker")
        qty = float(data.get("qty"))
        price = round(float(data.get("price")), 2)
        side = OrderSide.BUY if data.get("side") == "BUY" else OrderSide.SELL
        tif = TimeInForce.CLS if data.get("type") == "LOC" else TimeInForce.GTC

        trade_client, _ = get_alpaca_clients(account_type)
        manual_order = LimitOrderRequest(symbol=ticker, qty=qty, limit_price=price, side=side, time_in_force=tif)
        trade_client.submit_order(manual_order)
        return {"status": "success", "message": f"[{account_type.upper()}] {ticker} {qty}주 수동 주문 완료!"}
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# =================================================================
# 💡 [신규 추가] 주문 히스토리 불러오기 API
# =================================================================
@app.get("/api/orders/{account_type}")
def get_order_history(account_type: str):
    try:
        trade_client, _ = get_alpaca_clients(account_type)
        # 최신 주문 40건을 가져옵니다 (취소/체결/대기 모두 포함)
        req = GetOrdersRequest(status=QueryOrderStatus.ALL, limit=40, direction=Sort.DESC)
        orders = trade_client.get_orders(req)
        
        history = []
        for o in orders:
            history.append({
                "id": str(o.id),
                "symbol": o.symbol,
                "qty": float(o.qty) if o.qty else 0,
                "filled_qty": float(o.filled_qty) if o.filled_qty else 0,
                "side": o.side.name, # BUY or SELL
                "type": o.order_type.name if o.order_type else "UNKNOWN",
                "status": o.status.name,
                "limit_price": float(o.limit_price) if o.limit_price else None,
                "submitted_at": o.submitted_at.strftime("%m-%d %H:%M") if o.submitted_at else ""
            })
        return history
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/", response_class=FileResponse)
def index():
    return FileResponse(INDEX_HTML_PATH)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)