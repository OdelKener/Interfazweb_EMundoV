const API_BASE = 'https://afdd34068c0c.ngrok-free.app/';

class LoginManager {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        this.togglePassword = document.getElementById('togglePassword');
        this.passwordInput = document.getElementById('password');
        this.mensaje = document.getElementById('mensaje');
        this.btnLogin = document.querySelector('.btn-login');
        this.btnText = document.querySelector('.btn-text');
        this.btnLoader = document.querySelector('.btn-loader');
        
        this.initEventListeners();
        this.checkRememberedUser();
    }

    initEventListeners() {
        // Evento para el formulario de login
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Evento para mostrar/ocultar contraseña
        if (this.togglePassword) {
            this.togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
        }
        
        // Eventos para mejorar UX
        this.addInputFocusEffects();
        
        // Limpiar mensajes al empezar a escribir
        this.addInputChangeListeners();
    }

    addInputFocusEffects() {
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                this.parentElement.classList.add('focused');
            });
            
            input.addEventListener('blur', function() {
                if (this.value === '') {
                    this.parentElement.classList.remove('focused');
                }
            });
        });
    }

    addInputChangeListeners() {
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.hideMessage();
            });
        });
    }

    togglePasswordVisibility() {
        const type = this.passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        this.passwordInput.setAttribute('type', type);
        
        // Cambiar icono
        const icon = this.togglePassword.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    }

    async handleLogin(e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const pais = parseInt(document.getElementById('pais').value);
        const rememberMe = document.getElementById('remember')?.checked;

        // Validaciones
        if (!this.validateForm(username, password, pais)) {
            return;
        }

        // Mostrar estado de carga
        this.setLoadingState(true);

        try {
            const response = await this.makeLoginRequest(username, password, pais);
            
            if (response.ok) {
                await this.handleSuccessResponse(response, username, rememberMe);
            } else {
                this.handleErrorResponse(response);
            }
        } catch (error) {
            this.handleNetworkError(error);
        } finally {
            this.setLoadingState(false);
        }
    }

    validateForm(username, password, pais) {
        this.hideMessage();

        if (!username) {
            this.showMessage('Por favor, ingresa tu usuario', 'error');
            document.getElementById('username').focus();
            return false;
        }

        if (!password) {
            this.showMessage('Por favor, ingresa tu contraseña', 'error');
            document.getElementById('password').focus();
            return false;
        }

        if (!pais) {
            this.showMessage('Debes seleccionar un país', 'error');
            document.getElementById('pais').focus();
            return false;
        }

        return true;
    }

    async makeLoginRequest(username, password, pais) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

        try {
            const response = await fetch(`${API_BASE}Seguridad/Usuarios/LoginU/`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ username, password, pais }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    async handleSuccessResponse(response, username, rememberMe) {
        const data = await response.json();
        
        // Guardar información del usuario
        this.saveUserData(data, rememberMe);
        
        // Mostrar mensaje de éxito
        this.showMessage(`¡Bienvenido ${data.username || username}! Redirigiendo...`, 'success');
        
        // Redirigir después de un breve delay
        setTimeout(() => {
            this.redirectUser(data.pais);
        }, 1500);
    }

    saveUserData(data, rememberMe) {
        const userData = {
            username: data.username,
            pais: data.pais,
            rol: data.rol,
            timestamp: new Date().getTime()
        };

        // Guardar en localStorage (siempre)
        localStorage.setItem('usuario', JSON.stringify(userData));
        
        // Guardar en sessionStorage para sesión actual
        sessionStorage.setItem('usuario', JSON.stringify(userData));

        // Si el usuario marcó "Recordarme", guardar info básica
        if (rememberMe) {
            localStorage.setItem('rememberedUser', JSON.stringify({
                username: data.username,
                timestamp: new Date().getTime()
            }));
        } else {
            localStorage.removeItem('rememberedUser');
        }
    }

    redirectUser(pais) {
        const dashboards = {
            1: '../HTML/dashboardadminnicaragua.html',
            2: '../HTML/dashboardadminhonduras.html', 
            3: '../HTML/dashboardadmincostarica.html',
            4: '../HTML/dashboardadminpanama.html'
        };

        const redirectUrl = dashboards[pais];
        
        if (redirectUrl) {
            window.location.href = redirectUrl;
        } else {
            this.showMessage('Dashboard para este país aún no implementado.', 'error');
        }
    }

    handleErrorResponse(response) {
        if (response.status === 401) {
            this.showMessage('Credenciales inválidas. Por favor, verifica tus datos.', 'error');
        } else if (response.status === 400) {
            this.showMessage('Datos de solicitud incorrectos.', 'error');
        } else if (response.status >= 500) {
            this.showMessage('Error del servidor. Por favor, intenta más tarde.', 'error');
        } else {
            response.json().then(data => {
                this.showMessage(data.error || 'Error desconocido', 'error');
            }).catch(() => {
                this.showMessage('Error en la respuesta del servidor', 'error');
            });
        }
    }

    handleNetworkError(error) {
        if (error.name === 'AbortError') {
            this.showMessage('Tiempo de espera agotado. Verifica tu conexión.', 'error');
        } else if (error.name === 'TypeError') {
            this.showMessage('Error de conexión. Verifica tu acceso a internet.', 'error');
        } else {
            this.showMessage('Error de conexión al servidor', 'error');
        }
        
        console.error('Error de login:', error);
    }

    setLoadingState(isLoading) {
        if (isLoading) {
            this.btnLogin.classList.add('loading');
            this.btnLogin.disabled = true;
            this.loginForm.classList.add('submitting');
        } else {
            this.btnLogin.classList.remove('loading');
            this.btnLogin.disabled = false;
            this.loginForm.classList.remove('submitting');
        }
    }

    showMessage(text, type) {
        this.mensaje.textContent = text;
        this.mensaje.className = `mensaje ${type}`;
        this.mensaje.style.display = 'block';
        
        // Auto-ocultar mensajes de éxito después de 5 segundos
        if (type === 'success') {
            setTimeout(() => {
                this.hideMessage();
            }, 5000);
        }
    }

    hideMessage() {
        this.mensaje.style.display = 'none';
        this.mensaje.className = 'mensaje';
    }

    checkRememberedUser() {
        const rememberedUser = localStorage.getItem('rememberedUser');
        if (rememberedUser) {
            try {
                const user = JSON.parse(rememberedUser);
                const usernameInput = document.getElementById('username');
                if (usernameInput && user.username) {
                    usernameInput.value = user.username;
                    document.getElementById('remember').checked = true;
                }
            } catch (error) {
                console.error('Error al cargar usuario recordado:', error);
                localStorage.removeItem('rememberedUser');
            }
        }
    }

    // Método para cerrar sesión (podría ser usado desde otras páginas)
    static logout() {
        localStorage.removeItem('usuario');
        sessionStorage.removeItem('usuario');
        window.location.href = '/index.html';
    }

    // Método para verificar si el usuario está autenticado
    static isAuthenticated() {
        const user = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
        if (!user) return false;

        try {
            const userData = JSON.parse(user);
            // Verificar si la sesión ha expirado (24 horas)
            const now = new Date().getTime();
            const sessionDuration = 24 * 60 * 60 * 1000; // 24 horas
            return (now - userData.timestamp) < sessionDuration;
        } catch {
            return false;
        }
    }

    // Método para obtener datos del usuario actual
    static getCurrentUser() {
        const user = localStorage.getItem('usuario') || sessionStorage.getItem('usuario');
        if (!user) return null;

        try {
            return JSON.parse(user);
        } catch {
            return null;
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});

// Exportar para uso en otros archivos (si se usa módulos)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoginManager;
}

