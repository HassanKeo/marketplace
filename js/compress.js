/**
 * Compresse une image via Canvas en WebP et l'uploade sur ImgBB.
 * @param {File} file - Fichier image brut (input type="file").
 * @returns {Promise<string>} - L'URL directe de l'image hébergée.
 */
async function compressAndUploadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;

            img.onload = async () => {
                const canvas = document.createElement("canvas");
                const MAX_WIDTH = 800; // Largeur maximale pour optimiser le poids
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                // Export au format WebP avec qualité 0.8 (80%)
                const base64Data = canvas.toDataURL("image/webp", 0.8);
                const cleanBase64 = base64Data.split(",")[1];

                // Envoi à l'API ImgBB
                const formData = new FormData();
                formData.append("image", cleanBase64);

                try {
                    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                        method: "POST",
                        body: formData
                    });

                    const json = await response.json();
                    if (json.success) {
                        resolve(json.data.url);
                    } else {
                        reject(new Error("Échec de l'hébergement sur ImgBB"));
                    }
                } catch (err) {
                    reject(err);
                }
            };

            img.onerror = (error) => reject(error);
        };

        reader.onerror = (error) => reject(error);
    });
}