// js/common.js
const DOMAIN = 'http://127.0.0.1:8000';
const API_BASE_URL = `${DOMAIN}/api`; 
const MEDIA_URL = DOMAIN; 

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

function formatMoney(amount) {
    if (!amount) return '0 ₫';
    let num = parseFloat(amount);
    return isNaN(num) ? '0 ₫' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

function getAccessToken() { return localStorage.getItem(ACCESS_TOKEN_KEY); }
function getRefreshToken() { return localStorage.getItem(REFRESH_TOKEN_KEY); }
function setTokens(access, refresh) {
    if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

window.logout = function() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.location.href = '/login.html'; 
};

// HÀM FETCH ĐÃ ĐƯỢC FIX ĐỂ UPLOAD ẢNH
async function fetchAPI(endpoint, method = 'GET', body = null) {
    let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    const headers = {};
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // TỰ ĐỘNG NHẬN DIỆN: Nếu body là FormData thì ĐỂ TRỐNG Content-Type
    if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const config = { method, headers };
    if (body) {
        config.body = (body instanceof FormData) ? body : JSON.stringify(body);
    }

    try {
        let response = await fetch(url, config);
        // Tự động refresh token nếu 401
        if (response.status === 401 && !url.includes('login')) {
            const newToken = await refreshAccessToken();
            if (newToken) {
                config.headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(url, config);
            } else { window.logout(); throw new Error("Hết hạn"); }
        }
        if (response.status === 204) return null;
        const data = await response.json();
        if (!response.ok) throw data;
        return data;
    } catch (error) { throw error; }
}

async function refreshAccessToken() {
    const refresh = getRefreshToken();
    if (!refresh) return null;
    try {
        const res = await fetch(`${API_BASE_URL}/token/refresh/`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh })
        });
        if (res.ok) {
            const data = await res.json();
            setTokens(data.access, data.refresh); return data.access;
        }
    } catch (e) {} return null;
}

const Toast = typeof Swal !== 'undefined' ? Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true
}) : { fire: (o) => alert(o.title) };