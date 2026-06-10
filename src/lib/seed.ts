import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── helpers ──────────────────────────────────────────────────────────────────
const hash = (pw: string) => bcrypt.hashSync(pw, 10);
const img  = (id: string)  => `https://images.unsplash.com/photo-${id}?w=600&q=80`;

// ── branches ─────────────────────────────────────────────────────────────────
const BRANCHES = [
  { name: 'Steakz London',     city: 'London',     address: '42 Carnaby Street',   postcode: 'W1F 9PR',   phone: '+44 20 7946 0100',  email: 'london@steakz.co.uk'     },
  { name: 'Steakz Manchester', city: 'Manchester',  address: '18 Deansgate',        postcode: 'M3 4LY',    phone: '+44 161 946 0200', email: 'manchester@steakz.co.uk' },
  { name: 'Steakz Birmingham', city: 'Birmingham',  address: '5 Broad Street',      postcode: 'B1 2HF',    phone: '+44 121 946 0300', email: 'birmingham@steakz.co.uk' },
  { name: 'Steakz Edinburgh',  city: 'Edinburgh',   address: '22 Rose Street',       postcode: 'EH2 2PR',   phone: '+44 131 946 0400', email: 'edinburgh@steakz.co.uk'  },
  { name: 'Steakz Bristol',    city: 'Bristol',     address: '9 Corn Street',        postcode: 'BS1 1HT',   phone: '+44 117 946 0500', email: 'bristol@steakz.co.uk'    },
  { name: 'Steakz Leeds',      city: 'Leeds',       address: '31 Briggate',          postcode: 'LS1 6HD',   phone: '+44 113 946 0600', email: 'leeds@steakz.co.uk'      },
  { name: 'Steakz Glasgow',    city: 'Glasgow',     address: '67 Buchanan Street',    postcode: 'G1 3HL',    phone: '+44 141 946 0700', email: 'glasgow@steakz.co.uk'    },
];

