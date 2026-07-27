let curAcc = 'live';
let vrData = null;
let pendingOrderCallback = null; 

function toggleVRDisplay() {
    const isChecked = document.getElementById('vr-toggle').checked;
    const vrCard = document.getElementById('vr-card');
    const grid = document.getElementById('strategy-grid');
    
    if (isChecked) {
        vrCard.classList.remove('hidden');
        grid.classList.replace('lg:grid-cols-1', 'lg:grid-cols-2');
        fetchVR(); 
    } else {
        vrCard.classList.add('hidden');
        grid.classList.replace('lg:grid-cols-2', 'lg:grid-cols-1');
    }
}

function getCurrentTheme() {
    return document.documentElement.classList.contains('light-mode') ? 'light' : 'dark';
}

function applyTheme(theme) {
    const darkIcon = document.getElementById('theme-toggle-dark-icon');
    const lightIcon = document.getElementById('theme-toggle-light-icon');
    const themeText = document.getElementById('theme-toggle-text');
    const toggleBtn = document.getElementById('theme-toggle');

    if (theme === 'light') {
        document.documentElement.classList.add('light-mode');
        if (darkIcon) darkIcon.classList.remove('hidden');
        if (lightIcon) lightIcon.classList.add('hidden');
        if (themeText) themeText.innerText = '라이트';
        if (toggleBtn) toggleBtn.setAttribute('title', '스위치: 다크 모드로 변경');
    } else {
        document.documentElement.classList.remove('light-mode');
        if (darkIcon) darkIcon.classList.add('hidden');
        if (lightIcon) lightIcon.classList.remove('hidden');
        if (themeText) themeText.innerText = '다크';
        if (toggleBtn) toggleBtn.setAttribute('title', '스위치: 라이트 모드로 변경');
    }
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const current = getCurrentTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);

    // Refresh active TradingView charts with new theme
    const ibmTickerInput = document.getElementById('ibm-ticker');
    if (ibmTickerInput && ibmTickerInput.value) {
        refreshChartWidget('ibm-chart-container', ibmTickerInput.value.trim().toUpperCase());
    }
    const vrCard = document.getElementById('vr-card');
    const vrTickerInput = document.getElementById('vr-ticker');
    if (vrCard && !vrCard.classList.contains('hidden') && vrTickerInput && vrTickerInput.value) {
        refreshChartWidget('vr-chart-container', vrTickerInput.value.trim().toUpperCase());
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
}

function refreshChartWidget(containerId, ticker) {
    const activeTheme = getCurrentTheme();
    if (document.getElementById(containerId)) {
        new TradingView.widget({
            "autosize": true,
            "symbol": ticker, 
            "interval": "D",
            "timezone": "Asia/Seoul",
            "theme": activeTheme,
            "style": "1", 
            "locale": "ko",
            "toolbar_bg": activeTheme === 'dark' ? "#111827" : "#ffffff",
            "enable_publishing": false,
            "hide_top_toolbar": true,
            "hide_legend": true,
            "save_image": false,
            "extended_hours": true, 
            "container_id": containerId
        });
    }
}

function openOrderModal(title, detailsHtml, confirmCallback) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-details').innerHTML = detailsHtml;
    pendingOrderCallback = confirmCallback;
    const modal = document.getElementById('order-modal');
    const box = document.getElementById('modal-box');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        box.classList.remove('scale-95');
    }, 10);
}

function closeOrderModal() {
    const modal = document.getElementById('order-modal');
    const box = document.getElementById('modal-box');
    modal.classList.add('opacity-0');
    box.classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); }, 200);
    pendingOrderCallback = null;
}

// 💡 [새로 추가] 히스토리 항목 클릭 시 세부 정보를 여닫는 아코디언 토글
function toggleOrderDetail(orderId) {
    const detailBox = document.getElementById('detail-' + orderId);
    if (detailBox.classList.contains('hidden')) {
        detailBox.classList.remove('hidden');
    } else {
        detailBox.classList.add('hidden');
    }
}

// 💡 Alpaca 실시간 계좌 잔고 (구매력) 조회
async function fetchAccountInfo() {
    try {
        const res = await fetch(`/api/account/${curAcc}`);
        if (res.ok) {
            const data = await res.json();
            const formattedBP = Number(data.buying_power).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const elem = document.getElementById('buying-power-val');
            if (elem) elem.innerText = `$${formattedBP}`;
        }
    } catch(e) {
        console.error("계좌 정보 로드 실패:", e);
    }
}

