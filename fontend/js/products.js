// js/products.js

let allProductsData = [];

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadAllProducts();

    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
        
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('search');
        if (searchQuery) {
            searchInput.value = searchQuery;
        }
    }
});

async function loadCategories() {
    const container = document.getElementById('category-filter-list');
    if (!container) return;

    let html = `
        <div class="form-check mb-2">
            <input class="form-check-input" type="radio" name="cat-radio" id="cat-all" value="all" checked onchange="applyFilters()">
            <label class="form-check-label small fw-bold text-danger" for="cat-all">Tất cả sản phẩm</label>
        </div>
    `;

    try {
        const cats = await fetchAPI('/categories/');
        if (cats && cats.length > 0) {
            html += cats.map(c => `
                <div class="form-check mb-2">
                    <input class="form-check-input" type="radio" name="cat-radio" id="cat-${c.id}" value="${c.id}" onchange="applyFilters()">
                    <label class="form-check-label small" for="cat-${c.id}">${c.name}</label>
                </div>
            `).join('');
        }
        container.innerHTML = html;
    } catch (e) { 
        console.warn("Lỗi tải danh mục (Có thể do quyền truy cập API).");
        container.innerHTML = html + '<div class="small text-muted mt-2 fst-italic">Đang cập nhật danh mục...</div>'; 
    }
}

async function loadAllProducts() {
    const grid = document.getElementById('all-products-grid');
    if (!grid) return;

    try {
        allProductsData = await fetchAPI('/products/');
        
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('search')) {
            applyFilters(); 
        } else {
            renderProducts(allProductsData); 
        }
        
    } catch (e) {
        grid.innerHTML = '<div class="col-12 text-center py-5 text-danger fw-bold">Lỗi kết nối máy chủ. Vui lòng thử lại sau.</div>';
    }
}

function renderProducts(productsArray) {
    const grid = document.getElementById('all-products-grid');
    const countLabel = document.getElementById('product-count');
    if (countLabel) countLabel.innerText = productsArray.length;

    if (productsArray.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center py-5"><h5 class="text-muted">Không tìm thấy sản phẩm nào phù hợp!</h5></div>';
        return;
    }

    grid.innerHTML = productsArray.map((p) => {
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

        let cleanDesc = p.description ? p.description.replace(/(<([^>]+)>)/gi, "").trim() : 'Gói bảo hiểm toàn diện.';
        let priceDisplay = p.base_price ? formatMoney(p.base_price) : 'Liên hệ';
        
        let defaultPackageId = (p.packages && p.packages.length > 0) ? p.packages[0].id : null;

        return `
            <div class="col-md-6 col-xl-4 mb-4">
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
}

function applyFilters() {
    const searchInput = document.getElementById('filter-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    const checkedRadio = document.querySelector('input[name="cat-radio"]:checked');
    const selectedCatId = checkedRadio ? checkedRadio.value : 'all';

    const filteredProducts = allProductsData.filter(p => {
        const matchName = p.name.toLowerCase().includes(searchTerm);
        const matchCat = (selectedCatId === 'all') || (p.category == selectedCatId);
        return matchName && matchCat;
    });

    renderProducts(filteredProducts);
}