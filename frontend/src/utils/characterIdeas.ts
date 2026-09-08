export interface CharacterIdea {
  category: string;
  name: string;
  starterTips: string[];
}

export const CHARACTER_IDEAS: CharacterIdea[] = [
  {
    category: 'Animações & Desenhos',
    name: 'Bob Esponja',
    starterTips: ['Amarelo e com formato quadrado', 'Tem buraquinhos por todo o corpo', 'Usa calça marrom e gravata vermelha', 'Tem dois dentes grandes na frente']
  },
  {
    category: 'Animações & Desenhos',
    name: 'Shrek',
    starterTips: ['É verde e grandalhão', 'As orelhas parecem pequenos tubos cônicos', 'Veste um colete marrom curto', 'Tem uma barriga bem avantajada']
  },
  {
    category: 'Animações & Desenhos',
    name: 'Pikachu',
    starterTips: ['É amarelo com bochechas vermelhas circulares', 'Tem orelhas compridas com pontas pretas', 'O rabo tem formato de raio elétrico']
  },
  {
    category: 'Games',
    name: 'Super Mario',
    starterTips: ['Usa um boné vermelho com uma aba na frente', 'Tem um bigode preto farto e arredondado', 'Veste macacão azul com camisa vermelha', 'Nariz grande e redondo']
  },
  {
    category: 'Games',
    name: 'Sonic',
    starterTips: ['É azul e tem espinhos pontudos apontando para trás', 'Usa luvas brancas e tênis vermelhos', 'Tem olhos grandes que se conectam no meio']
  },
  {
    category: 'Super-Heróis',
    name: 'Batman',
    starterTips: ['Usa uma máscara com orelhas pontudas que lembram um animal noturno', 'Tem uma capa preta longa', 'Símbolo no peito com asas pretas abertas', 'Cinto de utilidades amarelo']
  },
  {
    category: 'Super-Heróis',
    name: 'Homem-Aranha',
    starterTips: ['Máscara vermelha com dois grandes olhos brancos pontudos', 'Traje vermelho e azul com linhas que lembram teia', 'Geralmente fica agachado como um aracnídeo']
  },
  {
    category: 'Cinema & Ficção',
    name: 'Darth Vader',
    starterTips: ['Capacete preto imponente com grade triangular na boca', 'Capa preta comprida até o chão', 'Painel cheio de botões coloridos no peito', 'Empunha um sabre de luz vermelho']
  },
  {
    category: 'Cinema & Ficção',
    name: 'Harry Potter',
    starterTips: ['Usa óculos perfeitamente redondos', 'Tem uma cicatriz em formato de raio na testa', 'Cachecol listrado vermelho e amarelo', 'Segura uma varinha de madeira']
  },
  {
    category: 'Comédia & Memes',
    name: 'Homer Simpson',
    starterTips: ['Pele amarela e cabeça redonda', 'Tem apenas dois fios de cabelo curvados no topo', 'Barba por fazer meio acastanhada ao redor da boca', 'Camisa branca e calça azul']
  },
  {
    category: 'Comédia & Memes',
    name: 'Minion',
    starterTips: ['Formato de cápsula amarela arredondada', 'Um ou dois olhos com óculos prateados enormes', 'Veste macacão jeans azul com bolsos', 'Tem poucos fios de cabelo espetados']
  },
  {
    category: 'Conceito Cômico',
    name: 'Dinossauro de Patins',
    starterTips: ['T-Rex verde com bracinhos minúsculos', 'Na cabeça usa um capacete de segurança', 'Nos pés tem patins com rodinhas coloridas']
  },
  {
    category: 'Conceito Cômico',
    name: 'Pinguim de Óculos Escuros',
    starterTips: ['Corpo de pinguim preto e branco', 'Bico laranja e óculos escuros estilo aviador', 'Segura um picolé com a nadadeira']
  }
];

export function getRandomIdea(): CharacterIdea {
  const index = Math.floor(Math.random() * CHARACTER_IDEAS.length);
  return CHARACTER_IDEAS[index];
}
