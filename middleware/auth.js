const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        // 1. Obtener el token del header
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            throw new Error('No autorizado (sin header)');
        }

        const token = authHeader.replace('Bearer ', '');
        
        // 2. Verificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. Encontrar al usuario (opcional, pero bueno)
        const user = await User.findOne({ _id: decoded.userId });

        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        // 4. Adjuntar el ID del usuario a la petición
        req.userId = decoded.userId;
        next(); // ¡Dejar pasar!

    } catch (e) {
        console.error("Error de autenticación:", e.message);
        res.status(401).send({ error: 'Por favor, autentíquese.' });
    }
};

module.exports = auth;