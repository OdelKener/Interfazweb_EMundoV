document.addEventListener('DOMContentLoaded', function () {
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');

    // Mostrar u ocultar la contraseña
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye-slash');
        });
    }

    const loginForm = document.querySelector('.login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            if (!username || !password) {
                alert('⚠️ Por favor complete todos los campos.');
                return;
            }

            try {
                const API_BASE_URL = 'http://127.0.0.1:8000/api'; // Cambiá esto según tu entorno

                const response = await fetch(`${API_BASE_URL}/token/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                if (!response.ok) {
                    throw new Error('Credenciales incorrectas o error de red');
                }

                const data = await response.json();
                console.log('🔐 Tokens recibidos:', data);

                if (data.access && data.refresh) {
                    localStorage.setItem('userToken', data.access);
                    localStorage.setItem('refreshToken', data.refresh);
                    console.log('✅ Tokens guardados en localStorage');

                    alert('✅ Sesión iniciada correctamente');
                    window.location.href = 'pruebaEmundo.html'; // Redirigí donde necesités
                } else {
                    throw new Error('La respuesta no contiene tokens válidos');
                }
            } catch (error) {
                console.error('❌ Error al iniciar sesión:', error);
                alert('❌ No se pudo iniciar sesión: ' + error.message);
            }
        });
    }
});

