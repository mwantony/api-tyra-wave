const express = require('express');
const { spawn } = require('child_process');
const ffmpeg = require('@ffmpeg-installer/ffmpeg');
const ffprobe = require('@ffprobe-installer/ffprobe');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
// Usa a porta atribuída pelo serviço de hospedagem (ex: Render) ou a porta 3000 localmente
const PORT = process.env.PORT || 3000;

// Configuração do CORS para permitir chamadas do seu site na Vercel
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const ytDlpPath = path.join(__dirname, 'yt-dlp.exe');
const downloadsDir = path.join(__dirname, 'temp_downloads');

if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

// Extrai a pasta onde o ffmpeg.exe está instalado
const ffmpegDir = path.dirname(ffmpeg.path);

// Copia o ffprobe para a mesma pasta do ffmpeg (se necessário)
const ffprobeSource = ffprobe.path;
const ffprobeDestination = path.join(ffmpegDir, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');

if (!fs.existsSync(ffprobeDestination) && fs.existsSync(ffprobeSource)) {
    try {
        fs.copyFileSync(ffprobeSource, ffprobeDestination);
    } catch (err) {
        console.error('Erro ao copiar ffprobe:', err.message);
    }
}

function extractVideoId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    return match ? match[1] : null;
}

app.get('/download', (req, res) => {
    const rawUrl = req.query.url;
    const videoId = extractVideoId(rawUrl);

    if (!videoId) {
        return res.status(400).json({ error: 'URL do YouTube inválida.' });
    }

    // Detecta se está rodando no Windows ou no Linux (Render)
    const isWindows = process.platform === 'win32';
    const currentYtDlpPath = isWindows ? ytDlpPath : 'yt-dlp';

    if (isWindows && !fs.existsSync(ytDlpPath)) {
        return res.status(500).json({ error: 'O arquivo yt-dlp.exe não foi encontrado na raiz do projeto!' });
    }

    const timestamp = Date.now();
    const outputTemplate = path.join(downloadsDir, `${videoId}_${timestamp}.%(ext)s`);
    const finalMp3Path = path.join(downloadsDir, `${videoId}_${timestamp}.mp3`);

    console.log(`[INFO] Iniciando download do vídeo: ${videoId}`);

    const args = [
        `https://www.youtube.com/watch?v=${videoId}`,
        '--js-runtimes', 'node',
        '-x',
        '--audio-format', 'mp3',
        '--ffmpeg-location', ffmpegDir,
        '-o', outputTemplate,
        '--no-playlist',
        '--no-part',
        '--force-overwrites'
    ];

    const child = spawn(currentYtDlpPath, args);

    child.stderr.on('data', (data) => {
        console.log(`[yt-dlp]: ${data.toString()}`);
    });

    child.on('close', (code) => {
        if (code === 0 && fs.existsSync(finalMp3Path)) {
            console.log(`[SUCESSO] Download e conversão concluídos: ${finalMp3Path}`);
            res.download(finalMp3Path, `musica-${videoId}.mp3`, () => {
                fs.unlink(finalMp3Path, (err) => {
                    if (err) console.error('Erro ao deletar arquivo temporário:', err);
                });
            });
        } else {
            console.error(`[ERRO] Processo do yt-dlp encerrou com código: ${code}`);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Falha ao converter ou baixar o áudio do vídeo.' });
            }
        }
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});