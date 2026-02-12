/**
 * admin/js/products.js
 * Xử lý: 2 trường mô tả, định dạng tiền tệ, và tự động Refresh Token.
 */

let descEditor;
let editingProductId = null;

// --- 1. CKEDITOR CONFIG ---
class Base64UploadAdapter {
    constructor(loader) { this.loader = loader; }
    upload() {
        return this.loader.file.then(file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ default: reader.result });
            reader.onerror = err => reject(err);
            reader.readAsDataURL(file);
        }));
    }
    abort() {}
}

function MyCustomUploadAdapterPlugin(editor) {
    editor.plugins.get('FileRepository').createUploadAdapter = (loader) => new Base64UploadAdapter(loader);
}

// --- 2. KHỞI TẠO ---
document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo CKEditor cho Chi tiết quyền lợi
    const editorEl = document.querySelector('#p-desc');
    if (editorEl) {
        ClassicEditor.create(editorEl, {
            extraPlugins: [MyCustomUploadAdapterPlugin],
            toolbar: ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'uploadImage', 'insertTable', 'undo', 'redo']
        }).then(editor => { descEditor = editor; }).catch(err => console.error(err));
    }

    // Tự động định dạng dấu chấm khi nhập giá
    const priceInput = document.getElementById('p-price');
    if (priceInput) {
        priceInput.addEventListener('input', function(e) {
            let val = e.target.value.replace(/\D/g, ""); 
            if (val) e.target.value = val.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        });
    }

    // Toggle bật/tắt ô nhập giá khi chọn "Giá liên hệ"
    document.getElementById('p-hidden-price')?.addEventListener('change', function() {
        priceInput.disabled = this.checked;
        if (this.checked) priceInput.value = "";
    });

    loadProducts();
});

// --- 3. LOGIC XỬ LÝ DỮ LIỆU ---

window.loadProducts = async function() {
    const tbody = document.getElementById('products-list');
    if (!tbody) return;
    try {
        const products = await fetchAPI('/products/'); // Sử dụng fetchAPI từ common.js
        tbody.innerHTML = products.map(p => {
            const img = p.images?.[0]?.image ? (p.images[0].image.startsWith('http') ? p.images[0].image : DOMAIN + p.images[0].image) : 'https://placehold.co/50';
            return `
                <tr>
                    <td class="ps-4"><img src="${img}" class="rounded border" width="50" height="40" style="object-fit:cover"></td>
                    <td class="fw-bold cursor-pointer" onclick="openProductModal(${p.id})">${p.name}</td>
                    <td><span class="badge bg-light text-dark border">${p.category_name || 'N/A'}</span></td>
                    <td>${p.target_audience === 'ent' ? 'Doanh nghiệp' : 'Cá nhân'}</td>
                    <td class="text-danger fw-bold">${p.is_price_hidden ? 'Liên hệ' : formatMoney(p.base_price)}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteProduct(${p.id})"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>`;
        }).join('');
    } catch (e) { tbody.innerHTML = '<tr><td colspan="6" class="text-center">Lỗi tải danh sách</td></tr>'; }
};

window.openProductModal = async function(id = null) {
    editingProductId = id;
    const form = document.getElementById('product-form');
    form.reset();
    if (descEditor) descEditor.setData('');
    document.getElementById('preview-container').innerHTML = '';
    
    await fetchCategoriesForDropdown();

    if (id) {
        document.querySelector('#productModal .modal-title').innerText = "Chỉnh sửa sản phẩm";
        try {
            const p = await fetchAPI(`/products/${id}/`);
            document.getElementById('p-name').value = p.name;
            document.getElementById('p-short-desc').value = p.short_description || ''; // Detail Base
            document.getElementById('p-provider').value = p.provider_name;
            document.getElementById('p-category').value = p.category;
            document.getElementById('p-target').value = p.target_audience;
            document.getElementById('p-hidden-price').checked = p.is_price_hidden;
            document.getElementById('p-price').disabled = p.is_price_hidden;

            // Định dạng giá có dấu chấm khi đổ lên Modal
            if (p.base_price) {
                document.getElementById('p-price').value = p.base_price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            }
            if (descEditor) descEditor.setData(p.description || ''); // Detail Final
        } catch (e) { Toast.fire({ icon: 'error', title: 'Lỗi tải chi tiết' }); }
    } else {
        document.querySelector('#productModal .modal-title').innerText = "Thêm sản phẩm mới";
    }
    new bootstrap.Modal(document.getElementById('productModal')).show();
};

window.submitProduct = async function() {
    const btn = document.getElementById('btn-submit-product');
    const name = document.getElementById('p-name').value.trim();
    if (!name) return Toast.fire({ icon: 'warning', title: 'Vui lòng nhập tên!' });

    const fd = new FormData();
    fd.append('name', name);
    fd.append('short_description', document.getElementById('p-short-desc').value); // Gửi mô tả ngắn
    fd.append('provider_name', document.getElementById('p-provider').value || "TIS Broker");
    fd.append('category', document.getElementById('p-category').value);
    fd.append('target_audience', document.getElementById('p-target').value);
    
    const isHidden = document.getElementById('p-hidden-price').checked;
    fd.append('is_price_hidden', isHidden ? 'True' : 'False');

    // Làm sạch dấu chấm trước khi gửi về Backend
    const rawPrice = document.getElementById('p-price').value.replace(/\./g, "");
    if (!isHidden && rawPrice) fd.append('base_price', rawPrice);

    if (descEditor) fd.append('description', descEditor.getData());

    const files = document.getElementById('p-images').files;
    for (let i = 0; i < files.length; i++) fd.append('uploaded_images', files[i]);

    try {
        btn.disabled = true;
        btn.innerText = "ĐANG LƯU...";
        const url = editingProductId ? `/products/${editingProductId}/` : `/products/`;
        const method = editingProductId ? 'PATCH' : 'POST';

        await fetchAPI(url, method, fd); // Tự động xử lý Bearer Token

        Toast.fire({ icon: 'success', title: 'Lưu sản phẩm thành công!' });
        bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
        loadProducts();
    } catch (e) {
        const msg = typeof e === 'object' ? (e.detail || Object.values(e).flat().join('\n')) : "Lỗi hệ thống";
        Swal.fire('Thất bại', msg, 'error');
    } finally {
        btn.disabled = false;
        btn.innerText = "Lưu sản phẩm";
    }
};

async function fetchCategoriesForDropdown() {
    const select = document.getElementById('p-category');
    try {
        const cats = await fetchAPI('/categories/');
        select.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (e) { console.error("Lỗi danh mục"); }
}

window.deleteProduct = async function(id) {
    const res = await Swal.fire({ title: 'Xác nhận xóa?', icon: 'warning', showCancelButton: true });
    if (!res.isConfirmed) return;
    try {
        await fetchAPI(`/products/${id}/`, 'DELETE');
        loadProducts();
        Toast.fire({ icon: 'success', title: 'Đã xóa' });
    } catch (e) { Toast.fire({ icon: 'error', title: 'Lỗi khi xóa' }); }
};