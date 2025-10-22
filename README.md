# Next Auth Products Backend

Backend de uma aplicação de e-commerce com autenticação JWT, gerenciamento de produtos, carrinho de compras, favoritos e sistema de pedidos. Desenvolvido com Fastify, Prisma e PostgreSQL.

## 🚀 Tecnologias Utilizadas

### Backend
- **Fastify** - Framework web rápido e eficiente para Node.js
- **TypeScript** - Superset do JavaScript com tipagem estática
- **Prisma** - ORM moderno para TypeScript e Node.js
- **PostgreSQL** - Banco de dados relacional
- **JWT** - Autenticação baseada em tokens
- **bcryptjs** - Hash de senhas
- **AWS S3** - Armazenamento de arquivos
- **PapaParse** - Parser de arquivos CSV

### Ferramentas de Desenvolvimento
- **ts-node-dev** - Execução em tempo real com hot reload
- **Docker** - Containerização do banco de dados
- **pino-pretty** - Logs formatados

## 📋 Pré-requisitos

- Node.js (versão 18 ou superior)
- Docker e Docker Compose
- Yarn ou npm

## 🛠️ Instalação

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd next-auth-products-backend
```

2. **Instale as dependências**
```bash
yarn install
# ou
npm install
```

3. **Configure as variáveis de ambiente**
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Banco de dados
DATABASE_URL="postgresql://lucas:devpassword@localhost:5432/next_auth_products"

# JWT
JWT_SECRET="seu-jwt-secret-aqui"

# AWS S3 (para upload de arquivos)
AWS_ACCESS_KEY_ID="sua-access-key"
AWS_SECRET_ACCESS_KEY="sua-secret-key"
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="seu-bucket-name"

# Servidor
PORT=3333
SERVER_PORT=3333
```

4. **Inicie o banco de dados com Docker**
```bash
yarn docker:up
# ou
docker-compose up -d
```

5. **Execute as migrações do banco**
```bash
yarn db:push
# ou
npx prisma db push
```

6. **Gere o cliente Prisma**
```bash
yarn db:generate
# ou
npx prisma generate
```

7. **Inicie o servidor de desenvolvimento**
```bash
yarn dev
# ou
npm run dev
```

O servidor estará rodando em `http://localhost:3333`

## 🐳 Docker

O projeto utiliza Docker Compose para o banco de dados PostgreSQL:

### Comandos Docker
```bash
# Iniciar containers
yarn docker:up

# Parar containers
yarn docker:down

# Reiniciar containers
yarn docker:restart
```

### Configuração do Docker Compose
```yaml
services:
  postgres:
    image: postgres:16
    container_name: postgres
    restart: always
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: lucas
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: next_auth_products
    volumes:
      - pgdata:/var/lib/postgresql/data
```

## 🗄️ Schema do Banco de Dados (Prisma)

### Enums
```prisma
enum Role {
  CLIENT
  SELLER
  ADMIN
}

enum OrderStatus {
  PENDING
  COMPLETED
  CANCELLED
}

enum ImportStatus {
  PENDING
  PROCESSING
  COMPLETED
  COMPLETED_WITH_ERRORS
  FAILED
}
```

### Modelos Principais

#### User
- **id**: UUID único
- **name**: Nome do usuário (opcional)
- **email**: Email único
- **passwordHash**: Hash da senha
- **role**: CLIENT, SELLER ou ADMIN
- **isActive**: Status da conta
- **createdAt/updatedAt**: Timestamps

#### Store
- **id**: UUID único
- **ownerId**: ID do proprietário (User)
- **name**: Nome da loja
- **isActive**: Status da loja
- **createdAt/updatedAt**: Timestamps

#### Product
- **id**: UUID único
- **storeId**: ID da loja
- **name**: Nome do produto
- **description**: Descrição (opcional)
- **price**: Preço
- **imageUrl**: URL da imagem (opcional)
- **stock**: Quantidade em estoque
- **soldCount**: Quantidade vendida
- **isVisible**: Visibilidade do produto
- **publishedAt**: Data de publicação

#### Order
- **id**: UUID único
- **userId**: ID do usuário
- **total**: Valor total
- **status**: Status do pedido
- **createdAt/updatedAt**: Timestamps