// ── menu items ────────────────────────────────────────────────────────────────
const MENU: Array<{
  name: string; description: string; price: number;
  category: 'STARTER'|'MAIN'|'SIDE'|'DESSERT'|'DRINK'|'SPECIAL';
  imageUrl: string;
}> = [
  // STARTERS
  { name: 'Wagyu Beef Tartare',         category: 'STARTER', price: 18.50, description: 'Hand-minced A5 Wagyu, quail egg yolk, capers, shallots, Dijon mustard',               imageUrl: img('1546069901-ba9599a7e63c') },
  { name: 'Pan-Seared Scallops',        category: 'STARTER', price: 22.00, description: 'King scallops, cauliflower purée, crispy pancetta, lemon beurre blanc',               imageUrl: img('1519984388953-d2406bc725e1') },
  { name: 'Bone Marrow Royale',         category: 'STARTER', price: 16.00, description: 'Roasted veal marrow, sourdough soldiers, parsley salsa, fleur de sel',                imageUrl: img('1544025162-d76694265947') },
  { name: 'Wagyu Beef Sliders',         category: 'STARTER', price: 19.50, description: 'Three mini Wagyu patties, aged cheddar, truffle aioli, brioche bun',                  imageUrl: img('1568901346375-23c9450c58cd') },
  { name: 'Crispy Calamari',            category: 'STARTER', price: 13.50, description: 'Cornish squid rings, smoked paprika salt, saffron aioli, lemon wedge',                imageUrl: img('1599487488170-d11ec9c172f0') },
  { name: 'Lobster Bisque',             category: 'STARTER', price: 16.50, description: 'Native lobster, Cognac cream, chervil oil, sourdough croutons',                       imageUrl: img('1547592166-23ac45744acd') },
  { name: 'Burrata & Heritage Tomato',  category: 'STARTER', price: 14.00, description: 'Creamy burrata, heirloom tomatoes, aged balsamic, basil oil, toasted pine nuts',      imageUrl: img('1608877907149-a206d75ba011') },
  { name: 'Tiger Prawn Cocktail',       category: 'STARTER', price: 17.00, description: 'Jumbo tiger prawns, Marie Rose sauce, avocado, gem lettuce, lemon',                   imageUrl: img('1565680018434-b513d5e5fd47') },
  { name: 'Steak Croquettes',           category: 'STARTER', price: 13.00, description: 'Slow-braised short rib croquettes, horseradish cream, chive oil',                     imageUrl: img('1555939594-58d7cb561ad1') },

  // MAINS
  { name: 'Bone-In Ribeye 400g',        category: 'MAIN', price: 58.00, description: 'Dry-aged 45 days, charcoal-grilled, herb compound butter, watercress',                   imageUrl: img('1558030006-450675393462') },
  { name: 'Wagyu Tomahawk 900g',        category: 'MAIN', price: 120.00, description: 'Japanese A5 Wagyu, 40oz long-bone, salt-aged, carved tableside',                        imageUrl: img('1544025162-d76694265947') },
  { name: 'Châteaubriand',              category: 'MAIN', price: 95.00, description: 'Centre-cut beef tenderloin for two, truffle jus, béarnaise sauce',                       imageUrl: img('1529692236671-f1f6cf9683ba') },
  { name: 'New York Strip 300g',        category: 'MAIN', price: 48.00, description: 'Prime cut, 28-day aged, peppercorn crust, red wine jus',                                 imageUrl: img('1600891964599-f61ba0e24092') },
  { name: 'Fillet Steak 250g',          category: 'MAIN', price: 52.00, description: 'Extra-tender centre-cut fillet, Bordelaise sauce, bone marrow crumb',                    imageUrl: img('1546833999-b9f581a1996d') },
  { name: 'T-Bone 500g',                category: 'MAIN', price: 62.00, description: 'Classic T-bone, charcoal-fired, sea salt, chimichurri, lemon',                           imageUrl: img('1600891964092-4316c288032e') },
  { name: 'Rack of Lamb',               category: 'MAIN', price: 44.00, description: 'Herb-crusted British lamb, fondant potato, minted pea purée, rosemary jus',              imageUrl: img('1535400255456-984b18064f73') },
  { name: 'Whole Roasted Sea Bass',     category: 'MAIN', price: 38.00, description: 'Wild-caught sea bass, brown butter, capers, dill, crushed new potatoes',                 imageUrl: img('1519984388953-d2406bc725e1') },
  { name: 'Half Lobster Thermidor',     category: 'MAIN', price: 55.00, description: 'Native lobster, brandy cream sauce, gruyère gratin, twice-cooked chips',                 imageUrl: img('1519015942167-6e44f4a27d9e') },

  // SIDES
  { name: 'Truffle & Parmesan Fries',   category: 'SIDE', price: 7.50, description: 'Thin-cut fries, black truffle oil, aged Parmesan, fresh chives',                          imageUrl: img('1541592106271-7f0c8838ccf9') },
  { name: 'Creamed Spinach',            category: 'SIDE', price: 6.50, description: 'Wilted baby spinach, crème fraîche, nutmeg, toasted garlic breadcrumbs',                  imageUrl: img('1512621776951-a57141f2eefd') },
  { name: 'Lobster Mac & Cheese',       category: 'SIDE', price: 12.00, description: 'House-made pasta, four-cheese sauce, lobster claw, Panko crust',                         imageUrl: img('1543339308-43e59d6b73a6') },
  { name: 'Roasted Heritage Carrots',   category: 'SIDE', price: 6.00, description: 'Honey and thyme glaze, toasted almonds, whipped goat cheese',                             imageUrl: img('1490645935967-10de6ba17061') },
  { name: 'Gratin Dauphinoise',         category: 'SIDE', price: 7.50, description: 'Thinly sliced potatoes, double cream, Gruyère, thyme',                                    imageUrl: img('1506354666786-959d6d497f1a') },

  // DESSERTS
  { name: 'Sticky Toffee Pudding',      category: 'DESSERT', price: 9.50,  description: 'Medjool date sponge, butterscotch sauce, clotted cream ice cream',                   imageUrl: img('1578985545062-69928b1d9587') },
  { name: 'Dark Chocolate Fondant',     category: 'DESSERT', price: 10.50, description: '70% Valrhona chocolate, molten centre, salted caramel ice cream',                    imageUrl: img('1519915028121-7d3463d20b13') },
  { name: 'Classic Crème Brûlée',       category: 'DESSERT', price: 9.00,  description: 'Madagascan vanilla custard, caramelised sugar crust, shortbread',                    imageUrl: img('1464305795204-6f5bbfc7fb81') },

  // DRINKS
  { name: 'House Red Wine',             category: 'DRINK', price: 8.50,  description: 'Malbec, Mendoza, Argentina — dark fruit, smooth tannins',                              imageUrl: img('1582106245687-cbb466a9f07f') },
  { name: 'House White Wine',           category: 'DRINK', price: 8.00,  description: 'Sauvignon Blanc, Marlborough, NZ — crisp citrus, gooseberry',                         imageUrl: img('1510812431401-41d2bd2722f3') },
  { name: 'Champagne Bottle',           category: 'DRINK', price: 65.00, description: 'Moët & Chandon Impérial Brut — biscuity, fine persistent bubbles',                     imageUrl: img('1541614101331-1a5a3a194e92') },
  { name: 'Espresso Martini',           category: 'DRINK', price: 12.50, description: 'Absolut Vanilla, Kahlúa, double espresso, coffee foam',                               imageUrl: img('1509042239860-f550ce710b93') },

  // SPECIALS
  { name: 'Surf & Turf Royale',         category: 'SPECIAL', price: 115.00, description: 'A5 Wagyu fillet + half native lobster thermidor, truffle butter, champagne beurre blanc, triple-cooked chips', imageUrl: img('1558030006-450675393462') },
  { name: 'The Royal Tomahawk',         category: 'SPECIAL', price: 145.00, description: '48oz bone-in Wagyu tomahawk for two, carved tableside, béarnaise, bone marrow, roasted garlic loaf',          imageUrl: img('1544025162-d76694265947') },
];

