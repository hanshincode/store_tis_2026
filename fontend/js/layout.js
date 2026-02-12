// js/layout.js
document.addEventListener('DOMContentLoaded', async () => {
    // Tự động nhận diện xem có đang ở trong thư mục con (user, admin...) không
    const isInSubFolder = window.location.pathname.includes('/user/') || window.location.pathname.includes('/admin/');
    const basePath = isInSubFolder ? '../' : '';

    // 1. Nhúng Header
    const headerElement = document.getElementById('header-placeholder');
    if (headerElement) {
        try {
            const response = await fetch(`${basePath}components/header.html`);
            headerElement.innerHTML = await response.text();
            
            initHeaderLogic();
            initAuthDisplay();
            updateCartBadge();
            if (typeof initRealtimeSearch === 'function') initRealtimeSearch(); 

            // FIX ĐƯỜNG DẪN LOGO & LINK TRONG HEADER NẾU Ở THƯ MỤC CON
            if (isInSubFolder) fixHeaderLinks(basePath);

        } catch (error) { console.error("Lỗi khi tải Header:", error); }
    }

    // 2. Nhúng Footer
    const footerElement = document.getElementById('footer-placeholder');
    if (footerElement) {
        try {
            const response = await fetch(`${basePath}components/footer.html`);
            footerElement.innerHTML = await response.text();
            if (isInSubFolder) fixFooterLinks(basePath);
        } catch (error) { console.error("Lỗi khi tải Footer:", error); }
    }
});


// Hàm tự động sửa đường dẫn hình ảnh và link khi ở thư mục con
// Thay thế hàm này trong js/layout.js
function fixHeaderLinks(basePath) {
    const navLogo = document.getElementById('nav-logo');
    if (navLogo) navLogo.src = `${basePath}images/logo.png`;
    
    // Gom tất cả các thẻ <a> trên Header cần được tự động căn chỉnh đường dẫn
    const headerLinks = document.querySelectorAll('#mainNavbar a.nav-link, .navbar-brand, .nav-cart-btn, #nav-auth a, .dropdown-item');
    
    headerLinks.forEach(link => {
        let href = link.getAttribute('href');
        // Bỏ qua các link trống, link nhảy (#) hoặc link chức năng (javascript:)
        if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('javascript')) {
            link.setAttribute('href', basePath + href);
        }
    });
}

function fixFooterLinks(basePath) {
    document.querySelectorAll('footer img').forEach(img => {
        let src = img.getAttribute('src');
        if (src && !src.startsWith('http')) img.setAttribute('src', basePath + src);
    });
}



// Xử lý hiệu ứng cuộn Navbar
// Thay thế hàm này trong js/layout.js
function initHeaderLogic() {
    const nav = document.getElementById('mainNavbar');
    
    // Kiểm tra xem có đang ở trang chủ không
    const isHomePage = window.location.pathname.endsWith('index.html') || 
                       window.location.pathname === '/' || 
                       window.location.pathname.endsWith('/');

    // Nếu KHÔNG PHẢI trang chủ -> Bật nền trắng cho Navbar ngay lập tức
    if (!isHomePage) {
        nav.classList.add('navbar-scrolled', 'shadow-sm');
        nav.classList.remove('shadow-none');
    }

    // Xử lý hiệu ứng khi cuộn chuột
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50 || !isHomePage) {
            nav.classList.add('navbar-scrolled', 'shadow-sm');
            nav.classList.remove('shadow-none');
        } else {
            nav.classList.remove('navbar-scrolled', 'shadow-sm');
            nav.classList.add('shadow-none');
        }
    });
}

// Kiểm tra đăng nhập
async function initAuthDisplay() {
    const token = getAccessToken();
    if (token) {
        try {
            const user = await fetchAPI('/users/me/');
            document.getElementById('username-display').innerText = user.first_name || user.username;
            document.getElementById('nav-auth').classList.add('d-none');
            document.getElementById('nav-user').classList.remove('d-none');
            if (user.is_staff || user.is_superuser) {
                document.getElementById('admin-link').classList.remove('d-none');
            }
        } catch (e) { window.logout(); }
    }
}

// Cập nhật giỏ hàng
async function updateCartBadge() {
    if (!getAccessToken()) return;
    try {
        const cart = await fetchAPI('/cart/');
        document.getElementById('cart-count-badge').innerText = cart.total_items || 0;
    } catch (e) {}
}

