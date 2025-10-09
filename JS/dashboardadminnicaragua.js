// -------------------- CONFIGURACIÓN GENERAL --------------------
const BASE_URL = 'http://127.0.0.1:8000/';

function getUsuario() {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!usuario.username) {
        alert('No estás autenticado. Por favor inicia sesión.');
        window.location.href = '../HTML/login.html';
    }
    return usuario;
}

// -------------------- FUNCIONES GENERALES --------------------
async function fetchJson(url, options = {}) {
    const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// -------------------- CATEGORÍAS --------------------
async function cargarCategoriasParaLibros() {
    const select = document.getElementById('categoria-libro');
    if (!select) return;

    try {
        const data = await fetchJson(`${BASE_URL}InventarioLibros/Categorias/categorias/`);
        const categorias = Array.isArray(data) ? data : data.results || [];

        select.innerHTML = '';
        const opcionInicial = document.createElement('option');
        opcionInicial.value = '';
        opcionInicial.textContent = 'Seleccione una categoría';
        select.appendChild(opcionInicial);

        categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.nombre;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Error cargando categorías para libros:', err);
    }
}

function configurarFormularioCategoria() {
    const form = document.getElementById('form-categorias');
    if (!form) return;
    let editandoId = null;

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const nombre = document.getElementById('nombre-categoria').value.trim();
        if (!nombre) return alert('Por favor ingresá el nombre de la categoría.');

        try {
            const url = editandoId
                ? `${BASE_URL}InventarioLibros/Categorias/categorias/${editandoId}/`
                : `${BASE_URL}InventarioLibros/Categorias/categorias/`;
            const method = editandoId ? 'PUT' : 'POST';
            await fetchJson(url, { method, body: JSON.stringify({ nombre }) });
            alert(editandoId ? '¡Categoría actualizada!' : '¡Categoría registrada!');
            form.reset();
            editandoId = null;
            cargarCategoriasParaLibros();
        } catch (err) {
            console.error('Error guardando categoría:', err);
            alert('Error al guardar categoría');
        }
    });

    window.editarCategoria = (id, nombre) => {
        document.getElementById('nombre-categoria').value = nombre;
        editandoId = id;
    };
}

window.eliminarCategoria = async id => {
    if (!confirm('¿Seguro que querés eliminar esta categoría?')) return;
    try {
        await fetchJson(`${BASE_URL}InventarioLibros/Categorias/categorias/${id}/`, { method: 'DELETE' });
        alert('¡Categoría eliminada!');
        cargarCategoriasParaLibros();
    } catch (err) {
        console.error('Error al eliminar categoría:', err);
        alert('No se pudo eliminar la categoría.');
    }
};

// -------------------- LIBROS --------------------
async function cargarLibros(categoriaId = null) {
    const tabla = document.querySelector('#tabla-inventario tbody');
    if (!tabla) return;
    try {
        const data = await fetchJson(`${BASE_URL}InventarioLibros/Libros/libros/`);
        const libros = Array.isArray(data) ? data : data.results || [];

        tabla.innerHTML = '';
        const filtrados = categoriaId ? libros.filter(lib => lib.categorias_id == parseInt(categoriaId)) : libros;

        filtrados.forEach(libro => {
            tabla.innerHTML += `
                <tr>
                  <td>${libro.id || '—'}</td>
                  <td>${libro.nombre || '—'}</td>
                  <td>${libro.categorias_nombre || '—'}</td>
                  <td>${libro.costoactual || 0}</td>
                  <td>${libro.existencia || 0}</td>
                  <td>
                    <button onclick="editarLibro(${libro.id})">Editar</button>
                    <button onclick="eliminarLibro(${libro.id})">Eliminar</button>
                  </td>
                </tr>`;
        });
    } catch (err) {
        console.error('Error al cargar libros:', err);
    }
}