// ── inventory template ────────────────────────────────────────────────────────
const INVENTORY_ITEMS = [
  { itemName: 'Wagyu Ribeye (kg)',          unit: 'kg',    currentStock: 45,  minimumStock: 10 },
  { itemName: 'USDA Prime Fillet (kg)',     unit: 'kg',    currentStock: 30,  minimumStock: 8  },
  { itemName: 'Lobster (units)',            unit: 'units', currentStock: 20,  minimumStock: 5  },
  { itemName: 'Black Truffle (g)',          unit: 'g',     currentStock: 500, minimumStock: 100},
  { itemName: 'House Red Wine (bottles)',   unit: 'btls',  currentStock: 60,  minimumStock: 15 },
];

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🥩  Steakz — starting seed...\n');

  // 1. BRANCHES
  console.log('📍 Seeding branches...');
  const branchMap: Record<string, string> = {};
  for (const b of BRANCHES) {
    const branch = await prisma.branch.upsert({
      where:  { email: b.email },
      update: { name: b.name, city: b.city, address: b.address, postcode: b.postcode, phone: b.phone },
      create: { ...b, isActive: true },
    });
    branchMap[b.city] = branch.id;
  }
  console.log(`   ✅ ${BRANCHES.length} branches ready`);

  // 2. ADMIN + HQ
  console.log('👤 Seeding admin / HQ users...');
  await prisma.user.upsert({
    where:  { email: 'admin@steakz.co.uk' },
    update: {},
    create: { name: 'System Admin', email: 'admin@steakz.co.uk', password: hash('Admin@123'), role: 'ADMIN' },
  });
  await prisma.user.upsert({
    where:  { email: 'hq@steakz.co.uk' },
    update: {},
    create: { name: 'HQ Manager', email: 'hq@steakz.co.uk', password: hash('Password@123'), role: 'HQ_MANAGER' },
  });
  console.log('   ✅ Admin + HQ ready');

  // 3. BRANCH STAFF
  console.log('👥 Seeding branch staff...');
  const cities = ['London','Manchester','Birmingham','Edinburgh','Bristol','Leeds','Glasgow'];
  for (const city of cities) {
    const branchId = branchMap[city];
    const slug     = city.toLowerCase();
    const staff    = [
      { suffix: 'manager',  role: 'BRANCH_MANAGER' as const, name: `${city} Manager`  },
      { suffix: 'chef',     role: 'CHEF'            as const, name: `${city} Chef`     },
      { suffix: 'cashier',  role: 'CASHIER'         as const, name: `${city} Cashier`  },
      { suffix: 'waiter1',  role: 'WAITER'          as const, name: `${city} Waiter`   },
    ];
    for (const s of staff) {
      await prisma.user.upsert({
        where:  { email: `${slug}.${s.suffix}@steakz.co.uk` },
        update: { branchId, role: s.role },   // always keep branchId in sync
        create: { name: s.name, email: `${slug}.${s.suffix}@steakz.co.uk`, password: hash('Password@123'), role: s.role, branchId },
      });
    }
  }
  console.log('   ✅ Branch staff ready');

  // 4. MENU ITEMS
  console.log('🍽️  Seeding menu items...');
  await prisma.menuItem.deleteMany({});
  await prisma.menuItem.createMany({
    data: MENU.map(item => ({ ...item, isActive: true })),
  });
  console.log(`   ✅ ${MENU.length} menu items created`);

  // 5. TABLES
  console.log('🪑 Seeding tables...');
  const sizes = [2, 2, 4, 4, 4, 4, 6, 6, 6, 8];
  for (const branchId of Object.values(branchMap)) {
    for (let i = 0; i < 10; i++) {
      await prisma.table.upsert({
        where: { branchId_tableNumber: { branchId, tableNumber: i + 1 } },
        update: { capacity: sizes[i] },
        create: { branchId, tableNumber: i + 1, capacity: sizes[i], status: 'AVAILABLE' }
      });
    }
  }
  console.log('   ✅ Tables ready');

  // 6. INVENTORY
  console.log('📦 Seeding inventory...');
  for (const branchId of Object.values(branchMap)) {
    for (const inv of INVENTORY_ITEMS) {
      const existing = await prisma.inventory.findFirst({ where: { branchId, itemName: inv.itemName } });
      if (!existing) {
        await prisma.inventory.create({ data: { ...inv, branchId } });
      }
    }
  }
  console.log('   ✅ Inventory ready');

  console.log('\n✅  Seed complete!\n');
}

main()
  .catch(e => { console.error('❌  Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());