// ==================== NUESTRO OS - VERSIÓN COMPLETA CON DRIVE ====================
// Incluye: persistencia base64, YouTube, Google Drive, galería, cartas, música, timeline, constelación, secretos, configuración.

let windows = [];
let nextZIndex = 1000;
let currentLetterIndex = 0;
let currentSongIndex = 0;
let audioPlayer = null;
let currentPhotoPage = 1;
const PHOTOS_PER_PAGE = 12;
let constellationPhotoUrl = null;
let constellationParticles = [];
let constellationAnimId = null;

let db = {
    photos: [],
    songs: [],
    timelineEvents: [],
    letters: [],
    secrets: [],
    settings: { background: "https://images.unsplash.com/photo-1516589091380-5d8e9f6a8e5b?auto=format&fit=crop&w=1350&q=80" }
};

// ========== FUNCIONES AUXILIARES ==========
async function loadData() {
    try {
        const response = await fetch('nuestrosos-config.json');
        if (response.ok) {
            const external = await response.json();
            const saved = localStorage.getItem("NuestroOS");
            if (saved) {
                const userData = JSON.parse(saved);
                db = { ...external, ...userData };
                db.photos = userData.photos || external.photos;
                db.songs = userData.songs || external.songs;
                db.timelineEvents = userData.timelineEvents || external.timelineEvents;
                db.letters = userData.letters || external.letters;
                db.secrets = userData.secrets || external.secrets;
                db.settings = { ...external.settings, ...userData.settings };
            } else {
                db = external;
            }
        } else {
            const saved = localStorage.getItem("NuestroOS");
            if (saved) db = JSON.parse(saved);
            else setDefaultData();
        }
    } catch(e) {
        const saved = localStorage.getItem("NuestroOS");
        if (saved) db = JSON.parse(saved);
        else setDefaultData();
    }
    applyBackground(db.settings.background);
}

