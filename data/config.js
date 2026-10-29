/*
 * CONFIGURAÇÕES DA LOJA — Hamburguer com H
 * ------------------------------------------------------------
 * Edite os valores abaixo e salve o arquivo. Não é preciso mexer
 * em nenhum outro arquivo para mudar estas informações.
 *
 * Dicas:
 * - Valores em dinheiro usam ponto como separador decimal: 5.00, 12.50
 * - Textos ficam entre aspas: "assim"
 * - Mantenha as vírgulas no fim de cada linha.
 */
window.CONFIG = {
  nome: "Hamburguer com H",

  // Número do WhatsApp com código do país (55) e DDD, só números.
  // Ele é exibido automaticamente como (19) 97172-0322.
  whatsapp: "5519971720322",

  instagram: "https://www.instagram.com/hamburguercomh/",

  endereco: "Rua Pedro Leite, nº 358 — Santa Cruz da Conceição/SP",

  // Taxa de entrega em reais. Use 0 para entrega grátis.
  taxaEntrega: 5.00,

  // Pedido mínimo em reais (sem contar a entrega). 0 = sem mínimo.
  pedidoMinimo: 0,

  // Formas de pagamento mostradas no checkout, na ordem desejada.
  // Se uma delas se chamar exatamente "Dinheiro", o site pergunta o troco.
  formasPagamento: [
    "Pix",
    "Cartão de crédito (na entrega)",
    "Cartão de débito (na entrega)",
    "Dinheiro"
  ],

  aceitaEntrega: true,
  aceitaRetirada: true,

  // Horário de funcionamento (horário de Brasília).
  // - Para fechar um dia inteiro, troque a linha por:   segunda: { fechado: true },
  // - Se fechar depois da meia-noite, é só colocar o horário normalmente
  //   (ex.: abre: "19:00", fecha: "01:00").
  horario: {
    domingo: { abre: "19:00", fecha: "23:30" },
    segunda: { abre: "19:00", fecha: "23:30" },
    terca:   { abre: "19:00", fecha: "23:30" },
    quarta:  { abre: "19:00", fecha: "23:30" },
    quinta:  { abre: "19:00", fecha: "23:30" },
    sexta:   { abre: "19:00", fecha: "23:30" },
    sabado:  { abre: "19:00", fecha: "23:30" }
  },

  // Fuso horário usado para calcular "Aberto agora" e os itens de terça a quinta.
  fusoHorario: "America/Sao_Paulo"
};
