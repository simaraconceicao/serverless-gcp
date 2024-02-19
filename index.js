const { Storage } = require('@google-cloud/storage');
const { parse } = require('papaparse');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

const storage = new Storage();

exports.geraPDF = async (event) => {
  const bucketName = event.bucket;
  const fileName = event.name;
  console.log(`Evento recebido com sucesso ${bucketName} ${fileName}`);

  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);
  console.log(`Instancia de bucket de origem criada com sucesso ${JSON.stringify(bucket)} ${JSON.stringify(file)}`);

  const fileContent = await file.download();
  const csvString = fileContent[0].toString();
  console.log(`Conteúdo baixado com sucesso ${fileContent} ${csvString}`);

  const parsedData = parse(csvString, { header: true, dynamicTyping: true });
  console.log(`Conteúdo transformado com sucesso ${JSON.stringify(parsedData)}`);

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  for (const row of parsedData.data) {
    try {
      const htmlContent = 
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Card de Boas-Vindas</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
          }

          .card {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            width: 300px;
            max-width: 100%;
            text-align: center;
            position: relative;
          }

          .image-container {
            position: relative;
            overflow: hidden;
            background-color: #c1ff72;
          }

          .image-container img {
            width: 100%;
            height: auto;
            display: block;
            max-width: 50%;
            margin: 0 auto;
          }

          .welcome-text {
            padding: 20px;
            color: #333;
          }

          h1 {
            font-size: 24px;
            margin-bottom: 10px;
            color: #4e4180;
          }

          p {
            font-size: 16px;
            color: #666;
          }

          .spread-news {
            background-color: #4e4180;
            color: #fff;
            padding: 10px;
            cursor: pointer;
            transition: background-color 0.3s ease;
            text-decoration: none;
          }

          .spread-news:hover {
            background-color: #3d3366;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="image-container">
            <img src="https://d335luupugsy2.cloudfront.net/cms/files/746374/1707347167/$acjko2ouu5" alt="Imagem de Boas-Vindas">
          </div>
          <div class="welcome-text">
            <h1>${row.Nome}</h1>
            <p>Seu passaporte está garantido para a <strong>Maratona Seu Projeto no Ar</strong>.</p>
            <p>Espalhe essa notícia!</p>
            <a href="https://queroserdev.rds.land/seu-projeto-no-ar" class="spread-news">Compartilhar</a>
          </div>
        </div>
      </body>
      </html>`;
      
      const pdfFileName = `${uuidv4()}.pdf`;

      console.log(`Iniciando geração de PDF para  ${pdfFileName}`);

      const page = await browser.newPage();
      await page.setContent(htmlContent);
      const pdfBuffer = await page.pdf({ format: 'A4' });

      console.log(`Buffer gerado com sucesso  ${JSON.stringify(pdfBuffer)}`);

      const bucketDestino = storage.bucket('gs://saida-pdf');
      console.log(`Bucket de destino ${bucketDestino}`);

      const pdfFileDestino = bucketDestino.file(pdfFileName);
      console.log(`Arquivo destino ${pdfFileDestino}`);

      console.log(`Salvando PDF...}`);
      await pdfFileDestino.save(pdfBuffer);

      console.log(`PDF gerado e salvo: ${pdfFileDestino.name}`);
    } catch (error) {
      console.error('Erro ao processar linha do CSV:', error);
    }
  }

  await browser.close();

  console.log('Processamento do CSV concluído.');
};