function setDefaultData() {
    db.photos = [
        { url: "https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=300", type: "image", caption: "Atardecer juntos" },
        { url: "https://images.pexels.com/photos/1024967/pexels-photo-1024967.jpeg?auto=compress&cs=tinysrgb&w=300", type: "image", caption: "Nuestras risas" }
    ];
    db.songs = [
        { audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", coverUrl: "https://cdn.pixabay.com/photo/2016/03/31/18/36/music-1294886_960_720.png", title: "Melodía del encuentro", artist: "Corazón", dedication: "Para ti, mi amor" }
    ];
    db.timelineEvents = [
        { date: "14 Feb 2022", description: "Primera cita: café y risas infinitas.", photos: [] },
        { date: "10 Jun 2022", description: "Dijimos 'te amo' bajo las estrellas.", photos: [] }
    ];
    db.letters = [
        { title: "💌 Nuestro primer día", content: "Recuerdo cuando nos conocimos, el mundo se detuvo...", imageUrl: "" },
        { title: "🌹 Promesa eterna", content: "A tu lado aprendí que el amor no se busca, se construye.", imageUrl: "" }
    ];
    db.secrets = [
        { title: "Nuestro lugar secreto", body: "El parque de los suspiros.", imageUrl: "", audioUrl: "" }
    ];
    db.settings = { background: "https://images.unsplash.com/photo-1516589091380-5d8e9f6a8e5b?auto=format&fit=crop&w=1350&q=80" };
}

function applyBackground(bg) {
    const bgDiv = document.getElementById("desktop-bg");
    if(bg.startsWith('http') || bg.startsWith('data:') || bg.startsWith('linear-gradient')) {
        bgDiv.style.background = bg.includes('gradient') ? bg : `url(${bg})`;
        bgDiv.style.backgroundSize = "cover";
    } else {
        bgDiv.style.backgroundColor = bg;
    }
}

function saveData() {
    localStorage.setItem("NuestroOS", JSON.stringify(db));
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function exportConfig() {
    const dataStr = JSON.stringify(db, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nuestrosos-config.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Configuración exportada. Sube este archivo como 'nuestrosos-config.json' a tu repositorio.", "fa-download");
}

function showNotification(msg, icon = "fa-heart") {
    const area = document.getElementById("notification-area");
    const notif = document.createElement("div");
    notif.className = "notification";
    notif.innerHTML = `<i class="fas ${icon}"></i><span>${msg}</span>`;
    area.appendChild(notif);
    setTimeout(() => notif.classList.add("show"), 10);
    setTimeout(() => {
        notif.classList.remove("show");
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

function escapeHtml(str) { return String(str).replace(/[&<>]/g, function(m){if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }

// ========== VENTANAS ==========
function createWindow(id, title, icon, contentHTML, width = 650, height = 550) {
    const container = document.getElementById("windows-container");
    const win = document.createElement("div");
    win.className = "window";
    win.id = `win-${id}`;
    win.style.width = `${width}px`;
    win.style.height = `${height}px`;
    win.style.left = `${Math.max(50, window.innerWidth/2 - width/2)}px`;
    win.style.top = `${Math.max(50, window.innerHeight/2 - height/2)}px`;
    win.style.zIndex = nextZIndex++;
    win.innerHTML = `
        <div class="window-header">
            <div class="window-title"><i class="fas ${icon}"></i> ${title}</div>
            <div class="window-controls">
                <i class="fas fa-window-minimize" data-action="minimize"></i>
                <i class="fas fa-times" data-action="close"></i>
            </div>
        </div>
        <div class="window-content">${contentHTML}</div>
    `;
    container.appendChild(win);
    let dragging = false, offX, offY;
    const header = win.querySelector(".window-header");
    header.addEventListener("mousedown", (e) => {
        if(e.target.closest(".window-controls")) return;
        dragging = true;
        offX = e.clientX - win.offsetLeft;
        offY = e.clientY - win.offsetTop;
        win.style.zIndex = nextZIndex++;
        document.body.style.userSelect = "none";
    });
    window.addEventListener("mousemove", (e) => {
        if(!dragging) return;
        let left = e.clientX - offX;
        let top = e.clientY - offY;
        left = Math.min(window.innerWidth - win.offsetWidth - 10, Math.max(10, left));
        top = Math.min(window.innerHeight - 70, Math.max(10, top));
        win.style.left = `${left}px`;
        win.style.top = `${top}px`;
    });
    window.addEventListener("mouseup", () => { dragging = false; document.body.style.userSelect = ""; });
    win.querySelector("[data-action='minimize']").addEventListener("click", () => minimizeWindow(id, win));
    win.querySelector("[data-action='close']").addEventListener("click", () => closeWindow(id, win));
    windows.push({ id, win, title, icon, minimized: false });
    updateTaskbar();
    return win;
}

function minimizeWindow(id, winEl) { const w = windows.find(w=>w.id===id); if(w){ w.minimized=true; winEl.style.display="none"; updateTaskbar(); } }
function restoreWindow(id) { const w = windows.find(w=>w.id===id); if(w && w.minimized){ w.minimized=false; w.win.style.display="flex"; w.win.style.zIndex=nextZIndex++; updateTaskbar(); } }
function closeWindow(id, winEl) { 
    const idx = windows.findIndex(w=>w.id===id);
    if(idx!==-1){
        if(id==="music" && audioPlayer) { audioPlayer.pause(); audioPlayer=null; }
        windows[idx].win.remove();
        windows.splice(idx,1);
        updateTaskbar();
    }
}
function updateTaskbar() {
    const bar = document.getElementById("taskbar-apps");
    bar.innerHTML = "";
    windows.forEach(w => {
        const btn = document.createElement("div");
        btn.className = "taskbar-app";
        btn.innerHTML = `<i class="fas ${w.icon || 'fa-apps'}"></i><span>${w.title}</span>`;
        if(w.minimized) btn.style.opacity = "0.6";
        btn.addEventListener("click", () => {
            if(w.minimized) restoreWindow(w.id);
            else minimizeWindow(w.id, w.win);
        });
        bar.appendChild(btn);
    });
}

// ========== GALERÍA DE FOTOS Y VIDEOS (CON YOUTUBE Y DRIVE) ==========
// Función para generar enlace directo de Google Drive a partir de URL o ID
function generateDriveDirectUrl(input) {
    let fileId = null;
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /^([a-zA-Z0-9_-]+)$/
    ];
    for (let pattern of patterns) {
        let match = input.match(pattern);
        if (match) {
            fileId = match[1];
            break;
        }
    }
    if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
    return null;
}

function extractYoutubeId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ];
    for (let pattern of patterns) {
        let match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

function getYoutubeEmbedUrl(url) {
    let videoId = extractYoutubeId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
}

function renderPhotosApp() {
    const start = (currentPhotoPage-1)*PHOTOS_PER_PAGE;
    const paginated = db.photos.slice(start, start+PHOTOS_PER_PAGE);
    let html = `<div class="photo-grid" id="photo-grid">`;
    paginated.forEach((item, idx) => {
        const globalIdx = start+idx;
        let isYoutube = item.url && (item.url.includes('youtube.com') || item.url.includes('youtu.be'));
        let isDrive = item.url && item.url.includes('drive.google.com/thumbnail');
        let thumbnailUrl = "";
        if (isYoutube) {
            let videoId = extractYoutubeId(item.url);
            if (videoId) thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        } else if (isDrive) {
            thumbnailUrl = item.url; // ya es thumbnail de drive
        }
        html += `
            <div class="photo-item">
                ${item.type === "image" ? `<img src="${item.url}" class="photo-thumb" data-url="${item.url}" data-type="image">` : 
                  (isYoutube ? `<img src="${thumbnailUrl}" class="photo-thumb youtube-thumb" data-url="${item.url}" data-type="youtube" style="width:100%; height:130px; object-fit:cover; cursor:pointer;">` :
                  (isDrive ? `<img src="${thumbnailUrl}" class="photo-thumb drive-thumb" data-url="${item.url}" data-type="drive" style="width:100%; height:130px; object-fit:cover; cursor:pointer;">` :
                  `<video src="${item.url}" class="video-thumb" data-url="${item.url}" data-type="video" controls preload="none" style="width:100%; height:130px; object-fit:cover;"></video>`))}
                <div class="photo-caption">
                    <input type="text" value="${escapeHtml(item.caption)}" data-idx="${globalIdx}" class="caption-input" placeholder="Pie de foto">
                </div>
                <div class="photo-delete" data-idx="${globalIdx}"><i class="fas fa-trash"></i></div>
            </div>
        `;
    });
    html += `</div><div class="pagination"><button id="prevPage">◀</button><span>Página ${currentPhotoPage}</span><button id="nextPage">▶</button></div>
             <button id="uploadMediaBtn" class="upload-photo-btn"><i class="fas fa-plus"></i> Subir imagen (se guarda)</button>
             <button id="uploadVideoUrlBtn" class="upload-photo-btn"><i class="fas fa-link"></i> Agregar video por URL</button>
             <button id="uploadYoutubeBtn" class="upload-photo-btn"><i class="fab fa-youtube"></i> Agregar video de YouTube</button>
             <button id="uploadDriveBtn" class="upload-photo-btn"><i class="fab fa-google-drive"></i> Agregar desde Google Drive</button>
             <p><small>Imágenes se guardan. Videos: URL directa .mp4, YouTube (short/normal) o Google Drive (pega la URL compartida).</small></p>`;
    return html;
}

function attachPhotoEvents() {
    // Imágenes normales
    document.querySelectorAll(".photo-thumb").forEach(img => {
        img.addEventListener("click", (e) => {
            e.stopPropagation();
            let url = img.getAttribute("data-url");
            let type = img.getAttribute("data-type");
            if (type === "youtube") {
                let embedUrl = getYoutubeEmbedUrl(url);
                if (embedUrl) showLightbox(embedUrl, "youtube");
            } else if (type === "drive") {
                showLightbox(url, "image"); // drive ya es imagen directa
            } else {
                showLightbox(url, "image");
            }
        });
    });
    // Videos mp4
    document.querySelectorAll(".video-thumb").forEach(vid => {
        vid.addEventListener("click", (e) => {
            e.stopPropagation();
            showLightbox(vid.getAttribute("data-url"), "video");
        });
    });
    // Eliminar
    document.querySelectorAll(".photo-delete").forEach(el => {
        el.addEventListener("click", (e) => {
            const idx = parseInt(el.getAttribute("data-idx"));
            if(!isNaN(idx)) { db.photos.splice(idx,1); saveData(); refreshWindowContent("photos"); showNotification("Elemento eliminado"); }
        });
    });
    // Editar caption
    document.querySelectorAll(".caption-input").forEach(inp => {
        inp.addEventListener("change", (e) => {
            const idx = parseInt(inp.getAttribute("data-idx"));
            if(!isNaN(idx) && db.photos[idx]) { db.photos[idx].caption = inp.value; saveData(); }
        });
    });
    // Paginación
    document.getElementById("prevPage")?.addEventListener("click", () => { if(currentPhotoPage>1){ currentPhotoPage--; refreshWindowContent("photos"); } });
    document.getElementById("nextPage")?.addEventListener("click", () => { if(currentPhotoPage*PHOTOS_PER_PAGE < db.photos.length){ currentPhotoPage++; refreshWindowContent("photos"); } });
    // Subir imagen local
    document.getElementById("uploadMediaBtn")?.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if(file) {
                if(file.size > 2 * 1024 * 1024) {
                    showNotification("La imagen es muy grande (máx 2MB). Redúcela o usa un enlace externo.", "fa-exclamation");
                    return;
                }
                const base64 = await fileToBase64(file);
                db.photos.push({ url: base64, type: "image", caption: "Nuevo recuerdo" });
                saveData();
                refreshWindowContent("photos");
                showNotification("Imagen guardada permanentemente");
            }
        };
        input.click();
    });
    // Agregar video por URL directa
    document.getElementById("uploadVideoUrlBtn")?.addEventListener("click", () => {
        const url = prompt("Ingresa la URL pública del video (directa .mp4 o .mov):");
        if(url && (url.startsWith("http") || url.startsWith("https"))) {
            db.photos.push({ url: url, type: "video", caption: "Video externo" });
            saveData();
            refreshWindowContent("photos");
            showNotification("Video agregado");
        } else showNotification("URL no válida");
    });
    // Agregar video de YouTube
    document.getElementById("uploadYoutubeBtn")?.addEventListener("click", () => {
        const url = prompt("Ingresa el enlace de YouTube (normal o short):\nEjemplo: https://youtu.be/abc123 o https://www.youtube.com/shorts/abc123");
        if(url && (url.includes("youtube.com") || url.includes("youtu.be"))) {
            db.photos.push({ url: url, type: "youtube", caption: "Video de YouTube" });
            saveData();
            refreshWindowContent("photos");
            showNotification("Video de YouTube agregado. Se mostrará como miniatura.");
        } else showNotification("Enlace de YouTube no válido");
    });
    // Agregar desde Google Drive
    document.getElementById("uploadDriveBtn")?.addEventListener("click", () => {
        const driveUrl = prompt("Pega la URL de Google Drive o el FILE_ID:\nEjemplo: https://drive.google.com/file/d/ABC123/view");
        if(driveUrl) {
            const directUrl = generateDriveDirectUrl(driveUrl);
            if(directUrl) {
                db.photos.push({ url: directUrl, type: "image", caption: "Desde Google Drive" });
                saveData();
                refreshWindowContent("photos");
                showNotification("Imagen de Google Drive agregada exitosamente");
            } else {
                showNotification("No se pudo extraer el ID del archivo. Revisa el enlace.");
            }
        }
    });
}

function showLightbox(url, type) {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    if(type === "image") {
        modal.innerHTML = `<div class="modal"><img src="${url}" style="max-width:90vw; max-height:80vh; border-radius:20px;"><br><button onclick="this.closest('.modal-overlay').remove()">Cerrar</button></div>`;
    } else if(type === "video") {
        modal.innerHTML = `<div class="modal"><video controls autoplay style="max-width:90vw; max-height:80vh;"><source src="${url}" type="video/mp4">Tu navegador no soporta video.</video><br><button onclick="this.closest('.modal-overlay').remove()">Cerrar</button></div>`;
    } else if(type === "youtube") {
        modal.innerHTML = `<div class="modal"><iframe width="80vw" height="70vh" src="${url}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width:80vw; height:70vh; border-radius:20px;"></iframe><br><button onclick="this.closest('.modal-overlay').remove()">Cerrar</button></div>`;
    }
    document.body.appendChild(modal);
}

// ========== CARTAS CON IMAGEN ==========
function renderLettersApp() {
    if(!db.letters.length) return "<p>No hay cartas. Agrega una.</p>";
    const letter = db.letters[currentLetterIndex];
    return `
        <div class="letter-card">
            ${letter.imageUrl ? `<img src="${letter.imageUrl}" style="max-width:100%; border-radius:20px; margin-bottom:15px;">` : ""}
            <div class="letter-title">${escapeHtml(letter.title)}</div>
            <div class="letter-text">${escapeHtml(letter.content)}</div>
            <div class="letter-nav">
                <button id="prevLetterBtn"><i class="fas fa-arrow-left"></i> Anterior</button>
                <button id="nextLetterBtn">Siguiente <i class="fas fa-arrow-right"></i></button>
            </div>
            <div style="margin-top:20px;"><button id="editLettersBtn" style="background:#ff6b8b;">✏️ Editar cartas</button></div>
        </div>
    `;
}

function attachLetterEvents() {
    document.getElementById("prevLetterBtn")?.addEventListener("click", () => { if(db.letters.length) currentLetterIndex = (currentLetterIndex-1+db.letters.length)%db.letters.length; refreshWindowContent("letters"); });
    document.getElementById("nextLetterBtn")?.addEventListener("click", () => { if(db.letters.length) currentLetterIndex = (currentLetterIndex+1)%db.letters.length; refreshWindowContent("letters"); });
    document.getElementById("editLettersBtn")?.addEventListener("click", () => openLetterEditor());
}

function openLetterEditor() {
    let editorHtml = `<h3>Editar cartas (incluye imagen)</h3><div id="letters-list">`;
    db.letters.forEach((l, idx) => {
        editorHtml += `<div style="margin-bottom:15px; border-bottom:1px solid #fff3;">
            <input value="${escapeHtml(l.title)}" placeholder="Título" id="letter-title-${idx}"><br>
            <textarea id="letter-content-${idx}" rows="3">${escapeHtml(l.content)}</textarea><br>
            <label>Imagen de la carta (URL o subir):</label>
            <input type="text" id="letter-img-url-${idx}" placeholder="URL imagen" value="${escapeHtml(l.imageUrl)}" style="width:70%;">
            <input type="file" id="letter-img-file-${idx}" accept="image/*" style="display:inline;">
            <button onclick="updateLetterWithImage(${idx})">Guardar imagen</button><br>
            <button onclick="updateLetter(${idx})">Guardar todo</button>
            <button onclick="deleteLetter(${idx})">Eliminar carta</button>
        </div>`;
    });
    editorHtml += `</div><button onclick="addNewLetter()">➕ Nueva carta</button><button onclick="closeModal()">Cerrar</button>`;
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `<div class="modal">${editorHtml}</div>`;
    document.body.appendChild(modal);
    window.updateLetter = (idx) => {
        const newTitle = document.getElementById(`letter-title-${idx}`).value;
        const newContent = document.getElementById(`letter-content-${idx}`).value;
        const imgUrl = document.getElementById(`letter-img-url-${idx}`).value;
        db.letters[idx] = { title: newTitle, content: newContent, imageUrl: imgUrl };
        saveData();
        refreshWindowContent("letters");
        showNotification("Carta actualizada");
    };
    window.updateLetterWithImage = async (idx) => {
        const fileInput = document.getElementById(`letter-img-file-${idx}`);
        if(fileInput.files.length) {
            const file = fileInput.files[0];
            if(file.size <= 2*1024*1024) {
                const base64 = await fileToBase64(file);
                document.getElementById(`letter-img-url-${idx}`).value = base64;
                showNotification("Imagen convertida y lista para guardar");
            } else showNotification("La imagen es muy grande (máx 2MB)");
        }
    };
    window.deleteLetter = (idx) => {
        db.letters.splice(idx,1);
        if(currentLetterIndex >= db.letters.length && db.letters.length) currentLetterIndex = db.letters.length-1;
        saveData();
        refreshWindowContent("letters");
        closeModal();
        openLetterEditor();
    };
    window.addNewLetter = () => {
        db.letters.push({ title: "Nueva carta", content: "Escribe aquí...", imageUrl: "" });
        saveData();
        closeModal();
        openLetterEditor();
    };
    window.closeModal = () => modal.remove();
}

// ========== MÚSICA ==========
function renderMusicApp() {
    let songsHtml = `<div class="music-player-bar">
        <div class="player-controls">
            <button id="playPauseBtn"><i class="fas fa-play"></i></button>
            <button id="prevSongBtn"><i class="fas fa-backward"></i></button>
            <button id="nextSongBtn"><i class="fas fa-forward"></i></button>
        </div>
        <div id="nowPlayingInfo">Ninguna canción</div>
    </div>
    <div class="song-list" id="songList">`;
    db.songs.forEach((s, idx) => {
        songsHtml += `
            <div class="song-item" data-idx="${idx}">
                <img class="song-cover" src="${s.coverUrl}" onerror="this.src='https://cdn.pixabay.com/photo/2016/03/31/18/36/music-1294886_960_720.png'">
                <div class="song-info">
                    <div class="song-title">${escapeHtml(s.title)}</div>
                    <div class="song-artist">${escapeHtml(s.artist)}</div>
                    <div class="song-dedication">💬 ${escapeHtml(s.dedication)}</div>
                </div>
                <i class="fas fa-play-circle song-play" style="font-size:1.5rem; cursor:pointer;"></i>
                <i class="fas fa-trash song-delete" style="color:#ff6b8b; cursor:pointer;"></i>
            </div>
        `;
    });
    songsHtml += `</div>
    <div class="add-song-form">
        <h4>➕ Agregar canción</h4>
        <input type="text" id="newSongTitle" placeholder="Título">
        <input type="text" id="newSongArtist" placeholder="Artista">
        <textarea id="newSongDedication" placeholder="Dedicación"></textarea>
        <p>Audio: <input type="file" id="newSongAudio" accept="audio/*"> (máx 2MB para guardar permanentemente)</p>
        <p>O URL de audio: <input type="text" id="newSongAudioUrl" placeholder="https://... .mp3"></p>
        <label>Carátula: <input type="file" id="newSongCover" accept="image/*"></label>
        <button id="addSongBtn">Agregar</button>
    </div>`;
    return songsHtml;
}

function attachMusicEvents() {
    document.querySelectorAll(".song-play").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = btn.closest(".song-item").getAttribute("data-idx");
            if(idx !== null) playSong(parseInt(idx));
        });
    });
    document.querySelectorAll(".song-delete").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = btn.closest(".song-item").getAttribute("data-idx");
            if(idx !== null) {
                db.songs.splice(parseInt(idx),1);
                if(currentSongIndex >= db.songs.length) currentSongIndex = 0;
                saveData();
                refreshWindowContent("music");
                if(audioPlayer) { audioPlayer.pause(); audioPlayer = null; }
                showNotification("Canción eliminada");
            }
        });
    });
    document.getElementById("playPauseBtn")?.addEventListener("click", () => {
        if(audioPlayer) {
            if(audioPlayer.paused) audioPlayer.play();
            else audioPlayer.pause();
            updatePlayPauseIcon();
        }
    });
    document.getElementById("prevSongBtn")?.addEventListener("click", () => {
        if(db.songs.length) { currentSongIndex = (currentSongIndex-1+db.songs.length)%db.songs.length; playSong(currentSongIndex); }
    });
    document.getElementById("nextSongBtn")?.addEventListener("click", () => {
        if(db.songs.length) { currentSongIndex = (currentSongIndex+1)%db.songs.length; playSong(currentSongIndex); }
    });
    document.getElementById("addSongBtn")?.addEventListener("click", async () => {
        const title = document.getElementById("newSongTitle").value.trim();
        const artist = document.getElementById("newSongArtist").value.trim() || "Anónimo";
        const dedication = document.getElementById("newSongDedication").value.trim() || "❤️";
        let audioUrl = document.getElementById("newSongAudioUrl").value.trim();
        const audioFile = document.getElementById("newSongAudio").files[0];
        const coverFile = document.getElementById("newSongCover").files[0];
        if(!audioFile && !audioUrl) { showNotification("Selecciona audio o URL"); return; }
        if(audioFile) {
            if(audioFile.size > 2 * 1024 * 1024) {
                showNotification("Audio muy grande (>2MB). Usa URL externa.");
                return;
            }
            audioUrl = await fileToBase64(audioFile);
        }
        let coverUrl = "https://cdn.pixabay.com/photo/2016/03/31/18/36/music-1294886_960_720.png";
        if(coverFile) coverUrl = await fileToBase64(coverFile);
        db.songs.push({ audioUrl, coverUrl, title, artist, dedication });
        saveData();
        refreshWindowContent("music");
        showNotification("Canción agregada");
    });
}

