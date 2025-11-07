const cloudinary = require('cloudinary').v2;

// Configurar Cloudinary con las variables de .env
// ¡AQUÍ DEBE USAR LOS NOMBRES DE LAS VARIABLES, NO LAS CLAVES!
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true // Usar https
});

module.exports = cloudinary;