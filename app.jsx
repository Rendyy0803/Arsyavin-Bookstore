import React, { useState, useEffect } from 'react';

// Karena akan di-bundle, tidak perlu import global window.tailwind lagi
// Tailwind CSS classes akan dikompilasi langsung ke dalam file CSS
// oleh build tool seperti Vite.

const App = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Mengelola pesan status
  const showStatus = (type, text) => {
    setStatusMessage({ type, text });
  };

  const hideStatus = () => {
    setStatusMessage({ type: '', text: '' });
  };

  // Memuat daftar pelanggan
  useEffect(() => {
    setIsLoading(true);
    google.script.run
      .withSuccessHandler((result) => {
        setCustomers(result);
        setIsLoading(false);
      })
      .withFailureHandler((error) => {
        showStatus('error', error.message || 'Gagal memuat daftar pelanggan.');
        setIsLoading(false);
      })
      .getUniqueCustomers();
  }, []);

  // Mengelola tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    hideStatus();
    setSearchResults([]);
  };

  // Mengirim data penjualan baru
  const handleAddSalesData = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const customerName = formData.get('customerName');
    const itemName = formData.get('itemName');
    const quantity = parseInt(formData.get('quantity'), 10);

    if (!customerName || !itemName || isNaN(quantity)) {
      showStatus('error', 'Semua field harus diisi dengan benar.');
      return;
    }

    setIsLoading(true);
    google.script.run
      .withSuccessHandler(() => {
        showStatus('success', 'Data berhasil disimpan! Klik tab "Buat Invoice" untuk membuat invoice.');
        event.target.reset();
        setIsLoading(false);
        // Muat ulang daftar pelanggan
        google.script.run.withSuccessHandler(setCustomers).getUniqueCustomers();
      })
      .withFailureHandler((error) => {
        showStatus('error', error.message || 'Gagal menyimpan data.');
        setIsLoading(false);
      })
      .addSalesData(customerName, itemName, quantity);
  };

  // Membuat invoice PDF
  const handleCreateInvoice = () => {
    const selectedCustomer = document.getElementById('customerSelect').value;
    if (!selectedCustomer) {
      showStatus('error', 'Pilih pelanggan terlebih dahulu.');
      return;
    }
    
    setIsLoading(true);
    google.script.run
      .withSuccessHandler((url) => {
        showStatus('success', `Invoice berhasil dibuat! <a href="${url}" target="_blank" class="font-bold underline text-amber-700">Klik di sini untuk melihat PDF</a>.`);
        setIsLoading(false);
      })
      .withFailureHandler((error) => {
        showStatus('error', error.message || 'Terjadi kesalahan saat membuat invoice.');
        setIsLoading(false);
      })
      .createInvoicePDF(selectedCustomer);
  };

  // Mencari invoice
  const handleSearch = () => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsLoading(true);
    google.script.run
      .withSuccessHandler((result) => {
        setSearchResults(result);
        setIsLoading(false);
      })
      .withFailureHandler((error) => {
        showStatus('error', error.message || 'Gagal mencari invoice.');
        setIsLoading(false);
      })
      .searchInvoices(searchQuery);
  };

  useEffect(() => {
    const timeoutId = setTimeout(handleSearch, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const renderContent = () => {
    switch (activeTab) {
      case 'create':
        return (
          <div className="pt-6">
            <p className="text-gray-600 mb-6 text-center">Pilih nama pelanggan dan klik 'Buat Invoice' untuk menghasilkan file PDF.</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="customerSelect" className="block text-sm font-medium text-gray-700">Pilih Pelanggan:</label>
                <select id="customerSelect" className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md">
                  {customers.length > 0 ? (
                    customers.map((customer, index) => (
                      <option key={index} value={customer}>
                        {customer}
                      </option>
                    ))
                  ) : (
                    <option>Tidak ada data pelanggan</option>
                  )}
                </select>
              </div>
              <button
                onClick={handleCreateInvoice}
                disabled={customers.length === 0 || isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Buat Invoice
              </button>
            </div>
          </div>
        );
      case 'input':
        return (
          <div className="pt-6">
            <p className="text-gray-600 mb-6 text-center">Masukkan data penjualan baru di bawah ini.</p>
            <form onSubmit={handleAddSalesData} className="space-y-4">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Nama Pelanggan</label>
                <input type="text" id="customerName" name="customerName" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2" />
              </div>
              <div>
                <label htmlFor="itemName" className="block text-sm font-medium text-gray-700">Nama Barang</label>
                <input type="text" id="itemName" name="itemName" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2" />
              </div>
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Jumlah</label>
                <input type="number" id="quantity" name="quantity" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2" />
              </div>
              <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed">
                Simpan Data
              </button>
            </form>
          </div>
        );
      case 'search':
        return (
          <div className="pt-6">
            <p className="text-gray-600 mb-6 text-center">Cari invoice berdasarkan nama pelanggan atau nomor invoice.</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="searchInput" className="block text-sm font-medium text-gray-700">Cari Invoice:</label>
                <input
                  type="text"
                  id="searchInput"
                  placeholder="Nama Pelanggan atau Nomor Invoice..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm p-2"
                />
              </div>
              <div id="searchResults" className="space-y-2">
                {searchResults.length > 0 ? (
                  searchResults.map((item, index) => (
                    <div key={index} className="p-4 border rounded-md shadow-sm bg-gray-50">
                      <p className="font-bold text-gray-800">No. Invoice: {item.invoiceNumber}</p>
                      <p className="text-sm text-gray-600">Pelanggan: {item.customerName}</p>
                      <p className="text-sm text-gray-600">Tanggal: {new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                      <a href={item.link} target="_blank" className="mt-2 inline-block text-sm font-medium text-amber-600 hover:underline">
                        Lihat PDF
                      </a>
                    </div>
                  ))
                ) : (
                  searchQuery.length > 2 && !isLoading && (
                    <p className="text-gray-500">Tidak ada invoice yang cocok ditemukan.</p>
                  )
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container font-sans">
      <h1 className="font-serif text-3xl font-bold text-[#4a2a16] mb-6 text-center">Arsyavin Bookstore</h1>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => handleTabChange('create')}
            className={`tab-link border-b-2 py-4 px-1 text-center text-sm font-medium ${activeTab === 'create' ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Buat Invoice
          </button>
          <button
            onClick={() => handleTabChange('input')}
            className={`tab-link border-b-2 py-4 px-1 text-center text-sm font-medium ${activeTab === 'input' ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Input Data Penjualan
          </button>
          <button
            onClick={() => handleTabChange('search')}
            className={`tab-link border-b-2 py-4 px-1 text-center text-sm font-medium ${activeTab === 'search' ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            Cari Invoice
          </button>
        </nav>
      </div>
      {renderContent()}

      {isLoading && (
        <div className="loading flex items-center justify-center mt-4">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Memproses, mohon tunggu...
        </div>
      )}

      {statusMessage.text && (
        <div className={`mt-4 p-4 rounded-md border ${statusMessage.type === 'error' ? 'bg-red-50 border-red-400 text-red-700' : 'bg-green-50 border-green-400 text-green-700'}`}>
          <span dangerouslySetInnerHTML={{ __html: statusMessage.text }} />
        </div>
      )}
    </div>
  );
};

export default App;
