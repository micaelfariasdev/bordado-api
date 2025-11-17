import { ClienteController } from '../controllers/ClienteController.js';
import { PedidoController } from '../controllers/PedidoController.js';
import { Conversation } from '../models/Conversation.js';
import { whatsapp } from '../routes/wwebjsRoutes.js';


function titleCase(str) {
  return String(str)
    .trim()
    .split(/\s+/)
    .map(w => w[0] ? w[0].toLocaleUpperCase('pt-BR') + w.slice(1).toLocaleLowerCase('pt-BR') : '')
    .join(' ')
}

export async function getStage(userId) {
  const conv = await Conversation.findOne({ where: { userId } });
  if (!conv) return null;

  const oneHour = 60 * 60 * 1000;
  const expired =
    new Date().getTime() - new Date(conv.lastInteraction).getTime() > oneHour;

  if (expired) {
    await conv.destroy();
    return null;
  }

  return conv.stage;
}

export async function setStage(userId, stageData) {
  const [conv, created] = await Conversation.findOrCreate({
    where: { userId },
    defaults: { stage: stageData, lastInteraction: new Date() },
  });

  if (!created) {
    conv.stage = stageData;
    conv.lastInteraction = new Date();
    await conv.save();
  }
}

export async function AutoBot(msg) {
  const userId = msg.from;
  let state = (await getStage(userId)) || {
    userId,
    currentStage: 1,
    data: {},
  };

  const userMessage = msg.body.toLowerCase().trim();
  const numberClient = userId.split('@')[0].slice(-8);
  const numberClientDDD = userId.split('@')[0].replace('55', '');

  const clientes = await ClienteController.listar();
  const lista = clientes.map((c) => c.toJSON());

  const cliente = lista.find(
    (c) => c.numeroCliente && String(c.numeroCliente).endsWith(numberClient)
  );
  if (userMessage.toLowerCase().includes('inicio')) {
    state.currentStage = 1;
  }

  switch (state.currentStage) {
    case 1:
      if (userMessage) {
        await whatsapp.enviarMensagem(
          userId,
          'Olá! Seja bem-vindo(a) à Joyce Bordados! 😊'
        );

        if (cliente) {
          await whatsapp.enviarMensagem(
            userId,
            `Que bom ter você de volta, ${cliente.nomeCliente}! 😊`
          );
          const pedidosPendentes =
            cliente?.pedidos?.filter(
              (c) => String(c.status || '') !== 'entregue'
            ) || [];
          if (pedidosPendentes) {
            await whatsapp.enviarMensagem(
              userId,
              `Verifiquei aqui e encontrei ${pedidosPendentes.length} ${pedidosPendentes.length > 1 ? 'pedidos' : 'pedido'
              } ${pedidosPendentes.length > 1 ? 'pendentes' : 'pendente'
              }. Deseja saber mais detalhes sobre ${pedidosPendentes.length > 1 ? 'eles' : 'ele'
              }?`
            );

            state.currentStage = 2;
          }
        } else {
            await whatsapp.enviarMensagem(
              userId,
              `Posso registrar um novo orçamento para você?`
            );
            state.currentStage = 3;
          }
      } else {
        return;
      }
      break;
    case 2:
      if (!userMessage) return;

      if (userMessage.toLowerCase().includes('sim')) {
        const pedidosPendentes =
          cliente?.pedidos?.filter(
            (c) => String(c.status || '') !== 'entregue'
          ) || [];

        if (pedidosPendentes.length > 1) {
          let texto = `Aqui estão seus pedidos pendentes:\n\n`;
          pedidosPendentes.forEach((p, i) => {
            texto += `#${p.id} - ${p.nomeProduto} (${p.status})\n`;
          });
          texto += `\nDeseja falar sobre algum deles? digite o numero do pedido`;
          await whatsapp.enviarMensagem(userId, texto);
          state.currentStage = 4;
        } else if (pedidosPendentes.length === 1) {
          const idPedido = pedidosPendentes[0].id;
          let pedido = await PedidoController.buscarPorId(idPedido);
          pedido = pedido.toJSON();
          const mensagem = `📦 Pedido #${pedido.id}
    
    👤 Cliente: ${pedido.cliente.nomeCliente}
    🧵 Produto: ${pedido.nomeProduto}
    📅 Recebido em: ${new Date(pedido.dataRecebimento).toLocaleDateString(
            'pt-BR'
          )}
    📆 Previsão de entrega: ${new Date(pedido.dataEntrega).toLocaleDateString(
            'pt-BR'
          )}
    💰 Forma de pagamento: ${pedido.formaPagamento}
    💸 Valor unitário: R$ ${pedido.precoUnt.toFixed(2)}
    📦 Quantidade: ${pedido.quantidade}
    📄 Status: ${pedido.status.toUpperCase()}
    ${pedido.pago ? '✅ Pago' : '⏳ Aguardando pagamento'}`;
          await whatsapp.enviarMensagem(userId, mensagem);
          await whatsapp.enviarMensagem(
            userId,
            'Se mesmo assim ainda tiver alguma dúvida e queira falar com um atendente digite "sim"'
          );
          state.currentStage = 6;
        } else {
          await whatsapp.enviarMensagem(
            userId,
            'Ocorreu algum problema, não encontro mais pedidos. Deseja solicitar um novo orçamento?'
          );
          state.currentStage = 3;
        }
      } else if (userMessage
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove acentos
        .toLowerCase()
        .includes('nao')) {
        await whatsapp.enviarMensagem(
          userId,
          'Sem problema! Deseja solicitar um novo orçamento?'
        );
        state.currentStage = 3;
      } else {
        await whatsapp.enviarMensagem(
          userId,
          'Desculpe, não entendi. Você quer falar sobre seus pedidos pendentes? (responda "sim" ou "não")'
        );
      }
      break;
    case 3:
      if (!userMessage) return;
      if (userMessage.toLowerCase().includes('sim')) {
        if (cliente) {
          await whatsapp.enviarMensagem(
            userId,
            `Ótimo ${cliente.nomeCliente}, agora poderia me confirmar se você deseja o serviço de bordado. [sim/não]`
          );

          state.currentStage = 8;

        } else {
          await whatsapp.enviarMensagem(
            userId,
            'Perfeito! Antes de prosseguirmos, poderia me informar seu nome completo para que eu possa registrar seu contato?(Exemplo: Joyce Farias)'
          );
          state.currentStage = 7;
        }
      } else if (userMessage
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove acentos
        .toLowerCase()
        .includes('nao')) {
        await whatsapp.enviarMensagem(
          userId,
          'Se mesmo assim ainda tiver alguma dúvida e queira falar com um atendente digite "sim"'
        );
        state.currentStage = 6;
      }
      break;
    case 4:
      if (!userMessage) return;

      const numeroMsg = Number(userMessage.replace(/\D/g, ''));
      if (isNaN(numeroMsg)) return;

      const pedidosPendentes =
        cliente?.pedidos?.filter(
          (c) => String(c.status || '') !== 'entregue'
        ) || [];

      const pedidoIsFrom = pedidosPendentes.find((p) => p.id === numeroMsg);

      if (pedidoIsFrom) {
        let pedido = await PedidoController.buscarPorId(numeroMsg);
        pedido = pedido.toJSON();
        const mensagem = `📦 Pedido #${pedido.id}
    
    👤 Cliente: ${pedido.cliente.nomeCliente}
    🧵 Produto: ${pedido.nomeProduto}
    📅 Recebido em: ${new Date(pedido.dataRecebimento).toLocaleDateString(
          'pt-BR'
        )}
    📆 Previsão de entrega: ${new Date(pedido.dataEntrega).toLocaleDateString(
          'pt-BR'
        )}
    💰 Forma de pagamento: ${pedido.formaPagamento}
    💸 Valor unitário: R$ ${pedido.precoUnt.toFixed(2)}
    📦 Quantidade: ${pedido.quantidade}
    📄 Status: ${pedido.status.toUpperCase()}
    ${pedido.pago ? '✅ Pago' : '⏳ Aguardando pagamento'}`;
        await whatsapp.enviarMensagem(userId, mensagem);
        await whatsapp.enviarMensagem(
          userId,
          'Deseja mais alguma informação sobre outro pedido?'
        );
        state.currentStage = 5;
      } else {
        await whatsapp.enviarMensagem(
          userId,
          'Não encontrei nenhum pedido seu com esse id, porfavor tente novamente'
        );
        let texto = `Aqui estão seus pedidos pendentes:\n\n`;
        pedidosPendentes.forEach((p, i) => {
          texto += `#${p.id} - ${p.nomeProduto} (${p.status})\n`;
        });
        texto += `\nDeseja falar sobre algum deles? digite o numero do pedido`;
        await whatsapp.enviarMensagem(userId, texto);
        state.currentStage = 4;
      }
      break;
    case 5:
      if (!userMessage) return;
      if (userMessage.toLowerCase().includes('sim')) {
        const pedidosPendentes =
          cliente?.pedidos?.filter(
            (c) => String(c.status || '') !== 'entregue'
          ) || [];

        if (pedidosPendentes.length > 1) {
          let texto = `Aqui estão seus pedidos pendentes:\n\n`;
          pedidosPendentes.forEach((p, i) => {
            texto += `#${p.id} - ${p.nomeProduto} (${p.status})\n`;
          });
          texto += `\nDeseja falar sobre algum deles? digite o numero do pedido`;
          await whatsapp.enviarMensagem(userId, texto);
          state.currentStage = 4;
        }
      } else {
        await whatsapp.enviarMensagem(
          userId,
          'Se mesmo assim ainda tiver alguma dúvida e queira falar com um atendente digite "sim"'
        );
        state.currentStage = 6;
      }
      break;
    case 6:
      if (!userMessage) return;
      if (userMessage.toLowerCase().includes('sim')) {
        await whatsapp.enviarMensagem(
          userId,
          'Ótimo, fique no aguardo que vamos lhe responder assim que possível'
        );
        state.currentStage = 10;

      } else if (userMessage
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove acentos
        .toLowerCase()
        .includes('nao')) {
        await whatsapp.enviarMensagem(
          userId,
          'Tudo bem! 😊 Se precisar de algo mais, é só mandar mensagem — estarei aqui para ajudar. Agradecemos o seu contato e desejamos um excelente dia!'
        );
        state.currentStage = 1;

      }
      break
    case 7:
      if (!userMessage) return;
      let stageCliente
      if (cliente) {
        const data = {
          nomeCliente: titleCase(userMessage),
          numeroCliente: numberClientDDD
        }
        stageCliente = await ClienteController.atualizar(cliente.id, data)
      } else {
        const data = {
          nomeCliente: titleCase(userMessage),
          numeroCliente: numberClientDDD
        }
        stageCliente = await ClienteController.criar(data)
      }
      await whatsapp.enviarMensagem(
        userId,
        `Perfeito, ${stageCliente.nomeCliente}! Seu nome foi registrado com sucesso. Se quiser alterar depois, é só digitar mudar.`
      );
      await whatsapp.enviarMensagem(
        userId,
        `Agora poderia me confirmar se você deseja o serviço de bordado. [sim/não]`
      );
      state.currentStage = 8;

      break
    case 8:
      if (!userMessage) return;
      if (userMessage.toLowerCase().includes('mudar')) {
        await whatsapp.enviarMensagem(
          userId,
          'Tudo bem, vamos atualizar então. Envie como gostaria que seu nome fosse salvo. (Exemplo: Joyce Farias)'
        );
        state.currentStage = 7;
      } else if (userMessage.toLowerCase().includes('sim')) {
        await whatsapp.enviarMensagem(
          userId,
          'Por favor, envie uma breve descrição do bordado desejado (tamanho, quantidade) e, se possível, a imagem de referência — tudo em uma única mensagem.'
        );
        state.currentStage = 9;
      }
      break
    case 9:
      if (!userMessage) return;
      await whatsapp.enviarMensagem(
        userId,
        'So um momento, estou cadastrando sua solitação'
      );
      const data = {
        nomeProduto: 'Orçamento Bordada',
        dataRecebimento: new Date(),
        dataEntrega: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        descricao: userMessage,
        clienteId: cliente.id
      }

      const novo = await PedidoController.criar(data)
      await whatsapp.enviarMensagem(
        userId,
        'Seu pedido foi registrado com sucesso em nosso sistema. 🎉'
      );
      const mensagem = `📦 Pedido #${novo.id}
      
      👤 Cliente: ${cliente.nomeCliente}
      🧵 Descrição: ${novo.descricao}
      📄 Status: ${novo.status.toUpperCase()}`
      await whatsapp.enviarMensagem(
        userId,
        mensagem
      );
      await whatsapp.enviarMensagem(
        userId,
        'Assim que analisarmos, entraremos em contato com os próximos passos.'
      );
      await whatsapp.enviarMensagem(
        userId,
        'Se mesmo assim ainda tiver alguma dúvida e queira falar com um atendente digite "sim"'
      );
      state.currentStage = 6;
      break
    case 10:


  }
  await setStage(userId, state);
}
