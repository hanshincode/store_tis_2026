// admin/js/orders.js
document.addEventListener('DOMContentLoaded', () => {
    loadOrders('all');
    document.getElementById('filter-status')?.addEventListener('change', (e) => loadOrders(e.target.value));
});

async function loadOrders(statusFilter) {
    const tbody = document.getElementById('orders-list'); tbody.innerHTML = '<tr><td colspan="6" class="text-center">Đang tải...</td></tr>';
    try {
        let orders = await fetchAPI('/orders/');
        if(statusFilter !== 'all') orders = orders.filter(o => o.status === statusFilter);
        
        tbody.innerHTML = orders.map(o => `<tr>
            <td><strong>${o.code}</strong></td><td>User ID: ${o.user}</td><td class="text-danger fw-bold">${formatMoney(o.total_amount)}</td>
            <td><span class="badge bg-${o.status==='pending'?'warning':(o.status==='active'?'success':'info')} text-dark">${o.status}</span></td>
            <td>${new Date(o.created_at).toLocaleDateString('vi-VN')}</td>
            <td><button class="btn btn-sm btn-primary" onclick="window.viewOrder(${o.id})"><i class="fas fa-eye"></i></button></td>
        </tr>`).join('');
    } catch(e) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Lỗi dữ liệu</td></tr>'; }
}

window.viewOrder = async function(id) {
    const body = document.getElementById('order-detail-body'); const footer = document.getElementById('order-footer-actions');
    body.innerHTML = 'Đang tải...'; footer.innerHTML = '';
    new bootstrap.Modal(document.getElementById('orderModal')).show();
    try {
        const order = await fetchAPI(`/orders/${id}/`);
        body.innerHTML = `<div class="row mb-3"><div class="col-6"><strong>Mã:</strong> ${order.code}<br><strong>User ID:</strong> ${order.user}</div><div class="col-6 text-end"><strong>Tổng tiền:</strong> <h4 class="text-danger">${formatMoney(order.total_amount)}</h4></div></div>
        <table class="table table-bordered table-sm"><thead class="table-light"><tr><th>Sản phẩm</th><th>Gói</th><th>Giá</th></tr></thead>
        <tbody>${(order.items||[]).map(i => `<tr><td>${i.product_name}</td><td>${i.duration}</td><td>${formatMoney(i.price)}</td></tr>`).join('')}</tbody></table>`;
        
        if(order.status === 'pending') {
            footer.innerHTML = `<button class="btn btn-success" onclick="window.updateStatus(${id}, 'confirmed')">Xác nhận đơn</button> <button class="btn btn-danger" onclick="window.updateStatus(${id}, 'cancelled')">Hủy đơn</button>`;
        } else if (order.status === 'confirmed') {
            footer.innerHTML = `<button class="btn btn-primary" onclick="window.updateStatus(${id}, 'active')">Kích hoạt (Đã thanh toán)</button>`;
        }
    } catch(e) { body.innerHTML = '<span class="text-danger">Lỗi tải chi tiết</span>'; }
};

window.updateStatus = async function(id, status) {
    if(!confirm('Xác nhận đổi trạng thái?')) return;
    await fetchAPI(`/orders/${id}/`, 'PATCH', {status: status});
    bootstrap.Modal.getInstance(document.getElementById('orderModal')).hide();
    loadOrders(document.getElementById('filter-status').value);
    Toast.fire({icon:'success', title: 'Đã cập nhật!'});
};