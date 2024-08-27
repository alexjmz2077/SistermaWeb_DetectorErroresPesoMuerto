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



let model, webcam, labelContainer, resultLabelContainer, maxPredictions;
let isRunning = false;
let predictionCounts = {};
let lastPredictedClass = '';
let predictionBuffer = [];
const BUFFER_SIZE = 35;
const CONSISTENCY_THRESHOLD = 34; // Al menos 34 de 35 predicciones deben ser consistentes
const THRESHOLD = 0.70;
let errorCounter = 0;
let csvContent = "Numero de error,Tipo de Error (prediccion),Hora del error\n";

async function init() {
    document.getElementById('container').style.display = 'flex';
    document.getElementById('startButton').style.display = 'none';
    document.getElementById('resultadosButton').style.display = 'block';
    document.getElementById('salirButton').style.display = 'block';
    document.getElementById('img_screen').style.display = 'none';
    document.getElementById('label-container').style.display = 'flex';

    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    const flip = true;
    webcam = new tmImage.Webcam(450, 450, flip);
    await webcam.setup();
    await webcam.play();
    isRunning = true;
    window.requestAnimationFrame(loop);

    document.getElementById("webcam-container").appendChild(webcam.canvas);
    labelContainer = document.getElementById("label-container");
    resultLabelContainer = document.getElementById("results-content");

    // Crear divs para predicciones válidas
    const metadata = await (await fetch(metadataURL)).json();
    metadata.labels.forEach(label => {
        if (label !== 'nada' && label !== 'bien' && label !== 'biencadera') {
            const labelDiv = document.createElement("div");
            labelDiv.classList.add('label-item');
            labelDiv.innerHTML = `<div class="label-percentage">0%</div><div class="label-name">${label}</div>`;
            labelContainer.appendChild(labelDiv);
            predictionCounts[label] = 0;
        }
    });
};

async function loop() {
    if (!isRunning) return;
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
};

async function predict() {
    const predictions = await model.predict(webcam.canvas);

    // Encontrar la clase con la mayor probabilidad
    let maxProbability = -1;
    let maxIndex = -1;
    for (let i = 0; i < maxPredictions; i++) {
        if (predictions[i].probability > maxProbability) {
            maxProbability = predictions[i].probability;
            maxIndex = i;
        }
    }

    // Agregar predicción actual al buffer
    predictionBuffer.push(predictions[maxIndex].className);
    if (predictionBuffer.length > BUFFER_SIZE) {
        predictionBuffer.shift();
    }

    // Determinar la clase más frecuente en el buffer
    const predictedClass = getMostFrequentPrediction(predictionBuffer);

    // Verificar si la clase más frecuente cumple con el umbral de consistencia
    const frequency = predictionBuffer.filter(pred => pred === predictedClass).length;

    // Si la clase más frecuente en el buffer cumple el umbral de consistencia y la probabilidad es alta
    if (predictedClass === predictions[maxIndex].className && frequency >= CONSISTENCY_THRESHOLD && maxProbability > THRESHOLD) {
        // Actualizar los labels y manejar la predicción como antes
        const validPredictions = predictions.filter(pred => pred.className !== 'nada' && pred.className !== 'bien' && pred.className !== 'biencadera');
        validPredictions.forEach((prediction, i) => {
            const labelDiv = labelContainer.childNodes[i];
            labelDiv.querySelector('.label-percentage').textContent = `${(prediction.probability * 100).toFixed(0)}%`;
            labelDiv.querySelector('.label-name').textContent = prediction.className;

            // Aplicar estilos basado en la probabilidad más alta
            if (prediction.className === predictions[maxIndex].className) {
                labelDiv.querySelector('.label-percentage').style.color = 'red';
                labelDiv.querySelector('.label-name').style.color = 'red';
            } else {
                labelDiv.querySelector('.label-percentage').style.color = '#031749';
                labelDiv.querySelector('.label-name').style.color = '#031749';
            }
        });

        // Incrementar el conteo de la predicción
        if (predictedClass !== lastPredictedClass) {
            predictionCounts[predictedClass]++;
            lastPredictedClass = predictedClass;

            // Registrar el error en el CSV
            if (predictedClass !== 'nada' && predictedClass !== 'bien' && predictedClass !== 'biencadera') {
                errorCounter++;
                const now = new Date();
                const time = now.toLocaleTimeString();
                csvContent += `${errorCounter},${predictedClass},${time}\n`;
            }
        }
    } else {
        // Ocultar las predicciones si no hay consistencia
        const validPredictions = predictions.filter(pred => pred.className !== 'nada' && pred.className !== 'bien' && pred.className !== 'biencadera');
        validPredictions.forEach((prediction, i) => {
            const labelDiv = labelContainer.childNodes[i];
            labelDiv.querySelector('.label-percentage').textContent = `0%`;
            labelDiv.querySelector('.label-percentage').style.color = '#031749';
            labelDiv.querySelector('.label-name').style.color = '#031749';
        });
    }
}


function getMostFrequentPrediction(buffer) {
    const frequency = {};
    buffer.forEach(pred => {
        if (!frequency[pred]) {
            frequency[pred] = 0;
        }
        frequency[pred]++;
    });
    return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
}

function Guardar() {
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

    // Aquí reestructuramos la data acumulada
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
            default:
                console.log("Tipo de error no reconocido:", tipoError);
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






function resultados() {
    isRunning = false;
    webcam.stop();
    document.getElementById('container').style.display = 'none';
    document.getElementById('container_results').style.display = 'flex';
    document.getElementById('hz').style.display = 'none';
    document.getElementById('label-container').style.display = 'none';

    // Mostrar resumen de resultados
    resultLabelContainer.innerHTML = '';
    for (const [className, count] of Object.entries(predictionCounts)) {
        // Filtrar las clases no deseadas
        if (className !== 'nada' && className !== 'bien' && className !== 'biencadera') {
            const resultDiv = document.createElement('div');
            resultDiv.classList.add('result-item');
            resultDiv.innerHTML = `<span class="label-name">${className}:</span>  ${count} ${count === 1 ? 'vez' : 'veces'} `;
            resultLabelContainer.appendChild(resultDiv);
        }
    }
};


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

    // Estructuramos los datos de los errores
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
        margin: { left: 20, right: 20 }
    });

    // Guardar el PDF con el nombre "reporte_errores_peso_muerto.pdf"
    doc.save('reporte_errores_peso_muerto.pdf');
}
