let curAcc = 'live';
let vrData = null;
let pendingOrderCallback = null; 
let curLang = localStorage.getItem('lang') || 'ko';

function getAuthHeaders() {
    const apiKey = localStorage.getItem('alpaca_api_key') || '';
    const secretKey = localStorage.getItem('alpaca_secret_key') || '';
    return {
        'X-Alpaca-API-Key': apiKey,
        'X-Alpaca-Secret-Key': secretKey
    };
}

const translations = {
    ko: {
        subtitle: "라오어 무한매수법 & 밸류 리밸런싱 통합 관리 터미널",
        vrToggle: "VR 전략 켜기",
        liveAccount: "🔴 LIVE 계정",
        buyingPowerLabel: "구매력:",
        keySettingsBtn: "🔑 API Key 설정",
        themeDark: "다크",
        themeLight: "라이트",
        ibmTitle: "무한매수법",
        tickerLabel: "티커 실시간 검색",
        budgetLabel: "예산($)",
        divisionLabel: "division(일)",
        ibmRow1: "현재가 / 내 평단",
        ibmRow2: "보유량 / 익절가",
        ibmRow3: "금일 매수 예정 수량",
        ibmBtn: "LOC 통합 주문 전송",
        vrTitle: "밸류 리밸런싱",
        targetLabel: "현재 목표 밸류($)",
        vrRow1: "현재 자산 가치",
        vrRow2: "목표와의 차이 (Gap)",
        vrRow3: "수행할 동작",
        vrBtn: "리밸런싱 주문 실행",
        manualTitle: "수동 개별 오더 보드",
        manualSub: "실전 계정 전송",
        mTickerLabel: "티커 입력",
        mQtyLabel: "수량 (주)",
        mPriceLabel: "한도 가격 ($)",
        mLocBuy: "LOC 매수",
        mLocSell: "LOC 매도",
        mLimitBuy: "지정가 매수",
        mLimitSell: "지정가 매도",
        historyTitle: "주문 히스토리",
        modalDefaultTitle: "주문 승인 명세서",
        modalWarning: "⚠️ 실전 계좌 경고: 전송 시 자산이 즉시 체결 엔진으로 전달됩니다.",
        modalCancel: "주문 취소",
        modalConfirm: "최종 주문 승인",
        envModalTitle: "Alpaca 계정 연동 설정",
        envModalSub: "개인 브라우저(localStorage)에 안전하게 저장됩니다.",
        envModalBanner: "🔒 보안 안내: 입력한 API Key는 본인의 웹 브라우저(localStorage)에만 저장되며 암호화된 요청 헤더로 전송됩니다.",
        envFormTitle: "🔑 API Key 브라우저 저장",
        apiKeyLabel: "LIVE API Key ID",
        secretKeyLabel: "LIVE Secret Key",
        envSaveBtn: "🔑 Key 저장 및 연동하기",
        envClearBtn: "🗑️ 연동 해제 (삭제)",
        envDocsLink: "Alpaca API Key & Secret Key 발급 가이드 (공식 문서) ↗",
        envCloseBtn: "확인 (닫기)",
        noHistory: "최근 주문 내역이 없습니다.",
        fillAllFields: "티커 기호, 수량, 가격 설정을 모두 채워주세요.",
        mTabAll: "전체 보기",
        mTabManual: "수동주문"
    },
    en: {
        subtitle: "Laoer Infinite Buy & Value Rebalancing Trading Terminal",
        vrToggle: "Turn on VR Strategy",
        liveAccount: "🔴 LIVE Account",
        buyingPowerLabel: "Buying Power:",
        keySettingsBtn: "🔑 Key Settings",
        themeDark: "Dark",
        themeLight: "Light",
        ibmTitle: "Infinite Buy",
        tickerLabel: "Ticker Search",
        budgetLabel: "Budget ($)",
        divisionLabel: "Division (Days)",
        ibmRow1: "Current / Avg Price",
        ibmRow2: "Qty / Target Price",
        ibmRow3: "Scheduled Buy Today",
        ibmBtn: "Submit Integrated LOC Orders",
        vrTitle: "Value Rebalancing",
        targetLabel: "Target Value ($)",
        vrRow1: "Current Portfolio Value",
        vrRow2: "Gap from Target",
        vrRow3: "Required Action",
        vrBtn: "Execute Rebalancing Order",
        manualTitle: "Manual Order Board",
        manualSub: "Live Account Execution",
        mTickerLabel: "Ticker",
        mQtyLabel: "Quantity (Shares)",
        mPriceLabel: "Limit Price ($)",
        mLocBuy: "LOC Buy",
        mLocSell: "LOC Sell",
        mLimitBuy: "Limit Buy",
        mLimitSell: "Limit Sell",
        historyTitle: "Order History",
        modalDefaultTitle: "Order Confirmation Summary",
        modalWarning: "⚠️ Real Account Warning: Orders will be submitted immediately to the execution engine.",
        modalCancel: "Cancel Order",
        modalConfirm: "Confirm Final Order",
        envModalTitle: "Alpaca Account Setup",
        envModalSub: "Stored securely in your browser (localStorage).",
        envModalBanner: "🔒 Security Info: API keys are saved strictly in your browser's localStorage and passed via HTTPS headers.",
        envFormTitle: "🔑 Store API Keys in Browser",
        apiKeyLabel: "LIVE API Key ID",
        secretKeyLabel: "LIVE Secret Key",
        envSaveBtn: "🔑 Save & Connect Keys",
        envClearBtn: "🗑️ Disconnect Keys",
        envDocsLink: "Alpaca API Key & Secret Key Setup Guide (Official Docs) ↗",
        envCloseBtn: "Close",
        noHistory: "No recent order history.",
        fillAllFields: "Please fill in Ticker, Quantity, and Price.",
        mTabAll: "View All",
        mTabManual: "Manual"
    }
};

