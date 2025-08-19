// ================================================================= //
// ARYSVAIN BOOKSTORE - INVOICE APP FRONTEND SCRIPT                  //
// ================================================================= //

// PENTING: Ganti URL ini dengan URL Web App dari Google Apps Script Anda
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw8VznO3MZ3QAApFKz4fWxSqBx9dX7CWM01xSs1iFaxI1M-pQaIknSXTL8esjHANudQ/exec";

// Variabel global untuk menyimpan data
let products = [];
let invoiceItems = [];

// Elemen-elemen DOM
const productSelect = document.getElementById('productSelect');
const invoiceItemsTable = document.getElementById('invoiceItemsTable');
const totalAmountSpan = document.getElementById('totalAmount');

// Event Listener utama saat halaman selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    showTab('createInvoiceTab'); // Tampilkan tab pertama secara default

    // BARU: Menambahkan event listener untuk semua tombol tab
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            showTab(tabId);
        });
    });
});

// Fungsi untuk menampilkan notifikasi
function showNotification(message, isSuccess = true) {
    const notification = document.getElementById('notification');
    const messageP = document.getElementById('notification-message');
    
    messageP.textContent = message;
    notification.className = `fixed top-5 right-5 text-white px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`;
    
    notification.classList.remove('opacity-0');
    setTimeout(() => {
        notification.classList.add('opacity-0');
    }, 3000);
}

// Fungsi untuk beralih antar tab
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    document.getElementById(tabId).classList.remove('hidden');
    document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');
}

// Fungsi untuk memuat produk dari backend
async function loadProducts() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getProducts`);
        const result = await response.json();
        if (result.status === 'success') {
            products = result.data;
            populateProductSelect();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showNotification('Gagal memuat produk: ' + error.message, false);
    }
}

// Mengisi pilihan produk di form
function populateProductSelect() {
    productSelect.innerHTML = '<option value="">-- Pilih Produk --</option>';
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.productId;
        option.textContent = `${product.productName} - Rp ${formatCurrency(product.price)}`;
        productSelect.appendChild(option);
    });
}

// Menambahkan item ke daftar invoice sementara
document.getElementById('addItemBtn').addEventListener('click', () => {
    const productId = productSelect.value;
    const quantity = parseInt(document.getElementById('quantity').value);

    if (!productId || quantity <= 0) {
        showNotification('Pilih produk dan jumlah yang valid.', false);
        return;
    }

    const product = products.find(p => p.productId === productId);
    
    // Cek jika produk sudah ada di daftar
    const existingItem = invoiceItems.find(item => item.productId === productId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        invoiceItems.push({
            productId: product.productId,
            productName: product.productName,
            price: product.price,
            quantity: quantity
        });
    }
    
    updateInvoiceItemsTable();
});

// Memperbarui tabel item invoice dan total harga
function updateInvoiceItemsTable() {
    invoiceItemsTable.innerHTML = '';
    let total = 0;

    invoiceItems.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        item.subtotal = subtotal; // Simpan subtotal di objek

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="py-2 px-4 border-b">${item.productName}</td>
            <td class="py-2 px-4 border-b">${item.quantity}</td>
            <td class="py-2 px-4 border-b">Rp ${formatCurrency(item.price)}</td>
            <td class="py-2 px-4 border-b">Rp ${formatCurrency(subtotal)}</td>
            <td class="py-2 px-4 border-b">
                <button type="button" onclick="removeItem(${index})" class="text-red-500 hover:text-red-700">Hapus</button>
            </td>
        `;
        invoiceItemsTable.appendChild(row);
    });

    totalAmountSpan.textContent = `Rp ${formatCurrency(total)}`;
}

// Menghapus item dari daftar
function removeItem(index) {
    invoiceItems.splice(index, 1);
    updateInvoiceItemsTable();
}

// Mengirim data invoice baru ke backend
document.getElementById('invoiceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const customerName = document.getElementById('customerName').value;

    if (!customerName || invoiceItems.length === 0) {
        showNotification('Nama pelanggan dan minimal satu item harus diisi.', false);
        return;
    }

    const totalAmount = invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);

    const payload = {
        customerName,
        items: invoiceItems,
        totalAmount
    };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'createInvoice', payload })
        });
        const result = await response.json();
        if (result.status === 'success') {
            showNotification(`Invoice ${result.data.invoiceId} berhasil dibuat!`);
            // Reset form
            document.getElementById('invoiceForm').reset();
            invoiceItems = [];
            updateInvoiceItemsTable();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showNotification('Gagal menyimpan invoice: ' + error.message, false);
    }
});

