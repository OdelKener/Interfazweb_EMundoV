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

// -------------------- FUNCIÓN PARA ACTUALIZAR EXISTENCIA DE LIBROS --------------------
async function actualizarExistenciaLibro(libroId, cantidad, operacion = 'entrada') {
    try {
        // Obtener el libro actual
        const libro = await fetchJson(`${BASE_URL}InventarioLibros/Libros/libros/${libroId}/`);
        
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
        
        await fetchJson(`${BASE_URL}InventarioLibros/Libros/libros/${libroId}/`, {
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

// -------------------- ENTRADAS - CÓDIGO MEJORADO --------------------
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

// -------------------- SALIDAS - CÓDIGO MEJORADO --------------------
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

// -------------------- MÓDULO DE REPORTES MEJORADO --------------------

// Variables globales para reportes
let chartInstance = null;
let reporteData = {
    librosVendidos: [],
    movimientos: [],
    categorias: []
};

// Función para cargar datos de reportes
async function cargarDatosReportes() {
    try {
        console.log('📊 Cargando datos para reportes...');
        
        // Cargar libros más vendidos
        const ventasData = await fetchJson(`${BASE_URL}Catalogos/Salida/detallesalida/`);
        reporteData.movimientos = Array.isArray(ventasData) ? ventasData : ventasData.results || [];
        
        // Cargar categorías para el filtro
        const categoriasData = await fetchJson(`${BASE_URL}InventarioLibros/Categorias/categorias/`);
        reporteData.categorias = Array.isArray(categoriasData) ? categoriasData : categoriasData.results || [];
        
        // Cargar libros para mapear IDs a nombres
        const librosData = await fetchJson(`${BASE_URL}InventarioLibros/Libros/libros/`);
        const librosMap = new Map();
        (Array.isArray(librosData) ? librosData : librosData.results || []).forEach(libro => {
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

// Función para crear gráfico de pastel de libros más vendidos
function crearGraficoLibrosMasVendidos(filtroMes = null) {
    const ctx = document.getElementById('librosChart');
    if (!ctx) return;
    
    // Destruir gráfico anterior si existe
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // Filtrar datos por mes si se especifica
    let datosFiltrados = [...reporteData.librosVendidos];
    if (filtroMes) {
        // Aquí podrías filtrar por mes si tienes datos de fecha en los movimientos
        // Por ahora mostramos todos los datos
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

// Función para crear gráfico de barras de ventas por mes
function crearGraficoVentasPorMes() {
    const ctx = document.getElementById('ventasMensualesChart');
    if (!ctx) return;
    
    // Agrupar ventas por mes (ejemplo simplificado)
    const ventasPorMes = {
        'Ene': 150, 'Feb': 200, 'Mar': 180, 'Abr': 220,
        'May': 190, 'Jun': 210, 'Jul': 240, 'Ago': 230,
        'Sep': 260, 'Oct': 280, 'Nov': 300, 'Dic': 350
    };
    
    // En una implementación real, calcularías esto desde los datos
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(ventasPorMes),
            datasets: [{
                label: 'Ventas Mensuales',
                data: Object.values(ventasPorMes),
                backgroundColor: '#36A2EB',
                borderColor: '#1E6CB3',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Ventas Mensuales'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Unidades Vendidas'
                    }
                }
            }
        }
    });
}

// Función para crear HTML del panel de reportes
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

// Función para configurar los controles del reporte
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

// Función para actualizar todo el reporte
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
            // Para gráfico de barras podrías implementar una función similar
            crearGraficoLibrosMasVendidos(filtroMes); // Por ahora usa el mismo
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

// Función para actualizar las estadísticas rápidas
function actualizarEstadisticasRapidas() {
    const totalVendido = reporteData.librosVendidos.reduce((sum, libro) => sum + libro.cantidad, 0);
    const totalLibros = reporteData.librosVendidos.length;
    const promedioMes = Math.round(totalVendido / 12); // Simplificado
    const libroTop = reporteData.librosVendidos[0]?.nombre || '-';
    
    document.getElementById('total-vendido').textContent = totalVendido.toLocaleString();
    document.getElementById('total-libros').textContent = totalLibros.toLocaleString();
    document.getElementById('promedio-mes').textContent = promedioMes.toLocaleString();
    document.getElementById('libro-top').textContent = libroTop;
}

// Función para actualizar la lista top libros
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

// Función para actualizar la tabla detalle de ventas
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

    // Inicialización de formularios (agregar reportes)
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
        // Cargar datos iniciales cuando se muestre el reporte
        const enlaceReporte = document.querySelector('a[data-form="reporte-form"]');
        if (enlaceReporte) {
            enlaceReporte.addEventListener('click', async function() {
                await cargarDatosReportes();
                actualizarEstadisticasRapidas();
                crearGraficoLibrosMasVendidos();
                actualizarListaTopLibros();
                actualizarTablaDetalleVentas();
            });
        }
    }


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





















