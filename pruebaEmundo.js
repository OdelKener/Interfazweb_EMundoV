// -------------------- CRUD CATEGORÍAS --------------------
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('form-categorias')) {
    cargarCategorias();
    configurarFormularioCategoria();
  }
});

const BASE_URL = 'https://4b69-200-62-78-139.ngrok-free.app';
const TOKEN = localStorage.getItem('userToken') || '';

async function cargarCategorias() {
  const tabla = document.querySelector('#tabla-categorias tbody');
  tabla.innerHTML = '';
  try {
    const response = await fetch(`${BASE_URL}/InventarioLibros/Categorias/categorias/`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const categorias = await response.json();
    categorias.forEach(cat => {
      tabla.innerHTML += `
        <tr>
          <td>${cat.id}</td>
          <td>${cat.nombre}</td>
          <td>
            <button onclick="editarCategoria(${cat.id}, '${cat.nombre}')">Editar</button>
            <button onclick="eliminarCategoria(${cat.id})">Eliminar</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error al cargar categorías:', err);
  }
}

function configurarFormularioCategoria() {
  const form = document.getElementById('form-categorias');
  let editandoId = null;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre-categoria').value.trim();
    if (!nombre) {
      alert('Por favor ingresá el nombre de la categoría.');
      return;
    }

    const url = editandoId
      ? `${BASE_URL}/InventarioLibros/Categorias/categorias/${editandoId}/`
      : `${BASE_URL}/InventarioLibros/Categorias/categorias/`;
    const method = editandoId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TOKEN}`
        },
        body: JSON.stringify({ nombre })
      });

      if (response.ok) {
        alert(editandoId ? '¡Categoría actualizada!' : '¡Categoría registrada!');
        form.reset();
        editandoId = null;
        cargarCategorias();
      } else {
        const error = await response.json();
        alert('Error: ' + JSON.stringify(error));
      }
    } catch (err) {
      console.error('Error guardando categoría:', err);
    }
  });

  window.editarCategoria = function (id, nombre) {
    document.getElementById('nombre-categoria').value = nombre;
    editandoId = id;
  };
}

window.eliminarCategoria = async function eliminarCategoria(id) {
  if (!confirm('¿Seguro que querés eliminar esta categoría?')) return;

  try {
    const response = await fetch(`${BASE_URL}/InventarioLibros/Categorias/categorias/${id}/`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${TOKEN}`
      }
    });

    if (response.ok) {
      alert('¡Categoría eliminada!');
      cargarCategorias();
    } else {
      alert('No se pudo eliminar la categoría.');
    }
  } catch (err) {
    console.error('Error al eliminar categoría:', err);
  }
};
// async function cargarCategoriast() {
//   const tabla = document.querySelector('#tabla-categorias tbody');
//   tabla.innerHTML = ''; // Limpiar tabla antes de cargar

//   try {
//     const response = await fetch(`${BASE_URL}/InventarioLibros/categorias/`, {
//       headers: {
//         'Authorization': `Bearer ${TOKEN}`
//       }
//     });

//     if (!response.ok) {
//       const texto = await response.text();
//       console.error('Respuesta no válida:', texto);
//       throw new Error(`Error al obtener categorías: ${response.status}`);
//     }

//     const categorias = await response.json();
//     console.log('Categorías recibidas:', categorias);

//     categorias.forEach(cat => {
//       const fila = document.createElement('tr');
//       fila.innerHTML = `
//         <td>${cat.id}</td>
//         <td>${cat.nombre}</td>
//         <td>
//           <button onclick="editarCategoria(${cat.id}, '${cat.nombre}')">✏️</button>
//           <button onclick="eliminarCategoria(${cat.id})">🗑️</button>
//         </td>
//       `;
//       tabla.appendChild(fila);
//     });
//   } catch (err) {
//     console.error('Error al cargar categorías:', err);
//   }
// }



// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// -------------------- CRUD LIBROS --------------------
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('form-libros')) {
    cargarCategoriasParaLibros();
    cargarLibros();
    configurarFormularioLibro();
  }
});

