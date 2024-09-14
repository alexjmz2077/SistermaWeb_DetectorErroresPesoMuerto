function Salir() {
    window.location.href = urlInicio;
}

function Pagina2() {
    window.location.href = urlRecomendaciones;
}
function PaginaAnalisis(){
    window.location.href = urlAnalisis;
}

function openNav() {
    document.getElementById("sidebar").style.width = "250px";
    document.getElementById("main").style.marginLeft = "250px";
};

function closeNav() {
    document.getElementById("sidebar").style.width = "0";
    document.getElementById("main").style.marginLeft = "0";
};
function openLoginPopup() {
    document.getElementById('loginPopup').style.display = 'flex';
}

function openRegisterPopup() {
    document.getElementById('registerPopup').style.display = 'flex';
}

function closePopup(popupId) {
    document.getElementById(popupId).style.display = 'none';
}

function showLoginMessage() {
    alert('Por favor, inicia sesión para comenzar.');
}

// Agregar un listener para detectar la tecla "Esc"
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") { // Detecta la tecla "Esc"
        // Cierra el popup si está abierto
        var popups = document.querySelectorAll('.popup');
        popups.forEach(function(popup) {
            if (popup.style.display === "flex") {
                popup.style.display = "none";
            }
        });

         // Cierra el sidebar si está abierto
         var sidebar = document.getElementById("sidebar");
         if (sidebar.style.width === "250px") {
             closeNav(); // Llama a la función que cierra el sidebar
         }
    }
});

let model, maxPredictions;
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');
const predictionHistory = [];
const historyLength = 35;
const consistentThreshold = 34;
const x_probability = 0.70;  // Si la probabilidad más alta es menor al 70%, no se considera
const predictionCounts = {};
let lastPredictedClass = '';
let errorCounter = 0;
let csvContent = "Numero de error,Tipo de Error (prediccion),Tiempo del video (minuto:segundo)\n";

async function loadModel() {
    const modelURL = `${modelURLBase}model.json`;
    const metadataURL = `${modelURLBase}metadata.json`;
    
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
}

function handleVideoUpload() {
    const videoUpload = document.getElementById('videoUpload');
    const uploadedVideo = document.getElementById('uploadedVideo');
    const videoContainer = document.getElementById('video-container');
    
    const file = videoUpload.files[0];
    if (!file) {
        alert("Por favor, sube un video antes de continuar.");
        return;
    }

    document.getElementById('resultadosButton').style.display = 'block';

    const url = URL.createObjectURL(file);
    uploadedVideo.src = url;
    uploadedVideo.load();

    uploadedVideo.onloadeddata = () => {
        videoContainer.style.display = 'block';
        setupVideo(uploadedVideo);
    };
}

async function setupVideo(videoElement) {
    await loadModel();

    videoElement.play();
    videoElement.addEventListener('play', () => {
        const videoWidth = videoElement.videoWidth;
        const videoHeight = videoElement.videoHeight;
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        document.getElementById('label-container').style.display = 'flex';
        window.requestAnimationFrame(() => loop(videoElement));
    });
}

async function loop(videoElement) {
    if (videoElement.paused || videoElement.ended) {
        return;
    }
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    await predict(videoElement);
    window.requestAnimationFrame(() => loop(videoElement));
}

async function predict(videoElement) {
    const prediction = await model.predict(canvas);
    const highestPrediction = prediction.reduce((prev, current) => (prev.probability > current.probability) ? prev : current);

    // Si la probabilidad más alta es menor al 70%, no se considera
    if (highestPrediction.probability < x_probability ) {
        return;
    }

    predictionHistory.push(highestPrediction.className);
    if (predictionHistory.length > historyLength) {
        predictionHistory.shift();
    }

    const consistentPrediction = checkConsistency(predictionHistory);
    const labelContainer = document.getElementById('label-container');
    
    const validPredictions = prediction.filter(pred => pred.className !== 'nada' && pred.className !== 'bien' && pred.className !== 'biencadera');
    labelContainer.innerHTML = '';  // Limpiar predicciones previas
    validPredictions.forEach(pred => {
        const labelDiv = document.createElement("div");
        labelDiv.classList.add('label-item');
        labelDiv.innerHTML = `<div class="label-percentage">${(pred.probability * 100).toFixed(0)}%</div><div class="label-name">${pred.className}</div>`;
        labelContainer.appendChild(labelDiv);
    });

    if (consistentPrediction.className !== 'nada' && consistentPrediction.className !== lastPredictedClass) {
        lastPredictedClass = consistentPrediction.className;
        predictionCounts[consistentPrediction.className] = (predictionCounts[consistentPrediction.className] || 0) + 1;
        
        if (consistentPrediction.className !== 'bien' && consistentPrediction.className !== 'biencadera') {
            errorCounter++;
            const videoTime = formatVideoTime(videoElement.currentTime);
            csvContent += `${errorCounter},${consistentPrediction.className},${videoTime}\n`;
        }
    }
}

