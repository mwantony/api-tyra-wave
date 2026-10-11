const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

const isWindows = process.platform === 'win32';
const binaryName = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
const binaryPath = path.join(__dirname, binaryName);

async function downloadFile(url, destPath) {
    console.log(`[SETUP] Baixando ${path.basename(destPath)} de: ${url}`);
    const tempPath = `${destPath}.tmp`;
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
        throw new Error(`Falha no download (HTTP ${res.status}): ${res.statusText}`);
    }
    const fileStream = fs.createWriteStream(tempPath);
    await pipeline(Readable.fromWeb(res.body), fileStream);
    fs.renameSync(tempPath, destPath);
    if (!isWindows) {
        fs.chmodSync(destPath, 0o755);
    }
    console.log(`[SETUP] Download concluído com sucesso: ${destPath}`);
}

async function ensureBinaries() {
    if (fs.existsSync(binaryPath) && fs.statSync(binaryPath).size > 1000000) {
        if (!isWindows) {
            try {
                fs.chmodSync(binaryPath, 0o755);
            } catch (e) {}
        }
        return binaryPath;
    }

    const downloadUrl = isWindows
        ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
        : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

    try {
        await downloadFile(downloadUrl, binaryPath);
    } catch (err) {
        console.error(`[SETUP ERROR] Não foi possível baixar ${binaryName}:`, err.message);
        throw err;
    }
    return binaryPath;
}

if (require.main === module) {
    ensureBinaries()
        .then(() => {
            console.log(`[SETUP] Binário verificado: ${binaryName}`);
            process.exit(0);
        })
        .catch((err) => {
            console.error('[SETUP] Aviso na verificação do binário:', err.message);
            // Não quebra a instalação do npm
            process.exit(0);
        });
}

module.exports = { ensureBinaries, binaryPath };
