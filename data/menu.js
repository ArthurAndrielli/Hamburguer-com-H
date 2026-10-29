/*
 * CARDÁPIO — Hamburguer com H
 * ------------------------------------------------------------
 * Aqui ficam todos os itens, descrições, preços e categorias.
 *
 * Campos de cada item:
 *   nome       (obrigatório) Nome exibido no cardápio.
 *   preco      (obrigatório) Preço em reais, com ponto: 41.90
 *   descricao  (opcional)    Texto abaixo do nome.
 *   imagem     (opcional)    Caminho da foto, ex.: "img/bacon.jpg".
 *                            Sem foto, o item aparece só com texto.
 *   opcoes     (opcional)    Lista de opções que o cliente precisa escolher,
 *                            ex.: ["Coca-Cola", "Guaraná", "Fanta"].
 *   rotulo     (opcional)    Complemento que aparece no pedido junto da opção
 *                            escolhida, ex.: "Guaraná (lata)".
 *   consultar  (opcional)    Mostra um campo de texto para o cliente dizer o
 *                            que deseja (ex.: "Sabor desejado"). A
 *                            disponibilidade é confirmada pelo WhatsApp.
 *   exemplo    (opcional)    Dica que aparece dentro do campo "consultar".
 *   esgotado   (opcional)    true para mostrar o item como indisponível.
 *
 * Campos de cada categoria:
 *   id, nome, descricao (opcional), itens
 *   tipo: "hamburguer"  -> os itens abrem a escolha de pão e adicionais.
 *   dias: [2, 3, 4]     -> só pode ser pedido nesses dias da semana
 *                          (0 = domingo, 1 = segunda ... 6 = sábado).
 *   selo: "..."         -> etiqueta mostrada em cada item da categoria.
 *
 * Para remover um item, apague o bloco { ... } dele (com a vírgula).
 * Para adicionar, copie um bloco parecido e altere os valores.
 */
