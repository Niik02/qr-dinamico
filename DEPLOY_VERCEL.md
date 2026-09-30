# Guia Completo de Instalação e Deploy: QR Dinâmico

Este documento contém todas as instruções necessárias para rodar o projeto localmente, configurar o banco de dados em produção e realizar o deploy completo na **Vercel**.

---

## 1. Como Rodar Localmente

O sistema está preparado para funcionar **imediatamente** sem a necessidade de instalar bancos externos no primeiro teste, utilizando persistência atômica no arquivo `data/qrcodes.json`.

```bash
# 1. Instalar dependências
npm install

# 2. Criar seu arquivo .env a partir do exemplo
cp .env.example .env

# 3. Iniciar o servidor de desenvolvimento
npm run dev
```

Acesse o sistema em: `http://localhost:3000`

---

## 2. Como Configurar o Banco de Dados em Produção (Supabase ou PostgreSQL)

Recomendamos utilizar o **Supabase** (plano gratuito generoso e compatibilidade total com PostgreSQL):

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e crie um novo projeto.
2. No menu lateral, acesse **SQL Editor**.
3. Clique em **New query**, cole o conteúdo do arquivo `schema.sql` (disponível na raiz do projeto) e clique em **Run**:

```sql
CREATE TABLE IF NOT EXISTS qr_codes (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  destination_url TEXT NOT NULL DEFAULT '',
  active BOOLEAN DEFAULT TRUE NOT NULL,
  user_id VARCHAR(64),
  scan_count INTEGER DEFAULT 0 NOT NULL,
  last_scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_code ON qr_codes (code);
CREATE INDEX IF NOT EXISTS idx_qr_codes_active ON qr_codes (active);
CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON qr_codes (user_id);
```

4. Acesse **Project Settings > Database** no Supabase e copie a **Connection String** no formato URI (modo *Transaction* ou *Session*, porta 5432 ou 6543).

---

## 3. Variáveis de Ambiente Necessárias na Vercel

No painel do seu projeto na Vercel (**Settings > Environment Variables**), adicione as seguintes variáveis:

| Variável | Valor de Exemplo | Descrição |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | `https://qr.meudominio.com` | URL base do seu domínio na Vercel (usada para gerar os QR Codes) |
| `APP_URL` | `https://qr.meudominio.com` | URL base do servidor |
| `DATABASE_URL` | `postgresql://postgres:[SENHA]@db.xxx.supabase.co:5432/postgres` | URL de conexão do PostgreSQL / Supabase |
| `PORT` | `3000` | Porta padrão |

---

## 4. Como Fazer Deploy na Vercel

O projeto está configurado com a arquitetura moderna da Vercel (Vite + Serverless Functions na pasta `/api`):
- O frontend estático é compilado em `dist/`.
- As rotas `/api/*` e o redirecionamento dinâmico `/r/*` são executados como Serverless Functions em `/api`.
- O arquivo `vercel.json` gerencia automaticamente os rewrites de URL.

### Opção A: Via Git (GitHub / GitLab) - Recomendado
1. Envie as alterações para o seu repositório GitHub (`git push`).
2. Acesse [vercel.com](https://vercel.com) e clique em **Add New... > Project**.
3. Importe o repositório.
4. Na tela de configuração:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_APP_URL`: seu domínio final (ex: `https://meu-app.vercel.app` ou `https://qr.meudominio.com`)
   - `DATABASE_URL`: connection string do Supabase/PostgreSQL
6. Clique em **Deploy**.

> **Nota sobre o erro 404 "This page doesn't exist"**:
> Esse erro ocorria em versões antigas do `vercel.json` que tentavam usar `"builds"` legados. O projeto agora usa a configuração nativa e moderna de Serverless Functions da Vercel, garantindo que tanto a página inicial quanto `/r/:code` funcionem perfeitamente.

### Opção B: Via Vercel CLI
```bash
npm i -g vercel
vercel --prod
```

---

## 5. Como Configurar o Domínio Personalizado

1. No painel da Vercel, vá em **Settings > Domains**.
2. Adicione seu domínio (ex: `qr.meudominio.com` ou `meudominio.com`).
3. Adicione o registro CNAME ou A no painel do seu provedor de DNS (ex: Cloudflare, Registro.br, GoDaddy) conforme instruído pela Vercel.
4. Após o certificado SSL ser emitido, atualize a variável `NEXT_PUBLIC_APP_URL` na Vercel com o seu novo domínio `https://qr.meudominio.com`.

---

## 6. Como Testar o Redirecionamento

1. Abra o painel e clique em **+ Criar QR Codes**.
2. Digite a quantidade (ex: `10`) e clique em **Gerar**.
3. O sistema criará os códigos `001`, `002`, ... `010`.
4. No código `001`, clique em **Editar**.
5. No campo **Link de Destino**, insira `https://google.com` e clique em **Salvar alterações**.
6. Baixe a imagem em PNG ou acesse no navegador:
   `https://seu-dominio.com/r/001`
7. Você será redirecionado imediatamente para `https://google.com`.
8. Volte ao painel e altere o link do `001` para `https://instagram.com`.
9. Acesse novamente `https://seu-dominio.com/r/001`: o redirecionamento agora levará ao Instagram, sem que você precise alterar nada na placa física já impressa!
10. Se desativar o código no painel, o visitante verá a mensagem:
    *"Este QR Code está temporariamente desativado."*
11. Se excluir o código, o visitante verá:
    *"QR Code não encontrado."*
