function Salir() {
    window.location.href = urlInicio;
}

function Pagina2() {
    window.location.href = urlRecomendaciones;
}

function Guardar() {
    const { jsPDF } = window.jspdf;

    // Crear una nueva instancia de jsPDF
    const doc = new jsPDF();

    // Obtener el contenido de los resultados
    const results = document.getElementById('results-content').innerText;

    // Obtener la fecha y hora actuales
    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString();

    // Establecer el título y subtítulo
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Resultados', 105, 20, null, null, 'center');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('Detector de errores en peso muerto', 105, 30, null, null, 'center');

    // Añadir el contenido de los resultados
    const lines = results.split('\n');
    let yOffset = 50;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    lines.forEach((line, index) => {
        doc.text(line, 105, yOffset + (index * 10), null, null, 'center');
    });

    // Añadir fecha y hora
    doc.setFontSize(12);
    doc.text(`Fecha: ${date}`, 105, yOffset + (lines.length * 10) + 20, null, null, 'center');
    doc.text(`Hora: ${time}`, 105, yOffset + (lines.length * 10) + 30, null, null, 'center');

    // Guardar el PDF con el nombre "resultados.pdf"
    doc.save('resultados.pdf');
};

function openNav() {
    document.getElementById("sidebar").style.width = "250px";
    document.getElementById("main").style.marginLeft = "250px";
};

function closeNav() {
    document.getElementById("sidebar").style.width = "0";
    document.getElementById("main").style.marginLeft = "0";
};


let model, webcam, labelContainer, resultLabelContainer, maxPredictions;
let isRunning = false;
let predictionCounts = {};
let lastPredictedClass = '';
let predictionBuffer = [];
const BUFFER_SIZE = 20;
const THRESHOLD = 0.51;

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
        if (label !== 'nada' && label !== 'bien') {
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

    // Si la clase más frecuente en el buffer coincide con la predicción actual, mostrarla
    if (predictedClass === predictions[maxIndex].className && maxProbability > THRESHOLD) {
        // Actualizar los labels
        const validPredictions = predictions.filter(pred => pred.className !== 'nada' && pred.className !== 'bien');
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
        }
    } else {
        // Ocultar las predicciones si no hay consistencia
        const validPredictions = predictions.filter(pred => pred.className !== 'nada' && pred.className !== 'bien');
        validPredictions.forEach((prediction, i) => {
            const labelDiv = labelContainer.childNodes[i];
            labelDiv.querySelector('.label-percentage').textContent = `0%`;
            labelDiv.querySelector('.label-name').textContent = '---';
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
        const resultDiv = document.createElement('div');
        resultDiv.classList.add('result-item');
        resultDiv.innerHTML = `<span class="label-name">${className}:</span>  ${count} ${count === 1 ? 'vez' : 'veces'} `;
        resultLabelContainer.appendChild(resultDiv);
    }
};
