Proyecto Asistente IA - Backend

Este repositorio contiene el backend (servidor) para el proyecto de asistente de voz. Está construido con Node.js, Express y se conecta a una base de datos MongoDB.

✨ Características

Autenticación: Sistema de registro (con login automático) y login de usuarios usando JWT (Tokens).

Gestión de Perfil: Los usuarios pueden ver y actualizar su nombre.

Subida de Fotos: Permite a los usuarios subir una foto de perfil, que se almacena en Cloudinary.

Base de Datos: Guarda el historial de conversaciones y la URL de la foto de perfil de cada usuario en MongoDB.

Conexión con IA: Actúa como intermediario para procesar consultas de IA (actualmente configurado para OpenAI).

🚀 Tecnologías Utilizadas

Node.js

Express (Para el servidor API REST)

Mongoose (Para modelar los datos de MongoDB)

MongoDB Atlas (Base de datos en la nube)

jsonwebtoken (JWT) (Para manejar sesiones de usuario)

bcryptjs (Para encriptar contraseñas)

axios (Para llamar a las APIs de IA externas)

dotenv (Para manejar variables de entorno)

nodemon (Para desarrollo en vivo)

multer (Para recibir la subida de archivos/fotos)

cloudinary (Para alojar las fotos de perfil en la nube)

📦 Instalación y Setup

Sigue estos pasos para correr el servidor localmente.

1. Clonar el repositorio

git clone [https://github.com/tu_usuario/asistente-ia-backend.git](https://github.com/tu_usuario/asistente-ia-backend.git)
cd asistente-ia-backend


2. Instalar dependencias

npm install


3. Configurar Variables de Entorno

Crea un archivo .env en la raíz del proyecto. Puedes copiar el archivo .env.example (incluido en este repo) y rellenar tus claves:

cp .env.example .env


Deberás rellenar las variables en tu archivo .env.

4. Iniciar el Servidor

npm start


El servidor se iniciará en http://localhost:3000.

📡 API Endpoints

POST /api/register: Registra un nuevo usuario y devuelve un token.

POST /api/login: Inicia sesión y devuelve un token JWT.

GET /api/historial: (Protegido) Obtiene el historial de chat del usuario.

POST /api/consulta: (Protegido) Envía una consulta a la IA y la guarda en el historial.

GET /api/perfil: (Protegido) Obtiene los datos del perfil del usuario (nombre, email, foto).

PUT /api/perfil: (Protegido) Actualiza el nombre del usuario.

POST /api/perfil/foto: (Protegido) Sube una nueva foto de perfil y actualiza la URL del usuario.