function playSong(idx) {
    if(!db.songs[idx]) return;
    if(audioPlayer) audioPlayer.pause();
    audioPlayer = new Audio(db.songs[idx].audioUrl);
    audioPlayer.play();
    currentSongIndex = idx;
    document.getElementById("nowPlayingInfo").innerHTML = `🎵 ${db.songs[idx].title} - ${db.songs[idx].artist}<br>💬 "${db.songs[idx].dedication}"`;
    updatePlayPauseIcon();
    audioPlayer.onended = () => { document.getElementById("nowPlayingInfo").innerHTML = "Canción finalizada"; };
}
function updatePlayPauseIcon() { const btn = document.getElementById("playPauseBtn"); if(btn && audioPlayer) btn.innerHTML = audioPlayer.paused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>'; }

// ========== LÍNEA DEL TIEMPO ==========
function renderTimelineApp() {
    let html = `<div class="timeline-container">`;
    db.timelineEvents.forEach((ev, idx) => {
        html += `
            <div class="timeline-event" data-idx="${idx}" data-full="${escapeHtml(ev.description)}">
                <div class="timeline-dot"></div>
                <div class="timeline-date">${escapeHtml(ev.date)}</div>
                <div class="timeline-preview">${escapeHtml(ev.description.substring(0,80))}...</div>
                <div class="event-detail" id="detail-${idx}" style="display:none;">
                    <p>${escapeHtml(ev.description)}</p>
                    <div class="timeline-photos" id="timeline-photos-${idx}"></div>
                    <button class="edit-event-btn" data-idx="${idx}">Editar evento</button>
                </div>
            </div>
        `;
    });
    html += `</div><button id="addTimelineEventBtn" style="margin-top:15px;">➕ Añadir evento</button>`;
    return html;
}

function attachTimelineEvents() {
    let tooltipDiv = null;
    document.querySelectorAll(".timeline-event").forEach(ev => {
        ev.addEventListener("mouseenter", (e) => {
            const fullText = ev.getAttribute("data-full");
            if(!tooltipDiv) { tooltipDiv = document.createElement("div"); tooltipDiv.className = "tooltip"; document.body.appendChild(tooltipDiv); }
            tooltipDiv.innerHTML = fullText;
            tooltipDiv.style.left = (e.pageX+15)+"px";
            tooltipDiv.style.top = (e.pageY+15)+"px";
            tooltipDiv.style.display = "block";
        });
        ev.addEventListener("mousemove", (e) => { if(tooltipDiv) { tooltipDiv.style.left = (e.pageX+15)+"px"; tooltipDiv.style.top = (e.pageY+15)+"px"; } });
        ev.addEventListener("mouseleave", () => { if(tooltipDiv) tooltipDiv.style.display = "none"; });
        ev.addEventListener("click", (e) => {
            const idx = ev.getAttribute("data-idx");
            const detail = document.getElementById(`detail-${idx}`);
            if(detail) {
                if(detail.style.display === "none") {
                    detail.style.display = "block";
                    const photosDiv = document.getElementById(`timeline-photos-${idx}`);
                    if(photosDiv) {
                        photosDiv.innerHTML = "";
                        (db.timelineEvents[idx].photos || []).forEach(purl => {
                            const img = document.createElement("img");
                            img.src = purl;
                            img.style.width = "60px"; img.style.height="60px"; img.style.objectFit="cover"; img.style.borderRadius="12px";
                            photosDiv.appendChild(img);
                        });
                    }
                } else detail.style.display = "none";
            }
        });
    });
    document.querySelectorAll(".edit-event-btn").forEach(btn => {
        btn.addEventListener("click", (e) => { const idx = btn.getAttribute("data-idx"); openEventEditor(parseInt(idx)); });
    });
    document.getElementById("addTimelineEventBtn")?.addEventListener("click", () => openEventEditor(null));
}

function openEventEditor(eventIdx) {
    const isNew = eventIdx === null;
    const ev = isNew ? { date: "Fecha", description: "", photos: [] } : db.timelineEvents[eventIdx];
    let photosHtml = "";
    (ev.photos || []).forEach((purl, i) => {
        photosHtml += `<div><img src="${purl}" width="50"> <button onclick="removeEventPhoto(${eventIdx}, ${i})">Eliminar</button></div>`;
    });
    const modalHtml = `<div class="modal"><h3>${isNew ? "Nuevo evento" : "Editar evento"}</h3>
        <input type="text" id="eventDate" value="${escapeHtml(ev.date)}" placeholder="Fecha">
        <textarea id="eventDesc" rows="4">${escapeHtml(ev.description)}</textarea>
        <div>Fotos asociadas:</div><div id="eventPhotosList">${photosHtml}</div>
        <button id="selectPhotoFromGallery">➕ Seleccionar foto de galería</button>
        <button id="saveEventBtn">Guardar</button><button onclick="closeModal()">Cancelar</button>
    </div>`;
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = modalHtml;
    document.body.appendChild(modal);
    window.closeModal = () => modal.remove();
    window.removeEventPhoto = (evIdx, photoIdx) => {
        if(evIdx !== null && db.timelineEvents[evIdx]) { db.timelineEvents[evIdx].photos.splice(photoIdx,1); saveData(); refreshWindowContent("timeline"); closeModal(); }
    };
    document.getElementById("selectPhotoFromGallery")?.addEventListener("click", () => {
        const galleryModal = document.createElement("div");
        galleryModal.className = "modal-overlay";
        let galleryHtml = `<div class="modal"><h3>Selecciona una foto</h3><div style="display:flex; flex-wrap:wrap; gap:10px;">`;
        db.photos.forEach((p, idx) => { galleryHtml += `<div><img src="${p.url}" style="width:80px; height:80px; object-fit:cover; cursor:pointer;" data-url="${p.url}"></div>`; });
        galleryHtml += `</div><button onclick="this.closest('.modal-overlay').remove()">Cerrar</button></div>`;
        galleryModal.innerHTML = galleryHtml;
        document.body.appendChild(galleryModal);
        galleryModal.querySelectorAll("img[data-url]").forEach(img => {
            img.addEventListener("click", () => {
                const selectedUrl = img.getAttribute("data-url");
                if(isNew) { if(!window.tempNewPhotos) window.tempNewPhotos = []; window.tempNewPhotos.push(selectedUrl); }
                else { if(!db.timelineEvents[eventIdx].photos) db.timelineEvents[eventIdx].photos = []; db.timelineEvents[eventIdx].photos.push(selectedUrl); saveData(); }
                galleryModal.remove(); closeModal(); openEventEditor(eventIdx);
            });
        });
    });
    document.getElementById("saveEventBtn")?.addEventListener("click", () => {
        const newDate = document.getElementById("eventDate").value;
        const newDesc = document.getElementById("eventDesc").value;
        if(isNew) { db.timelineEvents.push({ date: newDate, description: newDesc, photos: window.tempNewPhotos || [] }); delete window.tempNewPhotos; }
        else { db.timelineEvents[eventIdx].date = newDate; db.timelineEvents[eventIdx].description = newDesc; }
        saveData(); refreshWindowContent("timeline"); closeModal();
    });
}

// ========== CONSTELACIÓN ==========
function renderConstellationApp() {
    return `<div class="constellation-area">
        <canvas id="constellationCanvas" width="500" height="300" style="width:100%; height:250px; background:#000; border-radius:20px;"></canvas>
        <button id="uploadConstellationPhoto"><i class="fas fa-upload"></i> Subir foto para la constelación</button>
        <div id="constellationPhotoContainer"></div>
        <p>La imagen se convierte en una estrella rodeada de partículas.</p>
    </div>`;
}

function attachConstellationEvents() {
    const canvas = document.getElementById("constellationCanvas");
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    let width = canvas.clientWidth, height = canvas.clientHeight;
    canvas.width = width; canvas.height = height;
    function initParticles() { constellationParticles = []; for(let i=0;i<80;i++) { constellationParticles.push({ x: Math.random()*width, y: Math.random()*height, vx: (Math.random()-0.5)*1, vy: (Math.random()-0.5)*1 }); } }
    initParticles();
    function draw() {
        if(!ctx) return;
        ctx.clearRect(0,0,width,height);
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(0,0,width,height);
        if(constellationPhotoUrl) {
            const img = new Image();
            img.onload = () => { ctx.drawImage(img, width/2-50, height/2-50, 100, 100); };
            img.src = constellationPhotoUrl;
        }
        for(let p of constellationParticles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI*2);
            ctx.fillStyle = "#ffb7c5";
            ctx.fill();
            p.x += p.vx; p.y += p.vy;
            if(p.x<0||p.x>width) p.vx*=-1;
            if(p.y<0||p.y>height) p.vy*=-1;
        }
        constellationAnimId = requestAnimationFrame(draw);
    }
    if(constellationAnimId) cancelAnimationFrame(constellationAnimId);
    draw();
    window.addEventListener("resize", () => { if(canvas) { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; initParticles(); } });
    document.getElementById("uploadConstellationPhoto")?.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async (e) => {
            if(e.target.files[0]) {
                const file = e.target.files[0];
                if(file.size <= 2*1024*1024) {
                    constellationPhotoUrl = await fileToBase64(file);
                    showNotification("Foto cargada en la constelación");
                } else showNotification("Imagen muy grande, máx 2MB");
            }
        };
        input.click();
    });
}

