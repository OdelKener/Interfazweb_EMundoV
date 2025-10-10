/// -------------------- CONFIGURACIÓN GENERAL --------------------
const BASE_URL = 'https://6fb5146f8196.ngrok-free.app/';

// -------------------- FUNCIÓN FETCH MEJORADA CON PAGINACIÓN --------------------
async function fetchJson(url, options = {}) {
    // Construir URL correctamente
    let fullUrl;
    if (url.startsWith('http')) {
        fullUrl = url;
    } else {
        const base = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
        const path = url.startsWith('/') ? url : `/${url}`;
        fullUrl = `${base}${path}`;
    }
    
    console.log(`🌐 Fetch: ${fullUrl}`);
    
    try {
        const response = await fetch(fullUrl, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            },
            body: options.body,
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`📦 Response data:`, data);

        // ✅ MANEJAR PAGINACIÓN - Si tiene 'results', devolver eso
        if (data && typeof data === 'object' && Array.isArray(data.results)) {
            console.log(`✅ Datos paginados encontrados: ${data.results.length} items`);
            return data.results;
        }
        
        // Si es array directo, devolverlo
        if (Array.isArray(data)) {
            console.log(`✅ Array directo: ${data.length} items`);
            return data;
        }
        
        // Si es un solo objeto, devolverlo
        console.log(`✅ Objeto individual recibido`);
        return data;

    } catch (error) {
        console.error(`❌ Fetch error: ${url}`, error);
        throw error;
    }
}

// -------------------- VERIFICACIÓN RÁPIDA --------------------
async function verificarConexion() {
    console.log('🔍 Verificando conexión con el API...');
    
    try {
        const categorias = await fetchJson('InventarioLibros/Categorias/categorias/');
        const libros = await fetchJson('InventarioLibros/Libros/libros/');
        
        console.log(`✅ CONEXIÓN EXITOSA:`);
        console.log(`   - Categorías: ${categorias.length}`);
        console.log(`   - Libros: ${libros.length}`);
        
        return true;
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        return false;
    }
}

// -------------------- FUNCIONES BÁSICAS --------------------
function getUsuario() {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!usuario.username) {
        alert('No estás autenticado. Por favor inicia sesión.');
        window.location.href = '/index.html';
    }
    return usuario;
}

// -------------------- FUNCIÓN PARA ACTUALIZAR EXISTENCIA DE LIBROS --------------------
async function actualizarExistenciaLibro(libroId, cantidad, operacion = 'entrada') {
    try {
        // Obtener el libro actual
        const libro = await fetchJson(`InventarioLibros/Libros/libros/${libroId}/`);
        
        // Calcular nueva existencia
        let nuevaExistencia = libro.existencia || 0;
        if (operacion === 'entrada') {
            nuevaExistencia += cantidad;
        } else if (operacion === 'salida') {
            nuevaExistencia -= cantidad;
            // Asegurar que no sea negativo
            if (nuevaExistencia < 0) nuevaExistencia = 0;
        }
        
        // Actualizar el libro
        const datosActualizados = {
            ...libro,
            existencia: nuevaExistencia,
            costoactual: libro.costoactual // Mantener el costo actual
        };
        
        await fetchJson(`InventarioLibros/Libros/libros/${libroId}/`, {
            method: 'PUT',
            body: JSON.stringify(datosActualizados)
        });
        
        console.log(`✅ Existencia actualizada: Libro ${libroId} - ${operacion} de ${cantidad}. Nueva existencia: ${nuevaExistencia}`);
        return true;
        
    } catch (err) {
        console.error(`❌ Error actualizando existencia del libro ${libroId}:`, err);
        throw new Error(`No se pudo actualizar la existencia del libro: ${err.message}`);
    }
}

