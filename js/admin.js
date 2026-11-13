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

    // Basculement propre Connexion / Inscription
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

    // Gestion de la soumission du formulaire
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
                { id: shopId, nom_boutique: shopName, whatsapp: whatsapp, password: password }
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
            showGlobalError("Erreur de connexion : " + (err.message || "Problème réseau."));
        } finally {
            setLoading(false);
        }
    }

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

    function showDashboard() {
        if (authContainer) authContainer.classList.add("hidden");
        if (dashboardContainer) dashboardContainer.classList.remove("hidden");
        if (typeof window.loadVendorProducts === "function") {
            window.loadVendorProducts();
        }
    }

    const session = localStorage.getItem("vendor_session");
    if (session) {
        showDashboard();
    }
});
