# Guia de Configuração e Deploy em Produção 🚀

Este guia descreve o deploy do CM Studio tal como ele existe hoje: **Node.js + Express + Vite/React**, com banco **PostgreSQL** (recomendado: Neon, serverless e gratuito para começar). Não há PHP, Laravel, Redis ou filas neste projeto — se você viu uma versão anterior deste guia mencionando isso, ela estava desalinhada com o código real e foi substituída.

---

## 📋 Arquitetura de Produção

Um único processo Node (`server.ts`, compilado para `dist/server.cjs`) serve tanto a API (`/api/*`) quanto os arquivos estáticos do React já compilados (`dist/`). Não há servidor PHP-FPM nem processo separado de frontend.

Duas formas de rodar isso em produção:

### Opção A — Plataforma de hospedagem Node (mais simples, recomendado)
Serviços como **Railway**, **Render** ou **Fly.io** rodam o processo Node diretamente a partir do repositório, sem você gerenciar Docker/Nginx/SSL manualmente. Basta:
1. Conectar o repositório Git.
2. Definir o comando de build (`npm run build`) e start (`npm start`).
3. Configurar as variáveis de ambiente (seção abaixo).
4. O banco de dados continua sendo o Neon — nenhuma mudança necessária ali.
5. **Disco persistente para `uploads/`**: os logos enviados pelas empresas (`server/upload.ts`) são salvos em disco, na pasta `uploads/`. Containers efêmeros (o padrão nesses serviços) apagam esse conteúdo a cada redeploy — configure um volume/disco persistente apontando para `uploads/` (Railway Volumes, Render Persistent Disks, Fly Volumes), ou migre para um storage externo (S3, R2) se preferir não depender de disco.

### Opção B — Docker Compose auto-hospedado
Este repositório inclui um `Dockerfile` (build multi-stage: instala dependências, roda `npm run build`, e a imagem final só carrega `dist/` + dependências de produção) e um `docker-compose.prod.yml` com dois serviços:

1. **`app`**: o container Node/Express rodando `node dist/server.cjs` na porta 3000.
2. **`nginx`**: proxy reverso que termina TLS (HTTPS) e repassa tudo para o `app`.

O banco de dados **não está no compose** — é o Neon (ou outro Postgres gerenciado), acessado via `DATABASE_URL`.

---

## ⚙️ Variáveis de Ambiente Necessárias

Configure estas variáveis no seu `.env` (self-hosted) ou no painel de secrets da plataforma de hospedagem escolhida:

```ini
# Porta em que o Express escuta (server.ts usa 3000 fixo hoje)
NODE_ENV=production

# String de conexão do Postgres (Neon, Supabase, RDS, etc.)
DATABASE_URL="postgresql://usuario:senha@host/dbname?sslmode=require"

# Segredo usado para assinar os tokens de sessão (JWT). Gere um valor aleatório forte
# e nunca reaproveite o mesmo secret entre ambientes de dev e produção.
JWT_SECRET="GERE_UM_VALOR_ALEATORIO_FORTE_AQUI"

# Chave da API Gemini, se as funcionalidades de IA estiverem em uso
GEMINI_API_KEY="sua-chave-aqui"

# URL pública onde a aplicação está hospedada
APP_URL="https://sua-barbearia-url.com.br"
```

Para gerar um `JWT_SECRET` forte:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 🛠️ Passo a Passo (Opção B — Docker Compose)

### 1. Instalar Docker e Git no servidor
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install git docker.io docker-compose -y
```

### 2. Clonar o repositório
```bash
git clone <URL_DO_REPOSITÓRIO> /var/www/cmstudio
cd /var/www/cmstudio
```

### 3. Configurar as variáveis de ambiente
```bash
cp .env.example .env
nano .env
```
Preencha `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY` e `APP_URL` conforme a seção acima.

### 4. Gerar certificado SSL (Let's Encrypt / Certbot)
```bash
sudo apt install certbot -y
sudo certbot certonly --standalone -d sua-barbearia-url.com.br
```
Os certificados ficam em `/etc/letsencrypt/live/sua-barbearia-url.com.br/`. Aponte o volume `./docker/nginx/ssl` do `docker-compose.prod.yml` para essa pasta (ou copie os arquivos para lá), e ajuste `SEU_DOMINIO` em `docker/nginx/prod.conf`.

### 5. Rodar a migração do banco (uma única vez, contra o Neon)
Isso cria as tabelas no Postgres caso ainda não existam:
```bash
DATABASE_URL="sua-connection-string" npm run migrate
```

### 6. Subir os containers
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

Isso builda a imagem do `app` (via `Dockerfile`) e sobe o `nginx` na frente. Verifique os logs com:
```bash
docker logs -f cmstudio-app
```

---

## 🔒 Práticas Recomendadas de Segurança para Produção

1. **`NODE_ENV=production`**: garante que o servidor sirva os arquivos estáticos já compilados de `dist/` em vez de rodar o Vite em modo dev.
2. **Nunca commite o `.env`**: ele já está no `.gitignore`; apenas `.env.example` (sem segredos reais) deve ir para o Git.
3. **Rotação do `JWT_SECRET`**: trocar esse valor invalida todas as sessões ativas (usuários precisam logar de novo). Rotacione se houver suspeita de vazamento.
4. **Backups do banco**: como o banco é gerenciado (Neon), use os backups automáticos do próprio provedor — não é necessário `pg_dump` manual, mas vale confirmar a política de retenção no painel do Neon.
5. **Renovação automática do SSL** (se usar Certbot):
   ```bash
   0 3 1 * * certbot renew --post-hook "docker restart cmstudio-nginx"
   ```
6. **Não exponha a porta do banco publicamente** — com um provedor gerenciado como o Neon isso já é responsabilidade do provedor, mas se você migrar para um Postgres autogerenciado, nunca exponha a porta 5432 para `0.0.0.0`.
