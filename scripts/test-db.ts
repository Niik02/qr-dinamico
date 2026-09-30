import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

async function testDatabaseConnection() {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  console.log('=== TESTE DE CONEXÃO COM O BANCO DE DADOS POSTGRESQL ===\n');

  if (!databaseUrl) {
    console.error('❌ ERRO: A variável de ambiente DATABASE_URL não foi encontrada!');
    console.error('\nCausa provável:');
    console.error('1. O arquivo `.env` ainda não foi criado na raiz do projeto contendo DATABASE_URL=...');
    console.error('2. Ou a variável não foi exportada no ambiente de execução.\n');
    console.error('Como corrigir:');
    console.error('Crie um arquivo `.env` na raiz do projeto com o conteúdo:');
    console.error('DATABASE_URL="postgresql://postgres:[SUA_SENHA]@[HOST]:5432/postgres"\n');
    process.exit(1);
  }

  // Obfuscate password in log for security
  const maskedUrl = databaseUrl.replace(/(postgresql:\/\/[^:]+:)([^@]+)(@.+)/, '$1******$3');
  console.log(`📡 URL configurada: ${maskedUrl}`);
  console.log('⏳ Tentando conectar ao servidor PostgreSQL...');

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('✅ Conexão com o PostgreSQL estabelecida com sucesso!\n');

    // 1. Verificar versão do banco
    const versionRes = await client.query('SELECT version();');
    console.log(`ℹ️ Versão do Banco: ${versionRes.rows[0].version.split(',')[0]}`);

    // 2. Verificar se a tabela qr_codes existe
    console.log('\n🔍 Verificando se a tabela "qr_codes" existe...');
    const tableCheckRes = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_codes'
      ) AS table_exists;
    `);

    const tableExists = tableCheckRes.rows[0].table_exists;

    if (!tableExists) {
      console.log('⚠️ AVISO: A tabela "qr_codes" AINDA NÃO EXISTE no banco de dados.');
      console.log('\n👉 AÇÃO NECESSÁRIA:');
      console.log('O script `schema.sql` precisa ser executado no seu banco de dados (ex: no SQL Editor do Supabase ou Neon).');
      console.log('Abra o Supabase, vá em SQL Editor > New query, cole o conteúdo de schema.sql e clique em Run.\n');
      await client.end();
      process.exit(0);
    }

    console.log('✅ Tabela "qr_codes" encontrada com sucesso!\n');

    // 3. Fazer leitura segura dos registros (SEM alterar nem excluir nada)
    console.log('📖 Fazendo leitura não-destrutiva dos registros...');
    const countRes = await client.query('SELECT COUNT(*)::int AS total FROM qr_codes;');
    const totalRecords = countRes.rows[0].total;

    console.log(`📊 Total de registros cadastrados: ${totalRecords}`);

    if (totalRecords > 0) {
      const sampleRes = await client.query(`
        SELECT code, name, destination_url, active, scan_count, created_at 
        FROM qr_codes 
        ORDER BY code ASC 
        LIMIT 5;
      `);

      console.log('\nExemplos de registros encontrados:');
      console.table(
        sampleRes.rows.map((r) => ({
          ID: r.code,
          Nome: r.name,
          Destino: r.destination_url || '(não configurado)',
          Status: r.active ? 'Ativo' : 'Desativado',
          Acessos: r.scan_count,
        }))
      );
    } else {
      console.log('ℹ️ A tabela está atualmente vazia (pronta para receber novos QR Codes).');
    }

    console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO! O banco está 100% operacional para o QR Dinâmico.');
    await client.end();
  } catch (err: any) {
    console.error('\n❌ ERRO NA CONEXÃO COM O POSTGRESQL:');
    console.error(err.message);

    console.error('\n🔍 Causas prováveis e como corrigir:');
    if (err.message.includes('password authentication failed')) {
      console.error('- A senha fornecida na DATABASE_URL está incorreta.');
      console.error('- Solução: Verifique a senha do usuário "postgres" no painel do Supabase/Neon.');
    } else if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
      console.error('- O endereço do host (domínio do banco) não foi encontrado.');
      console.error('- Solução: Verifique se copiou a connection string correta sem espaços ou erros de digitação.');
    } else if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT')) {
      console.error('- Tempo limite de conexão esgotado (timeout).');
      console.error('- Solução: O banco pode estar pausado (scale-to-zero) ou a porta 5432/6543 está bloqueada.');
    } else if (err.message.includes('database') && err.message.includes('does not exist')) {
      console.error('- O nome do banco de dados na URL não existe.');
      console.error('- Solução: No Supabase, o nome padrão do banco é "postgres".');
    } else {
      console.error('- Detalhes do erro:', err.code || err);
      console.error('- Verifique o formato da URL: postgresql://[USER]:[SENHA]@[HOST]:[PORTA]/[BANCO]');
    }

    process.exit(1);
  }
}

testDatabaseConnection();
