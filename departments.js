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
  { id: 'odziez',    icon: '👕' },
  { id: 'zabawki',   icon: '🧸' },
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
  // The noun names the aisle, so a longer qualifier must not take it over:
  // "patera na ciasto" is a platter, not a cake, and "patelnia do pieczenia"
  // is a pan even though "pieczen" is the longer stem in the name.
  dom: ['pater', 'pateln'],
};

// The dictionary holds STEMS, not full forms — one entry covers the whole
// inflection: "pomidor" matches pomidory / pomidorów / pomidorami, "tomato"
// matches tomatoes.
//
// An entry without a space matches as a word PREFIX (not an arbitrary
// substring), so "por" does not match inside "pomidora". An entry with a space
// matches anywhere in the full name ("papier toaletowy").
//
// A prefix is what Polish inflection needs, but it is dangerous for a short
// English word: "pate" reached patera, patelnia and patent, which is how a
// platter was filed under mięso. A leading '=' marks a stem as the WHOLE WORD
// only — '=pate' still covers English "pate" and leaves the rest alone.
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
    'kumkwat',
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
    'cranberr', 'papaya', 'apricot', 'dates', 'melon', 'kumquat',
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
    'meat', 'beef', 'pork', 'chicken', 'turkey', 'bacon', 'sausage', '=ham',
    'steak', 'mince', 'ground beef', 'ribs', 'cutlet', 'drumstick', '=pate',
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
    // What a shop sells is the frozen one, so a bare "pizza" belongs to the
    // freezer — the same answer the dominant "mrozon" already gives to
    // "mrożona pizza". Same word in both languages, hence one entry.
    'pizza',
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
    // Longer than the "krem" that means hand cream, which would win otherwise.
    'kremowk',
    'popcorn', 'krakers', 'prazynk', 'maslo orzechowe', 'nutell', 'dzem',
    'powidl', 'marmolad', 'miod', 'syrop klonowy', 'guma do zucia',
    'ptasie mleczko', 'sernik', 'napoleonk', 'oreo', 'delicj', 'praliny', 'krowk',
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
    'beer', 'wine', 'vodka', 'whisky', 'whiskey', '=rum', '=gin', 'liqueur',
    'cider', 'prosecco', 'champagne', 'tequila', 'cognac', 'brandy',
    'bourbon', '=ale', 'lager', 'aperol', 'martini', 'vermouth', 'jagermeister',
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
    'do golenia', 'zyletk', 'podpask', 'tampon', 'prezerwatyw', 'kondom',
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
    // Tableware and textiles. 'kubek' needs both forms, as with 'ogorek' /
    // 'ogork': the singular has an e the plural does not. The cloth 'recznik'
    // belongs here too; the paper one spells the same word, but its longer stem
    // takes it back to chemia.
    'kubek', 'kubk', 'posciel', 'recznik',
    'pater', 'pateln',
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
    'mug', 'bedding', 'towel',
  ],
  // Clothes and toys are not groceries in any sense, so they get their own
  // sections rather than being stretched into Home — the same reasoning that
  // gave zdrowie its own department. An empty section is not rendered, so the
  // two cost nothing on a shop that has neither.
  odziez: [
    // pl
    'koszul', 'spodn', 'plaszcz',
    // en
    'shirt', 'trousers', '=pants', 'coat', 'jacket',
  ],
  zabawki: [
    // pl
    'lalk', 'zabawk', 'klocki lego',
    // '=lego' as the whole word only: "legowisko" is a dog bed, not a toy.
    '=lego',
    // en
    'toy', 'doll',
  ],
};

