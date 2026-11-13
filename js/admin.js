// js/admin.js

document.addEventListener("DOMContentLoaded", () => {
    const authContainer = document.getElementById("auth-container");
    const dashboardContainer = document.getElementById("dashboard-container");
    const authTitle = document.getElementById("auth-title");
    const authForm = document.getElementById("auth-form");
    const submitBtn = document.getElementById("submit-btn");
    const toggleAuth = document.getElementById("toggle-auth");
    
    const signupFields = document.getElementById("signup-fields");
    const shopNameInput = document.getElementById("shop_name");
    const whatsappInput = document.getElementById("whatsapp");
    const shopIdInput = document.getElementById("shop_id");
    const passwordInput = document.getElementById("password");

    let isLoginMode = true;

    // Gestion propre du basculement Connexion / Inscription
    if (toggleAuth) {
        toggleAuth.addEventListener("click", (e) => {
            e.preventDefault();
            clearFeedback();
            isLoginMode = !isLoginMode;

            if (isLoginMode) {
                if (authTitle) authTitle.textContent = "Connexion Vendeur";
                if (submitBtn) submitBtn.textContent = "Se connecter";
                if (signupFields) signupFields.classList.add("hidden");
                toggleAuth.innerHTML = 'Pas encore de compte ? <span class="text-blue-600 underline">S\'inscrire</span>';
            } else {
                if (authTitle) authTitle.textContent = "Inscription Vendeur";
                if (submitBtn) submitBtn.textContent = "S'inscrire";
                if (signupFields) signupFields.classList.remove("hidden");
                toggleAuth.innerHTML = 'Déjà un compte ? <span class="text-blue-600 underline">Se connecter</span>';
            }
        });
    }

    // Soumission unique du formulaire avec validations strictes et guidage visuel
    if (authForm) {
        authForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearFeedback();

            const shopId = shopIdInput ? shopIdInput.value.trim() : "";
            const password = passwordInput ? passwordInput.value.trim() : "";

            // Validation de l'identifiant
            if (!shopId) {
                showError(shopIdInput, "L'identifiant de la boutique est obligatoire.");
                return;
            }
            if (!/^[a-z0-9_-]+$/.test(shopId)) {
                showError(shopIdInput, "L'identifiant doit être en minuscules, sans espaces ni accents (ex: ma-boutique).");
                return;
            }

            // Validation du mot de passe
            if (password.length < 6) {
                showError(passwordInput, "Le mot de passe doit contenir au moins 6 caractères.");
                return;
            }

            if (isLoginMode) {
                await handleLogin(shopId, password);
            } else {
                const shopName = shopNameInput ? shopNameInput.value.trim() : "";
                const whatsapp = whatsappInput ? whatsappInput.value.trim().replace(/\s+/g, "") : "";

                // Validation du nom de la boutique
                if (!shopName) {
                    showError(shopNameInput, "Le nom de la boutique est obligatoire.");
                    return;
                }

                // Validation stricte du numéro WhatsApp avec indicatif international obligatoire
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

    // Logique d'inscription
    async function handleSignup(shopId, shopName, whatsapp, password) {
        setLoading(true);
        try {
            // Vérifier si l'identifiant existe déjà dans la base
            const { data: existingVendor, error: checkError } = await db
                .from("vendeurs")
                .select("id")
                .eq("id", shopId)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existingVendor) {
                showError(shopIdInput, "Cet identifiant de boutique est déjà pris. Choisis-en un autre.");
                setLoading(false);
                return;
            }

            // Insertion du nouveau vendeur
            const { error: insertError } = await db.from("vendeurs").insert([
                { id: shopId, nom_boutique: shopName, whatsapp: whatsapp, password: password }
            ]);

            if (insertError) throw insertError;

            // Enregistrement de la session et redirection vers le tableau de bord
            localStorage.setItem("vendor_session", JSON.stringify({ shopId, shopName, whatsapp }));
            showDashboard();
        } catch (err) {
            showGlobalError("Erreur lors de l'inscription : " + (err.message || "Problème de communication avec la base de données."));
        } finally {
            setLoading(false);
        }
    }

    // Logique de connexion
    async function handleLogin(shopId, password) {
        setLoading(true);
        try {
            const { data, error } = await db
                .from("vendeurs")
                .select("*")
                .eq("id", shopId)
                .eq("password", password)
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
                whatsapp: data.whatsapp
            }));

            showDashboard();
        } catch (err) {
            showGlobalError("Erreur de connexion : " + (err.message || "Problème de communication avec la base de données."));
        } finally {
            setLoading(false);
        }
    }

    // Affichage des erreurs ciblées sous le champ concerné (guidage visuel)
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

    // Affichage des erreurs globales (identifiants incorrects, pannes réseau)
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

    // Nettoyage complet des retours visuels d'erreur
    function clearFeedback() {
        document.querySelectorAll(".error-text").forEach(el => el.remove());
        document.querySelectorAll("input").forEach(el => el.classList.remove("border-red-500", "bg-red-50"));
        const globalBox = document.getElementById("auth-global-error");
        if (globalBox) globalBox.remove();
    }

    // Gestion dynamique de l'état de chargement du bouton
    function setLoading(isLoading) {
        if (submitBtn) {
            submitBtn.disabled = isLoading;
            submitBtn.textContent = isLoading ? "Traitement en cours..." : (isLoginMode ? "Se connecter" : "S'inscrire");
        }
    }

    // Affichage du tableau de bord vendeur
    function showDashboard() {
        if (authContainer) authContainer.classList.add("hidden");
        if (dashboardContainer) dashboardContainer.classList.remove("hidden");
        if (typeof window.loadVendorProducts === "function") {
            window.loadVendorProducts();
        }
    }

    // Restauration automatique de la session si l'utilisateur est déjà connecté
    const session = localStorage.getItem("vendor_session");
    if (session) {
        showDashboard();
    }
});

// Dans admin.js, après une connexion ou un chargement réussi du dashboard
function displayVendorShareLink(shopId) {
    // Récupère l'URL de base du site (ex: https://hankeo.github.io/marketplace/index.html)
    const baseUrl = window.location.href.replace('admin.html', 'index.html');
    const vendorLink = `${baseUrl}?v=${encodeURIComponent(shopId)}`;

    // Si tu as un élément HTML dédié dans ton dashboard (ex: <input id="share-link" readonly>)
    const linkInput = document.getElementById("vendor-share-link");
    if (linkInput) {
        linkInput.value = vendorLink;
    }
}
