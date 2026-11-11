document.addEventListener("DOMContentLoaded", () => {
    const authForm = document.getElementById("auth-form");
    const shopIdInput = document.getElementById("shop-id");
    const shopPasswordInput = document.getElementById("shop-password");
    const shopNameInput = document.getElementById("shop-name");
    const shopPhoneInput = document.getElementById("shop-phone");
    const signupFields = document.getElementById("signup-fields");
    const authTitle = document.getElementById("auth-title");
    const authBtn = document.getElementById("auth-btn");
    const authSwitchText = document.getElementById("auth-switch-text");
    const toggleModeBtn = document.getElementById("toggle-mode");
    const authSection = document.getElementById("auth-section");
    const dashboardSection = document.getElementById("dashboard-section");
    const authStatus = document.getElementById("auth-status");
    const logoutBtn = document.getElementById("logout-btn");
    const welcomeShop = document.getElementById("welcome-shop");
    const productForm = document.getElementById("product-form");
    const productsList = document.getElementById("products-list");
    const ordersList = document.getElementById("orders-list");

    let isSignup = false;
    let currentVendor = JSON.parse(localStorage.getItem("currentVendor")) || null;

    // Vérifier si un vendeur est déjà connecté en mémoire
    if (currentVendor) {
        showDashboard(currentVendor);
    }

    // Basculer entre Connexion et Inscription
    toggleModeBtn.addEventListener("click", () => {
        isSignup = !isSignup;
        if (isSignup) {
            authTitle.textContent = "Inscription Vendeur";
            authBtn.textContent = "S'inscrire";
            signupFields.classList.remove("hidden");
            authSwitchText.textContent = "Déjà un compte ?";
            toggleModeBtn.textContent = "Se connecter";
            shopNameInput.required = true;
            shopPhoneInput.required = true;
        } else {
            authTitle.textContent = "Connexion Vendeur";
            authBtn.textContent = "Se connecter";
            signupFields.classList.add("hidden");
            authSwitchText.textContent = "Pas encore de compte ?";
            toggleModeBtn.textContent = "S'inscrire";
            shopNameInput.required = false;
            shopPhoneInput.required = false;
        }
    });

    // Gestion de la soumission du formulaire d'authentification
    authForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = shopIdInput.value.trim().toLowerCase();
        const password = shopPasswordInput.value.trim();

        if (isSignup) {
            const nom_boutique = shopNameInput.value.trim();
            const telephone_whatsapp = shopPhoneInput.value.trim();

            const { error } = await db.from("vendeurs").insert([{
                id,
                nom_boutique,
                telephone_whatsapp,
                mot_de_passe: password
            }]);

            if (error) {
                alert("Erreur lors de l'inscription : " + error.message);
                return;
            }

            alert("Compte créé avec succès ! Connecte-toi.");
            toggleModeBtn.click();
        } else {
            const { data, error } = await db
                .from("vendeurs")
                .select("*")
                .eq("id", id)
                .single();

            if (error || !data || data.mot_de_passe !== password) {
                alert("Identifiant ou mot de passe incorrect.");
                return;
            }

            currentVendor = data;
            localStorage.setItem("currentVendor", JSON.stringify(currentVendor));
            showDashboard(currentVendor);
        }
    });

    // Déconnexion
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("currentVendor");
        currentVendor = null;
        dashboardSection.classList.add("hidden");
        authSection.classList.remove("hidden");
        authStatus.textContent = "Non connecté";
        authForm.reset();
    });

    function showDashboard(vendor) {
        authSection.classList.add("hidden");
        dashboardSection.classList.remove("hidden");
        authStatus.textContent = `Connecté : ${vendor.nom_boutique}`;
        welcomeShop.textContent = `Boutique : ${vendor.nom_boutique}`;
        loadVendorData(vendor.id);
    }

    // Charger les produits et commandes du vendeur
    async function loadVendorData(vendorId) {
        // Chargement des produits
        const { data: products, error: prodError } = await db
            .from("produits")
            .select("*")
            .eq("vendor_id", vendorId)
            .order("cree_le", { ascending: false });

        if (!prodError) {
            if (products.length === 0) {
                productsList.innerHTML = `<p class="text-gray-400">Aucun produit pour le moment.</p>`;
            } else {
                productsList.innerHTML = products.map(p => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div class="flex items-center space-x-3">
                            <img src="${p.image_url}" alt="${p.nom}" class="w-12 h-12 object-cover rounded">
                            <div>
                                <p class="font-semibold text-gray-800">${p.nom}</p>
                                <p class="text-xs text-gray-500">${p.prix} FCFA - <span class="${p.statut === 'disponible' ? 'text-green-600' : 'text-red-500'}">${p.statut}</span></p>
                            </div>
                        </div>
                        <button onclick="toggleProductStatus('${p.id}', '${p.statut}')" class="text-xs px-2 py-1 bg-white border rounded hover:bg-gray-100">
                            Changer statut
                        </button>
                    </div>
                `).join("");
            }
        }

        // Chargement des commandes
        const { data: orders, error: ordError } = await db
            .from("commandes")
            .select("*, produits(nom)")
            .eq("vendor_id", vendorId)
            .order("cree_le", { ascending: false });

        if (!ordError) {
            if (orders.length === 0) {
                ordersList.innerHTML = `<p class="text-gray-400">Aucune commande reçue.</p>`;
            } else {
                ordersList.innerHTML = orders.map(o => `
                    <div class="p-3 bg-gray-50 rounded-lg border space-y-1">
                        <div class="flex justify-between font-semibold text-gray-800">
                            <span>Produit : ${o.produits ? o.produits.nom : 'Inconnu'}</span>
                            <span class="text-blue-600">Qté: ${o.quantite}</span>
                        </div>
                        <p class="text-xs text-gray-600">Client : <a href="https://wa.me/${o.telephone_client}" target="_blank" class="text-green-600 underline font-medium">${o.telephone_client}</a></p>
                        <p class="text-xs text-gray-500">Lieu : ${o.lieu_livraison}</p>
                    </div>
                `).join("");
            }
        }
    }

    // Ajout d'un produit
    productForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById("save-prod-btn");
        submitBtn.textContent = "Compression et upload en cours...";
        submitBtn.disabled = true;

        const nom = document.getElementById("prod-name").value;
        const prix = parseInt(document.getElementById("prod-price").value);
        const description = document.getElementById("prod-desc").value;
        const imageFile = document.getElementById("prod-image").files[0];

        try {
            // Utilisation de la fonction d'upload compressée (compress.js)
            const imageUrl = await compressAndUploadImage(imageFile);

            const { error } = await db.from("produits").insert([{
                vendor_id: currentVendor.id,
                nom,
                prix,
                description,
                image_url: imageUrl,
                statut: "disponible"
            }]);

            if (error) throw error;

            alert("Produit ajouté avec succès !");
            productForm.reset();
            loadVendorData(currentVendor.id);
        } catch (err) {
            alert("Erreur lors de l'ajout : " + err.message);
        } finally {
            submitBtn.textContent = "Ajouter au catalogue";
            submitBtn.disabled = false;
        }
    });

    // Fonction globale pour changer le statut d'un produit
    window.toggleProductStatus = async function(productId, currentStatus) {
        const newStatus = currentStatus === "disponible" ? "epuise" : "disponible";
        const { error } = await db
            .from("produits")
            .update({ statut: newStatus })
            .eq("id", productId);

        if (!error) {
            loadVendorData(currentVendor.id);
        } else {
            alert("Erreur lors de la mise à jour.");
        }
    };
});