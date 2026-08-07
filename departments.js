// Static dictionary: product name -> store department.
//
// The order of DEPARTMENTS is the order of sections on the list — roughly the
// route through the store, so you don't walk back and forth.
//
// Departments are identified by a language-neutral id. Items store that id, and
// the visible label is resolved at render time through i18n, so one shared list
// can show up in a different language on every device.

export const DEPARTMENTS = [
  { id: 'warzywa',   icon: '🥦' },
  { id: 'pieczywo',  icon: '🍞' },
  { id: 'nabial',    icon: '🥛' },
  { id: 'mieso',     icon: '🥩' },
  { id: 'ryby',      icon: '🐟' },
  { id: 'mrozonki',  icon: '🧊' },
  { id: 'sypkie',    icon: '🍝' },
  { id: 'konserwy',  icon: '🥫' },
  { id: 'slodycze',  icon: '🍫' },
  { id: 'napoje',    icon: '🧃' },
  { id: 'alkohole',  icon: '🍷' },
  { id: 'chemia',    icon: '🧼' },
  { id: 'zdrowie',   icon: '💊' },
  { id: 'dom',       icon: '🏠' },
  { id: 'inne',      icon: '🛒' },
];

export const FALLBACK_DEPARTMENT = 'inne';

const DEPARTMENT_BY_ID = new Map(DEPARTMENTS.map((d) => [d.id, d]));

export function departmentInfo(id) {
  return DEPARTMENT_BY_ID.get(id) || DEPARTMENT_BY_ID.get(FALLBACK_DEPARTMENT);
}

// Some words define the category no matter what else is in the name. "Frozen
// strawberries" belongs in the freezer, not in produce, and "apple juice" is a
// drink, not fruit — but plain longest-match would pick 'strawberr' over
// 'frozen' and 'apple' over 'juice'. These stems are checked first and win.
const DOMINANT_KEYWORDS = {
  mrozonki: ['mrozon', 'frozen'],
  napoje: ['sok', 'juice', 'nektar', 'nectar'],
};