async function cargarCategoriasParaLibros() {
  const select = document.getElementById('categoria-libro');
  if (!select) return;

  try {
    const response = await fetch(`${BASE_URL}/InventarioLibros/Categorias/categorias/`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    if (!response.ok) throw new Error(`Error HTTP ${response.status}`);

    const data = await response.json();
    select.innerHTML = '<option value="">Seleccione una categoría</option>';
    data.forEach(c => {
      select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
    });
  } catch (err) {
    console.error('Error cargando categorías para libros:', err);
  }
}

async function cargarLibros() {
  const tabla = document.querySelector('#tabla-inventario tbody');
  if (!tabla) return;

  try {
    const response = await fetch(`${BASE_URL}/InventarioLibros/Libros/libros/`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    if (!response.ok) throw new Error(`Error HTTP ${response.status}`);

    const libros = await response.json();
    tabla.innerHTML = '';
    libros.forEach(libro => {
      tabla.innerHTML += `
        <tr>
          <td>${libro.codigo}</td>
          <td>${libro.nombre}</td>
          <td>${libro.categoria_nombre || '—'}</td>
          <td>${libro.costo}</td>
          <td>${libro.existencia}</td>
          <td>
            <button onclick="editarLibro(${libro.id})">Editar</button>
            <button onclick="eliminarLibro(${libro.id})">Eliminar</button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error al cargar libros:', err);
  }
}

function configurarFormularioLibro() {
  const form = document.getElementById('form-libros');
  let libroEditando = null;

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      codigo: document.getElementById('codigo-libro').value.trim(),
      nombre: document.getElementById('nombre-libro').value.trim(),
      categoria: document.getElementById('categoria-libro').value,
      costo: parseFloat(document.getElementById('costo-libro').value),
      existencia: parseInt(document.getElementById('existencia-libro').value)
    };

    const url = libroEditando
      ? `${BASE_URL}/InventarioLibros/Libros/libros/${libroEditando}/`
      : `${BASE_URL}/InventarioLibros/Libros/libros/`;
    const method = libroEditando ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TOKEN}`
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        alert(libroEditando ? '¡Libro actualizado!' : '¡Libro registrado!');
        form.reset();
        libroEditando = null;
        cargarLibros();
      } else {
        const err = await response.json();
        alert('Error: ' + JSON.stringify(err));
      }
    } catch (err) {
      console.error('Error al guardar libro:', err);
    }
  });

  window.editarLibro = async function (id) {
    try {
      const response = await fetch(`${BASE_URL}/InventarioLibros/Libros/libros/${id}/`, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });

      if (!response.ok) throw new Error(`Error HTTP ${response.status}`);

      const libro = await response.json();
      document.getElementById('codigo-libro').value = libro.codigo;
      document.getElementById('nombre-libro').value = libro.nombre;
      document.getElementById('categoria-libro').value = libro.categoria;
      document.getElementById('costo-libro').value = libro.costo;
      document.getElementById('existencia-libro').value = libro.existencia;
      libroEditando = id;
    } catch (err) {
      console.error('Error cargando libro a editar:', err);
    }
  };
}

window.eliminarLibro = async function (id) {
  if (!confirm('¿Seguro que querés eliminar este libro?')) return;

  try {
    const response = await fetch(`${BASE_URL}/InventarioLibros/Libros/libros/${id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${TOKEN}` }
    });

    if (response.ok) {
      alert('¡Libro eliminado!');
      cargarLibros();
    } else {
      alert('No se pudo eliminar el libro.');
    }
  } catch (err) {
    console.error('Error al eliminar libro:', err);
  }
};

