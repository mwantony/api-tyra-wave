const express = require('express');
const { spawn } = require('child_process');
const ffmpeg = require('@ffmpeg-installer/ffmpeg');
const ffprobe = require('@ffprobe-installer/ffprobe');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { ensureBinaries, binaryPath } = require('./setup-binaries');

const app = express();
// Usa a porta atribuída pelo serviço de hospedagem (ex: Render) ou a porta 3000 localmente
const PORT = process.env.PORT || 3000;

// Configuração do CORS para permitir chamadas do seu site na Vercel
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

const downloadsDir = path.join(__dirname, 'temp_downloads');

if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

// Extrai a pasta onde o ffmpeg está instalado
const ffmpegDir = path.dirname(ffmpeg.path);

// Garante permissão de execução para o ffmpeg no Linux
if (process.platform !== 'win32' && fs.existsSync(ffmpeg.path)) {
    try {
        fs.chmodSync(ffmpeg.path, 0o755);
    } catch (err) {
        console.warn('Aviso ao ajustar permissão do ffmpeg:', err.message);
    }
}

// Copia o ffprobe para a mesma pasta do ffmpeg (se necessário)
const ffprobeSource = ffprobe.path;
const ffprobeDestination = path.join(ffmpegDir, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');

if (!fs.existsSync(ffprobeDestination) && fs.existsSync(ffprobeSource)) {
    try {
        fs.copyFileSync(ffprobeSource, ffprobeDestination);
        if (process.platform !== 'win32') {
            fs.chmodSync(ffprobeDestination, 0o755);
        }
    } catch (err) {
        console.error('Erro ao copiar ffprobe:', err.message);
    }
}

function extractVideoId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    return match ? match[1] : null;
}

const cookiesPath = path.join(__dirname, 'cookies.txt');

function getActiveCookiesPath() {
    if (process.env.YOUTUBE_COOKIES && process.env.YOUTUBE_COOKIES.trim().length > 10) {
        try {
            fs.writeFileSync(cookiesPath, process.env.YOUTUBE_COOKIES.trim(), 'utf-8');
            return cookiesPath;
        } catch (err) {
            console.error('[ERRO] Falha ao gravar cookies a partir de YOUTUBE_COOKIES:', err.message);
        }
    }
    if (fs.existsSync(cookiesPath) && fs.statSync(cookiesPath).size > 10) {
        return cookiesPath;
    }
    return null;
}

app.get('/', (req, res) => {
    const hasCookies = !!getActiveCookiesPath();
    res.json({
        status: 'online',
        service: 'api-tyra-wave',
        platform: process.platform,
        ytDlpReady: fs.existsSync(binaryPath),
        cookiesConfigured: hasCookies
    });
});

app.get('/download', async (req, res) => {
    const rawUrl = req.query.url;
    const videoId = extractVideoId(rawUrl);

    if (!videoId) {
        return res.status(400).json({ error: 'URL do YouTube inválida.' });
    }

    // Garante que o binário adequado (Windows ou Linux) esteja presente e executável
    try {
        await ensureBinaries();
    } catch (err) {
        return res.status(500).json({ error: 'Binário yt-dlp não disponível no servidor: ' + err.message });
    }

    const currentYtDlpPath = fs.existsSync(binaryPath) ? binaryPath : (process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

    const timestamp = Date.now();
    const outputTemplate = path.join(downloadsDir, `${videoId}_${timestamp}.%(ext)s`);
    const finalMp3Path = path.join(downloadsDir, `${videoId}_${timestamp}.mp3`);

    console.log(`[INFO] Iniciando download do vídeo: ${videoId} com executável: ${currentYtDlpPath}`);

    const activeCookies = getActiveCookiesPath();
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

    if (activeCookies) {
        console.log(`[INFO] Usando arquivo de cookies do YouTube.`);
        args.push('--cookies', activeCookies);
    } else {
        // Tenta clientes alternativos para mitigar bloqueios em IPs de datacenter
        args.push('--extractor-args', 'youtube:player_client=android,web');
    }

    const child = spawn(currentYtDlpPath, args);

    // Evita crash de Unhandled 'error' event caso o spawn falhe
    child.on('error', (err) => {
        console.error(`[ERRO CRÍTICO] Falha ao iniciar processo ${currentYtDlpPath}:`, err);
        if (!res.headersSent) {
            res.status(500).json({ error: `Falha ao executar yt-dlp: ${err.message}` });
        }
    });

    let errorOutput = '';
    child.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        console.log(`[yt-dlp]: ${text}`);
    });

    req.on('close', () => {
        if (!child.killed && child.exitCode === null) {
            console.log(`[INFO] Conexão cancelada pelo cliente para o vídeo ${videoId}. Encerrando processo...`);
            child.kill('SIGTERM');
        }
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
                if (errorOutput.includes('Sign in to confirm you’re not a bot')) {
                    res.status(403).json({
                        error: 'O YouTube bloqueou a requisição exigindo confirmação de bot.',
                        motivo: 'Servidores de hospedagem em nuvem (como Render) utilizam IPs de datacenter que o YouTube bloqueia sem autenticação.',
                        solucao: 'Adicione suas cookies do YouTube na variável de ambiente YOUTUBE_COOKIES no painel do Render.'
                    });
                } else {
                    res.status(500).json({
                        error: 'Falha ao converter ou baixar o áudio do vídeo.',
                        details: errorOutput.trim() || `Código de saída: ${code}`
                    });
                }
            }
        }
    });
});

// Inicialização
ensureBinaries()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('[ERRO] Falha ao verificar binários na inicialização:', err);
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT} (aviso: yt-dlp pendente)`);
        });
    });