const express = require('express');
const ytdl = require('@distube/ytdl-core');

const app = express();
const PORT = 3000;

// Middleware para processar JSON no corpo das requisições
app.use(express.json());

app.get('/download', async (req, res) => {
    try {
        const videoUrl = req.query.url;

        // 1. Validação da URL
        if (!videoUrl || !ytdl.validateURL(videoUrl)) {
            return res.status(400).json({ error: 'URL do YouTube inválida ou não fornecida.' });
        }

        // 2. Obtém informações do vídeo para definir o título do arquivo
        const info = await ytdl.getInfo(videoUrl);
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, ''); // Remove caracteres especiais do nome

        // 3. Configura os cabeçalhos para o navegador/cliente entender que é um download de arquivo MP3
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);

        // 4. Cria o stream de áudio com a maior qualidade disponível e redireciona para a resposta HTTP
        ytdl(videoUrl, {
            filter: 'audioonly',
            quality: 'highestaudio',
        }).pipe(res);

    } catch (error) {
        console.error('Erro ao baixar vídeo:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Erro interno ao processar o vídeo.' });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});