// ========== SECRETOS ==========
function renderSecretsApp() {
    let html = `<div class="secret-area"><p>🔐 Introduce la contraseña para gestionar secretos:</p>
    <div class="secret-input"><input type="password" id="secret-password" placeholder="Contraseña"><button id="unlock-secret">Desbloquear</button></div>
    <div id="secrets-manager" style="display:none;">`;
    db.secrets.forEach((sec, idx) => {
        html += `<div class="secret-card"><h4>${escapeHtml(sec.title)}</h4><p>${escapeHtml(sec.body)}</p>
        ${sec.imageUrl ? `<img src="${sec.imageUrl}" style="max-width:100%; border-radius:16px;">` : ""}
        ${sec.audioUrl ? `<audio controls src="${sec.audioUrl}" class="secret-audio"></audio>` : ""}
        <div><button onclick="editSecret(${idx})">✏️ Editar</button> <button onclick="deleteSecret(${idx})">🗑️ Eliminar</button></div></div>`;
    });
    html += `<button id="addSecretBtn" class="add-secret-btn">➕ Añadir secreto</button></div></div>`;
    return html;
}
function attachSecretsEvents() {
    document.getElementById("unlock-secret")?.addEventListener("click", () => {
        const pass = document.getElementById("secret-password").value;
        if(pass === "amor143" || pass === "143" || pass === "teamo") { document.getElementById("secrets-manager").style.display = "block"; showNotification("Acceso concedido"); }
        else showNotification("Contraseña incorrecta");
    });
    document.getElementById("addSecretBtn")?.addEventListener("click", () => openSecretEditor(null));
    window.editSecret = (idx) => openSecretEditor(idx);
    window.deleteSecret = (idx) => { db.secrets.splice(idx,1); saveData(); refreshWindowContent("secrets"); };
}
function openSecretEditor(idx) {
    const isNew = idx === null;
    const sec = isNew ? { title: "", body: "", imageUrl: "", audioUrl: "" } : db.secrets[idx];
    const modalHtml = `<div class="modal"><h3>${isNew ? "Nuevo secreto" : "Editar secreto"}</h3>
        <input type="text" id="secTitle" value="${escapeHtml(sec.title)}" placeholder="Título">
        <textarea id="secBody" rows="4">${escapeHtml(sec.body)}</textarea>
        <label>Imagen: <input type="file" id="secImage" accept="image/*"></label>
        <label>Canción de fondo: <input type="file" id="secAudio" accept="audio/*"></label>
        <button id="saveSecretBtn">Guardar</button><button onclick="closeModal()">Cancelar</button>
    </div>`;
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = modalHtml;
    document.body.appendChild(modal);
    document.getElementById("saveSecretBtn").onclick = async () => {
        const title = document.getElementById("secTitle").value;
        const body = document.getElementById("secBody").value;
        let imageUrl = sec.imageUrl, audioUrl = sec.audioUrl;
        const imgFile = document.getElementById("secImage").files[0];
        const audFile = document.getElementById("secAudio").files[0];
        if(imgFile) {
            if(imgFile.size <= 2*1024*1024) imageUrl = await fileToBase64(imgFile);
            else showNotification("Imagen muy grande, máx 2MB");
        }
        if(audFile) {
            if(audFile.size <= 2*1024*1024) audioUrl = await fileToBase64(audFile);
            else showNotification("Audio muy grande, usa URL externa");
        }
        const newSec = { title, body, imageUrl, audioUrl };
        if(isNew) db.secrets.push(newSec);
        else db.secrets[idx] = newSec;
        saveData(); refreshWindowContent("secrets"); modal.remove();
    };
    window.closeModal = () => modal.remove();
}

