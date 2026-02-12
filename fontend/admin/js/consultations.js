document.addEventListener('DOMContentLoaded', loadConsultations);

async function loadConsultations() {
    const tbody = document.getElementById('consultation-list');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Đang tải...</td></tr>';
    try {
        const list = await fetchAPI('/consultations/');
        if (!list.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Không có yêu cầu nào</td></tr>'; return; }
        
        tbody.innerHTML = list.map(c => `
            <tr>
                <td class="fw-bold">${c.customer_name || 'Khách vãng lai'}</td>
                <td>${c.customer_contact || '---'}</td>
                <td>${c.product || 'Tư vấn chung'}</td>
                <td><span class="badge bg-${c.status === 'new' ? 'danger' : 'success'}">${c.status === 'new' ? 'Mới' : 'Đã xử lý'}</span></td>
                <td>${new Date(c.created_at).toLocaleDateString('vi-VN')}</td>
            </tr>
        `).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Lỗi kết nối</td></tr>'; }
}