function applyLanguage(lang) {
    curLang = lang;
    localStorage.setItem('lang', lang);
    const t = translations[lang] || translations.ko;

    document.querySelectorAll('[data-i18n]').forEach(elem => {
        const key = elem.getAttribute('data-i18n');
        if (t[key]) {
            elem.innerText = t[key];
        }
    });

    const langText = document.getElementById('lang-toggle-text');
    if (langText) {
        langText.innerText = lang === 'ko' ? 'English' : '한국어';
    }

    const ibmInput = document.getElementById('ibm-ticker');
    if (ibmInput && ibmInput.value) refreshChartWidget('ibm-chart-container', ibmInput.value.trim().toUpperCase());
    const vrCard = document.getElementById('vr-card');
    const vrInput = document.getElementById('vr-ticker');
    if (vrCard && !vrCard.classList.contains('hidden') && vrInput && vrInput.value) {
        refreshChartWidget('vr-chart-container', vrInput.value.trim().toUpperCase());
    }

    fetchIBM();
    if (document.getElementById('vr-toggle').checked) fetchVR();
    fetchOrders();
}

function toggleLanguage() {
    const nextLang = curLang === 'ko' ? 'en' : 'ko';
    applyLanguage(nextLang);
}

function initLanguage() {
    const savedLang = localStorage.getItem('lang') || 'ko';
    applyLanguage(savedLang);
}

function saveEnvKeys() {
    const apiKey = document.getElementById('env-api-key').value.trim();
    const secretKey = document.getElementById('env-secret-key').value.trim();

    if (!apiKey || !secretKey) {
        alert(curLang === 'en' ? "Please enter both API Key and Secret Key." : "API Key와 Secret Key를 모두 입력해야 합니다.");
        return;
    }

    localStorage.setItem('alpaca_api_key', apiKey);
    localStorage.setItem('alpaca_secret_key', secretKey);
    alert(curLang === 'en' ? "Alpaca API keys saved safely in your browser!" : "Alpaca API Key가 브라우저에 성공적으로 저장되었습니다!");
    closeEnvModal();
    fetchAccountInfo();
    fetchIBM();
    if (document.getElementById('vr-toggle').checked) fetchVR();
    fetchOrders();
}

