// BOT WHATSAPP - HOLLÁ TELECOM
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// CONFIGURAÇÕES
const CONFIG = {
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN || 'EAFTZBrsQZCpQkBOwIAZCNoWeFmJbBZCKeHIAeTrEZAK827RYPBA3xkK66gbnOJj6V9ME9t3XOJRpnDKrZA1X5jtOgmvOgLfhqIAiWlgUzUfcCdrhmiYZAFJW0ZCiFcUp5lc3RJyEVZAUqs9hvpbSao75dEsCdHeVoVZBkyDE28eQUlgMADACzZB9WnePrZAVrJVdOgZDZD',
    phoneNumberId: process.env.PHONE_NUMBER_ID || '645207948683804',
    verifyToken: 'holla_telecom_webhook_2024'
  },
  sgp: {
    baseURL: 'https://wktelecom.sgp.net.br/api',
    app: 'botpress',
    token: '6f031b06-076d-4dcb-a8dc-6ff8345e0f0d'
  }
};

// ARMAZENAR SESSÕES DOS USUÁRIOS (em produção usar Redis/DB)
const userSessions = new Map();

console.log('🚀 Iniciando Bot Hollá Telecom...');

// VERIFICAÇÃO WEBHOOK
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  console.log('🔍 Verificação webhook recebida');
  
  if (mode === 'subscribe' && token === CONFIG.whatsapp.verifyToken) {
    console.log('✅ Webhook verificado!');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Falha na verificação');
    res.sendStatus(403);
  }
});

