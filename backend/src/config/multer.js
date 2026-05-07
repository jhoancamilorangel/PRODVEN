const multer = require('multer');

// Usamos almacenamiento en memoria para que el servidor sea más rápido
// y no guarde basura en el disco duro.
const storage = multer.memoryStorage();

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Límite de 5MB por imagen
    },
    fileFilter: (req, file, cb) => {
        // Solo aceptamos imágenes (jpg, jpeg, png)
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('El archivo no es una imagen válida'), false);
        }
    }
});

module.exports = upload;