function checkConsistency(history) {
    const countMap = history.reduce((acc, prediction) => {
        acc[prediction] = (acc[prediction] || 0) + 1;
        return acc;
    }, {});

    const mostFrequentPrediction = Object.keys(countMap).reduce((a, b) => countMap[a] > countMap[b] ? a : b);
    return { className: countMap[mostFrequentPrediction] >= consistentThreshold ? mostFrequentPrediction : 'nada' };
}

function formatVideoTime(timeInSeconds) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function mostrarResultados() {
    const uploadedVideo = document.getElementById('uploadedVideo');
    document.getElementById('container_results').style.display = 'flex';
    document.getElementById('label-container').style.display = 'none';
    document.getElementById('video-container').style.display = 'none';
    document.getElementById('resultadosButton').style.display = 'none';
    document.getElementById('hz').style.display = 'none';
    
    const resultLabelContainer = document.getElementById('results-content');
    resultLabelContainer.innerHTML = '';
    for (const [className, count] of Object.entries(predictionCounts)) {
        if (className !== 'nada' && className !== 'bien' && className !== 'biencadera') {
            const resultDiv = document.createElement('div');
            resultDiv.classList.add('result-item');
            resultDiv.innerHTML = `<span class="label-name">${className}:</span> ${count} ${count === 1 ? 'vez' : 'veces'}`;
            resultLabelContainer.appendChild(resultDiv);
        }
    }

    // Eliminar el video cargado
    uploadedVideo.src = '';
}

