// js/product-detail.js

let currentProduct = null;
let selectedPackageId = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Lấy ID sản phẩm từ URL (Ví dụ: product-detail.html?id=5)
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        // Nếu không có ID, đá về trang sản phẩm
        window.location.href = 'products.html';
        return;
    }

    loadProductDetail(productId);
});

async function loadProductDetail(id) {
    const container = document.getElementById('product-detail-container');
    
    try {
        // Gọi API lấy chi tiết 1 sản phẩm
        currentProduct = await fetchAPI(`/products/${id}/`);
        
        // Cập nhật thanh Breadcrumb
        document.getElementById('breadcrumb-name').innerText = currentProduct.name;

        // Render toàn bộ giao diện
        renderDetailUI();

    } catch (e) {
        console.error("Lỗi tải chi tiết sản phẩm:", e);
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle text-warning display-1 mb-3"></i>
                <h3 class="fw-bold text-dark">Sản phẩm không tồn tại</h3>
                <p class="text-muted">Sản phẩm này có thể đã bị xóa hoặc ngừng cung cấp.</p>
                <a href="products.html" class="btn btn-danger rounded-pill px-4 mt-3">Quay lại danh sách</a>
            </div>
        `;
    }
}

function renderDetailUI() {
    const container = document.getElementById('product-detail-container');
    const p = currentProduct;

    // --- 1. XỬ LÝ ẢNH (Fix 404) ---
    let imagesHtml = '';
    let mainImageUrl = 'https://placehold.co/800x600/f8f9fa/d71920?text=TIS+Broker';
    
    if (p.images && p.images.length > 0) {
        // Lấy ảnh đầu tiên làm ảnh chính
        mainImageUrl = getValidImageUrl(p.images[0].image);
        
        // Tạo danh sách ảnh thu nhỏ (Thumbnails)
        let thumbnails = p.images.map((imgObj, idx) => {
            let thumbUrl = getValidImageUrl(imgObj.image);
            let activeClass = idx === 0 ? 'active' : '';
            return `
                <div class="col-3">
                    <img src="${thumbUrl}" class="thumbnail-img ${activeClass}" onclick="changeMainImage(this, '${thumbUrl}')">
                </div>
            `;
        }).join('');
        
        imagesHtml = `<div class="row g-2 mt-2">${thumbnails}</div>`;
    }

    // --- 2. XỬ LÝ GÓI BẢO HIỂM (Packages) ---
    let packagesHtml = '';
    let displayPrice = p.base_price ? formatMoney(p.base_price) : 'Liên hệ';
    
    if (p.packages && p.packages.length > 0) {
        // Chọn sẵn gói đầu tiên làm mặc định
        selectedPackageId = p.packages[0].id;
        displayPrice = formatMoney(p.packages[0].price);

        packagesHtml = p.packages.map((pkg, idx) => {
            let isSelected = idx === 0 ? 'selected' : '';
            let checked = idx === 0 ? 'checked' : '';
            return `
                <label class="package-option d-block mb-3 ${isSelected}" id="pkg-label-${pkg.id}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <input type="radio" name="product_package" value="${pkg.id}" class="form-check-input me-3" ${checked} 
                                   onchange="selectPackage(${pkg.id}, ${pkg.price})">
                            <div>
                                <h6 class="mb-0 fw-bold">${pkg.name}</h6>
                                <small class="text-muted">${pkg.duration_days} ngày bảo vệ</small>
                            </div>
                        </div>
                        <div class="fw-bold text-danger">${formatMoney(pkg.price)}</div>
                    </div>
                </label>
            `;
        }).join('');
    } else {
        packagesHtml = `<div class="alert alert-light border text-muted small"><i class="fas fa-info-circle me-1"></i> Sản phẩm này hiện chưa có gói cụ thể. Vui lòng liên hệ để được tư vấn.</div>`;
    }

    // --- 3. GHÉP HTML TOÀN TRANG ---
    container.innerHTML = `
        <div class="row g-5 bg-white p-4 p-md-5 rounded-4 shadow-sm mb-5">
            <div class="col-lg-5">
                <div class="main-image-wrapper position-relative">
                    ${p.provider_name ? `<span class="badge bg-danger position-absolute top-0 start-0 m-3 px-3 py-2 rounded-pill shadow-sm">${p.provider_name}</span>` : ''}
                    <img src="${mainImageUrl}" id="main-product-image" alt="${p.name}">
                </div>
                ${imagesHtml}
            </div>

            <div class="col-lg-7">
                <h2 class="fw-bold text-dark mb-3">${p.name}</h2>
                <p class="text-muted mb-4">${p.description ? p.description.replace(/(<([^>]+)>)/gi, "") : 'Đang cập nhật mô tả ngắn.'}</p>
                
                <hr class="text-muted opacity-25">
                
                <h3 class="fw-bolder text-danger mb-4" id="display-price">${displayPrice}</h3>

                <h6 class="fw-bold mb-3">Chọn gói bảo hiểm:</h6>
                <div class="package-list mb-4">
                    ${packagesHtml}
                </div>

                <div class="d-flex gap-3">
                    <button class="btn btn-danger btn-lg rounded-pill px-5 fw-bold shadow-sm" onclick="addToCart()" ${!selectedPackageId ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus me-2"></i> Thêm vào giỏ
                    </button>
                    <a href="tel:1900xxxx" class="btn btn-outline-secondary btn-lg rounded-pill px-4">
                        <i class="fas fa-phone-alt me-2"></i> Tư vấn
                    </a>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-12">
                <div class="bg-white p-4 p-md-5 rounded-4 shadow-sm">
                    <h4 class="fw-bold mb-4 pb-2 border-bottom">Chi tiết quyền lợi</h4>
                    <div class="ck-content">
                        ${p.content ? p.content : '<p class="text-muted fst-italic">Nội dung chi tiết đang được cập nhật.</p>'}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Hàm phụ trợ: Chỉnh sửa đường dẫn ảnh
function getValidImageUrl(imgPath) {
    if (!imgPath) return 'https://placehold.co/800x600/f8f9fa/d71920?text=TIS+Broker';
    if (imgPath.startsWith('http')) return imgPath;
    if (!imgPath.includes('/media/')) {
        imgPath = imgPath.startsWith('/') ? `/media${imgPath}` : `/media/${imgPath}`;
    }
    return DOMAIN + imgPath;
}

// Hàm xử lý đổi ảnh chính khi click vào ảnh thu nhỏ
function changeMainImage(thumbElement, imageUrl) {
    // Đổi ảnh chính
    document.getElementById('main-product-image').src = imageUrl;
    
    // Đổi viền đỏ (active) cho ảnh thu nhỏ
    document.querySelectorAll('.thumbnail-img').forEach(img => img.classList.remove('active'));
    thumbElement.classList.add('active');
}

// Hàm xử lý khi chọn Gói (Cập nhật giá tiền và UI)
function selectPackage(pkgId, price) {
    selectedPackageId = pkgId;
    
    // Cập nhật giá hiển thị khổng lồ
    document.getElementById('display-price').innerText = formatMoney(price);
    
    // Đổi màu viền gói được chọn
    document.querySelectorAll('.package-option').forEach(el => el.classList.remove('selected'));
    document.getElementById(`pkg-label-${pkgId}`).classList.add('selected');
}

// Hàm thêm vào giỏ hàng
async function addToCart() {
    if (!getAccessToken()) {
        // Chưa đăng nhập thì bắt đi đăng nhập
        Swal.fire({
            icon: 'info',
            title: 'Yêu cầu đăng nhập',
            text: 'Vui lòng đăng nhập để thêm vào giỏ hàng.',
            confirmButtonColor: '#D71920',
            confirmButtonText: 'Đăng nhập ngay'
        }).then((result) => {
            if (result.isConfirmed) window.location.href = 'login.html';
        });
        return;
    }

    if (!selectedPackageId) {
        Toast.fire({ icon: 'warning', title: 'Vui lòng chọn một gói bảo hiểm!' });
        return;
    }

    try {
        // Gọi API thêm vào giỏ (Bạn cần chắc chắn Backend có API /cart/add/ hỗ trợ POST)
        await fetchAPI('/cart/add/', 'POST', {
            package_id: selectedPackageId,
            quantity: 1
        });
        
        Toast.fire({ icon: 'success', title: 'Đã thêm vào giỏ hàng!' });
        
        // Gọi hàm từ layout.js để cập nhật vòng tròn số trên Header
        if (typeof updateCartBadge === 'function') updateCartBadge();

    } catch (error) {
        console.error("Lỗi thêm giỏ hàng:", error);
        Toast.fire({ icon: 'error', title: error.detail || 'Không thể thêm vào giỏ hàng lúc này.' });
    }
}