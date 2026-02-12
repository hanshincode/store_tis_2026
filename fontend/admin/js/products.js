// js/products.js
let descEditor;
class Base64UploadAdapter {
    constructor(loader) { this.loader = loader; }
    upload() { return this.loader.file.then(file => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve({ default: r.result }); r.readAsDataURL(file); })); }
    abort() {}
}
function Base64Plugin(editor) { editor.plugins.get('FileRepository').createUploadAdapter = (loader) => new Base64UploadAdapter(loader); }

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('#p-desc')) {
        ClassicEditor.create(document.querySelector('#p-desc'), { extraPlugins: [Base64Plugin] }).then(editor => { descEditor = editor; });
    }
    document.getElementById('btn-open-add-modal')?.addEventListener('click', openAddModal);
    document.getElementById('btn-submit-product')?.addEventListener('click', submitProduct);
    document.getElementById('p-hidden-price')?.addEventListener('change', function() {
        document.getElementById('p-price').disabled = this.checked; if(this.checked) document.getElementById('p-price').value = '';
    });
    document.getElementById('p-images')?.addEventListener('change', function(e) {
        const preview = document.getElementById('preview-container'); preview.innerHTML = '';
        Array.from(this.files).forEach(file => {
            const reader = new FileReader(); reader.onload = (ev) => { const img = document.createElement('img'); img.src = ev.target.result; preview.appendChild(img); }; reader.readAsDataURL(file);
        });
    });
    loadProducts();
});

async function fetchCategoriesForDropdown() {
    const select = document.getElementById('p-category');
    try {
        const cats = await fetchAPI('/categories/');
        select.innerHTML = '<option value="">-- Chọn danh mục --</option>' + cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch(e) { select.innerHTML = '<option value="">Lỗi tải danh mục</option>'; }
}

function openAddModal() {
    document.getElementById('product-form').reset();
    document.getElementById('p-price').disabled = false;
    document.getElementById('preview-container').innerHTML = '';
    if(descEditor) descEditor.setData('');
    fetchCategoriesForDropdown();
    new bootstrap.Modal(document.getElementById('productModal')).show();
}

async function loadProducts() {
    const tbody = document.getElementById('products-list'); tbody.innerHTML = '<tr><td colspan="6">Đang tải...</td></tr>';
    try {
        const pds = await fetchAPI('/products/');
        tbody.innerHTML = pds.map(p => `<tr>
            <td><img src="${p.images?.[0]?.image ? MEDIA_URL + p.images[0].image : ''}"> ${p.images?.length > 1 ? `<span class="badge bg-secondary">+${p.images.length-1}</span>` : ''}</td>
            <td class="fw-bold">${p.name}</td><td>${p.provider_name}</td>
            <td><span class="badge bg-${p.target_audience === 'ent' ? 'primary' : 'info'}">${p.target_audience === 'ent' ? 'Doanh nghiệp' : 'Cá nhân'}</span></td>
            <td class="text-danger fw-bold">${p.is_price_hidden ? 'Liên hệ' : (p.packages?.[0] ? formatMoney(p.packages[0].price) : 'Chưa set')}</td>
            <td><button class="btn btn-sm btn-danger" onclick="window.deleteProduct(${p.id})"><i class="fas fa-trash"></i></button></td>
        </tr>`).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="6">Lỗi kết nối</td></tr>'; }
}

async function submitProduct() {
    const fd = new FormData();
    fd.append('name', document.getElementById('p-name').value);
    fd.append('provider_name', document.getElementById('p-provider').value);
    fd.append('category', document.getElementById('p-category').value);
    fd.append('target_audience', document.getElementById('p-target').value);
    
    const isHidden = document.getElementById('p-hidden-price').checked;
    fd.append('is_price_hidden', isHidden ? 'True' : 'False');
    if(descEditor) fd.append('description', descEditor.getData());
    
    const files = document.getElementById('p-images').files;
    for (let i = 0; i < files.length; i++) fd.append('uploaded_images', files[i]);

    try {
        const res = await fetch(`${API_BASE_URL}/products/`, { method: 'POST', headers: { 'Authorization': `Bearer ${getAccessToken()}` }, body: fd });
        if(!res.ok) throw await res.json();
        const newProd = await res.json();

        if(!isHidden && document.getElementById('p-price').value) {
            await fetchAPI('/product-packages/', 'POST', { product: newProd.id, duration_label: '1 Năm', duration_days: 365, price: document.getElementById('p-price').value });
        }
        Toast.fire({ icon: 'success', title: 'Thêm thành công' });
        bootstrap.Modal.getInstance(document.getElementById('productModal')).hide(); loadProducts();
    } catch(e) { Toast.fire({ icon: 'error', title: 'Lỗi thêm sản phẩm' }); }
}
window.deleteProduct = async function(id) { if(!confirm('Xóa?')) return; await fetchAPI(`/products/${id}/`, 'DELETE'); loadProducts(); };