#### OrderItem
- **id**: UUID único
- **orderId**: ID do pedido
- **productId**: ID do produto
- **quantity**: Quantidade
- **unitPrice**: Preço unitário

#### Cart
- **id**: UUID único
- **userId**: ID do usuário (único)
- **items**: Itens do carrinho
- **createdAt/updatedAt**: Timestamps

#### CartItem
- **id**: UUID único
- **cartId**: ID do carrinho
- **productId**: ID do produto
- **quantity**: Quantidade
- **addedAt**: Data de adição

#### Favorite
- **id**: UUID único
- **userId**: ID do usuário
- **productId**: ID do produto
- **createdAt**: Data de criação

#### CSVImportJob
- **id**: ID único (cuid)
- **userId**: ID do usuário
- **fileUrl**: URL do arquivo
- **status**: Status da importação
- **progress**: Progresso (0-100)
- **totalRows**: Total de linhas
- **processedRows**: Linhas processadas
- **errorRows**: Linhas com erro
- **errorFileUrl**: URL do arquivo de erro

## 📁 Estrutura do Projeto

```
src/
├── app.ts                # Configuração principal da aplicação
├── index.ts              # Ponto de entrada do servidor
├── controllers/          # Lógica de negócio
│   ├── auth/             # Autenticação
│   ├── cart/             # Carrinho de compras
│   ├── favorites/        # Favoritos
│   ├── orders/           # Pedidos
│   ├── products/         # Produtos
│   ├── upload/           # Upload de arquivos
│   └── users/            # Usuários
├── lib/                  # Bibliotecas e configurações
│   └── prisma.ts         # Cliente Prisma
├── plugins/              # Plugins do Fastify
│   ├── authentication.ts # Plugin de autenticação
│   └── prisma.ts         # Plugin do Prisma
├── routes/               # Definição das rotas
│   ├── auth/             # Rotas de autenticação
│   ├── cart/             # Rotas do carrinho
│   ├── favorites/        # Rotas de favoritos
│   ├── orders/           # Rotas de pedidos
│   ├── products/         # Rotas de produtos
│   ├── upload/           # Rotas de upload
│   └── users/            # Rotas de usuários
├── types/                # Definições de tipos
│   ├── fastfy.d.ts       # Tipos do Fastify
│   └── product.d.ts      # Tipos de produto
└── utils/                # Utilitários
    └── getUserIdByToken.ts # Extração de ID do token
```

## 🔐 Autenticação

O sistema utiliza JWT (JSON Web Tokens) para autenticação:

### Plugin de Autenticação (`src/plugins/authentication.ts`)
- Registra o plugin JWT do Fastify
- Configura o secret do JWT
- Cria o decorator `authenticate` para validação de rotas

### Utilitário de Extração de Token (`src/utils/getUserIdByToken.ts`)
- Extrai o ID do usuário do token JWT
- Usado nos controllers para obter o usuário autenticado

## 🛣️ Rotas da API

### Autenticação (`/auth`)
- `POST /auth/login` - Login do usuário

### Usuários (`/users`)
- `POST /users` - Criar novo usuário

### Produtos (`/products`)
- `GET /products/all-products-by-seller` - Produtos do vendedor
- `GET /products/more-sold` - Produto mais vendido
- `GET /products/count-products-by-seller` - Contagem de produtos
- `GET /products/all-products-sold-by-seller` - Total vendido
- `GET /products/total-revenue-by-seller` - Faturamento total
- `GET /products/all-available-for-sale` - Produtos disponíveis (paginado)
- `GET /products/:id` - Detalhes do produto
- `POST /products` - Criar produto

### Carrinho (`/cart`)
- `GET /cart` - Obter carrinho do usuário
- `POST /cart/add-item` - Adicionar item ao carrinho
- `DELETE /cart/items/:itemId` - Remover item do carrinho

### Favoritos (`/favorites`)
- `GET /favorites` - Listar favoritos
- `POST /favorites/toggle` - Adicionar/remover favorito

### Pedidos (`/orders`)
- `POST /orders/create` - Criar pedido
- `GET /orders/my-orders` - Pedidos do usuário

