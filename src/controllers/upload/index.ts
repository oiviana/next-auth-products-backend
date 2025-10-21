// controllers/upload.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { FastifyRequest, FastifyReply } from 'fastify';
import { getUserIdByToken } from '@utils/getUserIdByToken';
import { parse } from 'papaparse';
import prisma from '@lib/prisma';
import { Prisma } from "@prisma-generated/prisma";

// Configuração do cliente S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME!;

interface MultipartRequest extends FastifyRequest {
  file: () => Promise<import('@fastify/multipart').MultipartFile | undefined>;
}

interface CSVRow {
  name: string;
  description?: string;
  price: string;
  imageurl?: string;
  stock?: string;
}

interface UploadResult {
  url: string;
  downloadUrl: string;
}

export async function uploadCSV(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = await getUserIdByToken(request);
    
    const userWithStore = await request.server.prisma.user.findUnique({
      where: { id: userId },
      include: { store: true },
    });

    if (!userWithStore?.store) {
      return reply.status(400).send({ error: 'Usuário não tem uma loja cadastrada' });
    }

    const multipartRequest = request as unknown as MultipartRequest;
    const data = await multipartRequest.file();
    
    if (!data) {
      return reply.status(400).send({ error: 'Nenhum arquivo enviado' });
    }

    // Validação do tipo de arquivo
    const isValidCSV = data.filename.endsWith('.csv') ||
      data.mimetype === 'text/csv' ||
      data.mimetype === 'application/vnd.ms-excel';

    if (!isValidCSV) {
      return reply.status(400).send({ error: 'Apenas arquivos CSV são permitidos' });
    }

    const buffer = await data.toBuffer();

    // Upload para S3
    const fileName = `csv-uploads/${userId}/${Date.now()}-${data.filename}`;

    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: data.mimetype,
      Metadata: {
        userId: userId,
        storeId: userWithStore.store.id,
        originalName: data.filename
      }
    });

    await s3Client.send(uploadCommand);

    // Gerar URLs
    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    // URL assinada para download (expira em 7 dias)
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    });

    const downloadUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 604800
    });

    const job = await request.server.prisma.cSVImportJob.create({
      data: {
        userId: userId,
        fileUrl: fileUrl,
        status: 'PENDING',
        progress: 0,
      },
    });

    // Processar em background (não bloquear a resposta)
    startCSVProcessing(job.id, userWithStore.store.id).catch(error => {
      console.error(`Erro no processamento do job ${job.id}:`, error);
    });

    return reply.send({
      success: true,
      jobId: job.id,
      message: 'CSV recebido e em processamento',
      fileInfo: {
        url: fileUrl,
        downloadUrl: downloadUrl,
        fileName: data.filename,
        size: buffer.length
      }
    });

  } catch (error) {
    request.server.log.error(`Upload error: ${error}`);

    if (error instanceof Error) {
      if (error.name === 'CredentialsProviderError') {
        return reply.status(500).send({ error: 'Configuração AWS inválida' });
      }
      if (error.name === 'NoSuchBucket') {
        return reply.status(500).send({ error: 'Bucket S3 não encontrado' });
      }
    }

    return reply.status(500).send({ error: 'Erro interno no servidor' });
  }
}

async function startCSVProcessing(jobId: string, storeId: string): Promise<void> {
  try {
    const job = await prisma.cSVImportJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return;
    }

    // Atualizar status para PROCESSING
    await prisma.cSVImportJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', progress: 10 }
    });

    // Buscar arquivo do S3 usando SDK
    const key = job.fileUrl.split('.amazonaws.com/')[1];
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const { Body } = await s3Client.send(getCommand);
    
    if (!Body) {
      throw new Error('Arquivo não encontrado no S3');
    }

    // Converter o stream para string
    const csvText = await streamToString(Body as import('stream').Readable);

    // Função auxiliar para converter stream
    async function streamToString(stream: import('stream').Readable): Promise<string> {
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      });
    }

    const { data: csvData, errors, meta } = parse<CSVRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    });

    if (errors.length > 0) {
      await prisma.cSVImportJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorFileUrl: job.fileUrl,
          processedRows: 0,
          totalRows: csvData.length
        },
      });
      return;
    }

    const products: Prisma.ProductCreateManyInput[] = [];
    const errorRows: { row: CSVRow; error: string }[] = [];

    // Processar cada linha
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];

      // Validações
      if (!row.name?.trim()) {
        errorRows.push({ row, error: 'Nome é obrigatório' });
        continue;
      }

      if (!row.price) {
        errorRows.push({ row, error: 'Preço é obrigatório' });
        continue;
      }

      const price = parseFloat(row.price.replace(',', '.'));
      const stock = row.stock ? parseInt(row.stock) : 0;

      if (isNaN(price) || price < 0) {
        errorRows.push({ row, error: 'Preço inválido' });
        continue;
      }

      if (isNaN(stock) || stock < 0) {
        errorRows.push({ row, error: 'Estoque inválido' });
        continue;
      }

      products.push({
        name: row.name.trim(),
        description: row.description?.trim() || '',
        price: Math.round(price * 100),
        imageUrl: row.imageurl?.trim() || '',
        stock,
        soldCount: 0,
        storeId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Atualizar progresso a cada 10%
      if (i % Math.ceil(csvData.length / 10) === 0) {
        const progress = 10 + Math.floor((i / csvData.length) * 80);
        await prisma.cSVImportJob.update({
          where: { id: jobId },
          data: { progress }
        });
      }
    }

    // Inserir produtos válidos em transação
    if (products.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.product.createMany({
          data: products,
          skipDuplicates: true
        });
      });
    }

    // Status final
    const finalStatus = errorRows.length === 0 ? 'COMPLETED' :
      products.length > 0 ? 'COMPLETED_WITH_ERRORS' : 'FAILED';

    await prisma.cSVImportJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        progress: 100,
        totalRows: csvData.length,
        processedRows: products.length,
        errorRows: errorRows.length,
        errorFileUrl: errorRows.length > 0 ? job.fileUrl : null,
      },
    });

  } catch (error) {
    console.error(`Erro no processamento do job ${jobId}:`, error);

    await prisma.cSVImportJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorFileUrl: null
      }
    });
  }
}