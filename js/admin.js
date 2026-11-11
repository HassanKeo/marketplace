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

    // Ajout d'un texte d'aide explicite sous les champs
    if (whatsappInput) {
        whatsappInput.setAttribute("placeholder", "+2250502554883");
        let helpText = whatsappInput.parentNode.querySelector(".help-text-wa");
        if (!helpText) {
            helpText = document.createElement("p");
            helpText.className = "help-text-wa text-gray-500 text-xs mt-1";
            helpText.textContent = "Précise obligatoirement l'indicatif de ton pays (ex: +225...).";
            whatsappInput.parentNode.appendChild(helpText);
        }
    }

    if (shopIdInput) {
        let helpTextId = shopIdInput.parentNode.querySelector(".help-text-id");
        if (!helpTextId) {
            helpTextId = document.createElement("p");
            helpTextId.className = "help-text-id text-gray-500 text-xs mt-1";
            helpTextId.textContent = "Minuscules, chiffres et tirets uniquement, sans espaces.";
            shopIdInput.parentNode.appendChild(helpTextId);
        }
    }

    // Basculer entre Connexion et Inscription
    if (toggleAuth) {
        toggleAuth.addEventListener("click", (e) => {
            e.preventDefault();
            clearFeedback();
            isLoginMode = !isLoginMode;

            if (isLoginMode) {
                authTitle.textContent = "Connexion Vendeur";
                submitBtn.textContent = "Se connecter";
                signupFields.classList.add("hidden");
                toggleAuth.innerHTML = 'Pas encore de compte ? <span class="text-blue-600 underline">S\'inscrire</span>';
            } else {
                authTitle.textContent = "Inscription Vendeur";
                submitBtn.textContent = "S'inscrire";
                signupFields.classList.remove("hidden");
                toggleAuth.innerHTML = 'Déjà un compte ? <span class="text-blue-600 underline">Se connecter</span>';
            }
        });
    }

    // Gestion de la soumission du formulaire
    if (authForm) {
        authForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            clearFeedback();

            const shopId = shopIdInput.value.trim();
            const password = passwordInput.value.trim();

            if (!shopId) {
                showError(shopIdInput, "L'identifiant de la boutique est obligatoire.");
                return;
            }

            // Vérification stricte du format de l'ID (pas d'espaces, pas de majuscules, pas de caractères spéciaux non autorisés)
            if (!/^[a-z0-9_-]+$/.test(shopId)) {
                showError(shopIdInput, "L'identifiant ne doit contenir que des minuscules, chiffres, tirets ou underscores (pas d'espaces ni de majuscules).");
                return;
            }

            if (password.length < 6) {
                showError(passwordInput, "Le mot de passe doit contenir au moins 6 caractères.");
                return;
            }

            if (isLoginMode) {
                await handleLogin(shopId, password);
            } else {
                const shopName = shopNameInput.value.trim();
                const whatsapp = whatsappInput.value.trim().replace(/\s+/g, "");

                if (!shopName) {
                    showError(shopNameInput, "Le nom de la boutique est obligatoire.");
                    return;
                }

                // Vérification stricte de l'indicatif international
                if (!whatsapp.startsWith("+")) {
                    showError(whatsappInput, "Tu dois obligatoirement inclure l'indicatif de ton pays au début (ex: +225...).");
                    return;
                }

                if (!/^\+[1-9][0-9]{7,14}$/.test(whatsapp)) {
                    showError(whatsappInput, "Format WhatsApp invalide. Respecte le format international (ex: +2250502554883).");
                    return;
                }

                await handleSignup(shopId, shopName, whatsapp, password);
            }
        });
    }

    async function handleSignup(shopId, shopName, whatsapp, password) {
        setLoading(true);
        try {
            const { data: existingVendor } = await db
                .from("vendeurs")
                .select("id")
                .eq("id", shopId)
                .maybeSingle();

            if (existingVendor) {
                showError(shopIdInput, "Cet identifiant est déjà pris. Choisis-en un autre.");
                setLoading(false);
                return;
            }

            const { error } = await db.from("vendeurs").insert([
                { id: shopId, nom_boutique: shopName, whatsapp: whatsapp, password: password }
            ]);

            if (error) throw error;

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
                .eq("password", password)
                .maybeSingle();

            if (error || !data) {
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
            showGlobalError("Erreur de connexion : " + (err.message || "Vérifiez vos identifiants."));
        } finally {
            setLoading(false);
        }
    }

    function showError(inputElement, message) {
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
        if (!globalBox) {
            globalBox = document.createElement("div");
            globalBox.id = "auth-global-error";
            globalBox.className = "mb-4 p-3 bg-red-100 border border-red-400 text-red-700 text-sm rounded";
            authForm.prepend(globalBox);
        }
        globalBox.textContent = message;
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
            submitBtn.textContent = isLoading ? "Traitement en cours..." : (isLoginMode ? "Se connecter" : "S'inscrire");
        }
    }

    function showDashboard() {
        if (authContainer) authContainer.classList.add("hidden");
        if (dashboardContainer) dashboardContainer.classList.remove("hidden");
        if (window.loadVendorProducts) window.loadVendorProducts();
    }

    const session = localStorage.getItem("vendor_session");
    if (session) {
        showDashboard();
    }
});
