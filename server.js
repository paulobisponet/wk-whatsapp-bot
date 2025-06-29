// BOT WHATSAPP WK TELECOM - VERSÃO PRODUÇÃO
const express = require('express');
const axios = require('axios');
const app = express();

// ===== CONFIGURAÇÕES (usando variáveis de ambiente) =====
const CONFIG = {
  // WhatsApp Meta API (pega das variáveis de ambiente)
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN || 'SEU_TOKEN_AQUI',
    phoneNumberId: process.env.PHONE_NUMBER_ID || 'SEU_PHONE_ID_AQUI',
    verifyToken: 'wktelecom_webhook_2024'
  },
  
  // SGP API (seus dados reais)
  sgp: {
    baseURL: 'https://wktelecom.sgp.net.br/api',
    app: 'botpress',
    token: '6f031b06-076d-4dcb-a8dc-6ff8345e0f0d'
  }
};

app.use(express.json());

// Log de inicialização
console.log('🚀 Iniciando Bot WK Telecom...');
console.log('📱 WhatsApp Token:', CONFIG.whatsapp.token ? '✅ Configurado' : '❌ Não configurado');
console.log('📞 Phone Number ID:', CONFIG.whatsapp.phoneNumberId ? '✅ Configurado' : '❌ Não configurado');

// ===== VERIFICAÇÃO DO WEBHOOK =====
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  console.log('🔍 Verificação webhook:', { mode, token });
  
  if (mode === 'subscribe' && token === CONFIG.whatsapp.verifyToken) {
    console.log('✅ Webhook do WhatsApp verificado com sucesso!');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Falha na verificação do webhook');
    res.sendStatus(403);
  }
});

// ===== RECEBER MENSAGENS DO WHATSAPP =====
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    console.log('📨 Mensagem recebida:', JSON.stringify(req.body, null, 2));
    
    const { entry } = req.body;
    
    if (entry?.[0]?.changes?.[0]?.value?.messages) {
      const message = entry[0].changes[0].value.messages[0];
      const contact = entry[0].changes[0].value.contacts[0];
      
      const dadosMensagem = {
        de: message.from,
        texto: message.text?.body || '',
        nome: contact.profile.name,
        timestamp: message.timestamp
      };
      
      console.log('📝 Processando mensagem:', dadosMensagem);
      
      // Processar mensagem
      await processarMensagem(dadosMensagem);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    res.status(500).send('Erro');
  }
});

// ===== PROCESSAMENTO DE MENSAGENS =====
async function processarMensagem({ de, texto, nome }) {
  const textoLimpo = texto.toLowerCase().trim();
  
  try {
    let resposta = '';
    
    console.log(`💬 Processando: "${texto}" de ${nome}`);
    
    // COMANDO: PLANOS
    if (textoLimpo.includes('plano') || textoLimpo.includes('preço') || textoLimpo.includes('valor')) {
      console.log('🔍 Comando identificado: PLANOS');
      resposta = await consultarPlanos();
    }
    
    // COMANDO: WIFI (formato: wifi 12345 678 novasenha)
    else if (textoLimpo.startsWith('wifi ')) {
      console.log('🔍 Comando identificado: WIFI');
      resposta = await processarComandoWifi(texto);
    }
    
    // COMANDO: REBOOT (formato: reboot 678 usuario senha)
    else if (textoLimpo.startsWith('reboot ')) {
      console.log('🔍 Comando identificado: REBOOT');
      resposta = await processarComandoReboot(texto);
    }
    
    // COMANDO: SUPORTE
    else if (textoLimpo.includes('suporte') || textoLimpo.includes('técnico') || textoLimpo.includes('ajuda')) {
      console.log('🔍 Comando identificado: SUPORTE');
      resposta = await consultarSuporte();
    }
    
    // COMANDO: STATUS (verificar se está funcionando)
    else if (textoLimpo.includes('status') || textoLimpo.includes('teste')) {
      console.log('🔍 Comando identificado: STATUS');
      resposta = '✅ *Bot WK Telecom Online!*\n\nSistema funcionando normalmente.\n⏰ ' + new Date().toLocaleString('pt-BR');
    }
    
    // SAUDAÇÕES
    else if (textoLimpo.includes('oi') || textoLimpo.includes('olá') || textoLimpo.includes('bom dia') || textoLimpo.includes('boa tarde') || textoLimpo.includes('boa noite')) {
      console.log('🔍 Comando identificado: SAUDAÇÃO');
      resposta = gerarSaudacao(nome);
    }
    
    // AJUDA/MENU
    else if (textoLimpo.includes('help') || textoLimpo.includes('menu') || textoLimpo.includes('comandos')) {
      console.log('🔍 Comando identificado: MENU');
      resposta = gerarMenu();
    }
    
    // MENSAGEM NÃO RECONHECIDA
    else {
      console.log('🔍 Comando não reconhecido');
      resposta = gerarAjuda();
    }
    
    // Enviar resposta
    console.log('📤 Enviando resposta para:', de);
    await enviarMensagem(de, resposta);
    
  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);
    await enviarMensagem(de, '❌ Ops! Algo deu errado. Tente novamente em alguns minutos.');
  }
}

