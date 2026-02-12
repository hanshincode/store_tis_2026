// admin/js/categories.js
const specMap = { 'property': 'Tài sản', 'health': 'Sức khỏe', 'vehicle': 'Xe cộ', 'marine': 'Hàng hải' };

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-open-add-modal')?.addEventListener('click', () => {
        document.getElementById('category-form').reset();
        new bootstrap.Modal(document.getElementById('categoryModal')).show();
    });
    document.getElementById('btn-submit-category')?.addEventListener('click', submitCategory);
    loadCategories();
});

async function loadCategories() {
    const tbody = document.getElementById('category-list');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Đang tải...</td></tr>';
    try {
        const cats = await fetchAPI('/categories/');
        tbody.innerHTML = cats.map(c => `
            <tr>
                <td>${c.id}</td>
                <td class="fw-bold text-dark">${c.name}</td>
                <td><span class="badge bg-light text-dark border">${c.slug}</span></td>
                <td><span class="badge bg-info-subtle text-info border border-info">${specMap[c.specialization_code] || c.specialization_code}</span></td>
                <td><button class="btn btn-sm btn-outline-danger" onclick="window.deleteCategory(${c.id})"><i class="fas fa-trash"></i></button></td>
            </tr>
        `).join('');
    } catch(e) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Lỗi tải danh mục</td></tr>'; }
}

async function submitCategory() {
    const name = document.getElementById('c-name').value.trim();
    const spec = document.getElementById('c-spec').value;
    if(!name) return Toast.fire({icon: 'warning', title: 'Nhập tên danh mục!'});

    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
    
    try {
        await fetchAPI('/categories/', 'POST', { name: name, slug: slug, specialization_code: spec });
        bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
        loadCategories();
        Toast.fire({icon: 'success', title: 'Thành công!'});
    } catch(e) { Swal.fire('Lỗi', 'Tên hoặc Slug đã tồn tại', 'error'); }
}

window.deleteCategory = async function(id) {
    if (!confirm('Xác nhận xóa danh mục này?')) return;
    try {
        await fetchAPI(`/categories/${id}/`, 'DELETE');
        loadCategories();
        Toast.fire({icon: 'success', title: 'Đã xóa'});
    } catch(e) { Swal.fire('Lỗi', 'Danh mục đang có sản phẩm liên kết', 'error'); }
};