// -------------------- CATEGORÍAS --------------------
async function cargarCategoriasParaLibros() {
    const select = document.getElementById('categoria-libro');
    if (!select) return;

    try {
        const categorias = await fetchJson('InventarioLibros/Categorias/categorias/');
        
        console.log(`✅ Categorías cargadas: ${categorias.length}`);

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
        
        console.log(`✅ ${categorias.length} categorías agregadas al select`);
    } catch (err) {
        console.error('❌ Error cargando categorías para libros:', err);
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
                ? `InventarioLibros/Categorias/categorias/${editandoId}/`
                : `InventarioLibros/Categorias/categorias/`;
            const method = editandoId ? 'PUT' : 'POST';
            await fetchJson(url, { method, body: JSON.stringify({ nombre }) });
            alert(editandoId ? '¡Categoría actualizada!' : '¡Categoría registrada!');
            form.reset();
            editandoId = null;
            cargarCategoriasParaLibros();
        } catch (err) {
            console.error('❌ Error guardando categoría:', err);
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
        await fetchJson(`InventarioLibros/Categorias/categorias/${id}/`, { method: 'DELETE' });
        alert('¡Categoría eliminada!');
        cargarCategoriasParaLibros();
    } catch (err) {
        console.error('❌ Error al eliminar categoría:', err);
        alert('No se pudo eliminar la categoría.');
    }
};

// -------------------- LIBROS --------------------
async function cargarLibros(categoriaId = null) {
    const tabla = document.querySelector('#tabla-inventario tbody');
    if (!tabla) return;
    
    try {
        const libros = await fetchJson('InventarioLibros/Libros/libros/');
        
        console.log(`✅ Libros cargados: ${libros.length}`);

        tabla.innerHTML = '';
        const filtrados = categoriaId ? 
            libros.filter(lib => lib.categorias_id == parseInt(categoriaId)) : 
            libros;

        console.log(`📊 Mostrando ${filtrados.length} libros`);

        if (filtrados.length === 0) {
            tabla.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay libros</td></tr>';
            return;
        }

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
        console.error('❌ Error al cargar libros:', err);
        tabla.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error cargando libros</td></tr>';
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
                ? `InventarioLibros/Libros/libros/${libroEditando}/`
                : `InventarioLibros/Libros/libros/`;
            const method = libroEditando ? 'PUT' : 'POST';

            await fetchJson(url, { method, body: JSON.stringify(data) });
            alert(libroEditando ? '¡Libro actualizado!' : '¡Libro registrado!');
            form.reset();
            libroEditando = null;
            cargarLibros(categoria);
        } catch (err) {
            console.error('❌ Error al guardar libro:', err);
            alert('Error al guardar libro: revisá que la categoría esté seleccionada y los datos sean correctos.');
        }
    });

    window.editarLibro = async id => {
        try {
            const libro = await fetchJson(`InventarioLibros/Libros/libros/${id}/`);
            document.getElementById('nombre-libro').value = libro.nombre;
            document.getElementById('categoria-libro').value = libro.categorias_id;
            document.getElementById('costo-libro').value = libro.costoactual;
            document.getElementById('existencia-libro').value = libro.existencia;
            libroEditando = id;
            cargarLibros(libro.categorias_id);
        } catch (err) {
            console.error('❌ Error cargando libro a editar:', err);
        }
    };

    window.eliminarLibro = async id => {
        if (!confirm('¿Seguro que querés eliminar este libro?')) return;
        try {
            await fetchJson(`InventarioLibros/Libros/libros/${id}/`, { method: 'DELETE' });
            alert('¡Libro eliminado!');
            const categoriaId = document.getElementById('categoria-libro').value;
            cargarLibros(categoriaId);
        } catch (err) {
            console.error('❌ Error al eliminar libro:', err);
            alert('No se pudo eliminar el libro.');
        }
    };
}

// -------------------- ENTRADAS --------------------
async function cargarLibrosParaEntrada() {
    const select = document.getElementById('select-libro-entrada');
    if (!select) {
        console.warn('❌ Select de libros para entrada no encontrado');
        return;
    }

    try {
        console.log('📚 Cargando libros para entrada...');
        const libros = await fetchJson('InventarioLibros/Libros/libros/');
        
        console.log(`✅ ${libros.length} libros cargados para entrada`);

        select.innerHTML = '<option value="">Seleccionar libro</option>';
        
        if (libros.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No hay libros disponibles';
            select.appendChild(option);
            return;
        }

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
            const stockElement = document.getElementById('stock-actual-entrada');
            if (stockElement) {
                stockElement.textContent = stock;
            }
        });

    } catch (err) {
        console.error('❌ Error al cargar libros para entrada:', err);
        
        // Fallback: mostrar mensaje de error en el select
        select.innerHTML = '<option value="">Error cargando libros</option>';
    }
}