function configurarFormularioLibro() {
    const form = document.getElementById('form-libros');
    if (!form) return;
    let libroEditando = null;

    form.addEventListener('submit', async e => {
        e.preventDefault();

        const categoriaSelect = document.getElementById('categoria-libro');
        const categoria = parseInt(categoriaSelect.value);
        if (isNaN(categoria)) return alert('Por favor seleccioná una categoría válida.');

        const data = {
            nombre: document.getElementById('nombre-libro').value.trim(),
            categorias: categoria,
            costoactual: parseFloat(document.getElementById('costo-libro').value),
            existencia: parseInt(document.getElementById('existencia-libro').value)
        };

        try {
            const url = libroEditando
                ? `${BASE_URL}InventarioLibros/Libros/libros/${libroEditando}/`
                : `${BASE_URL}InventarioLibros/Libros/libros/`;
            const method = libroEditando ? 'PUT' : 'POST';

            await fetchJson(url, { method, body: JSON.stringify(data) });
            alert(libroEditando ? '¡Libro actualizado!' : '¡Libro registrado!');
            form.reset();
            libroEditando = null;
            cargarLibros(categoria);
        } catch (err) {
            console.error('Error al guardar libro:', err);
            alert('Error al guardar libro: revisá que la categoría esté seleccionada y los datos sean correctos.');
        }
    });

    window.editarLibro = async id => {
        try {
            const libro = await fetchJson(`${BASE_URL}InventarioLibros/Libros/libros/${id}/`);
            document.getElementById('nombre-libro').value = libro.nombre;
            document.getElementById('categoria-libro').value = libro.categorias_id;
            document.getElementById('costo-libro').value = libro.costoactual;
            document.getElementById('existencia-libro').value = libro.existencia;
            libroEditando = id;
            cargarLibros(libro.categorias_id);
        } catch (err) {
            console.error('Error cargando libro a editar:', err);
        }
    };

    window.eliminarLibro = async id => {
        if (!confirm('¿Seguro que querés eliminar este libro?')) return;
        try {
            await fetchJson(`${BASE_URL}InventarioLibros/Libros/libros/${id}/`, { method: 'DELETE' });
            alert('¡Libro eliminado!');
            const categoriaId = document.getElementById('categoria-libro').value;
            cargarLibros(categoriaId);
        } catch (err) {
            console.error('Error al eliminar libro:', err);
            alert('No se pudo eliminar el libro.');
        }
    };
}

// -------------------- ENTRADAS - CÓDIGO CORREGIDO --------------------
async function cargarLibrosParaEntrada() {
    const select = document.getElementById('select-libro-entrada');
    if (!select) return;
    try {
        const data = await fetchJson(`${BASE_URL}InventarioLibros/Libros/libros/`);
        const libros = Array.isArray(data) ? data : data.results || [];

        select.innerHTML = '<option value="">Seleccionar libro</option>';
        libros.forEach(lib => {
            const option = document.createElement('option');
            option.value = lib.id;
            option.textContent = `${lib.nombre} (Stock: ${lib.existencia || 0})`;
            option.dataset.stock = lib.existencia || 0;
            select.appendChild(option);
        });

        // Actualizar stock cuando se selecciona un libro
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const stock = selectedOption?.dataset.stock || 0;
            document.getElementById('stock-actual-entrada').textContent = stock;
        });

    } catch (err) {
        console.error('Error al cargar libros para entrada:', err);
    }
}

async function cargarTiposEntrada() {
    const select = document.getElementById('tipo-entrada');
    if (!select) return;

    try {
        const data = await fetchJson(`${BASE_URL}Catalogos/TipoEntrada/tipoentrada/`);
        const tipos = Array.isArray(data) ? data : data.results || [];

        select.innerHTML = '<option value="">Seleccionar tipo de entrada</option>';
        tipos.forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo.id;
            option.textContent = tipo.nombre;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Error cargando tipos de entrada:', err);
        select.innerHTML = `
            <option value="">Seleccionar tipo de entrada</option>
            <option value="1">Compra</option>
            <option value="2">Devolución</option>
        `;
    }
}

