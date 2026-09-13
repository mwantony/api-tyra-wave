const express = require('express');
const { spawn } = require('child_process');
const ffmpeg = require('@ffmpeg-installer/ffmpeg');
const ffprobe = require('@ffprobe-installer/ffprobe');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

const ytDlpPath = path.join(__dirname, 'yt-dlp.exe');
const downloadsDir = path.join(__dirname, 'temp_downloads');

if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

// Extrai a pasta onde o ffmpeg.exe está instalado
const ffmpegDir = path.dirname(ffmpeg.path);

// Copia o ffprobe.exe para a mesma pasta do ffmpeg.exe (se ainda não estiver lá)
// Isso garante que o yt-dlp encontre os 2 executáveis no mesmo diretório
const ffprobeSource = ffprobe.path;
const ffprobeDestination = path.join(ffmpegDir, 'ffprobe.exe');

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

    if (!fs.existsSync(ytDlpPath)) {
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
        '--ffmpeg-location', ffmpegDir, // Pasta contendo ffmpeg.exe e ffprobe.exe
        '-o', outputTemplate,
        '--no-playlist',
        '--no-part',
        '--force-overwrites'
    ];

    const child = spawn(ytDlpPath, args);

    child.stderr.on('data', (data) => {
        console.log(`[yt-dlp]: ${data.toString()}`);
    });

    child.on('close', (code) => {
        if (code === 0 && fs.existsSync(finalMp3Path)) {
            console.log(`[SUCESSO] Download e conversão concluídos: ${finalMp3Path}`);
            res.download(finalMp3Path, `musica-${videoId}.mp3`, () => {
                fs.unlink(finalMp3Path, (err) => {
                    if (err) console.error('Erro ao deletar temporário:', err);
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
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});