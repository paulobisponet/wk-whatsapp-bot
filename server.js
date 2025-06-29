// BOT WHATSAPP WK TELECOM – JUNINHO IA
// Versão 3.2 – Integração com ChatGPT + SGP Expandido

// --------------------------------------------------------------------
// Inclui:
// - Menu com botões interativos ampliado
// - Personalização das mensagens por endpoint
// - Fluxos para trocar vencimento e mudar plano (simulados)
// - Integração com ChatGPT (fallback para mensagens não compreendidas)
// --------------------------------------------------------------------

const axios = require('axios');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'SUA_API_KEY_AQUI';

// [...] (código anterior preservado)

async function enviarMenuComBotoes(num) {
  const payload = {
    messaging_product: 'whatsapp',
    to: num,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: '👋 Olá! Como posso ajudar hoje? Escolha uma opção abaixo:' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'planos',     title: '📶 Planos' } },
          { type: 'reply', reply: { id: 'vencimento', title: '📅 Vencimento' } },
          { type: 'reply', reply: { id: 'fatura',     title: '🧾 2ª Via' } },
          { type: 'reply', reply: { id: 'historico',  title: '📜 Histórico' } },
          { type: 'reply', reply: { id: 'mudar-venc', title: '⚙️ Mudar Vencimento' } },
          { type: 'reply', reply: { id: 'trocar-plano', title: '📦 Trocar Plano' } },
          { type: 'reply', reply: { id: 'wifi',       title: '🔐 Alterar Wi‑Fi' } },
          { type: 'reply', reply: { id: 'reboot',     title: '🔄 Reboot' } },
          { type: 'reply', reply: { id: 'suporte',    title: '👨‍🔧 Suporte' } }
        ]
      }
    }
  };
  return enviarPayload(payload);
}

async function handleButton(num, id, nome) {
  switch (id) {
    case 'planos':         return enviarMensagem(num, await consultarPlanos());
    case 'fatura':         return solicitarCpf(num, 'fatura');
    case 'vencimento':     return solicitarCpf(num, 'vencimento');
    case 'historico':      return solicitarCpf(num, 'historico');
    case 'wifi':           return enviarMensagem(num, 'Envie: WIFI [contrato] [serviço] [nova_senha]');
    case 'reboot':         return enviarMensagem(num, 'Envie: REBOOT [id_serviço] [usuário] [senha]');
    case 'suporte':        return enviarMensagem(num, await consultarSuporte());
    case 'mudar-venc':     return solicitarCpf(num, 'mudar-vencimento');
    case 'trocar-plano':   return solicitarCpf(num, 'trocar-plano');
    default:               return enviarMensagem(num, geraAjuda());
  }
}

async function processText(num, text, nome) {
  const t = text.trim();
  const low = t.toLowerCase();

  if (/^\d{11}$/.test(t)) {
    const session = getSession(num);
    if (session.awaiting) {
      setSession(num, { cpf: t });
      switch (session.awaiting) {
        case 'fatura':           return enviarMensagem(num, await consultarFaturasCPF(t));
        case 'vencimento':       return enviarMensagem(num, await consultarVencimentoCPF(t));
        case 'historico':        return enviarMensagem(num, await consultarHistoricoSuporteCPF(t));
        case 'mudar-vencimento': return enviarMensagem(num, await mudarVencimentoCPF(t));
        case 'trocar-plano':     return enviarMensagem(num, await trocarPlanoCPF(t));
      }
    }
  }

  // Se não for reconhecido, usar IA
  const ia = await responderComIA(text);
  return enviarMensagem(num, ia);
}

async function mudarVencimentoCPF(cpf) {
  return `⚙️ Para alterar a data de vencimento da sua fatura, entre em contato com nosso setor financeiro pelo WhatsApp (81) 99160-0572 ou pela Central do Assinante.`;
}

async function trocarPlanoCPF(cpf) {
  const planos = await consultarPlanos();
  return `📦 Para trocar de plano, envie o nome do plano desejado conforme abaixo e aguarde confirmação:
\n${planos}`;
}

// ChatGPT Fallback
async function responderComIA(text) {
  try {
    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Você é um atendente virtual da empresa WK Telecom. Seja educado, direto e prestativo.' },
        { role: 'user', content: text }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return res.data.choices[0].message.content.trim();
  } catch (err) {
    console.error('Erro na IA:', err.message);
    return '🤖 Desculpe, não consegui entender. Tente reformular ou digite *menu* para opções.';
  }
}