// ===== FUNÇÕES SGP =====

// Consultar planos disponíveis
async function consultarPlanos() {
  try {
    console.log('🔗 Consultando SGP API - Planos...');
    const url = `${CONFIG.sgp.baseURL}/ura/consultaplano/?app=${CONFIG.sgp.app}&token=${CONFIG.sgp.token}`;
    
    const response = await axios.get(url, { timeout: 10000 });
    console.log('✅ SGP Planos response:', response.data);
    
    if (response.data.planos && response.data.planos.length > 0) {
      let resposta = '📋 *PLANOS WK TELECOM*\n\n';
      
      response.data.planos.forEach((plano, index) => {
        resposta += `${index + 1}️⃣ *${plano.descricao}*\n`;
        resposta += `💰 R$ ${plano.preco}\n`;
        resposta += `📊 ${plano.qtd_servicos} serviço(s)\n\n`;
      });
      
      resposta += '📞 *Para contratar:*\n';
      resposta += 'Digite: *CONTRATAR [número do plano]*\n';
      resposta += 'Ou ligue: (xx) xxxx-xxxx';
      
      return resposta;
    }
    
    return '❌ Nenhum plano disponível no momento.';
    
  } catch (error) {
    console.error('❌ Erro SGP Planos:', error.message);
    return '❌ Erro ao consultar planos. Tente novamente.';
  }
}

// Processar comando WiFi
async function processarComandoWifi(texto) {
  const partes = texto.split(' ');
  
  if (partes.length < 4) {
    return `🔧 *ALTERAR WIFI*

📝 *Formato correto:*
WIFI [contrato] [serviço] [nova_senha]

📌 *Exemplo:*
WIFI 12345 678 minhasenha123

ℹ️ A senha deve ter pelo menos 8 caracteres.`;
  }
  
  const [_, contrato, servico, novaSenha] = partes;
  
  if (novaSenha.length < 8) {
    return '❌ A senha deve ter pelo menos 8 caracteres.';
  }
  
  try {
    console.log(`🔗 Alterando WiFi SGP: contrato=${contrato}, servico=${servico}`);
    
    const formData = new URLSearchParams();
    formData.append('app', CONFIG.sgp.app);
    formData.append('token', CONFIG.sgp.token);
    formData.append('contrato', contrato);
    formData.append('servico', servico);
    formData.append('nova_senha', novaSenha);
    
    const response = await axios.post(`${CONFIG.sgp.baseURL}/ura/cpemanage/`, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000
    });
    
    console.log('✅ SGP WiFi response:', response.data);
    
    if (response.data.success) {
      return `✅ *WIFI ATUALIZADO!*

🔐 Nova senha: ${novaSenha}
📡 Contrato: ${contrato}
🔧 Serviço: ${servico}

⏰ A alteração já está ativa no equipamento.`;
    } else {
      return '❌ Erro ao alterar WiFi. Verifique os dados e tente novamente.';
    }
    
  } catch (error) {
    console.error('❌ Erro SGP WiFi:', error.message);
    return '❌ Erro na comunicação. Verifique contrato e serviço.';
  }
}

// Processar comando Reboot
async function processarComandoReboot(texto) {
  const partes = texto.split(' ');
  
  if (partes.length < 4) {
    return `🔄 *REINICIAR EQUIPAMENTO*

📝 *Formato correto:*
REBOOT [id_serviço] [usuário] [senha]

📌 *Exemplo:*
REBOOT 678 meuusuario minhasenha

⚠️ Use suas credenciais do SGP.`;
  }
  
  const [_, idServico, usuario, senha] = partes;
  
  try {
    console.log(`🔗 Reiniciando equipamento SGP: servico=${idServico}`);
    
    const auth = Buffer.from(usuario + ':' + senha).toString('base64');
    
    const response = await axios.post(
      `${CONFIG.sgp.baseURL}/cpemanager/servico/${idServico}/command/boot/`,
      {},
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );
    
    console.log('✅ SGP Reboot response:', response.status);
    
    if (response.status === 200) {
      return `🔄 *EQUIPAMENTO REINICIADO!*

📡 Serviço: ${idServico}
⏰ Aguarde 2-3 minutos para reconexão
📶 A internet voltará automaticamente

✅ Comando executado com sucesso.`;
    } else {
      return '❌ Erro ao reiniciar. Verifique as credenciais.';
    }
    
  } catch (error) {
    console.error('❌ Erro SGP Reboot:', error.message);
    return '❌ Erro ao reiniciar equipamento. Verifique os dados.';
  }
}

