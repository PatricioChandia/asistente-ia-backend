// 1. Importar dependencias
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('./models/User');
const auth = require('./middleware/auth');
const cloudinary = require('./config/cloudinary'); 
const multer = require('multer'); 

// 2. Inicializar la app y Middlewares
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

// 3. Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectado exitosamente a MongoDB'))
    .catch(err => console.error('Error al conectar a MongoDB:', err));

// 4. Configuración de Multer (para recibir archivos)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 5. RUTAS DE API

// ===================================
// Ruta de Registro: POST /api/register
// (Código COMPLETO)
// ===================================
app.post('/api/register', async (req, res) => {
    
    console.log(">>> Petición de registro recibida:", req.body);

    try {
        const { nombre, email, password } = req.body; 

        if (!nombre || !email || !password) { 
            console.log(">>> ERROR: Faltan campos");
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }

        const existingUser = await User.findOne({ email: email }); 
        
        if (existingUser) {
            console.log(">>> ERROR: El usuario ya existe en la BD");
            return res.status(400).json({ message: 'El correo ya está en uso' });
        }

        const newUser = new User({
            nombre: nombre,
            email: email, 
            password: password
        });

        await newUser.save();
        console.log(">>> ÉXITO: Nuevo usuario guardado en la BD");

        // Generar token inmediatamente
        const token = jwt.sign(
            { userId: newUser._id, email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        console.log(">>> ÉXITO: Token generado para nuevo usuario");
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            token: token 
        });

    } catch (error) {
        console.error(">>> ERROR FATAL EN /api/register:", error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// ===================================
// Ruta de Login: POST /api/login
// (Código COMPLETO)
// ===================================
app.post('/api/login', async (req, res) => {
    
    console.log(">>> Petición de login recibida:", req.body);

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            console.log(">>> ERROR LOGIN: Faltan campos");
            return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
        }

        const user = await User.findOne({ email: email });
        if (!user) {
            console.log(">>> ERROR LOGIN: Usuario no encontrado");
            return res.status(401).json({ message: 'Credenciales Incorrectas' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log(">>> ERROR LOGIN: Contraseña incorrecta");
            return res.status(401).json({ message: 'Credenciales Incorrectas' });
        }

        // Crear token
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        console.log(">>> ÉXITO LOGIN: Usuario autenticado");
        res.status(200).json({
            message: 'Login exitoso',
            token: token
        });

    } catch (error) {
        console.error(">>> ERROR FATAL EN /api/login:", error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});


// ===================================
// RUTA DE CONSULTA (OPENAI)
// (Código COMPLETO)
// ===================================
app.post('/api/consulta', auth, async (req, res) => {
    const { prompt } = req.body;
    const userId = req.userId; // Obtenido del middleware 'auth'

    if (!prompt) {
        return res.status(400).json({ message: 'El campo "prompt" es obligatorio' });
    }

    try {
        // 1. Guardar la consulta del usuario en la BD
        const userMessage = { role: 'user', content: prompt };
        await User.findByIdAndUpdate(userId, { $push: { conversation: userMessage } });

        // 2. Llamar a la API de OPENAI
        console.log(">>> Llamando a OpenAI (gpt-3.5-turbo)...");
        
        const openAIResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            }
        });

        const aiResponseContent = openAIResponse.data.choices[0].message.content;

        // 3. Guardar la respuesta de la IA en la BD
        const aiMessage = { role: 'assistant', content: aiResponseContent };
        await User.findByIdAndUpdate(userId, { $push: { conversation: aiMessage } });

        // 4. Devolver la respuesta al cliente
        res.status(200).json({ response: aiResponseContent });

    } catch (error) {
        // Manejo de errores de OpenAI
        if (error.response && error.response.data && error.response.data.error) {
            console.error(">>> ERROR de OpenAI (API):", error.response.data.error);
            res.status(500).json({ message: error.response.data.error.message });
        } else {
            console.error(">>> ERROR en /api/consulta (Genérico):", error.message);
            res.status(500).json({ message: 'Error al procesar la consulta de IA (Genérico)' });
        }
    }
});


// ===================================
// RUTA DE HISTORIAL
// (Código COMPLETO)
// ===================================
app.get('/api/historial', auth, async (req, res) => {
    const userId = req.userId; // Obtenido del middleware 'auth'
    console.log(">>> Petición recibida para GET /api/historial");
    try {
        const user = await User.findById(userId).select('conversation');
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        
        res.status(200).json(user.conversation);

    } catch (error) {
        console.error(">>> ERROR en /api/historial:", error.message);
        res.status(500).json({ message: 'Error al obtener el historial' });
    }
});

// ===================================
// RUTA GET PERFIL (¡ACTUALIZADA!)
// (Código COMPLETO)
// ===================================
app.get('/api/perfil', auth, async (req, res) => {
    console.log(">>> Petición recibida para GET /api/perfil");
    try {
        // ¡CAMBIO! Ahora también seleccionamos 'profileImageUrl'
        const user = await User.findById(req.userId).select('nombre email profileImageUrl');
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.status(200).json(user); // Devuelve { nombre, email, profileImageUrl }
    } catch (error) {
        console.error(">>> ERROR en /api/perfil:", error.message);
        res.status(500).json({ message: 'Error al obtener el perfil' });
    }
});

// ===================================
// RUTA PUT PERFIL (Actualizar Nombre)
// (Código COMPLETO)
// ===================================
app.put('/api/perfil', auth, async (req, res) => {
    console.log(">>> Petición recibida para PUT /api/perfil");
    const { nombre } = req.body;
    
    if (!nombre) {
        return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    try {
        const user = await User.findByIdAndUpdate(
            req.userId, 
            { nombre: nombre },
            { new: true }
        ).select('nombre email profileImageUrl'); // <-- Actualizado para devolver la URL
        
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        console.log(">>> ÉXITO: Perfil actualizado");
        res.status(200).json({ message: 'Perfil actualizado exitosamente', user: user });
    } catch (error) {
        console.error(">>> ERROR en PUT /api/perfil:", error.message);
        res.status(500).json({ message: 'Error al actualizar el perfil' });
    }
});

// ===================================
// (¡NUEVA!) RUTA POST FOTO DE PERFIL
// (Código COMPLETO)
// ===================================
app.post('/api/perfil/foto', auth, upload.single('profileImage'), async (req, res) => {
    console.log(">>> Petición recibida para POST /api/perfil/foto");
    
    if (!req.file) {
        return res.status(400).json({ message: 'No se subió ningún archivo.' });
    }

    try {
        // Convertir el buffer del archivo a un string base64 para subirlo
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

        // Subir a Cloudinary
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: "asistente_ia_perfiles" // Carpeta en Cloudinary
        });

        const imageUrl = result.secure_url; // URL https
        console.log(">>> ÉXITO: Imagen subida a Cloudinary:", imageUrl);

        // Guardar la URL en el usuario
        await User.findByIdAndUpdate(req.userId, { profileImageUrl: imageUrl });

        // Devolver la nueva URL a la app
        res.status(200).json({
            message: "Foto de perfil actualizada",
            profileImageUrl: imageUrl
        });

    } catch (error) {
        console.error(">>> ERROR al subir foto:", error);
        res.status(500).json({ message: "Error al subir la imagen" });
    }
});


// 6. Iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});