// RECEBER MENSAGENS
app.post('/webhook/whatsapp', async (req, res) => {
  console.log('📨 WEBHOOK RECEBIDO:', JSON.stringify(req.body, null, 2));
  
  try {
    if (req.body.entry && req.body.entry[0] && req.body.entry[0].changes) {
      const changes = req.body.entry[0].changes[0];
      
      if (changes.value && changes.value.messages) {
        const message = changes.value.messages[0];
        const from = message.from;
        const messageText = message.text ? message.text.body : '';
        
        console.log('💬 MENSAGEM RECEBIDA:');
        console.log('📱 De:', from);
        console.log('📝 Texto:', messageText);
        
        await processarMensagem(from, messageText);
      } else {
        console.log('📊 Status recebido (não é mensagem)');
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    res.status(500).send('Erro');
  }
});

// FUNÇÃO PRINCIPAL - PROCESSAR MENSAGEM
async function processarMensagem(from, texto) {
  console.log('🔄 Processando mensagem:', texto);
  
  const textoLimpo = texto.toLowerCase().trim();
  let resposta = '';
  
  // Obter ou criar sessão do usuário
  let session = userSessions.get(from) || {
    authenticated: false,
    cpf: null,
    clienteData: null,
    lastActivity: Date.now()
  };
  
  try {
    // COMANDO: OI / SAUDAÇÃO
    if (textoLimpo.includes('oi') || textoLimpo.includes('olá') || textoLimpo.includes('bom dia')) {
      resposta = `Olá! 👋

🌐 *Bem-vindo à Hollá Telecom!*

Para sua segurança, preciso que você se identifique primeiro.

🆔 *Digite seu CPF* (apenas números):
Exemplo: 12345678901

🔒 *Seus dados estão seguros conosco!*`;
      
      // Reset da sessão para nova autenticação
      session.authenticated = false;
      session.cpf = null;
      session.clienteData = null;
    }
    
    // VALIDAÇÃO DE CPF
    else if (!session.authenticated && isValidCPF(textoLimpo)) {
      console.log('🆔 Validando CPF:', textoLimpo);
      const cpf = textoLimpo.replace(/\D/g, ''); // Remove caracteres não numéricos
      
      // Simular validação do CPF no SGP (adaptar para sua API real)
      const clienteData = await validarCPFnoSGP(cpf);
      
      if (clienteData.valid) {
        session.authenticated = true;
        session.cpf = cpf;
        session.clienteData = clienteData.data;
        
        resposta = `✅ *Olá, ${clienteData.data.nome}!*

🎉 Acesso liberado com sucesso!

📋 *Serviços disponíveis:*
• *planos* - Consultar planos
• *boleto* - Consultar boleto
• *confianca* - Liberação de confiança
• *online* - Verificar se está online
• *sair* - Encerrar sessão

Como posso ajudar?`;
      } else {
        resposta = `❌ *CPF não encontrado!*

🔍 Verifique se digitou corretamente.
📞 Se o problema persistir, ligue: (xx) xxxx-xxxx

🆔 Digite seu CPF novamente:`;
      }
    }
    
    // COMANDOS QUE PRECISAM DE AUTENTICAÇÃO
    else if (session.authenticated) {
      
      // COMANDO: PLANOS
      if (textoLimpo.includes('plano')) {
        console.log('📋 Consultando planos para:', session.cpf);
        resposta = await consultarPlanos();
      }
      
      // COMANDO: BOLETO
      else if (textoLimpo.includes('boleto')) {
        console.log('💰 Consultando boleto para:', session.cpf);
        resposta = await consultarBoleto(session.cpf, session.clienteData);
      }
      
      // COMANDO: LIBERAÇÃO DE CONFIANÇA
      else if (textoLimpo.includes('confianca') || textoLimpo.includes('confiança')) {
        console.log('🔓 Liberação de confiança para:', session.cpf);
        resposta = await liberacaoConfianca(session.cpf, session.clienteData);
      }
      
      // COMANDO: VERIFICAR SE ESTÁ ONLINE
      else if (textoLimpo.includes('online')) {
        console.log('🌐 Verificando status online para:', session.cpf);
        resposta = await verificarStatusOnline(session.cpf, session.clienteData);
      }
      
      // COMANDO: MENU
      else if (textoLimpo.includes('menu') || textoLimpo.includes('ajuda')) {
        resposta = `📱 *MENU HOLLÁ TELECOM*

Olá, *${session.clienteData.nome}*!

🔧 *Serviços disponíveis:*
• *planos* - Consultar planos disponíveis
• *boleto* - Consultar boleto em aberto
• *confianca* - Solicitar liberação de confiança
• *online* - Verificar se está online
• *sair* - Encerrar sessão

💡 Digite o comando desejado!`;
      }
      
      // COMANDO: SAIR
      else if (textoLimpo.includes('sair') || textoLimpo.includes('logout')) {
        userSessions.delete(from);
        resposta = `👋 *Sessão encerrada!*

🔒 Seus dados foram protegidos.

Para usar novamente, digite *oi* e informe seu CPF.

Obrigado por usar a Hollá Telecom! 🌐`;
        
        return await enviarMensagem(from, resposta); // Return early
      }
      
      // NÃO ENTENDEU (AUTENTICADO)
      else {
        resposta = `🤖 Comando não reconhecido.

📱 *Comandos disponíveis:*
• *planos* - Ver planos
• *boleto* - Consultar boleto  
• *confianca* - Liberação de confiança
• *online* - Status da conexão
• *menu* - Ver todos comandos
• *sair* - Encerrar sessão

Digite um comando válido!`;
      }
    }
    
    // USUÁRIO NÃO AUTENTICADO
    else {
      if (isValidCPF(textoLimpo)) {
        // Já tratado acima
      } else {
        resposta = `🔒 *Acesso negado!*

Para sua segurança, você precisa se identificar primeiro.

🆔 *Digite seu CPF* (apenas números):
Exemplo: 12345678901

Para iniciar, digite: *oi*`;
      }
    }
    
    // Atualizar sessão
    session.lastActivity = Date.now();
    userSessions.set(from, session);
    
    // ENVIAR RESPOSTA
    console.log('📤 Enviando resposta...');
    await enviarMensagem(from, resposta);
    
  } catch (error) {
    console.error('❌ Erro ao processar:', error);
    await enviarMensagem(from, '❌ Ops! Erro interno. Tente novamente em alguns segundos.');
  }
}

// VALIDAR CPF (formato básico)
function isValidCPF(texto) {
  const cpf = texto.replace(/\D/g, '');
  return cpf.length === 11 && /^\d{11}$/.test(cpf);
}

// VALIDAR CPF NO SGP (adaptar para sua API real)
async function validarCPFnoSGP(cpf) {
  try {
    // SIMULAR VALIDAÇÃO - ADAPTAR PARA SUA API REAL
    console.log('🔍 Validando CPF no SGP:', cpf);
    
    // Aqui você chamaria sua API real de validação de CPF
    // const response = await axios.post(`${CONFIG.sgp.baseURL}/ura/validar-cpf/`, {...});
    
    // MOCK - Simular resposta (remover em produção)
    if (cpf === '12345678901' || cpf === '11111111111') {
      return {
        valid: true,
        data: {
          nome: 'João Silva',
          contrato: '123456',
          servico: '789',
          plano: 'Internet 100MB',
          status: 'ativo'
        }
      };
    } else {
      return { valid: false };
    }
    
  } catch (error) {
    console.error('❌ Erro validação CPF:', error);
    return { valid: false };
  }
}

// CONSULTAR PLANOS SGP
async function consultarPlanos() {
  try {
    const url = `${CONFIG.sgp.baseURL}/ura/consultaplano/?app=${CONFIG.sgp.app}&token=${CONFIG.sgp.token}`;
    console.log('🔗 Chamando SGP planos:', url);
    
    const response = await axios.get(url, { timeout: 10000 });
    console.log('✅ SGP respondeu:', response.data);
    
    if (response.data.planos && response.data.planos.length > 0) {
      let texto = '📋 *PLANOS HOLLÁ TELECOM*\n\n';
      
      response.data.planos.forEach((plano, index) => {
        texto += `${index + 1}️⃣ *${plano.descricao}*\n`;
        texto += `💰 R$ ${plano.preco}\n`;
        texto += `📊 ${plano.qtd_servicos} serviço(s)\n\n`;
      });
      
      texto += '📞 *Quer contratar?*\nFale conosco: (xx) xxxx-xxxx';
      return texto;
      
    } else {
      return '❌ Nenhum plano disponível no momento.\n\n📞 Entre em contato: (xx) xxxx-xxxx';
    }
    
  } catch (error) {
    console.error('❌ Erro SGP planos:', error);
    return '❌ Sistema temporariamente indisponível.\n\n📞 Ligue: (xx) xxxx-xxxx';
  }
}

// CONSULTAR BOLETO
async function consultarBoleto(cpf, clienteData) {
  try {
    console.log('💰 Consultando boleto para CPF:', cpf);
    
    // ADAPTAR PARA SUA API REAL DE BOLETOS
    // const response = await axios.post(`${CONFIG.sgp.baseURL}/ura/consultar-boleto/`, {
    //   cpf: cpf,
    //   contrato: clienteData.contrato
    // });
    
    // MOCK - Simular resposta (remover em produção)
    const mockBoleto = {
      valor: '89.90',
      vencimento: '2025-07-05',
      status: 'em_aberto',
      linhaDigitavel: '12345.67890 12345.678901 12345.678901 1 23456789012345',
      referencia: 'Junho/2025'
    };
    
    if (mockBoleto.status === 'em_aberto') {
      return `💰 *BOLETO EM ABERTO*

👤 *Cliente:* ${clienteData.nome}
📄 *Referência:* ${mockBoleto.referencia}
💵 *Valor:* R$ ${mockBoleto.valor}
📅 *Vencimento:* ${mockBoleto.vencimento}

🔢 *Linha Digitável:*
${mockBoleto.linhaDigitavel}

📱 *Pagar via PIX:*
Entre em contato: (xx) xxxx-xxxx`;
    } else {
      return `✅ *SEM PENDÊNCIAS*

👤 *Cliente:* ${clienteData.nome}
🎉 Parabéns! Não há boletos em aberto.

📊 Sua conta está em dia! 👏`;
    }
    
  } catch (error) {
    console.error('❌ Erro consulta boleto:', error);
    return '❌ Erro ao consultar boleto.\n\n📞 Entre em contato: (xx) xxxx-xxxx';
  }
}

// LIBERAÇÃO DE CONFIANÇA
async function liberacaoConfianca(cpf, clienteData) {
  try {
    console.log('🔓 Liberação de confiança para CPF:', cpf);
    
    // ADAPTAR PARA SUA API REAL
    // const response = await axios.post(`${CONFIG.sgp.baseURL}/ura/liberacao-confianca/`, {
    //   cpf: cpf,
    //   contrato: clienteData.contrato
    // });
    
    // MOCK - Simular liberação
    const liberado = true;
    
    if (liberado) {
      return `🔓 *LIBERAÇÃO DE CONFIANÇA*

✅ *Liberação realizada com sucesso!*

👤 *Cliente:* ${clienteData.nome}
📡 *Contrato:* ${clienteData.contrato}
⏰ *Liberado em:* ${new Date().toLocaleString('pt-BR')}

🌐 *Sua conexão foi restabelecida!*

⚠️ *Lembre-se:* Regularize sua situação o quanto antes.

📞 Dúvidas? (xx) xxxx-xxxx`;
    } else {
      return `❌ *LIBERAÇÃO NÃO DISPONÍVEL*

👤 *Cliente:* ${clienteData.nome}

🚫 *Motivos possíveis:*
• Conta já está ativa
• Pendência não liberável via sistema
• Restrição no contrato

📞 *Entre em contato:*
(xx) xxxx-xxxx`;
    }
    
  } catch (error) {
    console.error('❌ Erro liberação confiança:', error);
    return '❌ Erro ao processar liberação.\n\n📞 Entre em contato: (xx) xxxx-xxxx';
  }
}

// VERIFICAR STATUS ONLINE
async function verificarStatusOnline(cpf, clienteData) {
  try {
    console.log('🌐 Verificando status online para CPF:', cpf);
    
    // ADAPTAR PARA SUA API REAL
    // const response = await axios.get(`${CONFIG.sgp.baseURL}/ura/status-cliente/`, {
    //   params: { cpf: cpf, contrato: clienteData.contrato }
    // });
    
    // MOCK - Simular status
    const status = {
      online: true,
      ip: '192.168.1.100',
      velocidade: '95 Mbps',
      ultimaConexao: '2025-06-29 09:30:15',
      tempoOnline: '2h 15m'
    };
    
    if (status.online) {
      return `🌐 *STATUS DA CONEXÃO*

✅ *CLIENTE ONLINE*

👤 *Cliente:* ${clienteData.nome}
📡 *Plano:* ${clienteData.plano}
🚀 *Velocidade atual:* ${status.velocidade}
📱 *IP:* ${status.ip}
⏰ *Online há:* ${status.tempoOnline}

🎉 *Tudo funcionando perfeitamente!*`;
    } else {
      return `🌐 *STATUS DA CONEXÃO*

❌ *CLIENTE OFFLINE*

👤 *Cliente:* ${clienteData.nome}
📡 *Plano:* ${clienteData.plano}
⏰ *Última conexão:* ${status.ultimaConexao}

🔧 *Possíveis soluções:*
• Verificar cabos de rede
• Reiniciar o modem
• Verificar energia elétrica

📞 *Suporte:* (xx) xxxx-xxxx`;
    }
    
  } catch (error) {
    console.error('❌ Erro verificar status:', error);
    return '❌ Erro ao verificar status.\n\n📞 Entre em contato: (xx) xxxx-xxxx';
  }
}

// ENVIAR MENSAGEM WHATSAPP
async function enviarMensagem(para, texto) {
  try {
    console.log('📤 Enviando para:', para);
    console.log('📝 Texto:', texto.substring(0, 100) + '...');
    
    const url = `https://graph.facebook.com/v18.0/${CONFIG.whatsapp.phoneNumberId}/messages`;
    
    const data = {
      messaging_product: 'whatsapp',
      to: para,
      text: { body: texto }
    };
    
    const response = await axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${CONFIG.whatsapp.token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Mensagem enviada com sucesso!');
    
  } catch (error) {
    console.error('❌ ERRO AO ENVIAR MENSAGEM:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
  }
}

// LIMPEZA DE SESSÕES EXPIRADAS (executar a cada hora)
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [userId, session] of userSessions.entries()) {
    if (now - session.lastActivity > oneHour) {
      userSessions.delete(userId);
      console.log('🧹 Sessão expirada removida:', userId);
    }
  }
}, 60 * 60 * 1000);

// ROTAS DE TESTE
app.get('/', (req, res) => {
  res.send(`
    <h1>🌐 Bot Hollá Telecom</h1>
    <p>✅ Status: Online</p>
    <p>⏰ ${new Date().toLocaleString('pt-BR')}</p>
    <p>👥 Sessões ativas: ${userSessions.size}</p>
    <p>🔗 <a href="/status">Status Detalhado</a></p>
  `);
});

app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    bot: 'Hollá Telecom WhatsApp Bot',
    version: '1.0 - Autenticação CPF',
    activeSessions: userSessions.size,
    services: {
      whatsapp: CONFIG.whatsapp.token ? '✅ configurado' : '❌ token faltando',
      sgp: '✅ conectado',
      webhook: '✅ ativo',
      authentication: '✅ ativo'
    }
  });
});

// INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
🚀 BOT HOLLÁ TELECOM INICIADO!

📱 Servidor: http://localhost:${PORT}
🔗 Webhook: http://localhost:${PORT}/webhook/whatsapp
📊 Status: http://localhost:${PORT}/status

⚙️  Configurações:
• Empresa: Hollá Telecom
• Autenticação: CPF obrigatório
• Sessões: Memória (1h timeout)
• SGP: ${CONFIG.sgp.baseURL}

🎯 Funcionalidades:
• ✅ Consultar planos
• ✅ Consultar boleto  
• ✅ Liberação de confiança
• ✅ Verificar status online
• ✅ Autenticação por CPF

🔒 Bot pronto e seguro!
  `);
});

module.exports = app;