function configurarFormularioEntrada() {
    const form = document.getElementById('form-entradas');
    if (!form) return;

    // Configurar sucursal fija para Nicaragua
    const selectSucursal = document.getElementById('select-sucursal-entrada');
    if (selectSucursal) {
        selectSucursal.innerHTML = '<option value="1">Nicaragua</option>';
        selectSucursal.disabled = true;
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();

        const tipoEntrada = document.getElementById('tipo-entrada').value;
        const libroId = document.getElementById('select-libro-entrada').value;
        const cantidad = parseInt(document.getElementById('cantidad-entrada')?.value || 1);
        const costo = parseFloat(document.getElementById('costo-entrada')?.value || 0);

        console.log('📝 Datos del formulario:', { tipoEntrada, libroId, cantidad, costo });

        if (!tipoEntrada) return alert('Seleccioná un tipo de entrada válido.');
        if (!libroId) return alert('Seleccioná un libro válido.');
        if (isNaN(cantidad) || cantidad <= 0) return alert('Ingresá una cantidad válida.');
        if (isNaN(costo) || costo <= 0) return alert('Ingresá un costo válido.');

        try {
            // PRIMERO: Crear la ENTRADA principal
            const entradaData = {
                fechaentrada: new Date().toISOString().split('T')[0],
                tipoentrada_id: parseInt(tipoEntrada),
                sucursalid_id: 1,
                sucursalidhon_id: null,
                sucursalidcos_id: null,
                sucursalidpan_id: null
            };

            console.log('📤 Creando ENTRADA principal:', entradaData);

            const responseEntrada = await fetch(`${BASE_URL}Catalogos/Entrada/entrada/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entradaData)
            });

            if (!responseEntrada.ok) {
                const errorData = await responseEntrada.json();
                console.error('❌ Error creando entrada:', errorData);
                throw new Error(`Error al crear entrada: ${JSON.stringify(errorData)}`);
            }

            const entradaCreada = await responseEntrada.json();
            console.log('✅ Entrada creada:', entradaCreada);

            // SEGUNDO: Crear el DETALLE con referencia a la entrada - URL CORREGIDA
            const detalleData = {
             entrada: entradaCreada.id,  // Cambiado de 'entrada_id' a 'entrada'
             libro: parseInt(libroId),   // Cambiado de 'libro_id' a 'libro'
             librohon: null,
             librocos: null, 
             libropan: null,
             cantidad: cantidad,
             costoactual: costo
            };

            console.log('📤 Creando DETALLE:', detalleData);

            // URL CORREGIDA
            const responseDetalle = await fetch(`${BASE_URL}Catalogos/Entrada/detalleentrada/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(detalleData)
            });

            if (!responseDetalle.ok) {
                const errorData = await responseDetalle.json();
                console.error('❌ Error creando detalle:', errorData);
                
                // Rollback: Eliminar la entrada si falla el detalle
                await fetch(`${BASE_URL}Catalogos/Entrada/entrada/${entradaCreada.id}/`, {
                    method: 'DELETE'
                });
                
                throw new Error(`Error al crear detalle: ${JSON.stringify(errorData)}`);
            }

            const detalleCreado = await responseDetalle.json();
            console.log('✅ Detalle creado:', detalleCreado);

            alert('¡Entrada registrada correctamente!');
            form.reset();
            
            // Actualizar datos
            await cargarLibrosParaEntrada();
            await cargarLibros();
            
        } catch (err) {
            console.error('❌ Error al registrar entrada:', err);
            alert('Error al registrar entrada: ' + err.message);
        }
    });
}


// -------------------- SALIDAS - CÓDIGO CORREGIDO --------------------
async function cargarLibrosParaSalida() {
    const select = document.getElementById('select-libro-salida');
    if (!select) return;
    try {
        const data = await fetchJson(`${BASE_URL}InventarioLibros/Libros/libros/`);
        const libros = Array.isArray(data) ? data : data.results || [];

        select.innerHTML = '<option value="">Seleccionar libro</option>';
        libros.forEach(lib => {
            const option = document.createElement('option');
            option.value = lib.id;
            option.textContent = `${lib.nombre} (Stock: ${lib.existencia || 0})`;
            option.dataset.stock = lib.existencia || 0;
            select.appendChild(option);
        });

        // Actualizar stock cuando se selecciona un libro
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const stock = selectedOption?.dataset.stock || 0;
            document.getElementById('stock-actual-salida').textContent = stock;
            document.getElementById('max-disponible').textContent = stock;
            
            // Actualizar máximo del input de cantidad
            const cantidadInput = document.getElementById('cantidad-salida');
            cantidadInput.max = stock;
            if (parseInt(cantidadInput.value) > stock) {
                cantidadInput.value = stock;
            }
        });

    } catch (err) {
        console.error('Error al cargar libros para salida:', err);
    }
}

async function cargarTiposSalida() {
    const select = document.getElementById('tipo-salida');
    if (!select) return;

    try {
        const data = await fetchJson(`${BASE_URL}Catalogos/TipoSalida/tiposalida/`);
        const tipos = Array.isArray(data) ? data : data.results || [];

        select.innerHTML = '<option value="">Seleccionar tipo de salida</option>';
        tipos.forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo.id;
            option.textContent = tipo.nombre;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Error cargando tipos de salida:', err);
        select.innerHTML = `
            <option value="">Seleccionar tipo de salida</option>
            <option value="1">Venta</option>
            <option value="2">Devolución</option>
        `;
    }
}