window.MENU = {
  // Pães oferecidos nos hambúrgueres. A escolha é obrigatória.
  // "preco" é o valor somado ao lanche (0 = sem custo extra).
  // "resumo" é como o pão aparece no pedido: "Pão: com queijo gratinado".
  paes: [
    { nome: "Pão de hambúrguer tradicional", resumo: "tradicional", preco: 0 },
    { nome: "Pão com queijo gratinado", resumo: "com queijo gratinado", preco: 0 }
  ],

  // Adicionais dos hambúrgueres (preço por unidade).
  adicionais: [
    { nome: "Ovo", preco: 3.00 },
    { nome: "Cebola caramelizada", preco: 8.00 },
    { nome: "Picles", preco: 8.00 },
    { nome: "Bacon", preco: 8.00 },
    { nome: "Cebola crispy", preco: 8.00 },
    { nome: "Abacaxi grelhado", preco: 8.00 },
    { nome: "Anéis de cebola (3 un.)", preco: 8.00 },
    { nome: "Cheddar", preco: 8.00 },
    { nome: "Catupiry", preco: 8.00 },
    { nome: "Cream cheese", preco: 8.00 },
    { nome: "Hambúrguer", preco: 14.00 },
    { nome: "Queijo empanado", preco: 14.00 },
    { nome: "Hambúrguer de berinjela", preco: 14.00 }
  ],

  // Aviso mostrado no campo de observação dos hambúrgueres.
  avisoHamburguer: "Não substituímos ingredientes. Todos os lanches recebem molho.",

  categorias: [
    {
      id: "hamburgueres",
      nome: "Hambúrgueres",
      descricao: "Escolha o pão e, se quiser, acrescente adicionais.",
      tipo: "hamburguer",
      itens: [
        { nome: "Levinho", descricao: "Queijo, tomate e manjericão", preco: 23.90 },
        { nome: "Burguer", descricao: "Carne e queijo", preco: 29.90 },
        { nome: "Salada", descricao: "Carne, queijo, alface, cebola roxa e tomate", preco: 34.90 },
        { nome: "Pernil", descricao: "Pernil, cebola e tomate", preco: 38.90 },
        { nome: "Bacon", descricao: "Carne, queijo, alface, cebola roxa, tomate e bacon", preco: 39.90 },
        { nome: "Cream Cheese", descricao: "Carne, cream cheese e cebola caramelizada", preco: 41.90 },
        { nome: "Cheddar Crispy", descricao: "Carne, queijo, cebola crocante caramelizada e cheddar", preco: 41.90 },
        { nome: "Erick J.", descricao: "Carne, queijo, molho especial com maionese Heinz, picles e conhaque, cenoura ralada", preco: 41.90 },
        { nome: "Vegetariano", descricao: "Queijo empanado, molho especial com cenoura ralada, alface, tomate e cebola roxa", preco: 41.90 },
        { nome: "Gorgonzola", descricao: "Carne, gorgonzola e cebola roxa caramelizada", preco: 43.90 },
        { nome: "Tropical", descricao: "Carne, queijo, bacon e abacaxi grelhado no molho barbecue", preco: 43.90 },
        { nome: "Quatro Queijos", descricao: "Carne, queijo, gorgonzola, cheddar, provolone e cream cheese com cebola caramelizada", preco: 43.90 },
        { nome: "Árabe", descricao: "Carne, coalhada árabe, queijo, cebola roxa, hortelã, alface e tomate", preco: 43.90 },
        { nome: "Onion", descricao: "Carne, queijo, anéis de cebola e bacon", preco: 46.90 },
        { nome: "Super H", descricao: "Carne, queijo empanado, molho especial, alface, tomate e cebola", preco: 46.90 },
        { nome: "Ogro", descricao: "Carne, queijo empanado, anéis de cebola, bacon e ovo, alface, cebola roxa e tomate", preco: 54.90 }
      ]
    },
    {
      id: "terca-a-quinta",
      nome: "De terça a quinta",
      descricao: "Especiais servidos somente de terça a quinta-feira.",
      tipo: "hamburguer",
      dias: [2, 3, 4],
      selo: "Terça a quinta",
      avisoIndisponivel: "Disponível de terça a quinta",
      itens: [
        { nome: "Frango Muito Especial", descricao: "Filé de frango em cubos, cream cheese, provolone, mussarela, tomate, cebola roxa e alface", preco: 46.90 },
        { nome: "Churrasco", descricao: "Carne grelhada com queijo, alface, cebola roxa e tomate", preco: 46.90 }
      ]
    },
    {
      id: "porcoes",
      nome: "Porções",
      itens: [
        { nome: "Fritas individual", preco: 16.00 },
        { nome: "Meia porção de fritas", preco: 28.00 },
        { nome: "Fritas", preco: 39.00 },
        { nome: "Fritas especiais", descricao: "Com cheddar e bacon", preco: 46.00 },
        { nome: "Meia porção de anéis de cebola", preco: 28.00 },
        { nome: "Anéis de cebola", preco: 39.00 }
      ]
    },
    {
      id: "sucos",
      nome: "Sucos",
      descricao: "Naturais, com frutas da estação. Consulte a disponibilidade.",
      itens: [
        { nome: "Suco no copo 500 ml", preco: 12.00, consultar: "Sabor desejado", exemplo: "Qual fruta você prefere?" },
        { nome: "Suco na garrafinha 500 ml", preco: 12.00, consultar: "Sabor desejado", exemplo: "Qual fruta você prefere?" },
        { nome: "Soda italiana", descricao: "Consulte os sabores", preco: 18.00, consultar: "Sabor desejado", exemplo: "Qual sabor você prefere?" }
      ]
    },
    {
      id: "latas",
      nome: "Latas",
      itens: [
        { nome: "Coca-Cola / Coca-Cola Zero 200 ml", preco: 3.00, opcoes: ["Coca-Cola", "Coca-Cola Zero"], rotulo: "lata 200 ml" },
        { nome: "Coca-Cola / Guaraná / Fanta", preco: 7.00, opcoes: ["Coca-Cola", "Guaraná", "Fanta"], rotulo: "lata" },
        { nome: "Skol / Brahma / Antarctica", preco: 7.00, opcoes: ["Skol", "Brahma", "Antarctica"], rotulo: "lata" },
        { nome: "Schweppes / Tônica / Suco Del Valle", preco: 8.00, opcoes: ["Schweppes", "Tônica", "Suco Del Valle"], rotulo: "lata" },
        { nome: "Original / Budweiser / Heineken", preco: 9.50, opcoes: ["Original", "Budweiser", "Heineken"], rotulo: "lata" }
      ]
    },
    {
      id: "garrafas",
      nome: "Garrafas 600 ml",
      itens: [
        { nome: "Itubaína", preco: 8.00 },
        { nome: "Coca-Cola 600 ml", preco: 9.00 },
        { nome: "Skol / Brahma / Antarctica", preco: 12.00, opcoes: ["Skol", "Brahma", "Antarctica"], rotulo: "600 ml" },
        { nome: "Original", preco: 16.00 },
        { nome: "Heineken", preco: 18.00 }
      ]
    },
    {
      id: "cervejas",
      nome: "Cervejas",
      itens: [
        { nome: "Long neck", descricao: "Budweiser, Eisenbahn, Heineken ou Stella", preco: 12.00, opcoes: ["Budweiser", "Eisenbahn", "Heineken", "Stella"], rotulo: "long neck" },
        { nome: "Cervejas especiais", descricao: "Consulte as cervejas disponíveis", preco: 24.90, consultar: "Cerveja desejada", exemplo: "Qual estilo ou marca você prefere?" }
      ]
    },
    {
      id: "outros",
      nome: "Outros",
      itens: [
        { nome: "Água", preco: 4.00 },
        { nome: "Kapo", preco: 5.00 },
        { nome: "Refrigerante KS", preco: 5.50 },
        { nome: "H2O", preco: 8.00 },
        { nome: "Guaraná Antarctica 1 L", preco: 8.00 },
        { nome: "Cruzeiro 2 L", preco: 10.00 },
        { nome: "Coca-Cola 2 L", preco: 18.00 }
      ]
    }
  ]
};
