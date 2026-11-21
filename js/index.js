// js/index.js

document.addEventListener("DOMContentLoaded", async () => {
    const shopTitle = document.getElementById("shop-title");
    const shopSubtitle = document.getElementById("shop-subtitle");
    const productsGrid = document.getElementById("products-grid");

    const orderModal = document.getElementById("order-modal");
    const orderForm = document.getElementById("order-form");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const modalProductTitle = document.getElementById("modal-product-title");
    const modalDescDetails = document.getElementById("modal-desc-details");
    const modalProductDesc = document.getElementById("modal-product-desc");
    const modalProductId = document.getElementById("modal-product-id");
    const modalVendorId = document.getElementById("modal-vendor-id");
    const modalQty = document.getElementById("modal-qty");
    const modalStockInfo = document.getElementById("modal-stock-info");
    const modalPhone = document.getElementById("modal-phone");
    const modalLocation = document.getElementById("modal-location");
    const modalOrderError = document.getElementById("modal-order-error");
    const modalSubmitBtn = document.getElementById("modal-submit-btn");

    const DEFAULT_SUBMIT_HTML = modalSubmitBtn ? modalSubmitBtn.innerHTML : "Commander via WhatsApp";

    let currentVendorWhatsapp = "";
    let productsCache = {};

    function renderLoadingState(message = "Chargement du catalogue...") {
        if (!productsGrid) return;
        productsGrid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-14 space-y-3 text-gray-500">
                <span class="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                <p class="text-xs font-medium">${message}</p>
            </div>
        `;
    }

    function setSubmitLoading(isLoading) {
        if (!modalSubmitBtn) return;
        modalSubmitBtn.disabled = isLoading;
        modalSubmitBtn.innerHTML = isLoading
            ? `<span class="inline-flex items-center justify-center gap-2"><span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span><span>Envoi...</span></span>`
            : DEFAULT_SUBMIT_HTML;
    }

    function showModalError(message) {
        if (!modalOrderError) {
            alert(message);
            return;
        }
        modalOrderError.textContent = message;
        modalOrderError.classList.remove("hidden");
    }

    function clearModalError() {
        if (!modalOrderError) return;
        modalOrderError.textContent = "";
        modalOrderError.classList.add("hidden");
    }

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
        renderLoadingState("Chargement des produits...");

        try {
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
            productsCache = {};

            products.forEach(prod => {
                productsCache[String(prod.id)] = prod;
                const stock = prod.stock !== undefined && prod.stock !== null ? Number(prod.stock) : 0;
                const isOutOfStock = stock <= 0;
                const card = document.createElement("div");
                card.className = `bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between transition ${isOutOfStock ? 'opacity-60 border-red-200' : 'hover:shadow-md'}`;

                card.innerHTML = `
                    <div>
                        <div class="h-48 w-full bg-gray-100 relative overflow-hidden">
                            <img src="${prod.image_url || 'https://via.placeholder.com/300'}" alt="${prod.nom}" class="w-full h-full object-cover">
                            ${isOutOfStock ? '<span class="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded font-semibold">Épuisé</span>' : ''}
                        </div>
                        <div class="p-4 space-y-2">
                            <h3 class="font-bold text-gray-800 text-base">${prod.nom}</h3>
                            <p class="text-blue-600 font-bold text-sm">${Number(prod.prix || 0).toLocaleString()} FCFA</p>
                            <p class="text-xs font-medium ${isOutOfStock ? 'text-red-600' : 'text-gray-500'}">
                                ${isOutOfStock ? 'Rupture de stock' : `En stock : ${stock}`}
                            </p>

                            <!-- Accordéon déroulant sur la carte -->
                            <details class="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border">
                                <summary class="font-medium text-gray-700 cursor-pointer select-none">Des questions ? Lisez la description du produit</summary>
                                <p class="mt-2 pt-2 border-t text-gray-600 whitespace-pre-line">${prod.description || 'Aucune description détaillée fournie.'}</p>
                            </details>
                        </div>
                    </div>
                    <div class="p-4 pt-2">
                        <button onclick="window.openOrderModal('${prod.id}', '${vId}')"
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

    window.openOrderModal = function(productId, vId) {
        const prod = productsCache[String(productId)];
        if (!prod) return;

        clearModalError();
        setSubmitLoading(false);
        const stock = prod.stock !== undefined && prod.stock !== null ? Number(prod.stock) : 0;

        if (stock <= 0) {
            if (modalProductTitle) modalProductTitle.textContent = prod.nom;
            if (modalStockInfo) {
                modalStockInfo.textContent = "Produit épuisé (stock : 0).";
                modalStockInfo.className = "text-xs text-red-600 font-medium mt-1";
            }
            if (modalQty) {
                modalQty.value = 0;
                modalQty.max = 0;
                modalQty.disabled = true;
            }
            if (modalSubmitBtn) modalSubmitBtn.disabled = true;
            showModalError("Ce produit est en rupture de stock et ne peut pas être commandé.");
            if (orderModal) orderModal.classList.remove("hidden");
            return;
        }

        if (modalQty) {
            modalQty.disabled = false;
            modalQty.min = 1;
            modalQty.max = stock;
            modalQty.value = 1;
        }
        if (modalSubmitBtn) modalSubmitBtn.disabled = false;
        if (modalStockInfo) {
            modalStockInfo.textContent = `Disponible en stock : ${stock}`;
            modalStockInfo.className = "text-xs text-gray-500 mt-1";
        }

        if (modalProductTitle) modalProductTitle.textContent = `Commander : ${prod.nom}`;
        if (modalProductDesc) modalProductDesc.textContent = prod.description || "Aucune description détaillée fournie.";
        if (modalDescDetails) modalDescDetails.removeAttribute("open");

        if (modalProductId) modalProductId.value = productId;
        if (modalVendorId) modalVendorId.value = vId;
        if (orderModal) orderModal.classList.remove("hidden");
    };

    if (closeModalBtn && orderModal) {
        closeModalBtn.addEventListener("click", () => {
            clearModalError();
            setSubmitLoading(false);
            orderModal.classList.add("hidden");
        });
    }

    if (orderForm) {
        orderForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearModalError();

            const pId = modalProductId.value;
            const vId = modalVendorId.value;
            const qty = parseInt(modalQty.value, 10);
            const phone = modalPhone.value.trim();
            const location = modalLocation.value.trim();

            if (!phone || !location || isNaN(qty) || qty < 1) {
                showModalError("Veuillez remplir tous les champs correctement.");
                return;
            }

            const cachedProd = productsCache[String(pId)];
            const cachedStock = cachedProd && cachedProd.stock !== undefined && cachedProd.stock !== null
                ? Number(cachedProd.stock)
                : 0;

            if (cachedStock <= 0) {
                showModalError("Ce produit est en rupture de stock.");
                return;
            }

            if (qty > cachedStock) {
                showModalError(`Stock insuffisant : maximum ${cachedStock} disponible(s).`);
                return;
            }

            setSubmitLoading(true);

            try {
                // Vérification fraîche du stock avant insertion
                const { data: freshProd, error: stockErr } = await db
                    .from("produits")
                    .select("stock")
                    .eq("id", pId)
                    .maybeSingle();

                if (stockErr) throw stockErr;

                const latestStock = freshProd && freshProd.stock !== undefined && freshProd.stock !== null
                    ? Number(freshProd.stock)
                    : 0;

                if (latestStock <= 0) {
                    showModalError("Ce produit vient d'être épuisé.");
                    return;
                }

                if (qty > latestStock) {
                    showModalError(`Stock insuffisant : seulement ${latestStock} restant(s).`);
                    return;
                }

                const { error: insertError } = await db.from("commandes").insert([
                    {
                        vendor_id: vId,
                        produit_id: pId,
                        quantite: qty,
                        telephone_client: phone,
                        lieu_livraison: location,
                        statut: "en_attente"
                    }
                ]);

                if (insertError) throw insertError;

                const productName = modalProductTitle.textContent.replace("Commander : ", "");
                const whatsappMessage = encodeURIComponent(
                    `Bonjour, je souhaite passer commande :\n\n- Produit : *${productName}*\n- Quantité : *${qty}*\n- Lieu de livraison : *${location}*\n- Mon contact : *${phone}*`
                );

                orderModal.classList.add("hidden");
                orderForm.reset();
                clearModalError();

                const cleanWhatsappNumber = currentVendorWhatsapp.replace(/[^0-9+]/g, "");
                window.open(`https://wa.me/${cleanWhatsappNumber}?text=${whatsappMessage}`, "_blank");

            } catch (err) {
                console.error(err);
                showModalError("Erreur lors de l'enregistrement de la commande : " + (err.message || "Problème réseau."));
            } finally {
                setSubmitLoading(false);
            }
        });
    }
});