// Menambah produk baru
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const productName = document.getElementById('productName').value;
    const price = document.getElementById('price').value;

    const payload = { productName, price };

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'addProduct', payload })
        });
        const result = await response.json();
        if (result.status === 'success') {
            showNotification(`Produk "${result.data.productName}" berhasil ditambahkan.`);
            document.getElementById('addProductForm').reset();
            loadProducts(); // Muat ulang daftar produk
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        showNotification('Gagal menambah produk: ' + error.message, false);
    }
});

// Mencari invoice
document.getElementById('findInvoiceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = document.getElementById('searchQuery').value;
    const searchResultsDiv = document.getElementById('searchResults');
    searchResultsDiv.innerHTML = '<p>Mencari...</p>';

    try {
        const response = await fetch(`${SCRIPT_URL}?action=findInvoice&query=${encodeURIComponent(query)}`);
        const result = await response.json();

        if (result.status === 'success') {
            displaySearchResults(result.data);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        searchResultsDiv.innerHTML = `<p class="text-red-500">Gagal mencari invoice: ${error.message}</p>`;
    }
});

// Menampilkan hasil pencarian invoice
function displaySearchResults(invoices) {
    const searchResultsDiv = document.getElementById('searchResults');
    if (invoices.length === 0) {
        searchResultsDiv.innerHTML = '<p>Tidak ada invoice yang ditemukan.</p>';
        return;
    }

    let html = '<div class="space-y-4">';
    invoices.forEach(invoice => {
        html += `
            <div class="border p-4 rounded-md flex justify-between items-center">
                <div>
                    <p class="font-bold">${invoice.invoiceId}</p>
                    <p>${invoice.customerName} - ${invoice.date}</p>
                    <p class="text-gray-600">Total: Rp ${formatCurrency(invoice.totalAmount)}</p>
                </div>
                <div>
                    <button onclick='viewInvoice(${JSON.stringify(invoice)})' class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Lihat & Cetak</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    searchResultsDiv.innerHTML = html;
}

// Menampilkan detail invoice untuk dicetak
function viewInvoice(invoice) {
    const displayArea = document.getElementById('invoice-display-area');
    displayArea.innerHTML = generateInvoiceHTML(invoice);
    displayArea.classList.remove('hidden');
    // Scroll ke invoice
    displayArea.scrollIntoView({ behavior: 'smooth' });
}

// Membuat HTML untuk invoice yang akan dicetak
function generateInvoiceHTML(invoice) {
    let itemsHtml = '';
    invoice.items.forEach(item => {
        itemsHtml += `
            <tr>
                <td>${item.productName}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">Rp ${formatCurrency(item.price)}</td>
                <td class="text-right">Rp ${formatCurrency(item.subtotal)}</td>
            </tr>
        `;
    });

    return `
        <div id="invoice-to-print">
            <header class="invoice-header">
                <h1>Arysvain Bookstore</h1>
                <p>Jl. Literasi No. 123, Kota Buku, Indonesia</p>
            </header>
            <section class="invoice-details">
                <div class="invoice-details-left">
                    <strong>Ditagihkan Kepada:</strong><br>
                    ${invoice.customerName}
                </div>
                <div class="invoice-details-right">
                    <strong>Invoice #:</strong> ${invoice.invoiceId}<br>
                    <strong>Tanggal:</strong> ${invoice.date}
                </div>
            </section>
            <table>
                <thead>
                    <tr>
                        <th>Deskripsi</th>
                        <th class="text-center">Jumlah</th>
                        <th class="text-right">Harga Satuan</th>
                        <th class="text-right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            <section class="invoice-total">
                <p class="total-amount">Total: Rp ${formatCurrency(invoice.totalAmount)}</p>
            </section>
            <footer class="invoice-footer">
                <p>Terima kasih telah berbelanja di Arysvain Bookstore!</p>
            </footer>
            <div class="mt-8 text-center no-print">
                <button onclick="window.print()" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">Cetak Invoice</button>
                <button onclick="document.getElementById('invoice-display-area').classList.add('hidden')" class="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600">Tutup</button>
            </div>
        </div>
    `;
}

// Helper function untuk format mata uang
function formatCurrency(number) {
    return new Intl.NumberFormat('id-ID').format(number);
}
