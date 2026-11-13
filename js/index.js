// js/index.js

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const vendorId = urlParams.get("v"); // Récupère ?v=...

    const container = document.getElementById("products-container");
    const pageTitle = document.getElementById("page-title"); // Optionnel : titre de la page ou de la boutique

    if (!container) return;

    // Afficher un état de chargement
    container.innerHTML = `<p class="text-center col-span-full text-gray-500 py-8">Chargement des produits...</p>`;

    if (vendorId) {
        // --- MODE BOUTIQUE SPÉCIFIQUE ---
        await loadVendorStore(vendorId, container, pageTitle);
    } else {
        // --- MODE MARKETPLACE GLOBALE ---
        await loadAllProducts(container, pageTitle);
    }
});

// Charger uniquement les produits d'un vendeur spécifique
async function loadVendorStore(vendorId, container, pageTitle) {
    try {
        // 1. Récupérer les infos du vendeur pour afficher le nom de sa boutique
        const { data: vendor, error: vendorError } = await db
            .from("vendeurs")
            .select("nom_boutique, whatsapp")
            .eq("id", vendorId)
            .maybeSingle();

        if (vendorError || !vendor) {
            container.innerHTML = `<p class="text-center col-span-full text-red-600 py-8">Oups ! Cette boutique n'existe pas ou a été supprimée.</p>`;
            return;
        }

        // Mettre à jour le titre de la page si l'élément existe
        if (pageTitle) {
            pageTitle.textContent = `Boutique : ${vendor.nom_boutique}`;
        }

        // 2. Récupérer les produits de ce vendeur
        const { data: products, error: prodError } = await db
            .from("produits")
            .select("*")
            .eq("vendeur_id", vendorId)
            .order("created_at", { ascending: false });

        if (prodError) throw prodError;

        renderProducts(products, container, vendor.whatsapp);
    } catch (err) {
        console.error("Erreur chargement boutique :", err);
        container.innerHTML = `<p class="text-center col-span-full text-red-600 py-8">Erreur lors du chargement des produits de la boutique.</p>`;
    }
}

// Charger tous les produits de la marketplace
async function loadAllProducts(container, pageTitle) {
    try {
        if (pageTitle) {
            pageTitle.textContent = "Catalogue de la Marketplace";
        }

        const { data: products, error } = await db
            .from("produits")
            .select("*, vendeurs(nom_boutique, whatsapp)")
            .order("created_at", { ascending: false });

        if (error) throw error;

        renderProducts(products, container, null);
    } catch (err) {
        console.error("Erreur chargement catalogue :", err);
        container.innerHTML = `<p class="text-center col-span-full text-red-600 py-8">Erreur de chargement du catalogue.</p>`;
    }
}

// Afficher les produits sous forme de grille HTML (Tailwind CSS)
function renderProducts(products, container, defaultWhatsapp) {
    if (!products || products.length === 0) {
        container.innerHTML = `<p class="text-center col-span-full text-gray-500 py-12">Aucun produit disponible pour le moment.</p>`;
        return;
    }

    container.innerHTML = "";

    products.forEach(product => {
        // Gérer le numéro WhatsApp (soit celui de la boutique spécifique, soit celui lié au produit)
        const whatsappNumber = defaultWhatsapp || (product.vendeurs ? product.vendeurs.whatsapp : "") || "";
        const productName = encodeURIComponent(product.nom || product.titre || "Article");
        const whatsappUrl = whatsappNumber 
            ? `https://wa.me/${whatsappNumber.replace("+", "")}?text=Bonjour,%20je%20suis%20intéressé(e)%20par%20votre%20produit%20:${productName}`
            : "#";

        const card = document.createElement("div");
        card.className = "bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 flex flex-col justify-between hover:shadow-lg transition-shadow";

        card.innerHTML = `
            <div>
                <img src="${product.image_url || 'https://via.placeholder.com/300'}" alt="${product.nom || 'Produit'}" class="w-full h-48 object-cover bg-gray-100">
                <div class="p-4">
                    <h3 class="font-bold text-lg text-gray-800 mb-1">${product.nom || product.titre || 'Sans nom'}</h3>
                    <p class="text-blue-600 font-semibold text-base mb-2">${product.prix ? product.prix.toLocaleString() + ' FCFA' : 'Prix sur demande'}</p>
                    <p class="text-gray-600 text-sm line-clamp-2">${product.description || 'Aucune description fournie.'}</p>
                </div>
            </div>
            <div class="p-4 pt-0">
                <a href="${whatsappUrl}" target="_blank" class="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors text-sm">
                    Commander sur WhatsApp
                </a>
            </div>
        `;
        container.appendChild(card);
    });
}