// 💡 [새로 추가] 백엔드에서 주문 히스토리를 긁어와 리스트 UI를 그리는 메인 엔진
async function fetchOrders() {
    try {
        const res = await fetch(`/api/orders/${curAcc}`);
        const data = await res.json();
        const container = document.getElementById('order-history-list');
        container.innerHTML = '';
        
        if (data.length === 0) {
            container.innerHTML = '<div class="text-xs text-zinc-500 text-center py-4">최근 주문 내역이 없습니다.</div>';
            return;
        }

        data.forEach(o => {
            const isBuy = o.side === 'BUY';
            const sideColor = isBuy ? 'text-emerald-400' : 'text-rose-400';
            const sideText = isBuy ? '매수' : '매도';
            
            let statusColor = 'text-zinc-500';
            let statusText = o.status;
            
            // Alpaca 상태 코드를 직관적인 한글 뱃지로 치환
            if (o.status === 'FILLED') { statusColor = 'text-cyan-400'; statusText = '체결완료'; }
            else if (o.status === 'NEW' || o.status === 'ACCEPTED' || o.status === 'PENDING_NEW' || o.status === 'PARTIALLY_FILLED') { 
                statusColor = 'text-amber-400'; statusText = '대기중'; 
            }
            else if (o.status === 'CANCELED' || o.status === 'REJECTED') { 
                statusColor = 'text-rose-600'; statusText = '취소/거절'; 
            }

            const priceText = o.limit_price ? `$${o.limit_price}` : '시장가';
            
            const html = `
                <div class="border border-zinc-800/60 rounded-md overflow-hidden bg-zinc-950/50 hover:border-zinc-700 transition-colors">
                    <div class="p-3 flex justify-between items-center cursor-pointer select-none" onclick="toggleOrderDetail('${o.id}')">
                        <div class="flex flex-col">
                            <span class="text-xs font-bold ${sideColor}">${sideText} ${o.symbol}</span>
                            <span class="text-[10px] text-zinc-500 mt-0.5">${o.submitted_at}</span>
                        </div>
                        <div class="flex flex-col items-end">
                            <span class="text-xs font-bold text-zinc-200">${o.qty}주</span>
                            <span class="text-[10px] font-semibold ${statusColor} mt-0.5">${statusText}</span>
                        </div>
                    </div>
                    <div id="detail-${o.id}" class="hidden px-3 pb-3 pt-1 border-t border-zinc-800/50 bg-zinc-900/30 text-[10px] text-zinc-400 space-y-1">
                        <div class="flex justify-between"><span>주문 유형</span><span class="text-zinc-200">${o.type}</span></div>
                        <div class="flex justify-between"><span>지정 가격</span><span class="text-zinc-200">${priceText}</span></div>
                        <div class="flex justify-between"><span>체결 수량</span><span class="text-zinc-200">${o.filled_qty}주</span></div>
                        <div class="flex justify-between items-center mt-1 pt-1 border-t border-zinc-800/50">
                            <span>주문 ID</span><span class="text-zinc-600 truncate max-w-[120px]" title="${o.id}">${o.id}</span>
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        });
    } catch(e) {
        console.error("주문 내역 로드 실패");
    }
}

async function fetchIBM() {
    const inputElement = document.getElementById('ibm-ticker');
    const t = inputElement.value.trim().toUpperCase();
    inputElement.value = t;
    const b = document.getElementById('ibm-budget').value;
    const d = document.getElementById('ibm-division').value;
    
    refreshChartWidget('ibm-chart-container', t);
    try {
        const res = await fetch(`/api/status/ibm/${curAcc}/${t}/${b}/${d}`);
        const data = await res.json();
        if(res.ok) {
            document.getElementById('ibm-price').innerText = `$${data.current_price} / $${data.avg_entry_price}`;
            document.getElementById('ibm-qty').innerText = `${data.current_qty}주 / $${data.sell_target}`;
            document.getElementById('ibm-shares').innerText = `${data.shares_per_half * 2}주`;
        }
    } catch(e) { console.error("IBM 데이터 로드 실패"); }
}

async function fetchVR() {
    const inputElement = document.getElementById('vr-ticker');
    const t = inputElement.value.trim().toUpperCase();
    inputElement.value = t;
    const target = document.getElementById('vr-target').value;
    
    refreshChartWidget('vr-chart-container', t);
    try {
        const res = await fetch(`/api/status/vr/${curAcc}/${t}/${target}`);
        vrData = await res.json();
        if(res.ok) {
            document.getElementById('vr-current-val').innerText = `$${vrData.current_value}`;
            document.getElementById('vr-gap').innerText = `$${vrData.gap}`;
            document.getElementById('vr-action').innerText = `${vrData.action} ${vrData.required_qty}주`;
            document.getElementById('vr-action').style.color = vrData.gap > 0 ? '#4ade80' : '#f87171';
        }
    } catch(e) { console.error("VR 데이터 로드 실패"); }
}

async function sendIBM() {
    const t = document.getElementById('ibm-ticker').value.trim().toUpperCase();
    const b = document.getElementById('ibm-budget').value;
    const d = document.getElementById('ibm-division').value;
    const sharesText = document.getElementById('ibm-shares').innerText;

    const detailsHtml = `
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">지정 계좌</span><span class="font-bold text-rose-400">실전 REAL 계정</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">선택 전략</span><span class="font-semibold text-cyan-400">무한매수법 V2.0 CLS (Custom 4-Orders)</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">투자 종목</span><span class="font-bold text-zinc-100 text-sm">${t}</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">스케줄 배정</span><span class="font-medium text-zinc-200">$${b} / ${d}일 분할</span></li>
        <li class="flex justify-between pt-1"><span class="text-zinc-400 font-semibold">금일 총 매수 예정</span><span class="font-bold text-emerald-400">${sharesText} (각 0.5회분 분할)</span></li>
        <li class="flex flex-col gap-2 bg-zinc-950 p-3 rounded-md mt-3 text-[11px] text-zinc-400 border border-zinc-800/30 leading-relaxed">
            <div class="text-zinc-500 font-semibold border-b border-zinc-900 pb-1 mb-1">📋 전송 예정인 4중 오더 구성 명세</div>
            <div class="flex justify-between"><span>1️⃣ 매수: 평균단가 기준</span><span class="text-cyan-400 font-medium">LOC 매수</span></div>
            <div class="flex justify-between"><span>2️⃣ 매수: 평단가 +5% 인상 기준</span><span class="text-cyan-400 font-medium">LOC 매수</span></div>
            <div class="flex justify-between"><span>3️⃣ 매도: 보유량 25% 분량 (평단+5% + $0.01)</span><span class="text-rose-400 font-medium">LOC 매도</span></div>
            <div class="flex justify-between"><span>4️⃣ 매도: 나머지 75% 분량 (평단+10.5%)</span><span class="text-amber-400 font-medium">지정가 매도 (GTC)</span></div>
        </li>
    `;

    openOrderModal("무한매수법 4중 오더 최종 승인", detailsHtml, async () => {
        const res = await fetch('/api/order/auto', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({account_type:curAcc, ticker:t, budget:b, division:d})
        });
        const d2 = await res.json(); 
        alert(d2.message); 
        fetchIBM();
        fetchAccountInfo();
        fetchOrders(); // 💡 주문 후 우측 히스토리 패널 및 잔고 자동 갱신
    });
}

async function sendVR() {
    if(!vrData) return;
    const t = document.getElementById('vr-ticker').value.trim().toUpperCase();
    const actionColor = vrData.gap > 0 ? 'text-emerald-400' : 'text-rose-400';
    const detailsHtml = `
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">지정 계좌</span><span class="font-bold text-rose-400">실전 REAL 계정</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">선택 전략</span><span class="font-semibold text-amber-400">밸류 리밸런싱 (Value Path)</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">투자 종목</span><span class="font-bold text-zinc-100 text-sm">${t}</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">목표 경로 밸류</span><span class="font-medium text-zinc-200">$${document.getElementById('vr-target').value}</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">자산 괴리율 (Gap)</span><span class="font-medium text-zinc-100">$${vrData.gap}</span></li>
        <li class="flex justify-between pt-1"><span class="text-zinc-400 font-semibold">최종 거래 오더</span><span class="font-extrabold ${actionColor}">${vrData.action} ${vrData.required_qty}주 (당일 시장가)</span></li>
    `;
    openOrderModal("밸류 리밸런싱 오더 승인", detailsHtml, async () => {
        const res = await fetch('/api/order/vr', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({account_type:curAcc, ticker:t, qty:vrData.required_qty, action:vrData.action})
        });
        const d2 = await res.json(); 
        alert(d2.message); 
        fetchVR();
        fetchAccountInfo();
        fetchOrders(); // 💡 주문 후 우측 히스토리 패널 및 잔고 자동 갱신
    });
}

async function sendManual(side, type) {
    const ticker = document.getElementById('m-ticker').value.trim().toUpperCase();
    const qty = document.getElementById('m-qty').value;
    const price = document.getElementById('m-price').value;
    if(!ticker || !qty || !price) { alert("티커 기호, 수량, 가격 설정을 모두 채워주세요."); return; }
    const typeStr = type === 'LOC' ? 'LOC (당일 장마감 동시호가 지정)' : 'LIMIT (지정가 무기한 GTC)';
    const sideStr = side === 'BUY' ? '개별 수동 매수 기입' : '개별 수동 매도 기입';
    const sideColor = side === 'BUY' ? 'text-emerald-400' : 'text-rose-400';
    const detailsHtml = `
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">지정 계좌</span><span class="font-bold text-rose-400">실전 REAL 계정</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">선택 전략</span><span class="font-semibold text-rose-400">수동 개별 오더 보드</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">투자 종목</span><span class="font-bold text-zinc-100 text-sm">${ticker}</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">호가 처리 방식</span><span class="font-medium text-zinc-200">${typeStr}</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">신청 수량 / 가격</span><span class="font-medium text-zinc-200">${qty}주 / $${price}</span></li>
        <li class="flex justify-between pt-1"><span class="text-zinc-400 font-semibold">최종 수동 거래</span><span class="font-extrabold ${sideColor}">${sideStr} 전송</span></li>
    `;
    openOrderModal("수동 개별 오더 승인", detailsHtml, async () => {
        try {
            const res = await fetch('/api/order/manual', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_type: curAcc, ticker, qty, price, side, type })
            });
            const data = await res.json(); 
            alert(data.message || data.detail); 
            fetchIBM(); 
            if(document.getElementById('vr-toggle').checked) fetchVR();
            fetchAccountInfo();
            fetchOrders(); // 💡 주문 후 우측 히스토리 패널 및 잔고 자동 갱신
        } catch(e) { alert("수동 주문 통신 에러 발생"); }
    });
}

function bindAutocompleteEngine(inputId, suggestBoxId, selectCallback) {
    const input = document.getElementById(inputId);
    const box = document.getElementById(suggestBoxId);
    input.addEventListener('input', async () => {
        const word = input.value.trim().toUpperCase();
        if (!word) { box.classList.add('hidden'); return; }
        try {
            const response = await fetch(`/api/search?q=${word}`);
            const list = await response.json();
            if (list.length === 0) { box.classList.add('hidden'); return; }
            box.innerHTML = '';
            list.forEach(item => {
                const row = document.createElement('div');
                row.className = 'px-3 py-2 text-left text-xs hover:bg-zinc-800 cursor-pointer flex justify-between items-center border-b border-zinc-900/60 last:border-0 transition-colors';
                row.innerHTML = `<span class="font-bold text-zinc-100 tracking-wide">${item.symbol}</span><span class="text-zinc-500 text-[10px] truncate max-w-[140px] pl-2 text-right">${item.name}</span>`;
                row.addEventListener('click', () => {
                    input.value = item.symbol; box.classList.add('hidden'); selectCallback();
                });
                box.appendChild(row);
            });
            box.classList.remove('hidden');
        } catch (err) { console.error("검색 모듈 에러:", err); }
    });
    document.addEventListener('click', (e) => {
        if (e.target !== input && e.target !== box) box.classList.add('hidden');
    });
}

window.onload = () => { 
    initTheme();
    fetchAccountInfo(); // 💡 초기 구동 시 실시간 구매력 잔고 불러오기
    fetchIBM(); 
    fetchOrders(); // 💡 초기 구동 시 주문 히스토리 불러오기
    bindAutocompleteEngine('ibm-ticker', 'ibm-suggests', fetchIBM);
    bindAutocompleteEngine('vr-ticker', 'vr-suggests', fetchVR);
    bindAutocompleteEngine('m-ticker', 'm-suggests', () => {});
    document.getElementById('ibm-ticker').addEventListener('change', fetchIBM);
    document.getElementById('vr-ticker').addEventListener('change', fetchVR);
    document.getElementById('modal-confirm-btn').onclick = () => {
        if (pendingOrderCallback) pendingOrderCallback();
        closeOrderModal();
    };
};