async function cargarTiposEntrada() {
    const select = document.getElementById('tipo-entrada');
    if (!select) return;

    try {
        const tipos = await fetchJson('Catalogos/TipoEntrada/tipoentrada/');
        
        console.log(`✅ Tipos de entrada cargados: ${tipos.length}`);

        select.innerHTML = '<option value="">Seleccionar tipo de entrada</option>';
        tipos.forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo.id;
            option.textContent = tipo.nombre;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('❌ Error cargando tipos de entrada:', err);
        // Fallback básico
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

            const responseEntrada = await fetch(`${BASE_URL}/Catalogos/Entrada/entrada/`, {
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

            // SEGUNDO: Crear el DETALLE con referencia a la entrada
            const detalleData = {
                entrada: entradaCreada.id,
                libro: parseInt(libroId),
                librohon: null,
                librocos: null, 
                libropan: null,
                cantidad: cantidad,
                costoactual: costo
            };

            console.log('📤 Creando DETALLE:', detalleData);

            const responseDetalle = await fetch(`${BASE_URL}/Catalogos/Entrada/detalleentrada/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(detalleData)
            });

            if (!responseDetalle.ok) {
                const errorData = await responseDetalle.json();
                console.error('❌ Error creando detalle:', errorData);
                
                // Rollback: Eliminar la entrada si falla el detalle
                await fetch(`${BASE_URL}/Catalogos/Entrada/entrada/${entradaCreada.id}/`, {
                    method: 'DELETE'
                });
                
                throw new Error(`Error al crear detalle: ${JSON.stringify(errorData)}`);
            }

            const detalleCreado = await responseDetalle.json();
            console.log('✅ Detalle creado:', detalleCreado);

            // TERCERO: ACTUALIZAR LA EXISTENCIA DEL LIBRO
            await actualizarExistenciaLibro(libroId, cantidad, 'entrada');

            alert('¡Entrada registrada correctamente y stock actualizado!');
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

// -------------------- SALIDAS --------------------
async function cargarLibrosParaSalida() {
    const select = document.getElementById('select-libro-salida');
    if (!select) return;
    
    try {
        const libros = await fetchJson('InventarioLibros/Libros/libros/');
        
        console.log(`✅ ${libros.length} libros cargados para salida`);

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
        console.error('❌ Error al cargar libros para salida:', err);
    }
}

async function cargarTiposSalida() {
    const select = document.getElementById('tipo-salida');
    if (!select) return;

    try {
        const tipos = await fetchJson('Catalogos/TipoSalida/tiposalida/');
        
        console.log(`✅ Tipos de salida cargados: ${tipos.length}`);

        select.innerHTML = '<option value="">Seleccionar tipo de salida</option>';
        tipos.forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo.id;
            option.textContent = tipo.nombre;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('❌ Error cargando tipos de salida:', err);
        // Fallback básico
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
            const libro = await fetchJson(`InventarioLibros/Libros/libros/${libroId}/`);
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

            const responseSalida = await fetch(`${BASE_URL}/Catalogos/Salida/salida/`, {
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

            // SEGUNDO: Crear el DETALLE con referencia a la salida
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

            const responseDetalle = await fetch(`${BASE_URL}/Catalogos/Salida/detallesalida/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(detalleData)
            });

            if (!responseDetalle.ok) {
                const errorData = await responseDetalle.json();
                console.error('❌ Error creando detalle salida:', errorData);
                
                // Rollback: Eliminar la salida si falla el detalle
                await fetch(`${BASE_URL}/Catalogos/Salida/salida/${salidaCreada.id}/`, {
                    method: 'DELETE'
                });
                
                throw new Error(`Error al crear detalle salida: ${JSON.stringify(errorData)}`);
            }

            const detalleCreado = await responseDetalle.json();
            console.log('✅ Detalle salida creado:', detalleCreado);

            // TERCERO: ACTUALIZAR LA EXISTENCIA DEL LIBRO
            await actualizarExistenciaLibro(libroId, cantidad, 'salida');

            alert('¡Salida registrada correctamente y stock actualizado!');
            form.reset();
            
            await cargarLibrosParaSalida();
            await cargarLibros();
            
        } catch (err) {
            console.error('❌ Error al registrar salida:', err);
            alert('Error al registrar salida: ' + err.message);
        }
    });
}

