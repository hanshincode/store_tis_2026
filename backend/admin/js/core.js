// admin/js/core.js
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Kiểm tra đăng nhập
    if (!getAccessToken()) { window.location.href = '../login.html'; return; }
    
    // 2. Tự động vẽ Sidebar & Topbar
    renderLayout();
    markActiveMenu();

    // 3. Kiểm tra quyền Admin/Staff
    try {
        const user = await fetchAPI('/users/me/');
        const role = user.role;
        if (!['admin', 'super_admin', 'staff'].includes(role) && !user.is_superuser) {
            alert("Truy cập bị từ chối!"); window.location.href = '../index.html'; return;
        }
        
        document.getElementById('admin-profile-name').innerText = user.first_name || user.username;
        document.getElementById('admin-profile-role').innerText = role.toUpperCase();
    } catch (e) { window.logout(); }
});

function renderLayout() {
    const sidebarHTML = `
    <div class="sidebar">
        <div class="sidebar-header"><h4 class="fw-bold m-0 text-white">TIS ADMIN</h4></div>
        <div class="sidebar-menu">
            <a href="index.html" id="m-index"><i class="fas fa-chart-line"></i> Tổng quan</a>
            <a href="orders.html" id="m-orders"><i class="fas fa-shopping-cart"></i> Đơn hàng</a>
            <a href="products.html" id="m-products"><i class="fas fa-box"></i> Sản phẩm</a>
            <a href="categories.html" id="m-categories"><i class="fas fa-list"></i> Danh mục</a>
            <a href="consultations.html" id="m-consultations"><i class="fas fa-headset"></i> Tư vấn (Tickets)</a>
            <a href="news.html" id="m-news"><i class="fas fa-newspaper"></i> Tin tức</a>
            <a href="staff.html" id="m-staff"><i class="fas fa-user-shield"></i> Nhân sự</a>
        </div>
        <div class="p-3 position-absolute bottom-0 w-100"><button class="btn btn-outline-danger w-100" onclick="window.logout()">Đăng xuất</button></div>
    </div>`;

    const topbarHTML = `
    <div class="top-bar shadow-sm">
        <h5 class="m-0 fw-bold text-dark">HỆ THỐNG QUẢN TRỊ V1.0</h5>
        <div class="d-flex align-items-center">
            <div class="text-end me-3">
                <div class="fw-bold text-dark" id="admin-profile-name">...</div>
                <small class="text-danger fw-bold" id="admin-profile-role" style="font-size:10px"></small>
            </div>
            <div class="bg-light rounded-circle p-2 border"><i class="fas fa-user-shield text-danger"></i></div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
    document.querySelector('.main-content').insertAdjacentHTML('afterbegin', topbarHTML);
}

function markActiveMenu() {
    const page = window.location.pathname.split("/").pop() || 'index.html';
    const id = 'm-' + page.replace('.html', '');
    document.getElementById(id)?.classList.add('active');
}