function clearEnvKeys() {
    localStorage.removeItem('alpaca_api_key');
    localStorage.removeItem('alpaca_secret_key');
    const apiKeyInput = document.getElementById('env-api-key');
    const secretKeyInput = document.getElementById('env-secret-key');
    if (apiKeyInput) apiKeyInput.value = '';
    if (secretKeyInput) secretKeyInput.value = '';
    const bpVal = document.getElementById('buying-power-val');
    if (bpVal) bpVal.innerText = '$-';
    alert(curLang === 'en' ? "Alpaca API keys cleared from browser." : "저장된 Alpaca API Key가 연동 해제되었습니다.");
    closeEnvModal();
    fetchAccountInfo();
    fetchOrders();
}

let currentMobileTab = 'all';

function switchMobileTab(tab) {
    currentMobileTab = tab;
    
    const tabs = ['all', 'ibm', 'vr', 'manual', 'history'];
    tabs.forEach(t => {
        const btn = document.getElementById(`mtab-${t}`);
        if (btn) {
            if (t === tab) {
                btn.className = "mobile-tab-btn flex-1 py-2 rounded-lg text-center transition-all bg-zinc-800 text-white font-bold shadow-sm border border-zinc-700/60";
            } else {
                btn.className = "mobile-tab-btn flex-1 py-2 rounded-lg text-center transition-all text-zinc-400 hover:text-white font-normal";
            }
        }
    });

    const grid = document.getElementById('strategy-grid');
    const ibmCard = document.querySelector('#strategy-grid > div:first-child');
    const vrCard = document.getElementById('vr-card');
    const manualCard = document.getElementById('manual-card');
    const historyCard = document.getElementById('history-card');
    const mainCol = grid ? grid.parentElement : null;

    if (window.innerWidth < 1024) {
        if (tab === 'all') {
            if (mainCol) mainCol.style.display = 'flex';
            if (grid) grid.style.display = 'grid';
            if (ibmCard) ibmCard.style.display = 'flex';
            if (vrCard) {
                vrCard.style.display = 'flex';
                vrCard.classList.remove('hidden');
                fetchVR();
            }
            if (manualCard) {
                manualCard.style.display = 'block';
                manualCard.classList.add('mt-3');
            }
            if (historyCard) historyCard.style.display = 'flex';
        } else if (tab === 'ibm') {
            if (mainCol) mainCol.style.display = 'flex';
            if (grid) grid.style.display = 'grid';
            if (ibmCard) ibmCard.style.display = 'flex';
            if (vrCard) vrCard.style.display = 'none';
            if (manualCard) manualCard.style.display = 'none';
            if (historyCard) historyCard.style.display = 'none';
        } else if (tab === 'vr') {
            if (mainCol) mainCol.style.display = 'flex';
            if (grid) grid.style.display = 'grid';
            if (ibmCard) ibmCard.style.display = 'none';
            if (vrCard) {
                vrCard.style.display = 'flex';
                vrCard.classList.remove('hidden');
                fetchVR();
            }
            if (manualCard) manualCard.style.display = 'none';
            if (historyCard) historyCard.style.display = 'none';
        } else if (tab === 'manual') {
            if (mainCol) mainCol.style.display = 'flex';
            if (grid) grid.style.display = 'none';
            if (ibmCard) ibmCard.style.display = 'none';
            if (vrCard) vrCard.style.display = 'none';
            if (manualCard) {
                manualCard.style.display = 'block';
                manualCard.classList.remove('mt-3');
            }
            if (historyCard) historyCard.style.display = 'none';
        } else if (tab === 'history') {
            if (mainCol) mainCol.style.display = 'none';
            if (grid) grid.style.display = 'none';
            if (ibmCard) ibmCard.style.display = 'none';
            if (vrCard) vrCard.style.display = 'none';
            if (manualCard) manualCard.style.display = 'none';
            if (historyCard) historyCard.style.display = 'flex';
        }
    } else {
        if (mainCol) mainCol.style.display = '';
        if (grid) grid.style.display = '';
        if (ibmCard) ibmCard.style.display = '';
        if (vrCard) {
            const isVrChecked = document.getElementById('vr-toggle')?.checked;
            vrCard.style.display = isVrChecked ? '' : 'none';
            if (!isVrChecked) vrCard.classList.add('hidden');
        }
        if (manualCard) {
            manualCard.style.display = '';
            manualCard.classList.add('mt-3');
        }
        if (historyCard) historyCard.style.display = '';
    }
}