// -------------------- MÓDULO DE REPORTES --------------------
let chartInstance = null;
let reporteData = {
    librosVendidos: [],
    movimientos: [],
    categorias: []
};

async function cargarDatosReportes() {
    try {
        console.log('📊 Cargando datos para reportes...');
        
        // Cargar movimientos de salida
        const ventasData = await fetchJson('Catalogos/Salida/detallesalida/');
        reporteData.movimientos = ventasData;
        
        // Cargar categorías para el filtro
        const categoriasData = await fetchJson('InventarioLibros/Categorias/categorias/');
        reporteData.categorias = categoriasData;
        
        // Cargar libros para mapear IDs a nombres
        const librosData = await fetchJson('InventarioLibros/Libros/libros/');
        const librosMap = new Map();
        librosData.forEach(libro => {
            librosMap.set(libro.id, libro.nombre);
        });
        
        // Procesar datos para libros más vendidos
        const ventasPorLibro = {};
        reporteData.movimientos.forEach(movimiento => {
            if (movimiento.libro && movimiento.cantidad) {
                const libroId = movimiento.libro;
                const libroNombre = librosMap.get(libroId) || `Libro ${libroId}`;
                ventasPorLibro[libroNombre] = (ventasPorLibro[libroNombre] || 0) + movimiento.cantidad;
            }
        });
        
        // Convertir a array y ordenar
        reporteData.librosVendidos = Object.entries(ventasPorLibro)
            .map(([nombre, cantidad]) => ({ nombre, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad);
            
        console.log('✅ Datos de reportes cargados:', reporteData.librosVendidos);
        return true;
        
    } catch (err) {
        console.error('❌ Error cargando datos para reportes:', err);
        return false;
    }
}

function crearGraficoLibrosMasVendidos(filtroMes = null) {
    const ctx = document.getElementById('librosChart');
    if (!ctx) return;
    
    // Destruir gráfico anterior si existe
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    let datosFiltrados = [...reporteData.librosVendidos];
    if (filtroMes) {
        console.log(`Filtrando por mes: ${filtroMes}`);
    }
    
    // Tomar solo los top 10 para que el gráfico sea legible
    const topLibros = datosFiltrados.slice(0, 10);
    const otrosLibros = datosFiltrados.slice(10);
    
    let labels = topLibros.map(libro => libro.nombre);
    let data = topLibros.map(libro => libro.cantidad);
    
    // Si hay más de 10 libros, agrupar el resto en "Otros"
    if (otrosLibros.length > 0) {
        const totalOtros = otrosLibros.reduce((sum, libro) => sum + libro.cantidad, 0);
        labels.push('Otros');
        data.push(totalOtros);
    }
    
    // Colores para el gráfico
    const colores = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384',
        '#36A2EB'
    ];
    
    chartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colores.slice(0, labels.length),
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Top 10 Libros Más Vendidos',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: 20
                },
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} unidades (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function crearPanelReportes() {
    const reporteSection = document.getElementById('reporte-form');
    if (!reporteSection) return;
    
    reporteSection.innerHTML = `
        <div class="reporte-header">
            <h1 style="text-align:center; color:#1e2a38; margin-bottom: 30px;">
                <i class="fas fa-chart-bar"></i> Dashboard de Reportes
            </h1>
        </div>
        
        <div class="controles-reporte" style="margin-bottom: 30px; text-align: center;">
            <div class="filtros-container" style="display: inline-flex; gap: 15px; align-items: center; flex-wrap: wrap; justify-content: center;">
                <div class="filtro-group">
                    <label for="filtro-mes" style="margin-right: 8px; font-weight: 500;">Filtrar por Mes:</label>
                    <select id="filtro-mes" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="">Todos los meses</option>
                        <option value="1">Enero</option>
                        <option value="2">Febrero</option>
                        <option value="3">Marzo</option>
                        <option value="4">Abril</option>
                        <option value="5">Mayo</option>
                        <option value="6">Junio</option>
                        <option value="7">Julio</option>
                        <option value="8">Agosto</option>
                        <option value="9">Septiembre</option>
                        <option value="10">Octubre</option>
                        <option value="11">Noviembre</option>
                        <option value="12">Diciembre</option>
                    </select>
                </div>
                
                <div class="filtro-group">
                    <label for="tipo-grafico" style="margin-right: 8px; font-weight: 500;">Tipo de Gráfico:</label>
                    <select id="tipo-grafico" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px;">
                        <option value="pastel">Gráfico de Pastel</option>
                        <option value="barras">Gráfico de Barras</option>
                    </select>
                </div>
                
                <button id="btn-actualizar-reporte" class="btn btn-primary" style="padding: 8px 16px;">
                    <i class="fas fa-sync-alt"></i> Actualizar
                </button>
            </div>
        </div>
        
        <div class="estadisticas-rapidas" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div class="estadistica-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">TOTAL VENDIDO</h3>
                <p id="total-vendido" style="margin: 0; font-size: 24px; font-weight: bold;">0</p>
            </div>
            <div class="estadistica-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">LIBROS ÚNICOS</h3>
                <p id="total-libros" style="margin: 0; font-size: 24px; font-weight: bold;">0</p>
            </div>
            <div class="estadistica-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">PROMEDIO/MES</h3>
                <p id="promedio-mes" style="margin: 0; font-size: 24px; font-weight: bold;">0</p>
            </div>
            <div class="estadistica-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                <h3 style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">LIBRO MÁS VENDIDO</h3>
                <p id="libro-top" style="margin: 0; font-size: 14px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">-</p>
            </div>
        </div>
        
        <div class="charts-container" style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px; margin-bottom: 30px;">
            <div class="chart-main" style="background: white; padding: 25px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <div style="height: 400px;">
                    <canvas id="librosChart"></canvas>
                </div>
            </div>
            
            <div class="chart-sidebar" style="display: flex; flex-direction: column; gap: 20px;">
                <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); flex: 1;">
                    <h3 style="margin-top: 0; text-align: center; color: #1e2a38;">Top 5 Libros</h3>
                    <div id="lista-top-libros" style="max-height: 300px; overflow-y: auto;">
                        <!-- Lista se llenará dinámicamente -->
                    </div>
                </div>
            </div>
        </div>
        
        <div class="tabla-detalle" style="background: white; padding: 25px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h3 style="margin-top: 0; color: #1e2a38;">Detalle de Ventas por Libro</h3>
            <div class="table-container">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Libro</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Unidades Vendidas</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Porcentaje</th>
                        </tr>
                    </thead>
                    <tbody id="tabla-detalle-ventas">
                        <!-- Datos se llenarán dinámicamente -->
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Configurar event listeners para los controles
    configurarControlesReporte();
}

function configurarControlesReporte() {
    const filtroMes = document.getElementById('filtro-mes');
    const tipoGrafico = document.getElementById('tipo-grafico');
    const btnActualizar = document.getElementById('btn-actualizar-reporte');
    
    if (filtroMes) {
        filtroMes.addEventListener('change', actualizarReporte);
    }
    
    if (tipoGrafico) {
        tipoGrafico.addEventListener('change', actualizarReporte);
    }
    
    if (btnActualizar) {
        btnActualizar.addEventListener('click', actualizarReporte);
    }
}

async function actualizarReporte() {
    try {
        console.log('🔄 Actualizando reporte...');
        
        // Mostrar loading
        const btnActualizar = document.getElementById('btn-actualizar-reporte');
        if (btnActualizar) {
            btnActualizar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
            btnActualizar.disabled = true;
        }
        
        // Recargar datos
        await cargarDatosReportes();
        
        // Actualizar estadísticas rápidas
        actualizarEstadisticasRapidas();
        
        // Actualizar gráfico principal
        const tipoGrafico = document.getElementById('tipo-grafico')?.value || 'pastel';
        const filtroMes = document.getElementById('filtro-mes')?.value || null;
        
        if (tipoGrafico === 'pastel') {
            crearGraficoLibrosMasVendidos(filtroMes);
        } else {
            crearGraficoLibrosMasVendidos(filtroMes);
        }
        
        // Actualizar lista top libros
        actualizarListaTopLibros();
        
        // Actualizar tabla detalle
        actualizarTablaDetalleVentas();
        
        console.log('✅ Reporte actualizado');
        
    } catch (err) {
        console.error('❌ Error actualizando reporte:', err);
        alert('Error al actualizar el reporte');
    } finally {
        // Restaurar botón
        const btnActualizar = document.getElementById('btn-actualizar-reporte');
        if (btnActualizar) {
            btnActualizar.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar';
            btnActualizar.disabled = false;
        }
    }
}

function actualizarEstadisticasRapidas() {
    const totalVendido = reporteData.librosVendidos.reduce((sum, libro) => sum + libro.cantidad, 0);
    const totalLibros = reporteData.librosVendidos.length;
    const promedioMes = Math.round(totalVendido / 12);
    const libroTop = reporteData.librosVendidos[0]?.nombre || '-';
    
    document.getElementById('total-vendido').textContent = totalVendido.toLocaleString();
    document.getElementById('total-libros').textContent = totalLibros.toLocaleString();
    document.getElementById('promedio-mes').textContent = promedioMes.toLocaleString();
    document.getElementById('libro-top').textContent = libroTop;
}

function actualizarListaTopLibros() {
    const listaContainer = document.getElementById('lista-top-libros');
    if (!listaContainer) return;
    
    const top5 = reporteData.librosVendidos.slice(0, 5);
    
    listaContainer.innerHTML = top5.map((libro, index) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="background: #667eea; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">
                    ${index + 1}
                </span>
                <span style="font-size: 14px; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${libro.nombre}">
                    ${libro.nombre}
                </span>
            </div>
            <span style="background: #e9ecef; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                ${libro.cantidad}
            </span>
        </div>
    `).join('');
}