### Upload (`/upload`)
- `POST /upload/csv` - Upload de arquivo CSV para importação

## 🎯 Controllers

### Auth Controller (`src/controllers/auth/index.ts`)
- **loginController**: Autentica usuário e retorna JWT

### Cart Controller (`src/controllers/cart/index.ts`)
- **addCartItem**: Adiciona item ao carrinho
- **removeCartItem**: Remove item do carrinho
- **getCart**: Obtém carrinho com itens e totais

### Favorites Controller (`src/controllers/favorites/index.ts`)
- **toggleFavoriteProduct**: Adiciona/remove favorito
- **getFavorites**: Lista favoritos do usuário

### Orders Controller (`src/controllers/orders/index.ts`)
- **createOrder**: Cria pedido a partir do carrinho
- **getUserOrders**: Lista pedidos do usuário

### Products Controller (`src/controllers/products/index.ts`)
- **getAllProductsBySeller**: Lista produtos do vendedor
- **countAllProductsBySeller**: Conta produtos do vendedor
- **totalProductsSoldBySeller**: Total de produtos vendidos
- **getTotalRevenueBySeller**: Faturamento total
- **getMoreSoldProduct**: Produto mais vendido
- **createProduct**: Cria novo produto
- **getProductsAvailableForSale**: Produtos disponíveis (paginado)
- **getProductDetails**: Detalhes de um produto

### Upload Controller (`src/controllers/upload/index.ts`)
- **uploadCSV**: Upload e processamento de CSV
- **startCSVProcessing**: Processamento em background

### Users Controller (`src/controllers/users/index.ts`)
- **isUserAlreadyExist**: Verifica se usuário existe
- **createUser**: Cria novo usuário
- **getAllUsers**: Lista todos os usuários

## 🔧 Plugins

### Prisma Plugin (`src/plugins/prisma.ts`)
- Configura e conecta o cliente Prisma
- Adiciona logs de query
- Gerencia conexão e desconexão
- Decora o servidor Fastify com `prisma`

### Authentication Plugin (`src/plugins/authentication.ts`)
- Registra plugin JWT
- Cria decorator `authenticate` para validação
- Configura secret do JWT

## 📚 Bibliotecas e Utilitários

### Prisma Client (`src/lib/prisma.ts`)
- Instância única do cliente Prisma
- Configuração centralizada do banco

### Utilitários (`src/utils/`)
- **getUserIdByToken**: Extrai ID do usuário do JWT

## 🚀 Scripts Disponíveis

```bash
# Desenvolvimento
yarn dev              # Inicia servidor com hot reload

# Build e produção
yarn build            # Compila TypeScript
yarn start            # Inicia servidor em produção

# Banco de dados
yarn db:push          # Aplica mudanças do schema
yarn db:migrate       # Executa migrações
yarn db:generate      # Gera cliente Prisma
yarn db:studio        # Abre Prisma Studio

# Docker
yarn docker:up        # Inicia containers
yarn docker:down      # Para containers
yarn docker:restart   # Reinicia containers
```

## 🔒 Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `DATABASE_URL` | URL de conexão PostgreSQL | Sim |
| `JWT_SECRET` | Secret para assinatura JWT | Sim |
| `AWS_ACCESS_KEY_ID` | Access Key da AWS | Sim |
| `AWS_SECRET_ACCESS_KEY` | Secret Key da AWS | Sim |
| `AWS_REGION` | Região da AWS | Sim |
| `AWS_BUCKET_NAME` | Nome do bucket S3 | Sim |
| `PORT` | Porta do servidor | Não (padrão: 3333) |
| `SERVER_PORT` | Porta alternativa | Não |

## 📝 Funcionalidades

### ✅ Implementadas
- Autenticação JWT
- CRUD de usuários
- CRUD de produtos
- Sistema de carrinho
- Sistema de favoritos
- Sistema de pedidos
- Upload de CSV para importação
- Relatórios de vendas
- Paginação de produtos
- Validação de dados
- Tratamento de erros
- Logs estruturados


---

Desenvolvido com ❤️ usando Fastify, Prisma e TypeScript por Lucas Viana

