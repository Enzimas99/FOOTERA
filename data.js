export const COUNTRIES = ['Brasil', 'Argentina', 'Inglaterra', 'Espanha', 'Itália', 'Portugal'];

export const POSITIONS = {
  goleiro: { label: 'Goleiro', short: 'GOL', weights: { reflexos: 5, defesa: 5, posicionamento: 3, passe: 1, forca: 1 } },
  zagueiro: { label: 'Zagueiro', short: 'ZAG', weights: { marcacao: 5, desarme: 5, posicionamento: 4, forca: 3, cabeca: 3, passe: 1 } },
  lateral_direito: { label: 'Lateral-direito', short: 'LD', weights: { velocidade: 3, aceleracao: 2, passe: 2, resistencia: 3, marcacao: 3, desarme: 3, controle: 1 } },
  lateral_esquerdo: { label: 'Lateral-esquerdo', short: 'LE', weights: { velocidade: 3, aceleracao: 2, passe: 2, resistencia: 3, marcacao: 3, desarme: 3, controle: 1 } },
  volante: { label: 'Volante', short: 'VOL', weights: { passe: 3, posicionamento: 3, marcacao: 4, desarme: 4, resistencia: 3, forca: 1 } },
  meio_campista: { label: 'Meio-campista', short: 'MC', weights: { passe: 5, controle: 4, resistencia: 3, posicionamento: 3, drible: 2, desarme: 1 } },
  meia_atacante: { label: 'Meia-atacante', short: 'MEI', weights: { passe: 4, drible: 4, controle: 4, finalizacao: 2, aceleracao: 2, posicionamento: 2 } },
  ponta_direita: { label: 'Ponta-direita', short: 'PD', weights: { velocidade: 4, aceleracao: 4, drible: 4, controle: 3, finalizacao: 2, passe: 1 } },
  ponta_esquerda: { label: 'Ponta-esquerda', short: 'PE', weights: { velocidade: 4, aceleracao: 4, drible: 4, controle: 3, finalizacao: 2, passe: 1 } },
  centroavante: { label: 'Centroavante', short: 'CA', weights: { finalizacao: 5, posicionamento: 4, controle: 2, forca: 2, cabeca: 3, aceleracao: 2 } },
};

export const ATTRIBUTES = {
  velocidade: 'Velocidade', aceleracao: 'Aceleração', finalizacao: 'Finalização', passe: 'Passe',
  drible: 'Drible', controle: 'Controle de bola', marcacao: 'Marcação', desarme: 'Desarme',
  posicionamento: 'Posicionamento', forca: 'Força', resistencia: 'Resistência', cabeca: 'Cabeceio',
  reflexos: 'Reflexos', defesa: 'Defesa de goleiro',
};

// Vínculos são internos: cada personagem guarda um nível de confiança de -3 a +3.
// Eles nunca aparecem como barras; influenciam cartas, espaço no elenco e oportunidades.
export const BONDS = {
  treinador: 'Treinador', companheiro: 'Companheiro', empresario: 'Empresário', familia: 'Família',
  imprensa: 'Imprensa', torcida: 'Torcida', rival: 'Rival', amigo: 'Amigo', clube: 'Diretoria',
};
export const BOND_WORDS = { '-3': 'Rompido', '-2': 'Desconfiado', '-1': 'Distante', '0': 'Neutro', '1': 'Próximo', '2': 'Confiante', '3': 'Leal' };

export const STANDING = [
  { label: 'Fora dos planos', share: 0.1 }, { label: 'No banco', share: 0.35 }, { label: 'Em rodízio', share: 0.6 },
  { label: 'Titular', share: 0.82 }, { label: 'Dono da camisa', share: 0.95 },
];

// Categorias de consequência exibidas como pontos na carta (sem números).
export const HINTS = {
  dinheiro: { label: 'Dinheiro', icon: '€' }, fisico: { label: 'Físico', icon: '♨' }, tecnica: { label: 'Evolução', icon: '↗' },
  espaco: { label: 'Espaço no elenco', icon: '◆' }, imagem: { label: 'Imagem pública', icon: '✦' },
  relacao: { label: 'Relações', icon: '♥' }, futuro: { label: 'Pode voltar depois', icon: '↺' }, carreira: { label: 'Carreira', icon: '★' },
};

export const TRAITS = ['Humilde', 'Ambicioso', 'Disciplinado', 'Competitivo', 'Extrovertido', 'Reservado', 'Confiante', 'Criativo', 'Determinado', 'Tranquilo'];

