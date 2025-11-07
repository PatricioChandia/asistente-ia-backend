const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// (NUEVO) Un sub-esquema para cada mensaje
const messageSchema = new mongoose.Schema({
    role: { 
        type: String, 
        enum: ['user', 'assistant'], // 'user' es la pregunta, 'assistant' la respuesta
        required: true 
    },
    content: { 
        type: String, 
        required: true 
    },
    timestamp: { 
        type: Date, 
        default: Date.now 
    }
});

const userSchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true, 
        lowercase: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    // ===================================
    // ¡NUEVO CAMPO!
    // ===================================
    profileImageUrl: {
        type: String,
        default: '' // Por defecto no hay imagen
    },
    // (NUEVO) El historial de chat del usuario
    conversation: [messageSchema]
}, {
    timestamps: true
});



// Hook para encriptar la contraseña ANTES de guardarla
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Método para comparar la contraseña del login
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);