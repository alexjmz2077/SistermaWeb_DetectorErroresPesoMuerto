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

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, 'resultados.csv');
    } else {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "resultados.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

loadModel();
