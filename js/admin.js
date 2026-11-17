// js/admin.js

document.addEventListener("DOMContentLoaded", () => {
    const authContainer = document.getElementById("auth-container");
    const dashboardContainer = document.getElementById("dashboard-container");
    const authTitle = document.getElementById("auth-title");
    const authForm = document.getElementById("auth-form");
    const submitBtn = document.getElementById("submit-btn");
    const toggleAuth = document.getElementById("toggle-auth");
    const logoutBtn = document.getElementById("logout-btn");
    const welcomeShop = document.getElementById("welcome-shop");
    const shopLinkInput = document.getElementById("shop-link-input");
    const copyLinkBtn = document.getElementById("copy-link-btn");
    
    const signupFields = document.getElementById("signup-fields");
    const shopNameInput = document.getElementById("shop_name");
    const whatsappInput = document.getElementById("whatsapp");
    const shopIdInput = document.getElementById("shop_id");
    const passwordInput = document.getElementById("password");

    // Éléments du formulaire produit
    const productForm = document.getElementById("product-form");
    const formSectionTitle = document.getElementById("form-section-title");
    const saveProdBtn = document.getElementById("save-prod-btn");
    const cancelEditBtn = document.getElementById("cancel-edit-btn");
    const editProductIdInput = document.getElementById("edit-product-id");
    const prodNameInput = document.getElementById("prod-name");
    const prodPriceInput = document.getElementById("prod-price");
    const prodStockInput = document.getElementById("prod-stock");
    const prodDescInput = document.getElementById("prod-desc");
    const prodImageInput = document.getElementById("prod-image");
    
    const productsList = document.getElementById("products-list");
    const ordersList = document.getElementById("orders-list");

    let isLoginMode = true;

    // --- 1. AUTHENTIFICATION & SESSION ---

    if (toggleAuth) {
        toggleAuth.addEventListener("click", (e) => {
            e.preventDefault();
            clearFeedback();
            isLoginMode = !isLoginMode;

            if (isLoginMode) {
                if (authTitle) authTitle.textContent = "Connexion Vendeur";
                if (submitBtn) submitBtn.textContent = "Se connecter";
                if (signupFields) signupFields.classList.add("hidden");
                toggleAuth.textContent = "Pas encore de compte ? S'inscrire";
            } else {
                if (authTitle) authTitle.textContent = "Inscription Vendeur";
                if (submitBtn) submitBtn.textContent = "S'inscrire";
                if (signupFields) signupFields.classList.remove("hidden");
                toggleAuth.textContent = "Déjà un compte ? Se connecter";
            }
        });
    }

    if (authForm) {
        authForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearFeedback();

            const shopId = shopIdInput ? shopIdInput.value.trim() : "";
            const password = passwordInput ? passwordInput.value.trim() : "";

            if (!shopId) {
                showError(shopIdInput, "L'identifiant de la boutique est obligatoire.");
                return;
            }

            if (!/^[a-z0-9_-]+$/.test(shopId)) {
                showError(shopIdInput, "L'identifiant doit être en minuscules, sans espaces ni accents (ex: ma-boutique).");
                return;
            }

            if (password.length < 6) {
                showError(passwordInput, "Le mot de passe doit contenir au moins 6 caractères.");
                return;
            }

            if (isLoginMode) {
                await handleLogin(shopId, password);
            } else {
                const shopName = shopNameInput ? shopNameInput.value.trim() : "";
                const whatsapp = whatsappInput ? whatsappInput.value.trim().replace(/\s+/g, "") : "";

                if (!shopName) {
                    showError(shopNameInput, "Le nom de la boutique est obligatoire.");
                    return;
                }

                if (!whatsapp) {
                    showError(whatsappInput, "Le numéro WhatsApp est obligatoire.");
                    return;
                }

                if (!whatsapp.startsWith("+")) {
                    showError(whatsappInput, "Précise obligatoirement l'indicatif de ton pays (ex: +225...).");
                    return;
                }

                if (!/^\+[1-9][0-9]{7,14}$/.test(whatsapp)) {
                    showError(whatsappInput, "Format international invalide (ex: +2250502554883).");
                    return;
                }

                await handleSignup(shopId, shopName, whatsapp, password);
            }
        });
    }

    async function handleSignup(shopId, shopName, whatsapp, password) {
        setLoading(true);
        try {
            const { data: existingVendor, error: checkError } = await db
                .from("vendeurs")
                .select("id")
                .eq("id", shopId)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existingVendor) {
                showError(shopIdInput, "Cet identifiant de boutique est déjà pris.");
                setLoading(false);
                return;
            }

            const { error: insertError } = await db.from("vendeurs").insert([
                { id: shopId, nom_boutique: shopName, telephone_whatsapp: whatsapp, mot_de_passe: password }
            ]);

            if (insertError) throw insertError;

            localStorage.setItem("vendor_session", JSON.stringify({ shopId, shopName, whatsapp }));
            showDashboard();
        } catch (err) {
            showGlobalError("Erreur lors de l'inscription : " + (err.message || "Problème réseau."));
        } finally {
            setLoading(false);
        }
    }

    async function handleLogin(shopId, password) {
        setLoading(true);
        try {
            const { data, error } = await db
                .from("vendeurs")
                .select("*")
                .eq("id", shopId)
                .eq("mot_de_passe", password)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                showGlobalError("Identifiant ou mot de passe incorrect.");
                setLoading(false);
                return;
            }

            localStorage.setItem("vendor_session", JSON.stringify({
                shopId: data.id,
                shopName: data.nom_boutique,
                whatsapp: data.telephone_whatsapp
            }));

            showDashboard();
        } catch (err) {
            showGlobalError("Erreur de connexion : " + (err.message || "Problème réseau."));
        } finally {
            setLoading(false);
        }
    }

    function getSession() {
        const sessionStr = localStorage.getItem("vendor_session");
        return sessionStr ? JSON.parse(sessionStr) : null;
    }

    function showDashboard() {
        if (authContainer) authContainer.classList.add("hidden");
        if (dashboardContainer) dashboardContainer.classList.remove("hidden");
        
        const session = getSession();
        if (session) {
            if (welcomeShop) welcomeShop.textContent = `Bienvenue, ${session.shopName}`;
            
            // Génération du lien personnalisé de la boutique
            if (shopLinkInput) {
                const currentUrl = window.location.href.replace("admin.html", "index.html");
                shopLinkInput.value = `${currentUrl.split('?')[0]}?v=${session.shopId}`;
            }
        }

        loadVendorProducts();
        loadVendorOrders();
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("vendor_session");
            window.location.reload();
        });
    }

    if (copyLinkBtn && shopLinkInput) {
        copyLinkBtn.addEventListener("click", () => {
            shopLinkInput.select();
            navigator.clipboard.writeText(shopLinkInput.value);
            copyLinkBtn.textContent = "Copié !";
            setTimeout(() => { copyLinkBtn.textContent = "Copier le lien"; }, 2000);
        });
    }

    // --- 2. GESTION DES PRODUITS (CRUD COMPLET & STOCK) ---

    async function loadVendorProducts() {
        const session = getSession();
        if (!session || !productsList) return;

        productsList.innerHTML = `<p class="text-gray-400">Chargement de votre catalogue...</p>`;

        try {
            const { data: products, error } = await db
                .from("produits")
                .select("*")
                .eq("vendor_id", session.shopId)
                .order("cree_le", { ascending: false });

            if (error) throw error;

            if (!products || products.length === 0) {
                productsList.innerHTML = `<p class="text-gray-500 italic">Aucun produit dans votre catalogue.</p>`;
                return;
            }

            productsList.innerHTML = "";
            products.forEach(prod => {
                const isOutOfStock = (prod.stock !== undefined && prod.stock <= 0);
                const card = document.createElement("div");
                // Carte en rouge si le stock est épuisé
                card.className = `flex items-center justify-between p-3 border rounded-lg transition ${isOutOfStock ? 'bg-red-50 border-red-300' : 'bg-gray-50'}`;
                
                card.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <img src="${prod.image_url || 'https://via.placeholder.com/50'}" class="w-12 h-12 object-cover rounded-md border">
                        <div>
                            <h4 class="font-bold text-gray-800">${prod.nom}</h4>
                            <p class="text-xs text-blue-600 font-semibold">${prod.prix.toLocaleString()} FCFA</p>
                            <p class="text-xs font-bold ${isOutOfStock ? 'text-red-600' : 'text-gray-500'}">
                                Stock : ${prod.stock !== undefined ? prod.stock : 'N/A'} ${isOutOfStock ? '(Épuisé)' : ''}
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="window.editProductModal('${prod.id}', '${escapeHtml(prod.nom)}', ${prod.prix}, ${prod.stock || 0}, '${escapeHtml(prod.description || '')}')" class="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 bg-blue-50 rounded border border-blue-200">Modifier</button>
                        <button onclick="window.deleteProduct('${prod.id}')" class="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 bg-red-50 rounded border border-red-200">Supprimer</button>
                    </div>
                `;
                productsList.appendChild(card);
            });
        } catch (err) {
            console.error(err);
            productsList.innerHTML = `<p class="text-red-500">Erreur lors du chargement du catalogue.</p>`;
        }
    }

    window.loadVendorProducts = loadVendorProducts;

    // Préparer le formulaire pour l'édition d'un produit
    window.editProductModal = function(id, name, price, stock, desc) {
        if (editProductIdInput) editProductIdInput.value = id;
        if (prodNameInput) prodNameInput.value = name;
        if (prodPriceInput) prodPriceInput.value = price;
        if (prodStockInput) prodStockInput.value = stock;
        if (prodDescInput) prodDescInput.value = desc;

        if (formSectionTitle) formSectionTitle.textContent = "Modifier le produit";
        if (saveProdBtn) saveProdBtn.textContent = "Mettre à jour";
        if (cancelEditBtn) cancelEditBtn.classList.remove("hidden");
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener("click", () => {
            resetProductForm();
        });
    }

    function resetProductForm() {
        if (productForm) productForm.reset();
        if (editProductIdInput) editProductIdInput.value = "";
        if (formSectionTitle) formSectionTitle.textContent = "Ajouter un produit";
        if (saveProdBtn) saveProdBtn.textContent = "Ajouter au catalogue";
        if (cancelEditBtn) cancelEditBtn.classList.add("hidden");
    }

    window.deleteProduct = async function(productId) {
        if (!confirm("Voulez-vous vraiment supprimer ce produit ?")) return;
        try {
            const { error } = await db.from("produits").delete().eq("id", productId);
            if (error) throw error;
            loadVendorProducts();
        } catch (err) {
            alert("Erreur lors de la suppression : " + err.message);
        }
    };

    // Soumission du formulaire (Ajout ou Modification)
    if (productForm) {
        productForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const session = getSession();
            if (!session) return;

            const productId = editProductIdInput.value;
            const name = prodNameInput.value.trim();
            const price = parseFloat(prodPriceInput.value);
            const stock = parseInt(prodStockInput.value);
            const description = prodDescInput.value.trim();
            const imageFile = prodImageInput.files[0];

            if (!name || isNaN(price) || isNaN(stock)) {
                alert("Veuillez remplir correctement les champs obligatoires.");
                return;
            }

            if (saveProdBtn) {
                saveProdBtn.disabled = true;
                saveProdBtn.textContent = "Traitement en cours...";
            }

            try {
                let imageUrl = null;

                // Upload ImgBB si une nouvelle image est sélectionnée
                if (imageFile) {
                    let fileToUpload = imageFile;
                    if (typeof window.compressImage === "function") {
                        fileToUpload = await window.compressImage(imageFile, { quality: 0.8, maxWidth: 1000 });
                    }

                    const formData = new FormData();
                    formData.append("image", fileToUpload);

                    const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                        method: "POST",
                        body: formData
                    });
                    const imgbbData = await imgbbResponse.json();

                    if (!imgbbData.success) {
                        throw new Error("Échec de l'upload de l'image sur ImgBB.");
                    }
                    imageUrl = imgbbData.data.url;
                }

                if (productId) {
                    // --- MODE MISE À JOUR ---
                    const updateData = {
                        nom: name,
                        prix: price,
                        stock: stock,
                        description: description
                    };
                    if (imageUrl) updateData.image_url = imageUrl;

                    const { error: updateError } = await db
                        .from("produits")
                        .update(updateData)
                        .eq("id", productId);

                    if (updateError) throw updateError;
                    alert("Produit mis à jour avec succès !");
                } else {
                    // --- MODE CRÉATION ---
                    if (!imageUrl) {
                        alert("Veuillez joindre une image pour un nouveau produit.");
                        saveProdBtn.disabled = false;
                        saveProdBtn.textContent = "Ajouter au catalogue";
                        return;
                    }

                    const { error: insertError } = await db.from("produits").insert([
                        {
                            vendor_id: session.shopId,
                            nom: name,
                            prix: price,
                            stock: stock,
                            description: description,
                            image_url: imageUrl
                        }
                    ]);

                    if (insertError) throw insertError;
                    alert("Produit ajouté avec succès !");
                }

                resetProductForm();
                loadVendorProducts();
            } catch (err) {
                console.error(err);
                alert("Erreur : " + (err.message || "Opération impossible."));
            } finally {
                if (saveProdBtn) {
                    saveProdBtn.disabled = false;
                    saveProdBtn.textContent = editProductIdInput.value ? "Mettre à jour" : "Ajouter au catalogue";
                }
            }
        });
    }

    // --- 3. GESTION DES COMMANDES (VALIDATION / ANNULATION & STOCK) ---

    async function loadVendorOrders() {
        const session = getSession();
        if (!session || !ordersList) return;

        try {
            const { data: orders, error } = await db
                .from("commandes")
                .select("*, produits(id, nom, stock)")
                .eq("vendor_id", session.shopId)
                .order("cree_le", { ascending: false });

            if (error) {
                ordersList.innerHTML = `<p class="text-gray-500 italic">Aucune commande pour le moment.</p>`;
                return;
            }

            if (!orders || orders.length === 0) {
                ordersList.innerHTML = `<p class="text-gray-500 italic">Aucune commande reçue.</p>`;
                return;
            }

            ordersList.innerHTML = "";
            orders.forEach(ord => {
                const status = ord.statut || 'en_attente';
                let statusBadge = '<span class="px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-800 font-semibold">En attente</span>';
                if (status === 'confirmée') statusBadge = '<span class="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800 font-semibold">Confirmée</span>';
                if (status === 'annulée') statusBadge = '<span class="px-2 py-0.5 text-xs rounded bg-red-100 text-red-800 font-semibold">Annulée</span>';

                const item = document.createElement("div");
                item.className = "p-3 border rounded-lg bg-gray-50 space-y-2";
                item.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-bold text-gray-800">Client : ${ord.telephone_client}</p>
                            <p class="text-xs text-gray-600">Produit : <span class="font-medium">${ord.produits?.nom || 'Article'}</span> (x${ord.quantite})</p>
                            <p class="text-xs text-gray-500">Lieu : ${ord.lieu_livraison}</p>
                        </div>
                        <div>${statusBadge}</div>
                    </div>
                    <div class="flex justify-end space-x-2 pt-2 border-t text-xs">
                        <button onclick="window.handleOrderAction('${ord.id}', '${ord.produit_id}', ${ord.quantite}, 'confirmée')" class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition">Valider</button>
                        <button onclick="window.handleOrderAction('${ord.id}', '${ord.produit_id}', ${ord.quantite}, 'annulée')" class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition">Annuler</button>
                    </div>
                `;
                ordersList.appendChild(item);
            });
        } catch (err) {
            ordersList.innerHTML = `<p class="text-gray-500 italic">Module commandes en attente de configuration.</p>`;
        }
    }

    // Valider ou annuler une commande et mettre à jour le stock automatiquement
    window.handleOrderAction = async function(orderId, produitId, orderedQty, newStatus) {
        if (!confirm(`Voulez-vous vraiment marquer cette commande comme "${newStatus}" ?`)) return;

        try {
            // 1. Mettre à jour le statut de la commande
            const { error: updateError } = await db
                .from("commandes")
                .update({ statut: newStatus })
                .eq("id", orderId);

            if (updateError) throw updateError;

            // 2. Si la commande est validée (confirmée), on décrémente le stock du produit correspondant
            if (newStatus === 'confirmée' && produitId) {
                const { data: prodData, error: prodError } = await db
                    .from("produits")
                    .select("stock")
                    .eq("id", produitId)
                    .maybeSingle();

                if (!prodError && prodData) {
                    const currentStock = prodData.stock !== undefined ? prodData.stock : 0;
                    const newStock = Math.max(0, currentStock - orderedQty);

                    await db
                        .from("produits")
                        .update({ stock: newStock })
                        .eq("id", produitId);
                }
            }

            loadVendorOrders();
            loadVendorProducts();
            alert(`Commande ${newStatus} avec succès !`);
        } catch (err) {
            alert("Erreur lors du traitement de la commande : " + err.message);
        }
    };

    // --- 4. UTILITAIRES ---

    function showError(inputElement, message) {
        if (!inputElement) return;
        inputElement.classList.add("border-red-500", "bg-red-50");
        let errorMsg = inputElement.parentNode.querySelector(".error-text");
        if (!errorMsg) {
            errorMsg = document.createElement("p");
            errorMsg.className = "error-text text-red-600 text-xs mt-1 font-medium";
            inputElement.parentNode.appendChild(errorMsg);
        }
        errorMsg.textContent = message;
        inputElement.focus();
    }

    function showGlobalError(message) {
        let globalBox = document.getElementById("auth-global-error");
        if (!globalBox && authForm) {
            globalBox = document.createElement("div");
            globalBox.id = "auth-global-error";
            globalBox.className = "mb-4 p-3 bg-red-100 border border-red-400 text-red-700 text-sm rounded";
            authForm.prepend(globalBox);
        }
        if (globalBox) globalBox.textContent = message;
    }

    function clearFeedback() {
        document.querySelectorAll(".error-text").forEach(el => el.remove());
        document.querySelectorAll("input").forEach(el => el.classList.remove("border-red-500", "bg-red-50"));
        const globalBox = document.getElementById("auth-global-error");
        if (globalBox) globalBox.remove();
    }

    function setLoading(isLoading) {
        if (submitBtn) {
            submitBtn.disabled = isLoading;
            submitBtn.textContent = isLoading ? "Traitement..." : (isLoginMode ? "Se connecter" : "S'inscrire");
        }
    }

    function escapeHtml(str) {
        return str.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
    }

    const session = getSession();
    if (session) {
        showDashboard();
    }
});
