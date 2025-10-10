window.APP_CONFIG = {
    // ✅ CAMBIA SOLO ESTA LÍNEA CUANDO NGROK CAMBIE
    API_BASE_URL: 'http://127.0.0.1:8000/',
    
    // Configuraciones fijas
    APP_NAME: 'Sistema de Inventario Ediciones Mundo',
    VERSION: '1.0.0',
    DEBUG: true
};

console.log('✅ Configuración cargada:', window.APP_CONFIG.API_BASE_URL)