// ========== CONFIGURACIÓN ==========
function renderSettingsApp() {
    return `
        <div class="config-section">
            <h3>Personalizar fondo del escritorio</h3>
            <label>Color sólido: <input type="color" id="bgColor" value="#1a1a2e"></label>
            <label>Imagen (subir y guardar): <input type="file" id="bgImageUpload" accept="image/*"></label>
            <button id="applyBgBtn">Aplicar y guardar fondo</button>
            <p>O usa una URL de imagen:</p>
            <input type="text" id="bgUrl" placeholder="https://...">
            <button id="applyUrlBtn">Usar URL</button>
            <div class="export-import-buttons">
                <button id="exportConfigBtn" class="btn-secondary"><i class="fas fa-download"></i> Exportar mi configuración</button>
                <button id="resetDataBtn" class="btn-secondary" style="background:#a55;"><i class="fas fa-trash"></i> Reiniciar todos los datos</button>
            </div>
            <p><small>Exporta un JSON con todas tus personalizaciones. Súbelo como 'nuestrosos-config.json' a tu repositorio.</small></p>
        </div>
    `;
}

function attachSettingsEvents() {
    document.getElementById("applyBgBtn")?.addEventListener("click", async () => {
        const color = document.getElementById("bgColor").value;
        const imgFile = document.getElementById("bgImageUpload").files[0];
        let bgValue = "";
        if(imgFile) {
            if(imgFile.size > 2*1024*1024) showNotification("Imagen muy grande, usa URL externa");
            else {
                const base64 = await fileToBase64(imgFile);
                bgValue = `url(${base64})`;
            }
        } else {
            bgValue = color;
        }
        if(bgValue) {
            applyBackground(bgValue);
            db.settings.background = bgValue;
            saveData();
            showNotification("Fondo guardado permanentemente");
        }
    });
    document.getElementById("applyUrlBtn")?.addEventListener("click", () => {
        const url = document.getElementById("bgUrl").value;
        if(url) {
            applyBackground(url);
            db.settings.background = url;
            saveData();
            showNotification("Fondo URL guardado");
        }
    });
    document.getElementById("exportConfigBtn")?.addEventListener("click", () => exportConfig());
    document.getElementById("resetDataBtn")?.addEventListener("click", () => {
        if(confirm("¿Borrar todos tus datos personalizados? Esta acción no se puede deshacer.")) {
            localStorage.removeItem("NuestroOS");
            setDefaultData();
            saveData();
            location.reload();
        }
    });
}

