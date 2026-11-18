// js/index.js

document.addEventListener("DOMContentLoaded", async () => {
    const shopTitle = document.getElementById("shop-title");
    const shopSubtitle = document.getElementById("shop-subtitle");
    const productsGrid = document.getElementById("products-grid");

    const orderModal = document.getElementById("order-modal");
    const orderForm = document.getElementById("order-form");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const modalProductTitle = document.getElementById("modal-product-title");
    const modalProductId = document.getElementById("modal-product-id");
    const modalVendorId = document.getElementById("modal-vendor-id");
    const modalQty = document.getElementById("modal-qty");
    const modalPhone = document.getElementById("modal-phone");
    const modalLocation = document.getElementById("modal-location");

    let currentVendorWhatsapp = "";

    // Récupérer l'ID de la boutique depuis l'URL (ex: index.html?v=ma-boutique)
    const urlParams = new URLSearchParams(window.location.search);
    const vendorId = urlParams.get("v");

    if (!vendorId) {
        shopTitle.textContent = "Boutique introuvable";
        shopSubtitle.textContent = "Aucun identifiant de vendeur spécifié dans le lien.";
        productsGrid.innerHTML = `<p class="text-red-500 col-span-full text-center">Veuillez utiliser un lien de boutique valide (ex: ?v=nom_de_boutique).</p>`;
        return;
    }

    await loadStoreData(vendorId);

    async function loadStoreData(vId) {
        try {
            // 1. Charger les informations du vendeur
            const { data: vendor, error: vendorError } = await db
                .from("vendeurs")
                .select("*")
                .eq("id", vId)
                .maybeSingle();

            if (vendorError || !vendor) {
                shopTitle.textContent = "Boutique introuvable";
                shopSubtitle.textContent = "Cette boutique n'existe pas ou a été supprimée.";
                productsGrid.innerHTML = `<p class="text-red-500 col-span-full text-center">Impossible de charger la boutique.</p>`;
                return;
            }

            shopTitle.textContent = vendor.nom_boutique;
            shopSubtitle.textContent = "Commandez directement en ligne ou via WhatsApp";
            currentVendorWhatsapp = vendor.telephone_whatsapp;

            // 2. Charger les produits de cette boutique
            const { data: products, error: prodError } = await db
                .from("produits")
                .select("*")
                .eq("vendor_id", vId)
                .order("cree_le", { ascending: false });

            if (prodError) throw prodError;

            if (!products || products.length === 0) {
                productsGrid.innerHTML = `<p class="text-gray-500 col-span-full text-center py-12">Cette boutique n'a aucun produit pour le moment.</p>`;
                return;
            }

            productsGrid.innerHTML = "";
            products.forEach(prod => {
                const isOutOfStock = (prod.stock !== undefined && prod.stock <= 0);
                const card = document.createElement("div");
                // Carte visuellement grisée ou rouge si le stock est épuisé
                card.className = `bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between transition ${isOutOfStock ? 'opacity-60 border-red-200' : 'hover:shadow-md'}`;
                
                card.innerHTML = `
                    <div>
                        <div class="h-48 w-full bg-gray-100 relative overflow-hidden">
                            <img src="${prod.image_url || 'https://via.placeholder.com/300'}" alt="${prod.nom}" class="w-full h-full object-cover">
                            ${isOutOfStock ? '<span class="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded font-semibold">Épuisé</span>' : ''}
                        </div>
                        <div class="p-4 space-y-2">
                            <h3 class="font-bold text-gray-800 text-base">${prod.nom}</h3>
                            <p class="text-blue-600 font-bold text-sm">${prod.prix.toLocaleString()} FCFA</p>
                            <p class="text-xs text-gray-600 line-clamp-3 whitespace-pre-line">${prod.description || 'Aucune description détaillée fournie.'}</p>
                        </div>
                    </div>
                    <div class="p-4 pt-0">
                        <button onclick="window.openOrderModal('${prod.id}', '${escapeHtml(prod.nom)}', '${vId}', ${prod.stock || 0})" 
                            class="w-full py-2 rounded-lg text-xs font-semibold transition ${isOutOfStock ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}"
                            ${isOutOfStock ? 'disabled' : ''}>
                            ${isOutOfStock ? 'Rupture de stock' : 'Commander'}
                        </button>
                    </div>
                `;
                productsGrid.appendChild(card);
            });

        } catch (err) {
            console.error(err);
            productsGrid.innerHTML = `<p class="text-red-500 col-span-full text-center">Erreur lors du chargement du catalogue.</p>`;
        }
    }

    // --- GESTION DU MODAL DE COMMANDE ---

    window.openOrderModal = function(productId, productName, vId, stock) {
        if (stock <= 0) {
            alert("Désolé, ce produit est en rupture de stock.");
            return;
        }
        if (modalProductTitle) modalProductTitle.textContent = `Commander : ${productName}`;
        if (modalProductId) modalProductId.value = productId;
        if (modalVendorId) modalVendorId.value = vId;
        if (modalQty) {
            modalQty.value = 1;
            modalQty.max = stock;
        }
        if (orderModal) orderModal.classList.remove("hidden");
    };

    if (closeModalBtn && orderModal) {
        closeModalBtn.addEventListener("click", () => {
            orderModal.classList.add("hidden");
        });
    }

    // Soumission de la commande et redirection WhatsApp
    if (orderForm) {
        orderForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const pId = modalProductId.value;
            const vId = modalVendorId.value;
            const qty = parseInt(modalQty.value);
            const phone = modalPhone.value.trim();
            const location = modalLocation.value.trim();

            if (!phone || !location || isNaN(qty) || qty < 1) {
                alert("Veuillez remplir tous les champs correctement.");
                return;
            }

            try {
                // 1. Enregistrer la commande dans la table 'commandes' de Supabase
                const { error: insertError } = await db.from("commandes").insert([
                    {
                        vendor_id: vId,
                        produit_id: pId,
                        quantite: qty,
                        telephone_client: phone,
                        lieu_livraison: location,
                        statut: 'en_attente'
                    }
                ]);

                if (insertError) throw insertError;

                // 2. Construire le message WhatsApp formaté pour le vendeur
                const productName = modalProductTitle.textContent.replace("Commander : ", "");
                const whatsappMessage = encodeURIComponent(
                    `Bonjour, je souhaite passer commande :\n\n- Produit : *${productName}*\n- Quantité : *${qty}*\n- Lieu de livraison : *${location}*\n- Mon contact : *${phone}*`
                );

                // Fermer le modal et rediriger vers l'application WhatsApp
                orderModal.classList.add("hidden");
                orderForm.reset();

                const cleanWhatsappNumber = currentVendorWhatsapp.replace(/[^0-9+]/g, "");
                window.open(`https://wa.me/${cleanWhatsappNumber}?text=${whatsappMessage}`, "_blank");

            } catch (err) {
                console.error(err);
                alert("Erreur lors de l'enregistrement de la commande : " + (err.message || "Problème réseau."));
            }
        });
    }

    function escapeHtml(str) {
        return str.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
    }
});