function actualizarTablaDetalleVentas() {
    const tablaBody = document.getElementById('tabla-detalle-ventas');
    if (!tablaBody) return;
    
    const totalVendido = reporteData.librosVendidos.reduce((sum, libro) => sum + libro.cantidad, 0);
    
    tablaBody.innerHTML = reporteData.librosVendidos.map(libro => {
        const porcentaje = totalVendido > 0 ? ((libro.cantidad / totalVendido) * 100).toFixed(1) : 0;
        return `
            <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 12px; text-align: left;">${libro.nombre}</td>
                <td style="padding: 12px; text-align: center; font-weight: bold;">${libro.cantidad.toLocaleString()}</td>
                <td style="padding: 12px; text-align: center;">
                    <span style="background: #e9ecef; padding: 4px 8px; border-radius: 12px; font-size: 12px;">
                        ${porcentaje}%
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// -------------------- NAVEGACIÓN MENÚ Y LOGOUT --------------------
document.addEventListener('DOMContentLoaded', () => {
    const usuario = getUsuario();

    // Verificar conexión
    setTimeout(() => {
        verificarConexion();
    }, 500);

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
                } else if (formId === 'reporte-form') {
                    setTimeout(() => {
                        cargarDatosReportes();
                        actualizarEstadisticasRapidas();
                        crearGraficoLibrosMasVendidos();
                        actualizarListaTopLibros();
                        actualizarTablaDetalleVentas();
                    }, 100);
                }
            }
        });
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
    }
    if (document.getElementById('form-salidas')) {
        configurarFormularioSalida();
    }
    
    // INICIALIZAR REPORTES
    if (document.getElementById('reporte-form')) {
        crearPanelReportes();
    }

    // Logout
    const btnSalir = document.getElementById('btn-cerrar-sesion');
    btnSalir?.addEventListener('click', () => {
        if (confirm('¿Estás seguro que querés cerrar sesión?')) {
            localStorage.removeItem('usuario');
            window.location.href = '/index.html';
        }
    });
});

// Funcionalidad responsiva para móviles
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menuToggle');
    const menuVertical = document.getElementById('MenuVertical');
    const menuOverlay = document.createElement('div');
    
    // Crear overlay
    menuOverlay.className = 'menu-overlay';
    document.body.appendChild(menuOverlay);
    
    // Toggle menu
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            menuVertical.classList.toggle('menu-open');
            menuOverlay.classList.toggle('active');
        });
        
        // Cerrar menu al hacer clic en overlay
        menuOverlay.addEventListener('click', function() {
            menuVertical.classList.remove('menu-open');
            menuOverlay.classList.remove('active');
        });
    }
    
    // Cerrar menu al seleccionar una opción (en móviles)
    const menuLinks = document.querySelectorAll('.ul_MenuVertical a');
    menuLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                menuVertical.classList.remove('menu-open');
                menuOverlay.classList.remove('active');
            }
        });
    });
    
    // Ajustar comportamiento en resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            menuVertical.classList.remove('menu-open');
            menuOverlay.classList.remove('active');
        }
    });
});