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
    
    const signupFields = document.getElementById("signup-fields");
    const shopNameInput = document.getElementById("shop_name");
    const whatsappInput = document.getElementById("whatsapp");
    const shopIdInput = document.getElementById("shop_id");
    const passwordInput = document.getElementById("password");

    // Éléments du tableau de bord (Produits & Commandes)
    const productForm = document.getElementById("product-form");
    const saveProdBtn = document.getElementById("save-prod-btn");
    const prodNameInput = document.getElementById("prod-name");
    const prodPriceInput = document.getElementById("prod-price");
    const prodDescInput = document.getElementById("prod-desc");
    const prodImageInput = document.getElementById("prod-image");
    const productsList = document.getElementById("products-list");
    const ordersList = document.getElementById("orders-list");

    let isLoginMode = true;

    // --- 1. GESTION AUTHENTIFICATION ( CONNEXION / INSCRIPTION ) ---

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
                    showError(whatsappInput, "Précise obligatoirement l'indicatif de ton pays au début (ex: +225...).");
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

    // --- 2. GESTION DU TABLEAU DE BORD & PRODUITS ---

    function getSession() {
        const sessionStr = localStorage.getItem("vendor_session");
        return sessionStr ? JSON.parse(sessionStr) : null;
    }

    function showDashboard() {
        if (authContainer) authContainer.classList.add("hidden");
        if (dashboardContainer) dashboardContainer.classList.remove("hidden");
        
        const session = getSession();
        if (session && welcomeShop) {
            welcomeShop.textContent = `Bienvenue, ${session.shopName}`;
        }

        loadVendorProducts();
        loadVendorOrders();
    }

    // Gestion de la déconnexion
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("vendor_session");
            window.location.reload();
        });
    }

    // Charger les produits du vendeur connecté
    async function loadVendorProducts() {
        const session = getSession();
        if (!session || !productsList) return;

        productsList.innerHTML = `<p class="text-gray-400">Chargement de vos produits...</p>`;

        try {
            const { data: products, error } = await db
                .from("produits")
                .select("*")
                .eq("vendeur_id", session.shopId)
                .order("created_at", { ascending: false });

            if (error) throw error;

            if (!products || products.length === 0) {
                productsList.innerHTML = `<p class="text-gray-500 italic">Aucun produit ajouté pour le moment.</p>`;
                return;
            }

            productsList.innerHTML = "";
            products.forEach(prod => {
                const item = document.createElement("div");
                item.className = "flex items-center justify-between p-3 border rounded-lg bg-gray-50";
                item.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <img src="${prod.image_url || 'https://via.placeholder.com/50'}" class="w-12 h-12 object-cover rounded-md border">
                        <div>
                            <h4 class="font-bold text-gray-800">${prod.nom}</h4>
                            <p class="text-xs text-blue-600 font-semibold">${prod.prix.toLocaleString()} FCFA</p>
                        </div>
                    </div>
                    <button onclick="window.deleteProduct('${prod.id}')" class="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 bg-red-50 rounded border border-red-200">Supprimer</button>
                `;
                productsList.appendChild(item);
            });
        } catch (err) {
            console.error(err);
            productsList.innerHTML = `<p class="text-red-500">Erreur lors du chargement des produits.</p>`;
        }
    }

    // Exposer globalement pour le bouton supprimer
    window.loadVendorProducts = loadVendorProducts;

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

    // Ajouter un produit avec upload ImgBB
    if (productForm) {
        productForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const session = getSession();
            if (!session) return;

            const name = prodNameInput.value.trim();
            const price = parseFloat(prodPriceInput.value);
            const description = prodDescInput.value.trim();
            const imageFile = prodImageInput.files[0];

            if (!name || isNaN(price) || !imageFile) {
                alert("Veuillez remplir les champs obligatoires et joindre une image.");
                return;
            }

            if (saveProdBtn) {
                saveProdBtn.disabled = true;
                saveProdBtn.textContent = "Compression et upload en cours...";
            }

            try {
                // 1. Compression de l'image via compress.js
                let fileToUpload = imageFile;
                if (typeof window.compressImage === "function") {
                    fileToUpload = await window.compressImage(imageFile, { quality: 0.8, maxWidth: 1000 });
                }

                // 2. Upload vers ImgBB
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

                const imageUrl = imgbbData.data.url;

                // 3. Enregistrement dans Supabase
                const { error: insertError } = await db.from("produits").insert([
                    {
                        vendeur_id: session.shopId,
                        nom: name,
                        prix: price,
                        description: description,
                        image_url: imageUrl
                    }
                ]);

                if (insertError) throw insertError;

                // Réinitialiser le formulaire et rafraîchir la liste
                productForm.reset();
                loadVendorProducts();
                alert("Produit ajouté avec succès !");
            } catch (err) {
                console.error(err);
                alert("Erreur : " + (err.message || "Impossible d'ajouter le produit."));
            } finally {
                if (saveProdBtn) {
                    saveProdBtn.disabled = false;
                    saveProdBtn.textContent = "Ajouter au catalogue";
                }
            }
        });
    }

    // Charger les commandes reçues (si la table commandes existe)
    async function loadVendorOrders() {
        const session = getSession();
        if (!session || !ordersList) return;

        try {
            const { data: orders, error } = await db
                .from("commandes")
                .select("*, produits(nom)")
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
                const item = document.createElement("div");
                item.className = "p-3 border rounded-lg bg-gray-50 space-y-1";
                item.innerHTML = `
                    <p class="font-bold text-gray-800">Client : ${ord.telephone_client}</p>
                    <p class="text-xs text-gray-600">Produit : <span class="font-medium">${ord.produits?.nom || 'Article'}</span> (x${ord.quantite})</p>
                    <p class="text-xs text-gray-500">Lieu : ${ord.lieu_livraison}</p>
                `;
                ordersList.appendChild(item);
            });
        } catch (err) {
            ordersList.innerHTML = `<p class="text-gray-500 italic">Module commandes en attente.</p>`;
        }
    }

    // --- 3. FONCTIONS UTILITAIRES ---

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

    // Vérifier si une session active existe déjà au chargement de la page
    const session = getSession();
    if (session) {
        showDashboard();
    }
});
