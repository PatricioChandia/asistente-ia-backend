// 1. Importar dependencias
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('./models/User');
const auth = require('./middleware/auth');

// 2. Inicializar la app
const app = express();
const PORT = process.env.PORT || 3000;

// 3. Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Conectado exitosamente a MongoDB'))
    .catch(err => console.error('Error al conectar a MongoDB:', err));

// 4. Middlewares
app.use(cors());
app.use(express.json());

// 5. RUTAS DE API (Login y Registro - Sin cambios)
app.post('/api/register', async (req, res) => {
    console.log(">>> Petición de registro recibida:", req.body);
    try {
        const { nombre, email, password } = req.body;
        if (!nombre || !email || !password) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.status(400).json({ message: 'El correo ya está en uso' });
        }
        const newUser = new User({ nombre, email, password });
        await newUser.save();
        console.log(">>> ÉXITO: Nuevo usuario guardado en la BD");
        res.status(201).json({ message: 'Usuario registrado exitosamente' });
    } catch (error) {
        console.error(">>> ERROR FATAL EN /api/register:", error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

app.post('/api/login', async (req, res) => {
    console.log(">>> Petición de login recibida:", req.body);
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(401).json({ message: 'Credenciales Incorrectas' });
        }
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(401).json({ message: 'Credenciales Incorrectas' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales Incorrectas' });
        }
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        console.log(">>> ÉXITO LOGIN: Usuario autenticado");
        res.status(200).json({ message: 'Login exitoso', token: token });
    } catch (error) {
        console.error(">>> ERROR FATAL EN /api/login:", error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});

// ===================================
// RUTA DE CONSULTA (¡Volvemos a OpenAI!)
// ===================================
app.post('/api/consulta', auth, async (req, res) => {
    const { prompt } = req.body;
    const userId = req.userId;

    if (!prompt) {
        return res.status(400).json({ message: 'El campo "prompt" es obligatorio' });
    }

    try {
        // 1. Guardar la consulta del usuario en la BD (Sin cambios)
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
        // --- FIN DE LA LLAMADA A OPENAI ---

        // 3. Guardar la respuesta de la IA en la BD (Sin cambios)
        const aiMessage = { role: 'assistant', content: aiResponseContent };
        await User.findByIdAndUpdate(userId, { $push: { conversation: aiMessage } });

        // 4. Devolver la respuesta al cliente (Sin cambios)
        res.status(200).json({ response: aiResponseContent });

    } catch (error) {
        // Manejo de errores de OpenAI
        if (error.response && error.response.data && error.response.data.error) {
            console.error(">>> ERROR de OpenAI (API):", error.response.data.error);
            // El error 'insufficient_quota' entra aquí
            res.status(500).json({ message: error.response.data.error.message });
        } else {
            console.error(">>> ERROR en /api/consulta (Genérico):", error.message);
            res.status(500).json({ message: 'Error al procesar la consulta de IA (Genérico)' });
        }
    }
});

// ===================================
// RUTA DE HISTORIAL (Sin cambios)
// ===================================
app.get('/api/historial', auth, async (req, res) => {
    const userId = req.userId;
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


// 6. Iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});