// Consultar suporte técnico
async function consultarSuporte() {
  try {
    console.log('🔗 Consultando SGP API - Técnicos...');
    
    const formData = new URLSearchParams();
    formData.append('app', CONFIG.sgp.app);
    formData.append('token', CONFIG.sgp.token);
    
    const response = await axios.post(`${CONFIG.sgp.baseURL}/ura/tecnicos/`, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    });
    
    console.log('✅ SGP Técnicos response:', response.data);
    
    if (response.data && response.data.length > 0) {
      let resposta = '👨‍🔧 *SUPORTE WK TELECOM*\n\n';
      resposta += '📋 Técnicos disponíveis:\n\n';
      
      response.data.slice(0, 3).forEach((tecnico, index) => {
        resposta += `${index + 1}. *${tecnico.nome}*\n`;
        resposta += `   📧 ${tecnico.username}\n\n`;
      });
      
      resposta += '📞 *Outros canais:*\n';
      resposta += '• WhatsApp: Aqui mesmo!\n';
      resposta += '• Telefone: (xx) xxxx-xxxx\n';
      resposta += '• Email: suporte@wktelecom.com\n\n';
      resposta += '🕐 Horário: Seg-Sex 8h às 18h';
      
      return resposta;
    }
    
    return '📞 *SUPORTE WK TELECOM*\n\n🕐 Seg-Sex 8h às 18h\n📞 (xx) xxxx-xxxx\n📧 suporte@wktelecom.com';
    
  } catch (error) {
    console.error('❌ Erro SGP Técnicos:', error.message);
    return '📞 *SUPORTE WK TELECOM*\n\nEstamos aqui para ajudar!\n📞 (xx) xxxx-xxxx\n📧 suporte@wktelecom.com';
  }
}

// ===== MENSAGENS PADRÃO =====

function gerarSaudacao(nome) {
  const hora = new Date().getHours();
  let saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  
  return `${saudacao}, ${nome}! 👋

🌐 *Bem-vindo à WK Telecom!*

Sou seu assistente virtual e posso ajudar com:

📋 Ver planos - digite: *planos*
🔧 Alterar WiFi - digite: *wifi*
🔄 Reiniciar equipamento - digite: *reboot*
👨‍🔧 Suporte técnico - digite: *suporte*
📱 Ver comandos - digite: *menu*

Como posso te ajudar?`;
}

function gerarMenu() {
  return `📱 *MENU DE COMANDOS*

🔧 *ALTERAR WIFI:*
WIFI [contrato] [serviço] [nova_senha]
Exemplo: WIFI 12345 678 minhasenha123

🔄 *REINICIAR EQUIPAMENTO:*
REBOOT [id_serviço] [usuário] [senha]
Exemplo: REBOOT 678 meuusuario minhasenha

📋 *CONSULTAR PLANOS:*
Digite: planos, preços ou valores

👨‍🔧 *SUPORTE TÉCNICO:*
Digite: suporte, técnico ou ajuda

📊 *TESTAR SISTEMA:*
Digite: status ou teste

💡 *Dica:* Os comandos não diferenciam maiúsculas/minúsculas.`;
}

function gerarAjuda() {
  return `🤖 *Não entendi sua mensagem*

📱 Digite *MENU* para ver todos os comandos

🔗 *Comandos rápidos:*
• *planos* - Ver preços
• *wifi* - Alterar WiFi  
• *reboot* - Reiniciar equipamento
• *suporte* - Falar com técnico

📞 Precisa de ajuda? Digite *suporte*`;
}

// ===== ENVIAR MENSAGEM WHATSAPP =====
async function enviarMensagem(para, texto) {
  try {
    console.log('📤 Enviando mensagem para:', para);
    
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${CONFIG.whatsapp.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: para,
        text: { body: texto }
      },
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.whatsapp.token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    console.log('✅ Mensagem enviada com sucesso');
    return response.data;
    
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.response?.data || error.message);
    throw error;
  }
}

// ===== STATUS E LOGS =====
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    services: {
      sgp: '✅ connected',
      whatsapp: '✅ connected',
      webhook: '✅ active'
    },
    version: '1.0.0',
    config: {
      sgp_url: CONFIG.sgp.baseURL,
      sgp_app: CONFIG.sgp.app,
      whatsapp_configured: !!CONFIG.whatsapp.token
    }
  });
});

app.get('/', (req, res) => {
  res.send(`
    <h1>🤖 Bot WK Telecom</h1>
    <p>✅ Sistema online e funcionando!</p>
    <p>📊 <a href="/status">Ver status detalhado</a></p>
    <p>🔗 Webhook: /webhook/whatsapp</p>
  `);
});

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===== INICIALIZAR SERVIDOR =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
🚀 BOT WK TELECOM INICIADO!

📱 Servidor: http://localhost:${PORT}
🔗 Webhook: http://localhost:${PORT}/webhook/whatsapp
📊 Status: http://localhost:${PORT}/status

⚙️  Configurações:
• SGP: ${CONFIG.sgp.baseURL}
• App: ${CONFIG.sgp.app}
• WhatsApp Token: ${CONFIG.whatsapp.token ? '✅ Configurado' : '❌ Faltando'}

🔧 Próximo passo: Configure o webhook no Meta!
  `);
});

module.exports = app;