async function cargarCategoriasParaLibros() {
  const select = document.getElementById('categoria-libro');
  if (!select) return;

  try {
    const response = await fetch(`${BASE_URL}/InventarioLibros/categorias/`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    if (!response.ok) {
      const texto = await response.text();
      console.error('Respuesta no OK:', texto);
      throw new Error(`Error HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('Categorías cargadas:', data);

    select.innerHTML = '<option value="">Seleccione una categoría</option>';
    data.forEach(c => {
      select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
    });
  } catch (err) {
    console.error('Error cargando categorías para libros:', err);
  }
}

///////////////////////////////////////////////////////////////////////////

// -------------------- CRUD ENTRADAS --------------------
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('form-entradas')) {
    cargarLibrosParaEntrada();
    cargarSucursales();
    configurarFormularioEntrada();
  }
});

async function cargarLibrosParaEntrada() {
  const select = document.getElementById('select-libro-entrada');
  if (!select) return;

  try {
    const response = await fetch(`${BASE_URL}/InventarioLibros/Libros/`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const libros = await response.json();
    select.innerHTML = '<option value="">Seleccionar libro</option>';
    libros.forEach(lib => {
      select.innerHTML += `<option value="${lib.id}">${lib.nombre}</option>`;
    });
  } catch (err) {
    console.error('Error al cargar libros:', err);
  }
}

async function cargarSucursales() {
  const selects = document.querySelectorAll('#select-sucursal');
  if (!selects.length) return;

  try {
    const response = await fetch(`${BASE_URL}/Catalogos/Sucursal/`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const sucursales = await response.json();
    selects.forEach(select => {
      select.innerHTML = '<option value="">Seleccionar sucursal</option>';
      sucursales.forEach(s => {
        select.innerHTML += `<option value="${s.id}">${s.nombre}</option>`;
      });
    });
  } catch (err) {
    console.error('Error al cargar sucursales:', err);
  }
}

function configurarFormularioEntrada() {
  const form = document.getElementById('form-entradas');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tipoEntrada = form.querySelector('select').value;
    const codigo = form.querySelector('input[type="text"]').value.trim();
    const fecha = form.querySelector('input[type="date"]').value;
    const libroId = document.getElementById('select-libro-entrada').value;
    const cantidad = parseInt(form.querySelector('input[type="number"]').value);
    const costo = parseFloat(form.querySelectorAll('input[type="number"]')[1].value);
    const sucursalId = document.getElementById('select-sucursal').value;

    const entradaPayload = {
      tipoentrada: tipoEntrada,
      codigo: codigo,
      fechaentrada: fecha,
      libro: libroId,
      cantidad: cantidad,
      costoactual: costo,
      sucursalid: sucursalId
    };

    try {
      const response = await fetch(`${BASE_URL}/Catalogos/Entrada/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TOKEN}`
        },
        body: JSON.stringify(entradaPayload)
      });

      if (response.ok) {
        alert('¡Entrada registrada exitosamente!');
        form.reset();
      } else {
        const err = await response.json();
        alert('Error al registrar entrada: ' + JSON.stringify(err));
      }
    } catch (err) {
      console.error('Error al enviar entrada:', err);
    }
  });
}

////////////////////////////////////////////////////////////////////////////////////

// -------------------- CRUD SALIDAS --------------------
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('form-salidas')) {
    cargarLibrosParaSalida();
    cargarSucursales();
    configurarFormularioSalida();
  }
});

async function cargarLibrosParaSalida() {
  const select = document.getElementById('select-libro-salida');
  if (!select) return;

  try {
    const response = await fetch(`${BASE_URL}/InventarioLibros/Libros/`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const libros = await response.json();
    select.innerHTML = '<option value="">Seleccionar libro</option>';
    libros.forEach(lib => {
      select.innerHTML += `<option value="${lib.id}">${lib.nombre}</option>`;
    });
  } catch (err) {
    console.error('Error al cargar libros para salida:', err);
  }
}

function configurarFormularioSalida() {
  const form = document.getElementById('form-salidas');
  if (!form) return;

  // Actualizar máximo disponible según libro seleccionado (podés ajustar según API)
  const cantidadInput = form.querySelector('#cantidad-salida');
  const maxDisponibleSpan = document.getElementById('max-disponible');
  const libroSelect = document.getElementById('select-libro-salida');

  libroSelect.addEventListener('change', async () => {
    const libroId = libroSelect.value;
    if (!libroId) {
      maxDisponibleSpan.textContent = '0';
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/InventarioLibros/Libros/${libroId}/`, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      });
      if (response.ok) {
        const libro = await response.json();
        maxDisponibleSpan.textContent = libro.existencia || 0;
        cantidadInput.max = libro.existencia || 0;
      }
    } catch (err) {
      console.error('Error al obtener existencia:', err);
      maxDisponibleSpan.textContent = '0';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tipoSalida = form.querySelector('select').value;
    const codigo = form.querySelector('input[type="text"]').value.trim();
    const fecha = form.querySelector('input[type="date"]').value;
    const libroId = libroSelect.value;
    const cantidad = parseInt(cantidadInput.value);
    const precio = parseFloat(form.querySelectorAll('input[type="number"]')[1].value);
    const sucursalId = form.querySelector('#select-sucursal').value;

    if (cantidad > cantidadInput.max) {
      alert('La cantidad supera el stock disponible');
      return;
    }

    const salidaPayload = {
      tiposalida: tipoSalida,
      codigosalida: codigo,
      fechasalida: fecha,
      libro: libroId,
      cantidad: cantidad,
      precioventa: precio,
      sucursalid: sucursalId
    };

    try {
      const response = await fetch(`${BASE_URL}/Catalogos/Salida/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TOKEN}`
        },
        body: JSON.stringify(salidaPayload)
      });

      if (response.ok) {
        alert('¡Salida registrada exitosamente!');
        form.reset();
        maxDisponibleSpan.textContent = '0';
      } else {
        const err = await response.json();
        alert('Error al registrar salida: ' + JSON.stringify(err));
      }
    } catch (err) {
      console.error('Error al enviar salida:', err);
    }
  });
}

// -------------------- Navegación Menú Lateral --------------------
document.addEventListener('DOMContentLoaded', () => {
  const enlacesMenu = document.querySelectorAll('#MenuVertical ul.ul_MenuVertical li a');
  const formularios = document.querySelectorAll('.form-section');

  enlacesMenu.forEach(enlace => {
    enlace.addEventListener('click', e => {
      e.preventDefault();

      // Quitar clase active a todos los enlaces
      enlacesMenu.forEach(el => el.classList.remove('active'));

      // Poner clase active al enlace clickeado
      enlace.classList.add('active');

      // Ocultar todos los formularios
      formularios.forEach(form => form.classList.remove('active-form'));

      // Mostrar el formulario relacionado (data-form)
      const formId = enlace.getAttribute('data-form');
      const formularioMostrar = document.getElementById(formId);
      if (formularioMostrar) {
        formularioMostrar.classList.add('active-form');
      }
    });
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const btnSalir = document.getElementById('btn-cerrar-sesion');
  if (btnSalir) {
    btnSalir.addEventListener('click', cerrarSesion);
  }
});

function cerrarSesion() {
  if (confirm('¿Estás seguro que querés cerrar sesión?')) {
    localStorage.removeItem('userToken'); // eliminamos el token
    window.location.href = 'Emundo_Login.html';  // redirigimos al login
  }
}