function handleGlobalSearch(event) {
    event.preventDefault();
    const query = document.getElementById('global-search').value;
    alert("Đang tìm kiếm: " + query); // Thay bằng logic chuyển trang search của bạn
}



function initRealtimeSearch() {
    const searchInput = document.getElementById('global-search');
    const suggestionsBox = document.getElementById('search-suggestions');
    let timeoutId;

    if (!searchInput || !suggestionsBox) return;

    // Lắng nghe sự kiện gõ phím
    searchInput.addEventListener('input', function(e) {
        clearTimeout(timeoutId); // Xóa lịch trình cũ nếu người dùng đang gõ liên tục
        const query = e.target.value.trim().toLowerCase();

        // Nếu gõ ít hơn 2 ký tự thì ẩn hộp gợi ý đi
        if (query.length < 2) {
            suggestionsBox.classList.add('d-none');
            return;
        }

        // Hiện icon loading xoay xoay (Trải nghiệm người dùng)
        suggestionsBox.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-danger"></div></div>';
        suggestionsBox.classList.remove('d-none');

        // DEBOUNCE: Chờ 300ms sau khi ngừng gõ mới tiến hành tìm kiếm
        timeoutId = setTimeout(async () => {
            try {
                // Tạm thời gọi API lấy toàn bộ sản phẩm rồi tự lọc (Nhanh nhất cho DB nhỏ/vừa)
                const products = await fetchAPI('/products/');
                const filtered = products.filter(p => p.name.toLowerCase().includes(query));

                renderSuggestions(filtered, query);
            } catch (err) {
                console.error("Lỗi tìm kiếm realtime:", err);
            }
        }, 300);
    });

    // Ẩn kết quả khi click chuột ra chỗ khác trên màn hình
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.classList.add('d-none');
        }
    });
    
    // Hiện lại kết quả cũ khi bấm lại vào ô tìm kiếm
    searchInput.addEventListener('focus', function() {
        if (this.value.trim().length >= 2 && suggestionsBox.innerHTML !== '') {
            suggestionsBox.classList.remove('d-none');
        }
    });
}

// Hàm vẽ danh sách kết quả rơi xuống
function renderSuggestions(products, query) {
    const suggestionsBox = document.getElementById('search-suggestions');
    
    if (products.length === 0) {
        suggestionsBox.innerHTML = `<div class="p-3 text-muted small text-center">Không tìm thấy "${query}"</div>`;
        return;
    }

    // Chỉ hiển thị tối đa 5 kết quả đầu tiên cho gọn
    const topResults = products.slice(0, 5);

    let html = topResults.map(p => {
        // Xử lý đường dẫn ảnh an toàn (Fix 404)
        let imageUrl = 'https://placehold.co/100x100/f8f9fa/d71920?text=TIS';
        if (p.images && p.images.length > 0 && p.images[0].image) {
            let imgPath = p.images[0].image;
            if (imgPath.startsWith('http')) imageUrl = imgPath;
            else {
                if (!imgPath.includes('/media/')) imgPath = imgPath.startsWith('/') ? `/media${imgPath}` : `/media/${imgPath}`;
                imageUrl = DOMAIN + imgPath;
            }
        }
        
        let priceDisplay = p.base_price ? formatMoney(p.base_price) : 'Liên hệ';

        // Trả về HTML cho 1 dòng sản phẩm
        return `
            <a href="product-detail.html?id=${p.id}" class="suggestion-item">
                <img src="${imageUrl}" alt="${p.name}" class="suggestion-img">
                <div>
                    <h6 class="mb-1 fw-bold suggestion-title">${p.name}</h6>
                    <span class="text-danger fw-bold small">${priceDisplay}</span>
                </div>
            </a>
        `;
    }).join('');
    
    // Nếu có nhiều hơn 5 kết quả, hiện nút "Xem tất cả" để sang trang products.html
    if (products.length > 5) {
        html += `
            <a href="products.html?search=${encodeURIComponent(query)}" class="d-block text-center p-2 bg-light text-danger fw-bold small text-decoration-none border-top transition-hover">
                Xem thêm ${products.length - 5} kết quả <i class="fas fa-arrow-right ms-1"></i>
            </a>
        `;
    }

    suggestionsBox.innerHTML = html;
}