// A picture for the item itself, matched the same way as the department but kept
// separate from it: the department decides where a row sits, this only decides
// what it looks like. It is therefore never stored — recomputed on every render,
// so improving this list improves lists that already exist.
//
// Keyed by emoji so one picture can carry many stems without repeating itself.
const EMOJI = {
  '🥛': ['mlek', 'milk'],
  '🧀': ['ser', 'sery', 'serek', 'twaro', 'feta', 'mozzarell', 'parmezan', 'gouda',
         'cheddar', 'oscypek', 'bryndz', 'cheese', 'camembert', 'brie'],
  '🧈': ['maslo', 'masla', 'margaryn', 'butter'],
  '🥚': ['jajk', 'jaja', 'jajec', 'egg'],
  '🍦': ['jogurt', 'kefir', 'maslank', 'smietan', 'skyr', 'yogurt', 'yoghurt', 'lody',
         'ice cream'],
  '🍞': ['chleb', 'pieczyw', 'razow', 'graham', 'tost', 'bread', 'toast', 'sourdough'],
  '🥐': ['rogal', 'croissant', 'drozdzowk', 'paczek', 'paczki', 'donut', 'doughnut'],
  '🥖': ['bagiet', 'baguette', 'bulk', 'bun', 'kajzerk'],
  '🥨': ['precel', 'pretzel', 'obwarzanek', 'paluszk'],
  '🍎': ['jablk', 'apple'],
  '🍌': ['banan', 'banana'],
  '🍊': ['pomarancz', 'mandarynk', 'orange', 'tangerine', 'kumkwat', 'kumquat'],
  '🍋': ['cytryn', 'limonk', 'lemon', 'lime'],
  '🍇': ['winogron', 'grape', 'porzeczk', 'rodzynk', 'raisin'],
  '🍓': ['truskawk', 'strawberr', 'malin', 'raspberr'],
  '🫐': ['borowk', 'jagod', 'blueberr', 'zurawin', 'cranberr'],
  '🍒': ['czeresn', 'wisni', 'cherr'],
  '🍑': ['brzoskwin', 'nektaryn', 'peach', 'apricot', 'morel'],
  '🍐': ['gruszk', 'pear'],
  '🍉': ['arbuz', 'watermelon', 'melon'],
  '🍍': ['ananas', 'pineapple'],
  '🥝': ['kiwi'],
  '🥭': ['mango', 'papaj', 'papaya'],
  '🍅': ['pomidor', 'tomato', 'passat', 'koncentrat'],
  '🥕': ['marchew', 'marchw', 'carrot'],
  '🥔': ['ziemniak', 'potato', 'batat', 'frytk', 'fries'],
  '🧅': ['cebul', 'onion', 'por', 'pory', 'porow', 'leek', 'szalotk', 'shallot'],
  '🧄': ['czosnek', 'garlic', 'imbir', 'ginger'],
  '🌽': ['kukurydz', 'corn', 'sweetcorn'],
  '🥦': ['brokul', 'broccoli', 'kalafior', 'cauliflower', 'brukselk', 'kalarep'],
  '🥬': ['salat', 'kapust', 'szpinak', 'rukol', 'lettuce', 'cabbage', 'spinach',
         'kale', 'botwink', 'natka', 'pietruszk', 'koperek', 'szczypior'],
  '🥒': ['ogork', 'ogorek', 'cucumber', 'cukini', 'zucchini', 'courgette', 'pickle'],
  '🫑': ['papryk', 'pepper', 'chilli'],
  '🍄': ['grzyb', 'pieczark', 'kurk', 'podgrzyb', 'borowik', 'maslak', 'boczniak',
         'mushroom', 'chanterelle'],
  '🥑': ['awokado', 'avocado'],
  '🍆': ['baklazan', 'eggplant', 'aubergine'],
  '🎃': ['dyni', 'dynia', 'pumpkin', 'squash'],
  '🥩': ['mies', 'wolow', 'wieprzow', 'schab', 'karkowk', 'poledwic', 'beef', 'pork',
         'steak', 'miel', 'mince', 'kotlet', 'lamb', 'veal'],
  '🍗': ['kurczak', 'kurcze', 'indyk', 'chicken', 'turkey', 'udk', 'skrzydelk',
         'drumstick', 'filet'],
  '🥓': ['boczek', 'boczk', 'bacon', 'szynk', '=ham', 'prosciutto', 'pasztet', '=pate'],
  '🌭': ['parowk', 'kielbas', 'kabanos', 'sausage', 'salami', 'chorizo', 'pepperoni',
         'hot dog'],
  '🐟': ['ryb', 'losos', 'sledz', 'dorsz', 'makrel', 'mintaj', 'pstrag', 'tunczyk',
         'fish', 'salmon', 'tuna', 'herring', 'sardynk', 'sardine', 'szprot'],
  '🍤': ['krewetk', 'shrimp', 'prawn'],
  '🦀': ['krab', 'crab', 'surimi', 'paluszki krabowe', 'lobster'],
  '🍚': ['ryz', 'rice', 'kasz', 'komos', 'quinoa', 'kuskus', 'couscous'],
  '🍝': ['makaron', 'pasta', 'spaghetti', 'penne', 'lazani', 'noodle', 'kluski',
         'zacierk', 'macaroni'],
  '🍕': ['pizza'],
  '🥟': ['pierog', 'pyzy', 'kopytk', 'nugget'],
  '🌾': ['maka', 'flour', 'platk', 'musli', 'granol', 'otreb', 'oat', 'cereal',
         'cornflake', 'kaszk', 'semolina'],
  '🫘': ['fasol', 'groch', 'soczewic', 'ciecierzyc', 'bean', 'lentil', 'chickpea',
         'groszek'],
  '🥫': ['konserw', 'canned', 'sos', 'sauce', 'ketchup', 'majonez', 'mayo', 'musztard',
         'mustard', 'pesto', 'hummus', 'ajvar', 'bulion', 'przecier', 'salsa'],
  '🫒': ['oliw', 'olej', 'oil', 'olive', 'ocet', 'vinegar'],
  '🍯': ['miod', 'honey', 'dzem', 'jam', 'powidl', 'marmolad', 'marmalade', 'syrop',
         'syrup'],
  '🧂': ['sol', 'salt', 'pieprz', 'przypraw', 'spice', 'cynamon', 'cinnamon', 'oregano',
         'bazyli', 'basil', 'curry', 'kurkum', 'turmeric', 'majeranek', 'tymianek',
         'rozmaryn', 'wanili', 'vanilla', 'ziele angielskie', 'liscie laurowe'],
  '🍫': ['czekolad', 'chocolate', 'nutell', 'baton', 'batonik'],
  '🍬': ['cukierk', 'candy', 'sweets', 'zelk', 'gummy', 'lizak', 'lollipop', 'krowk',
         'toffee', 'guma do zucia', 'chewing gum'],
  '🍪': ['ciastk', 'herbatnik', 'biscuit', 'cookie', 'krakers', 'cracker', 'wafel',
         'wafl', 'wafer', 'waffle', 'piernik', 'oreo', 'delicj'],
  '🍰': ['ciasto', 'cake', 'sernik', 'keks', 'brownie', 'muffin', 'kremowk',
         'napoleonk'],
  '🥜': ['orzech', 'orzeszk', 'nut', 'migdal', 'almond', 'nerkowc', 'cashew',
         'pistacj', 'pistachio', 'walnut', 'hazelnut', 'maslo orzechowe',
         'peanut butter', 'slonecznik', 'pestki', 'sezam', 'chia', 'siemie'],
  '🍿': ['popcorn', 'chips', 'crisps', 'prazynk', 'nachos', 'snack'],
  '💧': ['wod', 'water'],
  '🧃': ['sok', 'juice', 'nektar', 'nectar', 'napoj', 'lemoniad', 'lemonade',
         'oranzad', 'kompot', 'smoothie'],
  '🥤': ['cola', 'pepsi', 'sprite', 'fant', 'soda', 'tonik', 'tonic', 'izoton',
         'energet', 'energy drink', 'red bull', 'monster'],
  '☕': ['kaw', 'coffee'],
  '🍵': ['herbat', 'tea', 'rumianek', 'miet', 'matcha'],
  '🍺': ['piw', 'beer', 'cydr', 'cider', '=ale', 'lager'],
  '🍷': ['win', 'wine', 'prosecco', 'szampan', 'champagne'],
  '🥃': ['wodk', 'vodka', 'whisky', 'whiskey', '=rum', '=gin', 'likier', 'liqueur',
         'koniak', 'cognac', 'brandy', 'bourbon', 'tequil', 'nalewk'],
  '🧻': ['papier toaletowy', 'toilet paper', 'toilet roll', 'reczniki papierowe',
         'recznik papierowy', 'paper towel', 'kitchen roll', 'chusteczk', 'tissue',
         'serwetk', 'napkin'],
  '🧼': ['mydl', 'soap', 'plyn do naczyn', 'dish soap', 'washing up liquid'],
  '🧴': ['szampon', 'shampoo', 'odzywk', 'conditioner', 'zel', 'balsam', 'lotion',
         'krem', 'cream', 'plyn', 'dezodorant', 'deodorant', 'antyperspirant',
         'perfum', 'sunscreen'],
  // 'pasta do zeb' for the same reason it exists in the department list: the
  // Italian 'pasta' is longer than 'past' and would otherwise win.
  '🪥': ['szczoteczk', 'toothbrush', 'past', 'pasta do zeb', 'toothpaste', 'nic dentystyczn',
         'nitka dentystyczn', 'floss', 'plyn do plukania ust', 'mouthwash'],
  '🧽': ['gabk', 'sponge', 'zmywak', 'druciak', 'scourer', 'sciereczk'],
  '🧺': ['proszek do prania', 'plyn do prania', 'detergent', 'laundry', 'kapsulki do prania',
         'plyn do plukania', 'fabric softener', 'wybielacz', 'bleach'],
  '🪒': ['do golenia', 'golark', 'zyletk', 'razor', 'shaving'],
  '🧷': ['podpask', 'tampon', 'pieluch', 'diaper', 'nappy', 'wkladki', 'sanitary pad',
         'prezerwatyw', 'kondom', 'condom'],
  '💊': ['suplement', 'supplement', 'witamin', 'vitamin', 'magnez', 'magnesium',
         'elektrolit', 'electrolyte', 'kolagen', 'collagen', 'probiotyk', 'probiotic',
         'tabletki', 'paracetamol', 'ibuprofen', 'apap', 'cynk', 'zinc', 'omega',
         'tran', 'melatonin', 'kreatyn', 'masc'],
  '🩹': ['plaster', 'plastry', 'band aid', 'wata', 'wacik', 'patyczki', 'cotton bud'],
  '🔋': ['bateri', 'battery', 'batteries'],
  '💡': ['zarowk', 'bulb', 'light bulb'],
  '🕯': ['swieczk', 'swiec', 'candle', 'znicz'],
  '🔥': ['zapalk', 'match', 'zapalniczk', 'lighter'],
  '🗑': ['worki na smieci', 'worki', 'bin bag', 'trash bag', 'garbage bag'],
  '🐕': ['karma', 'pet food', 'dog food', 'cat food', 'zwirek', 'litter', 'smycz',
         'leash', 'obroza', 'collar'],
  '🌻': ['kwiat', 'flower', 'doniczk', 'plant pot', 'nawoz', 'fertilizer'],
  '🧊': ['mrozon', 'frozen', 'kostki lodu', 'ice cube'],
  '🥥': ['kokos', 'coconut'],
  '🍠': ['sweet potato', 'burak', 'beetroot', 'rzodkiew', 'radish', 'seler', 'celery',
         'turnip'],
  '👕': ['koszul', 'shirt'],
  '👖': ['spodn', 'trousers', '=pants'],
  '🧥': ['plaszcz', 'coat', 'jacket'],
  // A doll gets the bear rather than nothing: both are toys, and the set has no
  // doll of its own.
  '🧸': ['lalk', 'doll', 'zabawk', 'toy'],
  '🧱': ['=lego', 'klocki lego'],
  '🛏': ['posciel', 'bedding'],
  // A bathtub for the cloth towel; the paper one keeps its own picture, since
  // 'recznik papierowy' is the longer stem.
  '🛁': ['recznik', 'towel'],
};