window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) {
        switchMobileTab('all');
    }
});

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
        if (currentMobileTab === 'vr') switchMobileTab('all');
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
        if (themeText) themeText.innerText = curLang === 'en' ? 'Light' : '라이트';
        if (toggleBtn) toggleBtn.setAttribute('title', curLang === 'en' ? 'Switch to Dark Mode' : '스위치: 다크 모드로 변경');
    } else {
        document.documentElement.classList.remove('light-mode');
        if (darkIcon) darkIcon.classList.add('hidden');
        if (lightIcon) lightIcon.classList.remove('hidden');
        if (themeText) themeText.innerText = curLang === 'en' ? 'Dark' : '다크';
        if (toggleBtn) toggleBtn.setAttribute('title', curLang === 'en' ? 'Switch to Light Mode' : '스위치: 라이트 모드로 변경');
    }
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const current = getCurrentTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);

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
    try {
        const activeTheme = getCurrentTheme();
        const container = document.getElementById(containerId);
        if (container && typeof TradingView !== 'undefined' && TradingView.widget) {
            new TradingView.widget({
                "autosize": true,
                "symbol": ticker, 
                "interval": "D",
                "timezone": "Asia/Seoul",
                "theme": activeTheme,
                "style": "1", 
                "locale": curLang === 'en' ? "en" : "ko",
                "toolbar_bg": activeTheme === 'dark' ? "#111827" : "#ffffff",
                "enable_publishing": false,
                "hide_top_toolbar": true,
                "hide_legend": true,
                "save_image": false,
                "extended_hours": true, 
                "container_id": containerId
            });
        }
    } catch (e) {
        console.warn("TradingView widget loading skipped/failed:", e);
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
        box.classList.add('scale-100');
    }, 10);
}

function closeOrderModal() {
    const modal = document.getElementById('order-modal');
    const box = document.getElementById('modal-box');
    modal.classList.add('opacity-0');
    box.classList.remove('scale-100');
    box.classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); }, 200);
    pendingOrderCallback = null;
}

function openEnvModal() {
    const modal = document.getElementById('env-modal');
    const box = document.getElementById('env-modal-box');
    const apiKeyInput = document.getElementById('env-api-key');
    const secretKeyInput = document.getElementById('env-secret-key');

    if (apiKeyInput) apiKeyInput.value = localStorage.getItem('alpaca_api_key') || '';
    if (secretKeyInput) secretKeyInput.value = localStorage.getItem('alpaca_secret_key') || '';

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        box.classList.remove('scale-95');
        box.classList.add('scale-100');
    }, 10);
}

function closeEnvModal() {
    const modal = document.getElementById('env-modal');
    const box = document.getElementById('env-modal-box');
    modal.classList.add('opacity-0');
    box.classList.remove('scale-100');
    box.classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); }, 200);
}

async function checkEnvBeforeOrder() {
    const apiKey = localStorage.getItem('alpaca_api_key');
    const secretKey = localStorage.getItem('alpaca_secret_key');
    if (apiKey && secretKey) return true;

    try {
        const res = await fetch('/api/check-env', { headers: getAuthHeaders() });
        if (res.ok) {
            const status = await res.json();
            if (status.has_keys) return true;
        }
    } catch(e) {
        console.error("환경 변수 상태 확인 실패:", e);
    }
    openEnvModal();
    return false;
}

function toggleOrderDetail(orderId) {
    const detailBox = document.getElementById('detail-' + orderId);
    if (detailBox.classList.contains('hidden')) {
        detailBox.classList.remove('hidden');
    } else {
        detailBox.classList.add('hidden');
    }
}

