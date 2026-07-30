# Guia de Configuração de Ambiente (.env) 🔐

Este documento detalha as variáveis de ambiente usadas pelo CM Studio em produção. O backend é **Node.js/Express** (não Laravel/PHP) e o banco é **PostgreSQL** (recomendado: Neon). Se você tem uma versão anterior deste guia mencionando `APP_KEY`, `DB_CONNECTION=pgsql` no estilo Laravel, Redis ou filas — ela descrevia um stack que nunca existiu neste repositório e foi substituída por este.

---

## 📁 1. Variáveis de Ambiente

```ini
# ==============================================================================
# APLICAÇÃO
# ==============================================================================
NODE_ENV=production

# URL pública onde a aplicação está hospedada (usada para links/callbacks)
APP_URL=https://barberflow.seudominio.com

# ==============================================================================
# BANCO DE DADOS (POSTGRESQL — Neon, Supabase, RDS ou instância própria)
# ==============================================================================
DATABASE_URL="postgresql://usuario:senha@host/dbname?sslmode=require"

# ==============================================================================
# AUTENTICAÇÃO
# ==============================================================================
# Segredo usado para assinar os tokens de sessão (JWT). Gere um valor aleatório
# forte e único por ambiente — nunca reaproveite entre dev e produção.
JWT_SECRET="GERE_UM_VALOR_ALEATORIO_FORTE_AQUI"

```

---

## 🛠️ 2. Detalhamento das Variáveis

### `DATABASE_URL`
Connection string completa do Postgres, no formato `postgresql://usuario:senha@host/dbname?sslmode=require`. Com o Neon, essa string já vem pronta no painel do projeto (Dashboard → Connection Details). `sslmode=require` é necessário porque provedores gerenciados exigem TLS.

### `JWT_SECRET`
Usado por `server/auth.ts` para assinar e verificar os tokens de sessão dos usuários. Se vazar, um invasor pode forjar sessões de qualquer usuário — trate como segredo crítico, no mesmo nível de uma senha de banco de dados.

Gere um valor forte com:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### `APP_URL`
Usada apenas como referência textual (não afeta lógica de CORS ou roteamento hoje). Mantenha alinhada com o domínio real em produção.

---

## 🔑 3. Boas Práticas de Segurança

### Prática 1: Nunca commitar segredos reais
Certifique-se de que `.env` (e variantes como `.env.production`, `.env.local`) estejam no `.gitignore` — já estão por padrão neste projeto. Apenas `.env.example`, com valores vazios/placeholder, deve ir para o Git.

### Prática 2: Gerar segredos únicos por ambiente
Nunca reutilize o mesmo `JWT_SECRET` ou a mesma senha de banco entre desenvolvimento e produção. Se um ambiente de dev vazar, produção não deve ser afetada.

### Prática 3: Injeção de variáveis via plataforma, não arquivo físico
Em produção — especialmente se usar Railway, Render, Fly.io ou containers — prefira configurar as variáveis diretamente no painel/secrets da plataforma em vez de manter um `.env` físico no servidor. Isso evita que o arquivo seja lido acidentalmente por outro processo ou vazado em um backup de disco.

### Prática 4: Rotação do `JWT_SECRET`
Rotacione se houver suspeita de vazamento, desligamento de alguém com acesso aos segredos, ou como política periódica. Rotacionar invalida instantaneamente todas as sessões ativas — os usuários precisarão logar novamente.

### Prática 5: Backups do banco
Com um provedor gerenciado (Neon), confira a política de backup automático/point-in-time-recovery no painel do provedor em vez de depender de `pg_dump` manual.