export const ORIGINS = [
  { id: 'cidade_pequena', label: 'Jogador desconhecido de uma cidade pequena', weight: 25 },
  { id: 'academia_modesta', label: 'Formado em uma academia modesta', weight: 24 },
  { id: 'promessa', label: 'Promessa de um clube profissional', weight: 20 },
  { id: 'profissional', label: 'Jovem com experiência profissional', weight: 13, minAge: 20 },
  { id: 'grande_promessa', label: 'Grande promessa de um clube importante', weight: 10 },
  { id: 'joia', label: 'Joia nacional em início de carreira', weight: 5 },
  { id: 'filho_ex_jogador', label: 'Filho de um ex-jogador', weight: 3 },
];

export const COUNTRY_DATA = {
  Brasil: { towns: ['Vale do Sol', 'Porto das Pedras', 'Santa Aurora', 'Rio Dourado'], names: ['Caio', 'Breno', 'André', 'Leandro', 'Thiago', 'Rafael', 'Matheus', 'Gustavo', 'Diego', 'Vitor', 'Henrique', 'Felipe'], surnames: ['Moura', 'Pacheco', 'Matos', 'Farias', 'Barreto', 'Lacerda', 'Siqueira', 'Teles', 'Araújo', 'Valente', 'Couto', 'Nogueira'] },
  Argentina: { towns: ['Puerto del Alba', 'Villa del Río', 'Santa Lucía', 'Valle Azul'], names: ['Tomás', 'Nicolás', 'Mateo', 'Julián', 'Facundo', 'Lautaro', 'Franco', 'Santiago', 'Agustín', 'Bruno', 'Ezequiel', 'Gonzalo'], surnames: ['Acosta', 'Quiroga', 'Ferreyra', 'Sosa', 'Benítez', 'Domínguez', 'Paz', 'Ledesma', 'Villalba', 'Rojas', 'Peralta', 'Cabrera'] },
  Inglaterra: { towns: ['Westmere', 'Northvale', 'Ashford Vale', 'Kingshaven'], names: ['Oliver', 'Ethan', 'Noah', 'James', 'Harry', 'Jack', 'Callum', 'Owen', 'Declan', 'Marcus', 'Toby', 'Reece'], surnames: ['Bennett', 'Foster', 'Reed', 'Turner', 'Hughes', 'Walsh', 'Crawford', 'Hartley', 'Doyle', 'Whitaker', 'Holt', 'Ellis'] },
  Espanha: { towns: ['Valle Claro', 'Puerto del Sol', 'Santa Vega', 'Monte Azul'], names: ['Hugo', 'Daniel', 'Álvaro', 'Pablo', 'Sergio', 'Iván', 'Adrián', 'Raúl', 'Marcos', 'Jorge', 'Dani', 'Rubén'], surnames: ['Molina', 'Santos', 'Vidal', 'Navarro', 'Cortés', 'Herrera', 'Prieto', 'Ibáñez', 'Campos', 'Ferrer', 'Salas', 'Beltrán'] },
  Itália: { towns: ['Valleverde', 'Porto Nuovo', 'Montechiaro', 'Santa Luce'], names: ['Luca', 'Matteo', 'Elia', 'Marco', 'Andrea', 'Davide', 'Simone', 'Federico', 'Lorenzo', 'Nicolò', 'Giorgio', 'Enzo'], surnames: ['Moretti', 'Conti', 'Riva', 'Greco', 'Bianchi', 'Ferri', 'Lombardi', 'Costa', 'Gallo', 'Marchetti', 'Rinaldi', 'Pagano'] },
  Portugal: { towns: ['Vale da Luz', 'Porto Verde', 'Vila Serena', 'Monte do Mar'], names: ['Tiago', 'Tomás', 'Duarte', 'Gonçalo', 'Rúben', 'Diogo', 'Rodrigo', 'Nuno', 'Bernardo', 'Miguel', 'Fábio', 'Ricardo'], surnames: ['Mendes', 'Neves', 'Tavares', 'Brito', 'Carvalho', 'Seixas', 'Figueira', 'Pinto', 'Barros', 'Rebelo', 'Amaral', 'Vasconcelos'] },
};

export const CLUB_PREFIXES = ['União', 'Estrela', 'Atlético', 'Clube Esportivo'];
export const CLUB_COLORS = [
  { primary: '#ec704f', secondary: '#f5d98f' },
  { primary: '#2d7461', secondary: '#e8d9ac' },
  { primary: '#5376a1', secondary: '#f3e3c2' },
  { primary: '#a95457', secondary: '#f5e4c9' },
];