// Flat list of [stem, department] sorted longest stem first, so the first hit
// is already the best hit.
// Shared by the department lists and the emoji list: same stems, same
// longest-wins rule, different answer. Hence "value" rather than "dept".
function compile(source) {
  return Object.entries(source)
    .flatMap(([value, stems]) => stems.map((raw) => ({ ...parseStem(raw), value })))
    .sort((a, b) => b.stem.length - a.stem.length);
}

// The '=' is stripped before measuring, so a whole-word stem competes for the
// longest match on the letters it actually carries.
function parseStem(raw) {
  const whole = raw.startsWith('=');
  return { stem: whole ? raw.slice(1) : raw, whole };
}

const DOMINANT_RULES = compile(DOMINANT_KEYWORDS);
const RULES = compile(KEYWORDS);
// Same problem as the departments have: "jablk" is longer than "sok", so apple
// juice would come out as an apple. The drink is the noun here; in "frozen peas"
// the peas are, which is why frozen is deliberately not on this list.
const EMOJI_DOMINANT = compile({
  '🧃': ['sok', 'juice', 'nektar', 'nectar'],
  // The cake a platter will carry is not the product, and there is no picture
  // of a platter — nothing is the honest answer, as with an unmatched name.
  '': ['pater', 'pateln'],
});
const EMOJI_RULES = compile(EMOJI);

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

function stemMatches({ stem, whole }, normalized, words) {
  if (whole) return words.includes(stem);
  if (stem.includes(' ')) return normalized.includes(stem);
  return words.some((word) => word.startsWith(stem));
}

function firstMatch(rules, normalized, words) {
  for (const rule of rules) {
    if (stemMatches(rule, normalized, words)) return rule.value;
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

// Empty when nothing matches. The row reserves the space either way, so names
// stay in one column instead of stepping in and out depending on the item.
export function emojiFor(name) {
  const normalized = normalize(name);
  if (!normalized) return '';
  const words = normalized.split(' ');
  return firstMatch(EMOJI_DOMINANT, normalized, words)
    ?? firstMatch(EMOJI_RULES, normalized, words)
    ?? '';
}
