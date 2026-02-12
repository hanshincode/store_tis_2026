document.addEventListener('DOMContentLoaded', async () => {
    if (!getAccessToken()) { window.location.href = '/login.html'; return; }
    
    renderLayout();
    activeCurrentMenu();

    try {
        const user = await fetchAPI('/users/me/');
        if (!['admin', 'super_admin', 'staff'].includes(user.role) && !user.is_superuser) {
            alert("Bạn không có quyền truy cập!"); window.location.href = '/user/index.html'; return;
        }
        document.getElementById('admin-name').innerText = user.first_name || user.username;
        document.getElementById('admin-role').innerText = user.role.toUpperCase();
    } catch (e) { window.logout(); }

    // Gắn sự kiện Đăng xuất (Không dùng onclick HTML)
    document.getElementById('btn-logout-sidebar')?.addEventListener('click', window.logout);
    document.getElementById('btn-logout-topbar')?.addEventListener('click', window.logout);
});

function renderLayout() {
    const sidebar = `
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header"><h4 class="fw-bold m-0 text-white">TIS ADMIN</h4></div>
        <div class="sidebar-menu mt-2">
            <a href="index.html" id="menu-index"><i class="fas fa-tachometer-alt"></i> Tổng quan</a>
            <a href="orders.html" id="menu-orders"><i class="fas fa-file-invoice-dollar"></i> Đơn hàng</a>
            <a href="products.html" id="menu-products"><i class="fas fa-box-open"></i> Sản phẩm</a>
            <a href="categories.html" id="menu-categories"><i class="fas fa-tags"></i> Danh mục</a>
            <a href="news.html" id="menu-news"><i class="fas fa-newspaper"></i> Tin tức</a>
            <a href="staff.html" id="menu-staff"><i class="fas fa-users-cog"></i> Nhân sự</a>
        </div>
        <div class="p-3 position-absolute bottom-0 w-100 bg-dark">
            <button id="btn-logout-sidebar" class="btn btn-outline-danger w-100 btn-sm"><i class="fas fa-sign-out-alt"></i> Đăng xuất</button>
        </div>
    </div>`;

    const topbar = `
    <div class="top-bar">
        <h5 class="m-0 fw-bold text-secondary text-uppercase">Hệ thống quản trị</h5>
        <div class="dropdown">
            <div class="d-flex align-items-center cursor-pointer" data-bs-toggle="dropdown">
                <div class="text-end me-2 d-none d-md-block">
                    <div class="fw-bold text-dark" id="admin-name">Loading...</div>
                    <small class="text-success" id="admin-role">...</small>
                </div>
                <div class="bg-light rounded-circle p-2"><i class="fas fa-user-circle fa-2x text-primary"></i></div>
            </div>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
                <li><a class="dropdown-item py-2" href="profile.html"><i class="fas fa-user-cog me-2"></i> Hồ sơ</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item py-2 text-danger cursor-pointer" id="btn-logout-topbar"><i class="fas fa-sign-out-alt me-2"></i> Đăng xuất</a></li>
            </ul>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('afterbegin', sidebar);
    document.querySelector('.main-content')?.insertAdjacentHTML('afterbegin', topbar);
}

function activeCurrentMenu() {
    const page = window.location.pathname.split("/").pop() || 'index.html';
    document.getElementById('menu-' + page.replace('.html', ''))?.classList.add('active');
}