async function fetchAccountInfo() {
    try {
        const res = await fetch(`/api/account/${curAcc}`, { headers: getAuthHeaders() });
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

async function fetchOrders() {
    try {
        const res = await fetch(`/api/orders/${curAcc}`, { headers: getAuthHeaders() });
        const data = await res.json();
        const container = document.getElementById('order-history-list');
        container.innerHTML = '';
        
        if (data.length === 0) {
            const emptyText = curLang === 'en' ? 'No recent order history.' : '최근 주문 내역이 없습니다.';
            container.innerHTML = `<div class="text-xs text-zinc-500 text-center py-4">${emptyText}</div>`;
            return;
        }

        data.forEach(o => {
            const isBuy = o.side === 'BUY';
            const sideColor = isBuy ? 'text-emerald-400' : 'text-rose-400';
            const sideText = isBuy ? (curLang === 'en' ? 'BUY' : '매수') : (curLang === 'en' ? 'SELL' : '매도');
            
            let statusColor = 'text-zinc-500';
            let statusText = o.status;
            
            if (o.status === 'FILLED') { 
                statusColor = 'text-cyan-400'; 
                statusText = curLang === 'en' ? 'Filled' : '체결완료'; 
            } else if (o.status === 'NEW' || o.status === 'ACCEPTED' || o.status === 'PENDING_NEW' || o.status === 'PARTIALLY_FILLED') { 
                statusColor = 'text-amber-400'; 
                statusText = curLang === 'en' ? 'Pending' : '대기중'; 
            } else if (o.status === 'CANCELED' || o.status === 'REJECTED') { 
                statusColor = 'text-rose-600'; 
                statusText = curLang === 'en' ? 'Canceled' : '취소/거절'; 
            }

            const priceText = o.limit_price ? `$${o.limit_price}` : (curLang === 'en' ? 'Market' : '시장가');
            const unit = curLang === 'en' ? 'shares' : '주';
            const typeLabel = curLang === 'en' ? 'Order Type' : '주문 유형';
            const limitLabel = curLang === 'en' ? 'Limit Price' : '지정 가격';
            const filledLabel = curLang === 'en' ? 'Filled Qty' : '체결 수량';
            const idLabel = curLang === 'en' ? 'Order ID' : '주문 ID';
            
            const html = `
                <div class="border border-zinc-800/60 rounded-md overflow-hidden bg-zinc-950/50 hover:border-zinc-700 transition-colors">
                    <div class="p-3 flex justify-between items-center cursor-pointer select-none" onclick="toggleOrderDetail('${o.id}')">
                        <div class="flex flex-col">
                            <span class="text-xs font-bold ${sideColor}">${sideText} ${o.symbol}</span>
                            <span class="text-[10px] text-zinc-500 mt-0.5">${o.submitted_at}</span>
                        </div>
                        <div class="flex flex-col items-end">
                            <span class="text-xs font-bold text-zinc-200">${o.qty} ${unit}</span>
                            <span class="text-[10px] font-semibold ${statusColor} mt-0.5">${statusText}</span>
                        </div>
                    </div>
                    <div id="detail-${o.id}" class="hidden px-3 pb-3 pt-1 border-t border-zinc-800/50 bg-zinc-900/30 text-[10px] text-zinc-400 space-y-1">
                        <div class="flex justify-between"><span>${typeLabel}</span><span class="text-zinc-200">${o.type}</span></div>
                        <div class="flex justify-between"><span>${limitLabel}</span><span class="text-zinc-200">${priceText}</span></div>
                        <div class="flex justify-between"><span>${filledLabel}</span><span class="text-zinc-200">${o.filled_qty} ${unit}</span></div>
                        <div class="flex justify-between items-center mt-1 pt-1 border-t border-zinc-800/50">
                            <span>${idLabel}</span><span class="text-zinc-600 truncate max-w-[120px]" title="${o.id}">${o.id}</span>
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
        const res = await fetch(`/api/status/ibm/${curAcc}/${t}/${b}/${d}`, { headers: getAuthHeaders() });
        const data = await res.json();
        if(res.ok) {
            const unit = curLang === 'en' ? 'shares' : '주';
            document.getElementById('ibm-price').innerText = `$${data.current_price} / $${data.avg_entry_price}`;
            document.getElementById('ibm-qty').innerText = `${data.current_qty} ${unit} / $${data.sell_target}`;
            document.getElementById('ibm-shares').innerText = `${data.shares_per_half * 2} ${unit}`;
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
        const res = await fetch(`/api/status/vr/${curAcc}/${t}/${target}`, { headers: getAuthHeaders() });
        vrData = await res.json();
        if(res.ok) {
            const unit = curLang === 'en' ? 'shares' : '주';
            const actionText = vrData.gap > 0 ? (curLang === 'en' ? 'BUY' : '매수') : (curLang === 'en' ? 'SELL' : '매도');
            document.getElementById('vr-current-val').innerText = `$${vrData.current_value}`;
            document.getElementById('vr-gap').innerText = `$${vrData.gap}`;
            document.getElementById('vr-action').innerText = `${actionText} ${vrData.required_qty} ${unit}`;
            document.getElementById('vr-action').style.color = vrData.gap > 0 ? '#4ade80' : '#f87171';
        }
    } catch(e) { console.error("VR 데이터 로드 실패"); }
}

async function sendIBM() {
    const isEnvValid = await checkEnvBeforeOrder();
    if (!isEnvValid) return;

    const t = document.getElementById('ibm-ticker').value.trim().toUpperCase();
    const b = document.getElementById('ibm-budget').value;
    const d = document.getElementById('ibm-division').value;
    const sharesText = document.getElementById('ibm-shares').innerText;

    const modalTitle = curLang === 'en' ? "Infinite Buy 4-Order Final Approval" : "무한매수법 4중 오더 최종 승인";

    const detailsHtml = curLang === 'en' ? `
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">Target Account</span><span class="font-bold text-rose-400">REAL Account</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">Strategy</span><span class="font-semibold text-cyan-400">Infinite Buy V2.0 CLS (Custom 4-Orders)</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">Ticker</span><span class="font-bold text-zinc-100 text-sm">${t}</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">Schedule</span><span class="font-medium text-zinc-200">$${b} / ${d} Days Division</span></li>
        <li class="flex justify-between pt-1"><span class="text-zinc-400 font-semibold">Total Buy Today</span><span class="font-bold text-emerald-400">${sharesText} (0.5x Split Each)</span></li>
        <li class="flex flex-col gap-2 bg-zinc-950 p-3 rounded-md mt-3 text-[11px] text-zinc-400 border border-zinc-800/30 leading-relaxed">
            <div class="text-zinc-500 font-semibold border-b border-zinc-900 pb-1 mb-1">📋 Scheduled 4-Order Execution Breakdown</div>
            <div class="flex justify-between"><span>1️⃣ Buy: Average Price basis</span><span class="text-cyan-400 font-medium">LOC Buy</span></div>
            <div class="flex justify-between"><span>2️⃣ Buy: Avg Price +5% basis</span><span class="text-cyan-400 font-medium">LOC Buy</span></div>
            <div class="flex justify-between"><span>3️⃣ Sell: 25% of holdings (Avg+5% + $0.01)</span><span class="text-rose-400 font-medium">LOC Sell</span></div>
            <div class="flex justify-between"><span>4️⃣ Sell: Remaining 75% (Avg+10.5%)</span><span class="text-amber-400 font-medium">Limit Sell (GTC)</span></div>
        </li>
    ` : `
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

    openOrderModal(modalTitle, detailsHtml, async () => {
        try {
            const res = await fetch('/api/order/auto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ account_type: curAcc, ticker: t, budget: b, division: d })
            });
            const d2 = await res.json();
            if (!res.ok) {
                if (d2.detail && (d2.detail.error === 'MISSING_ENV' || (typeof d2.detail === 'string' && d2.detail.includes('.env')))) {
                    openEnvModal();
                    return;
                }
                alert(typeof d2.detail === 'string' ? d2.detail : (d2.detail?.message || "주문 실패"));
                return;
            }
            alert(d2.message); 
            fetchIBM();
            fetchAccountInfo();
            fetchOrders();
        } catch(e) {
            alert(curLang === 'en' ? "Error occurred during order request" : "주문 요청 중 오류 발생");
        }
    });
}

async function sendVR() {
    if(!vrData) return;
    const isEnvValid = await checkEnvBeforeOrder();
    if (!isEnvValid) return;

    const t = document.getElementById('vr-ticker').value.trim().toUpperCase();
    const actionColor = vrData.gap > 0 ? 'text-emerald-400' : 'text-rose-400';
    const sharesUnit = curLang === 'en' ? 'shares' : '주';
    const actionText = vrData.action === 'BUY' ? (curLang === 'en' ? 'BUY' : '매수') : (curLang === 'en' ? 'SELL' : '매도');

    const modalTitle = curLang === 'en' ? "Value Rebalancing Order Approval" : "밸류 리밸런싱 오더 승인";

    const detailsHtml = curLang === 'en' ? `
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">Target Account</span><span class="font-bold text-rose-400">REAL Account</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">Strategy</span><span class="font-semibold text-amber-400">Value Rebalancing (Value Path)</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">Ticker</span><span class="font-bold text-zinc-100 text-sm">${t}</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">Target Value</span><span class="font-medium text-zinc-200">$${document.getElementById('vr-target').value}</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">Asset Gap</span><span class="font-medium text-zinc-100">$${vrData.gap}</span></li>
        <li class="flex justify-between pt-1"><span class="text-zinc-400 font-semibold">Final Order</span><span class="font-extrabold ${actionColor}">${actionText} ${vrData.required_qty} ${sharesUnit} (Market Day Order)</span></li>
    ` : `
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">지정 계좌</span><span class="font-bold text-rose-400">실전 REAL 계정</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">선택 전략</span><span class="font-semibold text-amber-400">밸류 리밸런싱 (Value Path)</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">투자 종목</span><span class="font-bold text-zinc-100 text-sm">${t}</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">목표 경로 밸류</span><span class="font-medium text-zinc-200">$${document.getElementById('vr-target').value}</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">자산 괴리율 (Gap)</span><span class="font-medium text-zinc-100">$${vrData.gap}</span></li>
        <li class="flex justify-between pt-1"><span class="text-zinc-400 font-semibold">최종 거래 오더</span><span class="font-extrabold ${actionColor}">${vrData.action} ${vrData.required_qty}주 (당일 시장가)</span></li>
    `;
    openOrderModal(modalTitle, detailsHtml, async () => {
        try {
            const res = await fetch('/api/order/vr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ account_type: curAcc, ticker: t, qty: vrData.required_qty, action: vrData.action })
            });
            const d2 = await res.json();
            if (!res.ok) {
                if (d2.detail && (d2.detail.error === 'MISSING_ENV' || (typeof d2.detail === 'string' && d2.detail.includes('.env')))) {
                    openEnvModal();
                    return;
                }
                alert(typeof d2.detail === 'string' ? d2.detail : (d2.detail?.message || "주문 실패"));
                return;
            }
            alert(d2.message); 
            fetchVR();
            fetchAccountInfo();
            fetchOrders();
        } catch(e) {
            alert(curLang === 'en' ? "Error occurred during rebalancing order" : "리밸런싱 주문 중 오류 발생");
        }
    });
}

async function sendManual(side, type) {
    const ticker = document.getElementById('m-ticker').value.trim().toUpperCase();
    const qty = document.getElementById('m-qty').value;
    const price = document.getElementById('m-price').value;
    if(!ticker || !qty || !price) {
        alert(curLang === 'en' ? "Please fill in Ticker, Quantity, and Price." : "티커 기호, 수량, 가격 설정을 모두 채워주세요.");
        return;
    }

    const isEnvValid = await checkEnvBeforeOrder();
    if (!isEnvValid) return;

    const modalTitle = curLang === 'en' ? "Manual Order Approval" : "수동 개별 오더 승인";
    const sharesUnit = curLang === 'en' ? 'shares' : '주';

    const typeStr = type === 'LOC' 
        ? (curLang === 'en' ? 'LOC (Market Close Limit)' : 'LOC (당일 장마감 동시호가 지정)') 
        : (curLang === 'en' ? 'LIMIT (Good-Til-Canceled)' : 'LIMIT (지정가 무기한 GTC)');
    
    const sideStr = side === 'BUY' 
        ? (curLang === 'en' ? 'Manual Buy Submission' : '개별 수동 매수 기입') 
        : (curLang === 'en' ? 'Manual Sell Submission' : '개별 수동 매도 기입');
    
    const sideColor = side === 'BUY' ? 'text-emerald-400' : 'text-rose-400';

    const detailsHtml = curLang === 'en' ? `
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">Target Account</span><span class="font-bold text-rose-400">REAL Account</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">Strategy</span><span class="font-semibold text-rose-400">Manual Order Board</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">Ticker</span><span class="font-bold text-zinc-100 text-sm">${ticker}</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">Execution Type</span><span class="font-medium text-zinc-200">${typeStr}</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">Qty / Price</span><span class="font-medium text-zinc-200">${qty} ${sharesUnit} / $${price}</span></li>
        <li class="flex justify-between pt-1"><span class="text-zinc-400 font-semibold">Final Action</span><span class="font-extrabold ${sideColor}">${sideStr}</span></li>
    ` : `
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">지정 계좌</span><span class="font-bold text-rose-400">실전 REAL 계정</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">선택 전략</span><span class="font-semibold text-rose-400">수동 개별 오더 보드</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">투자 종목</span><span class="font-bold text-zinc-100 text-sm">${ticker}</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">호가 처리 방식</span><span class="font-medium text-zinc-200">${typeStr}</span></li>
        <li class="flex justify-between border-b border-zinc-800/60 pb-1.5"><span class="text-zinc-500">신청 수량 / 가격</span><span class="font-medium text-zinc-200">${qty}주 / $${price}</span></li>
        <li class="flex justify-between pt-1"><span class="text-zinc-400 font-semibold">최종 수동 거래</span><span class="font-extrabold ${sideColor}">${sideStr} 전송</span></li>
    `;
    openOrderModal(modalTitle, detailsHtml, async () => {
        try {
            const res = await fetch('/api/order/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ account_type: curAcc, ticker, qty, price, side, type })
            });
            const data = await res.json(); 
            if (!res.ok) {
                if (data.detail && (data.detail.error === 'MISSING_ENV' || (typeof data.detail === 'string' && data.detail.includes('.env')))) {
                    openEnvModal();
                    return;
                }
                alert(typeof data.detail === 'string' ? data.detail : (data.detail?.message || "수동 주문 실패"));
                return;
            }
            alert(data.message || data.detail); 
            fetchIBM(); 
            if(document.getElementById('vr-toggle').checked) fetchVR();
            fetchAccountInfo();
            fetchOrders();
        } catch(e) {
            alert(curLang === 'en' ? "Error occurred during manual order submission" : "수동 주문 통신 에러 발생");
        }
    });
}

function bindAutocompleteEngine(inputId, suggestBoxId, selectCallback) {
    const input = document.getElementById(inputId);
    const box = document.getElementById(suggestBoxId);
    input.addEventListener('input', async () => {
        const word = input.value.trim().toUpperCase();
        if (!word) { box.classList.add('hidden'); return; }
        try {
            const response = await fetch(`/api/search?q=${word}`, { headers: getAuthHeaders() });
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
    initLanguage();
    initTheme();
    fetchAccountInfo();
    fetchIBM(); 
    fetchOrders();
    bindAutocompleteEngine('ibm-ticker', 'ibm-suggests', fetchIBM);
    bindAutocompleteEngine('vr-ticker', 'vr-suggests', fetchVR);
    bindAutocompleteEngine('m-ticker', 'm-suggests', () => {});
    
    const ibmInput = document.getElementById('ibm-ticker');
    if (ibmInput) ibmInput.addEventListener('change', fetchIBM);
    const vrInput = document.getElementById('vr-ticker');
    if (vrInput) vrInput.addEventListener('change', fetchVR);

    const confirmBtn = document.getElementById('modal-confirm-btn');
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            if (pendingOrderCallback) pendingOrderCallback();
            closeOrderModal();
        };
    }

    if (!localStorage.getItem('alpaca_api_key') || !localStorage.getItem('alpaca_secret_key')) {
        setTimeout(openEnvModal, 300);
    }
};