function guardarResultados() {
    if (errorCounter === 0) {
        alert("No se han detectado errores.");
        return;
    }

    // Obtener fecha actual
    const now = new Date();
    const fechaActual = now.toLocaleDateString();

    // Encabezado del reporte
    let nuevoCsvContent = "Reporte de Errores en el Peso muerto\n\n";
    nuevoCsvContent += `Fecha,${fechaActual}\n`;
    nuevoCsvContent += `Usuario,${nombreUsuario}\n\n`;
    nuevoCsvContent += "No.,Cadera Alta,Cadera Baja,Espalda Curva,Extensión Excesiva\n";

    // Reestructurar la data acumulada
    const registros = csvContent.trim().split("\n").slice(1); // Omitimos el encabezado original
    const errorData = {
        "Cadera Alta": [],
        "Cadera Baja": [],
        "Espalda Curva": [],
        "Extensión Excesiva": []
    };

    registros.forEach((registro) => {
        const [, tipoError, hora] = registro.split(",");
        switch (tipoError.trim()) {
            case "Cadera Alta":
                errorData["Cadera Alta"].push(hora);
                break;
            case "Cadera Baja":
                errorData["Cadera Baja"].push(hora);
                break;
            case "Espalda Curva":
                errorData["Espalda Curva"].push(hora);
                break;
            case "Extensión Excesiva":
                errorData["Extensión Excesiva"].push(hora);
                break;
        }
    });

    // Calcular el número máximo de errores
    const maxErrores = Math.max(
        errorData["Cadera Alta"].length,
        errorData["Cadera Baja"].length,
        errorData["Espalda Curva"].length,
        errorData["Extensión Excesiva"].length
    );

    // Generar filas para cada error
    for (let i = 0; i < maxErrores; i++) {
        nuevoCsvContent += `${i + 1},`;
        nuevoCsvContent += `${errorData["Cadera Alta"][i] || ""},`;
        nuevoCsvContent += `${errorData["Cadera Baja"][i] || ""},`;
        nuevoCsvContent += `${errorData["Espalda Curva"][i] || ""},`;
        nuevoCsvContent += `${errorData["Extensión Excesiva"][i] || ""}\n`;
    }

    // Añadir total por tipo de error
    nuevoCsvContent += `Total,${errorData["Cadera Alta"].length},${errorData["Cadera Baja"].length},${errorData["Espalda Curva"].length},${errorData["Extensión Excesiva"].length}\n`;

    // Crear un Blob con el nuevo contenido CSV
    const blob = new Blob([nuevoCsvContent], { type: 'text/csv;charset=utf-8;' });
    if (window.navigator.msSaveOrOpenBlob) {
        // Para IE y Edge
        window.navigator.msSaveBlob(blob, 'reporte_errores_peso_muerto.csv');
    } else {
        // Para otros navegadores
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "reporte_errores_peso_muerto.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function GuardarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Obtener la fecha y hora actuales
    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString();

    if (errorCounter === 0) {
        alert("No se han detectado errores.");
        return;
    }

    // Establecer el título y subtítulo
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte de Errores en el Peso Muerto', 105, 20, null, null, 'center');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${date}`, 20, 30);
    doc.text(`Usuario: ${nombreUsuario}`, 20, 40);

    // Espacio entre el título y el contenido
    let yOffset = 50;

    // Estructurar los datos de los errores
    const registros = csvContent.trim().split("\n").slice(1); // Omitimos el encabezado original
    const errorData = {
        "Cadera Alta": [],
        "Cadera Baja": [],
        "Espalda Curva": [],
        "Extensión Excesiva": []
    };

    registros.forEach((registro) => {
        const [, tipoError, hora] = registro.split(",");
        switch (tipoError.trim()) {
            case "Cadera Alta":
                errorData["Cadera Alta"].push(hora);
                break;
            case "Cadera Baja":
                errorData["Cadera Baja"].push(hora);
                break;
            case "Espalda Curva":
                errorData["Espalda Curva"].push(hora);
                break;
            case "Extensión Excesiva":
                errorData["Extensión Excesiva"].push(hora);
                break;
        }
    });

    // Calcular el número máximo de errores
    const maxErrores = Math.max(
        errorData["Cadera Alta"].length,
        errorData["Cadera Baja"].length,
        errorData["Espalda Curva"].length,
        errorData["Extensión Excesiva"].length
    );

    // Preparar las filas para la tabla
    const rows = [];
    for (let i = 0; i < maxErrores; i++) {
        rows.push([
            i + 1,
            errorData["Cadera Alta"][i] || "",
            errorData["Cadera Baja"][i] || "",
            errorData["Espalda Curva"][i] || "",
            errorData["Extensión Excesiva"][i] || ""
        ]);
    }

    // Añadir fila de totales
    rows.push([
        'Total',
        errorData["Cadera Alta"].length,
        errorData["Cadera Baja"].length,
        errorData["Espalda Curva"].length,
        errorData["Extensión Excesiva"].length
    ]);

    // Generar la tabla usando autoTable
    doc.autoTable({
        head: [['No.', 'Cadera Alta', 'Cadera Baja', 'Espalda Curva', 'Extensión Excesiva']],
        body: rows,
        startY: yOffset,
        theme: 'grid',
        styles: { halign: 'center' },
        headStyles: { fillColor: [0, 0, 0] },
        margin: { left: 20, right: 20 },
        didDrawPage: function (data) {
            // Pie de página
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
        
            // Ajuste de la longitud del texto
            const footerText = 'Reporte generado por DLchecker, desarrollada por Jaime Jiménez como trabajo de fin de carrera para obtener el título de Ingeniero en Tecnologías de la Información.';
            const pageHeight = doc.internal.pageSize.height;
            const footerX = 20;
            const footerY = pageHeight - 20;
        
            // Divide el texto en líneas si es necesario
            const textLines = doc.splitTextToSize(footerText, 180);
            doc.text(textLines, footerX, footerY);
        
            // Agregar número de página
            doc.text(`Página ${data.pageNumber} de ${pageCount}`, doc.internal.pageSize.width - 50, pageHeight - 10);
        }
    });

    // Guardar el PDF con el nombre "reporte_errores_peso_muerto.pdf"
    doc.save('reporte_errores_peso_muerto.pdf');
}

loadModel();