// ========== REFRESCAR VENTANAS Y ABRIR APPS ==========
function refreshWindowContent(appId) {
    const win = windows.find(w => w.id === appId);
    if(win && !win.minimized) {
        let content = "";
        switch(appId) {
            case "photos": content = renderPhotosApp(); break;
            case "letters": content = renderLettersApp(); break;
            case "music": content = renderMusicApp(); break;
            case "timeline": content = renderTimelineApp(); break;
            case "constellation": content = renderConstellationApp(); break;
            case "secrets": content = renderSecretsApp(); break;
            case "settings": content = renderSettingsApp(); break;
        }
        win.win.querySelector(".window-content").innerHTML = content;
        if(appId === "photos") attachPhotoEvents();
        if(appId === "letters") attachLetterEvents();
        if(appId === "music") attachMusicEvents();
        if(appId === "timeline") attachTimelineEvents();
        if(appId === "constellation") attachConstellationEvents();
        if(appId === "secrets") attachSecretsEvents();
        if(appId === "settings") attachSettingsEvents();
    }
}

function openApp(appId) {
    if(windows.some(w=>w.id===appId)) { showNotification(`${appId} ya está abierta`); return; }
    let content = "", icon = "fa-apps", width = 650, height = 550;
    switch(appId){
        case "photos": content = renderPhotosApp(); icon="fa-images"; break;
        case "letters": content = renderLettersApp(); icon="fa-envelope"; break;
        case "music": content = renderMusicApp(); icon="fa-headphones"; break;
        case "timeline": content = renderTimelineApp(); icon="fa-chart-line"; break;
        case "constellation": content = renderConstellationApp(); icon="fa-star-of-life"; break;
        case "secrets": content = renderSecretsApp(); icon="fa-lock"; break;
        case "settings": content = renderSettingsApp(); icon="fa-cog"; break;
        default: return;
    }
    const win = createWindow(appId, appId.charAt(0).toUpperCase()+appId.slice(1), icon, content, width, height);
    setTimeout(() => {
        if(appId === "photos") attachPhotoEvents();
        if(appId === "letters") attachLetterEvents();
        if(appId === "music") attachMusicEvents();
        if(appId === "timeline") attachTimelineEvents();
        if(appId === "constellation") attachConstellationEvents();
        if(appId === "secrets") attachSecretsEvents();
        if(appId === "settings") attachSettingsEvents();
    }, 50);
}

// ========== INICIALIZACIÓN ==========
document.addEventListener("DOMContentLoaded", async () => {
    await loadData();
    let percent = 0;
    const loaderInterval = setInterval(() => {
        percent += Math.floor(Math.random()*15)+1;
        if(percent>=100){
            percent=100;
            clearInterval(loaderInterval);
            setTimeout(()=>{
                document.getElementById("splash-screen").style.opacity="0";
                setTimeout(()=>{
                    document.getElementById("splash-screen").style.display="none";
                    document.getElementById("desktop").style.display="block";
                    document.getElementById("taskbar").style.display="flex";
                    showNotification("Bienvenido a NuestroOS");
                },800);
            },400);
        }
        document.getElementById("loading-percent").innerText=percent;
        document.querySelector(".loader-bar").style.width=percent+"%";
    },80);
    document.querySelectorAll(".desktop-icon").forEach(icon => {
        const app = icon.getAttribute("data-app");
        if(app) icon.addEventListener("click", ()=>openApp(app));
    });
    document.getElementById("start-button").addEventListener("click", ()=>openApp("settings"));
    setInterval(() => {
        const clock = document.getElementById("clock");
        if(clock) clock.innerText = new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    },1000);
});