// The dictionary holds STEMS, not full forms — one entry covers the whole
// inflection: "pomidor" matches pomidory / pomidorów / pomidorami, "tomato"
// matches tomatoes.
//
// An entry without a space matches as a word PREFIX (not an arbitrary
// substring), so "por" does not match inside "pomidora". An entry with a space
// matches anywhere in the full name ("papier toaletowy").
//
// When several entries match, the longest stem wins — that is how "masło
// orzechowe" beats "masło" and "peanut butter" beats "butter".
//
// Polish and English stems live side by side in the same lists, so a shared
// list works regardless of which language each person types in.
const KEYWORDS = {
  warzywa: [
    // pl
    'pomidor', 'ogork', 'ogorek', 'salat', 'kapust', 'marchew', 'marchw',
    'ziemniak', 'cebul', 'czosnek', 'papryk', 'pieczark', 'grzyb', 'brokul',
    'kalafior', 'cukini', 'baklazan', 'dyni', 'dynia', 'burak', 'rzodkiew',
    // Named mushrooms: none of them start with "grzyb", and "maslak" would
    // otherwise be swallowed by "masla" from the dairy list.
    'kurk', 'podgrzyb', 'borowik', 'maslak', 'boczniak', 'kania', 'opienk',
    'shiitake', 'portobello', 'chanterelle', 'porcini',
    'pory', 'porow', 'seler', 'pietruszk', 'koperek', 'koper', 'szczypior',
    'natka', 'szpinak', 'rukol', 'roszponk', 'botwink', 'kalarep', 'brukselk',
    'fasolk szparagow', 'bob', 'kielki', 'imbir', 'batat', 'awokado',
    'jablk', 'gruszk', 'banan', 'pomarancz', 'mandarynk', 'cytryn', 'limonk',
    'winogron', 'truskawk', 'malin', 'borowk', 'jagod', 'sliwk', 'brzoskwin',
    'nektaryn', 'arbuz', 'melon', 'ananas', 'kiwi', 'granat', 'czeresn',
    'wisni', 'porzeczk', 'zurawin', 'mango', 'papaj', 'figi', 'daktyl',
    // en
    'tomato', 'cucumber', 'lettuce', 'iceberg', 'cabbage', 'carrot', 'potato',
    'onion', 'garlic', 'pepper', 'bell pepper', 'mushroom', 'broccoli',
    'cauliflower', 'zucchini', 'courgette', 'eggplant', 'aubergine', 'pumpkin',
    'beetroot', 'radish', 'leek', 'celery', 'parsley', 'dill', 'spinach',
    'arugula', 'rocket', 'kale', 'sprout', 'ginger', 'sweet potato', 'avocado',
    'green bean', 'peas', 'asparagus', 'squash', 'turnip', 'shallot', 'chilli',
    'apple', 'pear', 'banana', 'orange', 'mandarin', 'tangerine', 'lemon',
    'lime', 'grape', 'strawberr', 'raspberr', 'blueberr', 'blackberr', 'plum',
    'peach', 'nectarine', 'watermelon', 'pineapple', 'pomegranate', 'cherr',
    'cranberr', 'papaya', 'apricot', 'dates', 'melon',
  ],
  pieczywo: [
    // pl
    'chleb', 'bulk', 'bagiet', 'rogal', 'kajzerk', 'tost', 'pieczyw',
    'drozdzowk', 'ciabatt', 'graham', 'razow', 'precel', 'obwarzanek',
    'ptys', 'paczek', 'paczki', 'jagodzianka', 'focaccia', 'pita',
    'tortill', 'wrap', 'maca', 'sucharki',
    // en
    'bread', 'roll', 'bun', 'baguette', 'toast', 'croissant', 'bagel',
    'donut', 'doughnut', 'muffin', 'brioche', 'sourdough', 'crumpet', 'scone',
  ],
  nabial: [
    // pl
    'mlek', 'mlecz', 'ser', 'serk', 'sery', 'twaro', 'jogurt', 'kefir',
    'maslank', 'smietan', 'smietank', 'maslo', 'masla', 'jajk', 'jaja', 'jajec',
    'mozzarell', 'feta', 'parmezan', 'mascarpone', 'skyr', 'ricott',
    'camembert', 'brie', 'oscypek', 'gouda', 'cheddar', 'bryndz', 'margaryn',
    'creme fraiche', 'plesniow',
    // en
    'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'sour cream',
    'cream cheese', 'cottage cheese', 'curd', 'egg', 'buttermilk', 'margarine',
    'halloumi', 'quark',
  ],
  mieso: [
    // pl
    'mies', 'kielbas', 'szynk', 'boczek', 'boczk', 'kabanos', 'parowk',
    'kurczak', 'kurcze', 'indyk', 'wolow', 'wieprzow', 'karkowk', 'schab',
    'zeberk', 'miel', 'filet', 'poledwic', 'salami', 'pasztet', 'smalec',
    'golonk', 'watrobk', 'watrob', 'kaszank', 'salceson', 'pieczen',
    'mortadel', 'udk', 'skrzydelk', 'kotlet', 'gyros', 'bekon',
    // en
    'meat', 'beef', 'pork', 'chicken', 'turkey', 'bacon', 'sausage', 'ham',
    'steak', 'mince', 'ground beef', 'ribs', 'cutlet', 'drumstick', 'pate',
    'prosciutto', 'meatball', 'lamb', 'veal', 'chorizo', 'pepperoni',
  ],
  ryby: [
    // pl
    'ryb', 'losos', 'sledz', 'tunczyk', 'dorsz', 'makrel', 'mintaj', 'pstrag',
    'krewetk', 'szprot', 'karp', 'panga', 'halibut', 'kalmar', 'malz',
    'ostryg', 'kawior', 'surimi', 'paluszki rybne', 'paprykarz', 'wegorz',
    // en
    'fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'herring', 'mackerel',
    'trout', 'sardine', 'anchov', 'squid', 'mussel', 'oyster', 'caviar',
    'crab', 'lobster', 'seafood', 'fish finger', 'fish stick', 'cod',
  ],
  mrozonki: [
    // pl
    'mrozonk', 'lody', 'lodow', 'frytk', 'pierog', 'pyzy', 'kluski',
    'kopytk', 'kostki lodu',
    // en
    'ice cream', 'ice lolly', 'popsicle', 'fries', 'french fries', 'nugget',
    'ice cube', 'sorbet',
  ],
  sypkie: [
    // pl
    'makaron', 'ryz', 'kasz', 'maka', 'platk', 'musli', 'granol', 'otreb',
    'cukier', 'sol', 'pieprz', 'przypraw', 'drozdz', 'budyn', 'kisiel',
    'zelatyn', 'kakao', 'kuskus', 'komos', 'quinoa', 'spaghetti', 'penne',
    'lazani', 'zacierk', 'groch', 'fasol', 'soczewic', 'ciecierzyc',
    'bulka tarta', 'panierk', 'proszek do pieczenia', 'soda oczyszczona',
    'cynamon', 'wanili', 'oregano', 'bazyli', 'curry', 'kurkum', 'papryka slodka',
    'ziele angielskie', 'liscie laurowe', 'majeranek', 'tymianek', 'rozmaryn',
    'siemie', 'slonecznik', 'pestki', 'sezam', 'chia', 'kokos',
    // en
    'pasta', 'rice', 'flour', 'sugar', 'salt', 'black pepper', 'peppercorn',
    'spice', 'oat', 'cereal', 'cornflake', 'muesli', 'granola', 'semolina',
    'couscous', 'lentil', 'chickpea', 'bean', 'baking powder', 'baking soda',
    'yeast', 'gelatin', 'pudding', 'cocoa', 'cinnamon', 'vanilla', 'basil',
    'turmeric', 'paprika', 'bay leaf', 'thyme', 'rosemary', 'sesame',
    'coconut', 'sunflower seed', 'breadcrumb', 'cornstarch', 'noodle',
    'lasagna', 'macaroni', 'nutmeg', 'barley', 'buckwheat', 'millet',
    'pancake', 'cornmeal', 'tapioca',
  ],
  konserwy: [
    // pl
    'konserw', 'ketchup', 'majonez', 'musztard', 'sos', 'passat', 'koncentrat',
    'oliw', 'olej', 'ocet', 'groszek', 'kukurydz', 'przecier', 'chrzan',
    'ajvar', 'pesto', 'hummus', 'tahini', 'kapary', 'ogorki kiszone',
    'kapusta kiszona', 'buraczki', 'cwikl', 'tunczyk w puszce', 'bulion',
    'kostki rosolowe', 'zupa w proszku', 'sardynk',
    // en
    'canned', 'ketchup', 'mayo', 'mayonnaise', 'mustard', 'sauce', 'soy sauce',
    'tomato paste', 'olive oil', 'oil', 'vinegar', 'pickle', 'gherkin',
    'sweetcorn', 'corn', 'horseradish', 'broth', 'stock cube', 'bouillon',
    'salsa', 'relish', 'caper', 'sauerkraut', 'olive', 'chutney',
  ],
  slodycze: [
    // pl
    'czekolad', 'cukierk', 'batonik', 'baton', 'ciastk', 'herbatnik', 'wafel',
    'wafl', 'chips', 'paluszk', 'orzech', 'orzeszk', 'migdal', 'nerkowc',
    'pistacj', 'rodzynk', 'zelk', 'lizak', 'ciasto', 'keks', 'piernik',
    'popcorn', 'krakers', 'prazynk', 'maslo orzechowe', 'nutell', 'dzem',
    'powidl', 'marmolad', 'miod', 'syrop klonowy', 'guma do zucia',
    'ptasie mleczko', 'sernik', 'oreo', 'delicj', 'praliny', 'krowk',
    'nachos', 'suszone owoce',
    // en
    'chocolate', 'candy', 'sweets', 'biscuit', 'cookie', 'cracker', 'wafer',
    'waffle', 'crisps', 'pretzel', 'nuts', 'nut', 'almond', 'cashew',
    'pistachio', 'walnut', 'hazelnut', 'raisin', 'jelly', 'gummy', 'lollipop',
    'cake', 'brownie', 'jam', 'marmalade', 'honey', 'maple syrup',
    'peanut butter', 'chewing gum', 'snack', 'granola bar', 'chocolate bar',
    'dried fruit', 'marshmallow', 'toffee', 'fudge', 'caramel', 'shortbread',
  ],
  napoje: [
    // pl
    'wod', 'napoj', 'cola', 'pepsi', 'sprite', 'fant', 'herbat',
    'kaw', 'lemoniad', 'izoton', 'energet', 'tonik', 'oranzad', 'kompot',
    'smoothie', 'rumianek', 'miet', 'zielona herbata', 'mleko roslinne',
    'napoj sojowy', 'napoj owsiany', 'mleko owsiane', 'mleko migdalowe',
    'mleko kokosowe', 'red bull', 'monster', 'lipton',
    // en
    'water', 'soda', 'lemonade', 'tea', 'coffee', 'energy drink', 'tonic',
    'milkshake', 'oat milk', 'almond milk', 'soy milk', 'coconut milk',
    'plant milk', 'sparkling water', 'iced tea', 'cordial', 'matcha',
  ],
  alkohole: [
    // pl
    'piw', 'win', 'wodk', 'likier', 'nalewk', 'cydr', 'szampan', 'koniak',
    // en
    'beer', 'wine', 'vodka', 'whisky', 'whiskey', 'rum', 'gin', 'liqueur',
    'cider', 'prosecco', 'champagne', 'tequila', 'cognac', 'brandy',
    'bourbon', 'ale', 'lager', 'aperol', 'martini', 'vermouth', 'jagermeister',
  ],
  chemia: [
    // pl
    'papier toaletowy', 'reczniki papierowe', 'recznik papierowy', 'chusteczk',
    'mydl', 'szampon', 'odzywk', 'zel', 'past', 'szczoteczk',
    // Both spellings: "nić" is what people actually say, "nitka" was the guess.
    'nic dentystyczn', 'nitka dentystyczn', 'rekawiczk', 'glove',
    // Longer than the "pasta" that means noodles, which would otherwise win.
    'pasta do zeb', 'pasta do but',
    'plyn do plukania ust', 'dezodorant', 'antyperspirant', 'perfum',
    'plyn do naczyn', 'plyn do prania', 'plyn do plukania', 'plyn', 'proszek do prania',
    'proszek', 'kapsulki do prania', 'wybielacz', 'odkamieniacz', 'odplamiacz',
    'gabk', 'druciak', 'sciereczk', 'odswiezacz', 'krem', 'balsam', 'golark',
    'do golenia', 'zyletk', 'podpask', 'tampon', 'prezerwatyw',
    'wacik', 'zmywak', 'condom', 'shaving',
    'wkladki', 'pieluch', 'mokre chusteczki', 'domestos', 'ludwik', 'cif',
    'mydelko', 'plyn do szyb', 'wc', 'kostka do wc', 'tabletki do zmywarki',
    'nablyszczacz', 'sol do zmywarki', 'wata', 'patyczki',
    'plaster', 'plastry', 'chusteczki nawilzane',
    // en
    'toilet paper', 'toilet roll', 'kitchen roll', 'paper towel', 'tissue',
    'soap', 'shampoo', 'conditioner', 'shower gel', 'toothpaste', 'toothbrush',
    'deodorant', 'dish soap', 'washing up liquid', 'detergent', 'laundry',
    'fabric softener', 'bleach', 'sponge', 'scourer', 'cleaner', 'cleaning',
    'air freshener', 'face cream', 'lotion', 'razor', 'shaving', 'sanitary pad',
    'diaper', 'nappy', 'wipes', 'dishwasher tablet', 'floss', 'mouthwash',
    'cotton bud', 'cotton pad', 'plaster', 'band aid', 'sanitizer', 'sunscreen',
  ],
  // Supplements and over-the-counter remedies. Added as their own department
  // rather than folded into chemia: a probiotic is not a cleaning product, and
  // stretching an existing department to fit would make its name a lie.
  zdrowie: [
    // pl
    'suplement', 'witamin', 'magnez', 'elektrolit', 'kolagen', 'probiotyk',
    'omega', 'tran', 'cynk', 'melatonin', 'kreatyn', 'masc', 'tabletki',
    'syrop na kaszel', 'paracetamol', 'ibuprofen', 'apap', 'rutinoscorbin',
    'ibuprom', 'termometr', 'zelazo w tabletkach', 'wapn w tabletkach',
    // en
    'supplement', 'vitamin', 'magnesium', 'electrolyte', 'collagen',
    'probiotic', 'zinc', 'painkiller', 'lozenge', 'cough syrup',
  ],
  dom: [
    // pl
    'bateri', 'zarowk', 'swieczk', 'swiec', 'zapalk', 'folia', 'folia aluminiowa',
    'papier do pieczenia', 'karma', 'zwirek', 'kuweta', 'smycz', 'obroza',
    'serwetk', 'slomk', 'sztucce', 'kubki jednorazowe', 'talerzyki',
    'worki na smieci', 'worki', 'torebki sniadaniowe', 'papier sniadaniowy',
    'sandwich bag', 'doniczk', 'nawoz',
    'kwiat', 'znicz', 'sznurek', 'tasma', 'klej', 'dlugopis', 'zeszyt',
    'reklamowk', 'siatk', 'zapalniczk', 'wklad',
    // en
    'battery', 'batteries', 'light bulb', 'bulb', 'candle', 'match', 'foil',
    'tinfoil', 'aluminium foil', 'cling film', 'baking paper', 'parchment',
    'pet food', 'dog food', 'cat food', 'litter', 'leash', 'collar', 'napkin',
    'straw', 'cutlery', 'paper plate', 'bin bag', 'trash bag', 'garbage bag',
    'flower', 'plant pot', 'fertilizer', 'lighter', 'notebook', 'tape', 'glue',
  ],
};

// Flat list of [stem, department] sorted longest stem first, so the first hit
// is already the best hit.
function compile(source) {
  return Object.entries(source)
    .flatMap(([dept, stems]) => stems.map((stem) => ({ stem, dept })))
    .sort((a, b) => b.stem.length - a.stem.length);
}

const DOMINANT_RULES = compile(DOMINANT_KEYWORDS);
const RULES = compile(KEYWORDS);

// Reduces a name to a comparable form: lowercase, no Polish diacritics, no
// punctuation, single spaces. "Ogórki 2 szt." -> "ogorki 2 szt"
export function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining marks split off by NFD
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstMatch(rules, normalized, words) {
  for (const { stem, dept } of rules) {
    const hit = stem.includes(' ')
      ? normalized.includes(stem)
      : words.some((word) => word.startsWith(stem));
    if (hit) return dept;
  }
  return null;
}

export function guessDepartment(name) {
  const normalized = normalize(name);
  if (!normalized) return FALLBACK_DEPARTMENT;

  const words = normalized.split(' ');

  return firstMatch(DOMINANT_RULES, normalized, words)
    ?? firstMatch(RULES, normalized, words)
    ?? FALLBACK_DEPARTMENT;
}