function configurarFormularioSalida() {
    const form = document.getElementById('form-salidas');
    if (!form) return;

    // Configurar sucursal fija para Nicaragua
    const selectSucursal = document.getElementById('select-sucursal-salida');
    if (selectSucursal) {
        selectSucursal.innerHTML = '<option value="1">Nicaragua</option>';
        selectSucursal.disabled = true;
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();

        const tipoSalida = document.getElementById('tipo-salida').value;
        const libroId = document.getElementById('select-libro-salida').value;
        const cantidad = parseInt(document.getElementById('cantidad-salida')?.value || 1);
        const precioSalida = parseFloat(document.getElementById('precio-salida')?.value || 0);

        console.log('📝 Datos del formulario salida:', { tipoSalida, libroId, cantidad, precioSalida });

        if (!tipoSalida) return alert('Seleccioná un tipo de salida válida.');
        if (!libroId) return alert('Seleccioná un libro válido.');
        if (isNaN(cantidad) || cantidad <= 0) return alert('Ingresá una cantidad válida.');
        if (isNaN(precioSalida) || precioSalida <= 0) return alert('Ingresá un precio válido.');

        try {
            // Verificar stock disponible
            const libro = await fetchJson(`${BASE_URL}InventarioLibros/Libros/libros/${libroId}/`);
            if (libro.existencia < cantidad) {
                return alert(`Stock insuficiente. Disponible: ${libro.existencia}`);
            }

            // PRIMERO: Crear la SALIDA principal
            const salidaData = {
                fechasalida: new Date().toISOString().split('T')[0],
                tiposalida_id: parseInt(tipoSalida),
                sucursalid_id: 1,
                sucursalidhon_id: null,
                sucursalidcos_id: null,
                sucursalidpan_id: null
            };

            console.log('📤 Creando SALIDA principal:', salidaData);

            const responseSalida = await fetch(`${BASE_URL}Catalogos/Salida/salida/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(salidaData)
            });

            if (!responseSalida.ok) {
                const errorData = await responseSalida.json();
                console.error('❌ Error creando salida:', errorData);
                throw new Error(`Error al crear salida: ${JSON.stringify(errorData)}`);
            }

            const salidaCreada = await responseSalida.json();
            console.log('✅ Salida creada:', salidaCreada);

            // SEGUNDO: Crear el DETALLE con referencia a la salida - URL CORREGIDA
            const detalleData = {
                salida: salidaCreada.id,
                libro: parseInt(libroId),
                librohon: null,
                librocos: null,
                libropan: null,
                cantidad: cantidad,
                costosalida: precioSalida
            };

            console.log('📤 Creando DETALLE salida:', detalleData);

            // URL CORREGIDA
            const responseDetalle = await fetch(`${BASE_URL}Catalogos/Salida/detallesalida/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(detalleData)
            });

            if (!responseDetalle.ok) {
                const errorData = await responseDetalle.json();
                console.error('❌ Error creando detalle salida:', errorData);
                
                // Rollback: Eliminar la salida si falla el detalle
                await fetch(`${BASE_URL}Catalogos/Salida/salida/${salidaCreada.id}/`, {
                    method: 'DELETE'
                });
                
                throw new Error(`Error al crear detalle salida: ${JSON.stringify(errorData)}`);
            }

            const detalleCreado = await responseDetalle.json();
            console.log('✅ Detalle salida creado:', detalleCreado);

            alert('¡Salida registrada correctamente!');
            form.reset();
            
            await cargarLibrosParaSalida();
            await cargarLibros();
            
        } catch (err) {
            console.error('❌ Error al registrar salida:', err);
            alert('Error al registrar salida: ' + err.message);
        }
    });
}

// -------------------- NAVEGACIÓN MENÚ Y LOGOUT --------------------
document.addEventListener('DOMContentLoaded', () => {
    const usuario = getUsuario();

    // Navegación menú
    const enlacesMenu = document.querySelectorAll('#MenuVertical ul.ul_MenuVertical li a');
    const formularios = document.querySelectorAll('.form-section');
    enlacesMenu.forEach(enlace => {
        enlace.addEventListener('click', e => {
            e.preventDefault();
            enlacesMenu.forEach(el => el.classList.remove('active'));
            enlace.classList.add('active');
            formularios.forEach(f => f.classList.remove('active-form'));
            
            const formId = enlace.getAttribute('data-form');
            const formElement = document.getElementById(formId);
            
            if (formElement) {
                formElement.classList.add('active-form');
                
                // Cargar datos específicos cuando se muestra el formulario
                if (formId === 'entradas-form') {
                    cargarLibrosParaEntrada();
                    cargarTiposEntrada();
                } else if (formId === 'salidas-form') {
                    cargarLibrosParaSalida();
                    cargarTiposSalida();
                }
            }
        });
    });

    // Logout
    const btnSalir = document.getElementById('btn-cerrar-sesion');
    btnSalir?.addEventListener('click', () => {
        if (confirm('¿Estás seguro que querés cerrar sesión?')) {
            localStorage.removeItem('usuario');
            window.location.href = '../HTML/login.html';
        }
    });

    // Inicialización de formularios
    if (document.getElementById('form-categorias')) configurarFormularioCategoria();
    if (document.getElementById('form-libros')) {
        cargarCategoriasParaLibros();
        configurarFormularioLibro();
        cargarLibros();
    }
    if (document.getElementById('form-entradas')) {
        configurarFormularioEntrada();
        // Los datos se cargarán cuando se muestre el formulario
    }
    if (document.getElementById('form-salidas')) {
        configurarFormularioSalida();
        // Los datos se cargarán cuando se muestre el formulario
    }
});





















