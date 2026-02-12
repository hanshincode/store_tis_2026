// js/home.js

document.addEventListener('DOMContentLoaded', () => {
    if (typeof AOS !== 'undefined') {
        AOS.init({ duration: 800, once: true });
    }

    loadFeaturedProducts();
    loadLatestNews();
});

async function loadFeaturedProducts() {
    const container = document.getElementById('product-list');
    if (!container) return;

    try {
        const products = await fetchAPI('/products/');
        
        if (!products || products.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-5 text-muted">Hệ thống đang cập nhật sản phẩm.</div>';
            return;
        }

        container.innerHTML = products.slice(0, 6).map((p, idx) => {
            let imageUrl = 'https://placehold.co/400x250/f8f9fa/d71920?text=TIS+Broker';
            if (p.images && p.images.length > 0 && p.images[0].image) {
                let imgPath = p.images[0].image;
                if (imgPath.startsWith('http')) {
                    imageUrl = imgPath;
                } else {
                    if (!imgPath.includes('/media/')) {
                        imgPath = imgPath.startsWith('/') ? `/media${imgPath}` : `/media/${imgPath}`;
                    }
                    imageUrl = DOMAIN + imgPath;
                }
            }

            let cleanDesc = p.description ? p.description.replace(/(<([^>]+)>)/gi, "").trim() : 'Gói bảo hiểm toàn diện giúp bạn an tâm bảo vệ tài chính.';
            let priceDisplay = p.base_price ? formatMoney(p.base_price) : 'Liên hệ';
            
            // Lấy ID gói mặc định để mua nhanh
            let defaultPackageId = (p.packages && p.packages.length > 0) ? p.packages[0].id : null;

            return `
                <div class="col-lg-4 col-md-6 mb-4" data-aos="fade-up" data-aos-delay="${idx * 100}">
                    <div class="card product-card-modern h-100 shadow-sm border-0 cursor-pointer" 
                         onclick="window.location.href='product-detail.html?id=${p.id}'" 
                         title="Xem chi tiết ${p.name}">
                        
                        <div class="product-img-wrapper">
                            <span class="badge-provider shadow-sm">${p.provider_name || 'TIS'}</span>
                            <img src="${imageUrl}" alt="${p.name}" onerror="this.onerror=null; this.src='https://placehold.co/400x250/f8f9fa/d71920?text=TIS+Product';">
                        </div>
                        
                        <div class="card-body p-4 d-flex flex-column">
                            <h5 class="fw-bold text-dark mb-2 product-title">${p.name}</h5>
                            <p class="text-muted small flex-grow-1 product-desc">${cleanDesc}</p>
                            
                            <div class="d-flex justify-content-between align-items-end mt-3 pt-3 border-top">
                                <div class="price-block">
                                    <span class="d-block text-muted mb-1" style="font-size: 0.75rem;">Phí từ</span>
                                    <span class="text-danger fw-bolder h5 mb-0">${priceDisplay}</span>
                                </div>
                                
                                <button onclick="event.stopPropagation(); handleQuickBuy(${defaultPackageId}, ${p.id})" 
                                        class="btn btn-danger btn-sm rounded-pill px-4 py-2 fw-bold shadow-sm btn-buy">
                                    Mua ngay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) { 
        console.error("Lỗi tải sản phẩm:", e);
        container.innerHTML = '<div class="col-12 text-center py-5 text-danger fw-bold">Không thể kết nối tải dữ liệu sản phẩm.</div>'; 
    }
}

async function loadLatestNews() {
    const container = document.getElementById('news-list');
    if (!container) return;

    try {
        const news = await fetchAPI('/news/');
        
        if (!news || news.length === 0) {
            container.innerHTML = '<div class="col-12 text-center py-4 text-muted">Đang cập nhật bài viết mới...</div>';
            return;
        }

        container.innerHTML = news.slice(0, 3).map((n, idx) => {
            let imageUrl = 'https://placehold.co/400x250/f8f9fa/6c757d?text=TIS+News';
            if (n.image) {
                let imgPath = n.image;
                if (imgPath.startsWith('http')) {
                    imageUrl = imgPath;
                } else {
                    if (!imgPath.includes('/media/')) {
                        imgPath = imgPath.startsWith('/') ? `/media${imgPath}` : `/media/${imgPath}`;
                    }
                    imageUrl = DOMAIN + imgPath;
                }
            }
            
            let cleanDesc = n.content ? n.content.replace(/(<([^>]+)>)/gi, "").substring(0, 90) + '...' : 'Đang cập nhật nội dung...';
            let dateStr = n.created_at ? new Date(n.created_at).toLocaleDateString('vi-VN') : '';

            return `
                <div class="col-lg-4 col-md-6" data-aos="fade-up" data-aos-delay="${idx * 100}">
                    <div class="card news-card bg-white rounded-4 shadow-sm h-100 overflow-hidden border-0 cursor-pointer" 
                         onclick="window.location.href='news-detail.html?id=${n.id}'">
                        <div class="product-img-wrapper" style="height: 180px;">
                            <img src="${imageUrl}" alt="${n.title}" onerror="this.onerror=null; this.src='https://placehold.co/400x250/f8f9fa/6c757d?text=TIS+News';">
                        </div>
                        <div class="card-body p-4 d-flex flex-column">
                            <div class="d-flex align-items-center mb-2 text-muted small">
                                <i class="far fa-calendar-alt me-2 text-danger"></i> ${dateStr}
                            </div>
                            <h5 class="fw-bold mb-3 product-title">
                                <a href="news-detail.html?id=${n.id}" class="text-dark text-decoration-none hover-red">${n.title}</a>
                            </h5>
                            <p class="text-secondary small mb-0 flex-grow-1">${cleanDesc}</p>
                            <span class="text-danger small fw-bold text-decoration-none mt-3">Đọc tiếp <i class="fas fa-arrow-right ms-1"></i></span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error("Lỗi tải tin tức:", e);
        container.innerHTML = '';
    }
}