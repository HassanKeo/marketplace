document.addEventListener("DOMContentLoaded", async () => {
    const catalogGrid = document.getElementById("catalog-grid");
    const searchInput = document.getElementById("search-input");
    const productsCount = document.getElementById("products-count");
    
    // Éléments du Modal
    const orderModal = document.getElementById("order-modal");
    const closeModalBtn = document.getElementById("close-modal");
    const orderForm = document.getElementById("order-form");
    const modalProductName = document.getElementById("modal-product-name");
    const modalProductId = document.getElementById("modal-product-id");
    const modalVendorId = document.getElementById("modal-vendor-id");

    let allProducts = [];

    // Charger les produits et les vendeurs associés
    async function loadProducts() {
        const { data: products, error } = await db
            .from("produits")
            .select("*, vendeurs(nom_boutique, telephone_whatsapp)")
            .eq("statut", "disponible")
            .order("cree_le", { ascending: false });

        if (error) {
            catalogGrid.innerHTML = `<p class="text-red-500 col-span-full">Erreur lors du chargement des produits.</p>`;
            return;
        }

        allProducts = products;
        renderProducts(allProducts);
    }

    // Afficher la liste des produits
    function renderProducts(products) {
        productsCount.textContent = `${products.length} produit(s) disponible(s)`;

        if (products.length === 0) {
            catalogGrid.innerHTML = `<p class="text-gray-400 col-span-full text-center py-8">Aucun produit trouvé.</p>`;
            return;
        }

        catalogGrid.innerHTML = products.map(p => `
            <div class="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col justify-between hover:shadow-md transition">
                <img src="${p.image_url}" alt="${p.nom}" class="w-full h-48 object-cover">
                <div class="p-4 flex-1 flex flex-col justify-between">
                    <div>
                        <span class="text-xs text-blue-600 font-semibold uppercase tracking-wider">${p.vendeurs ? p.vendeurs.nom_boutique : 'Boutique'}</span>
                        <h3 class="font-bold text-gray-800 text-lg mt-1">${p.nom}</h3>
                        <p class="text-xs text-gray-500 mt-1 line-clamp-2">${p.description || ''}</p>
                    </div>
                    <div class="mt-4 pt-3 border-t flex items-center justify-between">
                        <span class="text-lg font-bold text-gray-900">${p.prix} FCFA</span>
                        <button onclick="openOrderModal('${p.id}', '${p.nom.replace(/'/g, "\\'")}', '${p.vendor_id}')" class="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition">
                            Commander
                        </button>
                    </div>
                </div>
            </div>
        `).join("");
    }

    // Recherche dynamique
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allProducts.filter(p => 
            p.nom.toLowerCase().includes(query) || 
            (p.description && p.description.toLowerCase().includes(query)) ||
            (p.vendeurs && p.vendeurs.nom_boutique.toLowerCase().includes(query))
        );
        renderProducts(filtered);
    });

    // Gestion du Modal de commande
    window.openOrderModal = function(id, name, vendorId) {
        modalProductId.value = id;
        modalVendorId.value = vendorId;
        modalProductName.textContent = `Commander : ${name}`;
        orderModal.classList.remove("hidden");
    };

    closeModalBtn.addEventListener("click", () => {
        orderModal.classList.add("hidden");
    });

    // Validation et envoi de la commande
    orderForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const productId = modalProductId.value;
        const vendorId = modalVendorId.value;
        const qty = parseInt(document.getElementById("modal-qty").value);
        const phone = document.getElementById("modal-phone").value.trim();
        const location = document.getElementById("modal-location").value.trim();

        const product = allProducts.find(p => p.id === productId);
        if (!product || !product.vendeurs) {
            alert("Erreur lors de la récupération des infos vendeur.");
            return;
        }

        // 1. Enregistrer la commande dans Supabase
        const { error } = await db.from("commandes").insert([{
            produit_id: productId,
            vendor_id: vendorId,
            quantite: qty,
            telephone_client: phone,
            lieu_livraison: location
        }]);

        if (error) {
            alert("Erreur lors de l'enregistrement de la commande.");
            return;
        }

        // 2. Rediriger vers WhatsApp avec un message pré-rempli
        const vendorPhone = product.vendeurs.telephone_whatsapp.replace(/[^0-9]/g, "");
        const message = `Bonjour ${product.vendeurs.nom_boutique}, je souhaite commander :\n- *Produit* : ${product.nom}\n- *Quantité* : ${qty}\n- *Prix Total* : ${product.prix * qty} FCFA\n- *Livraison à* : ${location}\n- *Mon Contact* : ${phone}`;

        const whatsappUrl = `https://wa.me/${vendorPhone}?text=${encodeURIComponent(message)}`;
        
        orderModal.classList.add("hidden");
        orderForm.reset();
        window.open(whatsappUrl, "_blank");
    });

    loadProducts();
});