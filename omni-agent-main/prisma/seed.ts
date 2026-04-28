// Seed script for OmniAgent Clothing Store
// Custom entries with Pexels images for ecommerce boost start

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { searchPexelsImages } from '../src/services/pexels.service';

const prisma = new PrismaClient();

// Pexels image URLs (curated via Pexels MCP) - fallback when API unavailable
const PEXELS_IMAGES: Record<string, string> = {
  tshirt: 'https://images.pexels.com/photos/1040945/pexels-photo-1040945.jpeg?auto=compress&cs=tinysrgb&w=600',
  jeans: 'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=600',
  hoodie: 'https://images.pexels.com/photos/1153838/pexels-photo-1153838.jpeg?auto=compress&cs=tinysrgb&w=600',
  jacket: 'https://images.pexels.com/photos/7679638/pexels-photo-7679638.jpeg?auto=compress&cs=tinysrgb&w=600',
  sneakers: 'https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=600',
  cap: 'https://images.pexels.com/photos/157675/fashion-men-s-individuality-black-and-white-157675.jpeg?auto=compress&cs=tinysrgb&w=600',
  blouse: 'https://images.pexels.com/photos/1485968/pexels-photo-1485968.jpeg?auto=compress&cs=tinysrgb&w=600',
  // Dress images from Pexels MCP
  dress_elegant: 'https://images.pexels.com/photos/33296071/pexels-photo-33296071.jpeg?auto=compress&cs=tinysrgb&w=600',
  dress_summer_floral: 'https://images.pexels.com/photos/31830781/pexels-photo-31830781.jpeg?auto=compress&cs=tinysrgb&w=600',
  dress_floral_pink: 'https://images.pexels.com/photos/19236170/pexels-photo-19236170.jpeg?auto=compress&cs=tinysrgb&w=600',
  dress_maxi_casual: 'https://images.pexels.com/photos/15573299/pexels-photo-15573299.jpeg?auto=compress&cs=tinysrgb&w=600',
  dress_maxi_denim: 'https://images.pexels.com/photos/17071185/pexels-photo-17071185.jpeg?auto=compress&cs=tinysrgb&w=600',
  dress_maxi_floral: 'https://images.pexels.com/photos/18807721/pexels-photo-18807721.jpeg?auto=compress&cs=tinysrgb&w=600',
  dress_maxi_striped: 'https://images.pexels.com/photos/25731827/pexels-photo-25731827.jpeg?auto=compress&cs=tinysrgb&w=600',
  dress_black_elegant: 'https://images.pexels.com/photos/24247329/pexels-photo-24247329.jpeg?auto=compress&cs=tinysrgb&w=600',
};

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.agentVote.deleteMany();
  await prisma.agentDecision.deleteMany();
  await prisma.agentLog.deleteMany();
  await prisma.agentAlert.deleteMany();
  await prisma.monitoringRule.deleteMany();
  await prisma.simulationEvent.deleteMany();
  await prisma.simulationScenario.deleteMany();
  await prisma.returnRequest.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.address.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.agentMemory.deleteMany();
  await prisma.agentType.deleteMany();

  // 1. Create Agent Types
  console.log('🤖 Creating agent types...');
  await Promise.all([
    prisma.agentType.create({ data: { id: 'warden', name: 'Warden Agent', role: 'Monitoring and Detection', configuration: JSON.stringify({ alertThreshold: 10 }), isActive: true } }),
    prisma.agentType.create({ data: { id: 'finance', name: 'Finance Agent', role: 'Budget Analysis and Approval', configuration: JSON.stringify({ minCashReserve: 5000 }), isActive: true } }),
    prisma.agentType.create({ data: { id: 'architect', name: 'Architect Agent', role: 'Data Analysis', configuration: JSON.stringify({ queryTimeout: 30000 }), isActive: true } }),
    prisma.agentType.create({ data: { id: 'support', name: 'Support Agent', role: 'Customer Communication', configuration: JSON.stringify({ tone: 'friendly' }), isActive: true } }),
    prisma.agentType.create({ data: { id: 'executive', name: 'Executive Agent', role: 'Decision Coordination', configuration: JSON.stringify({ consensusTimeout: 60 }), isActive: true } }),
  ]);
  console.log('✅ Created 5 agent types');

  // 2. Create categories
  console.log('\n📂 Creating categories...');
  const clothing = await prisma.category.create({
    data: { name: 'Clothing', slug: 'clothing', displayOrder: 0 },
  });
  const dresses = await prisma.category.create({
    data: { name: 'Dresses', slug: 'dresses', displayOrder: 1 },
  });
  const accessories = await prisma.category.create({
    data: { name: 'Accessories', slug: 'accessories', displayOrder: 2 },
  });
  const shoes = await prisma.category.create({
    data: { name: 'Shoes', slug: 'shoes', displayOrder: 3 },
  });
  console.log('✅ Created 4 categories');

  // 3. Create products with Pexels images (API fetch or fallback)
  console.log('\n👕 Creating products...');

  const productDefs = [
    { name: 'Cotton T-Shirt', description: 'Comfortable cotton t-shirt', price: 24.99, size: 'M', stock: 45, imgKey: 'tshirt', categoryId: clothing.id },
    { name: 'Classic Jeans', description: 'Durable denim jeans', price: 79.99, size: '32', stock: 12, imgKey: 'jeans', categoryId: clothing.id },
    { name: 'Cotton Hoodie', description: 'Soft hoodie for layering', price: 69.99, size: 'L', stock: 8, imgKey: 'hoodie', categoryId: clothing.id },
    { name: 'Leather Jacket', description: 'Classic leather jacket', price: 249.99, size: 'M', stock: 15, imgKey: 'jacket', categoryId: clothing.id },
    { name: 'Canvas Sneakers', description: 'Comfortable everyday sneakers', price: 64.99, size: '9', stock: 4, imgKey: 'sneakers', categoryId: clothing.id },
    { name: 'Baseball Cap', description: 'Adjustable cotton cap', price: 19.99, size: 'One Size', stock: 150, imgKey: 'cap', categoryId: clothing.id },
    // Dresses - Pexels MCP curated images
    { name: 'Summer Dress', description: 'Light floral dress for warm days', price: 59.99, size: 'M', stock: 3, imgKey: 'dress_summer_floral', categoryId: dresses.id },
    { name: 'Elegant White Dress', description: 'Timeless white dress for special occasions', price: 129.99, size: 'S', stock: 5, imgKey: 'dress_elegant', categoryId: dresses.id },
    { name: 'Pink Floral Dress', description: 'Romantic pink dress with floral print', price: 74.99, size: 'M', stock: 7, imgKey: 'dress_floral_pink', categoryId: dresses.id },
    { name: 'Casual Maxi Dress', description: 'Comfortable floral maxi for everyday wear', price: 64.99, size: 'L', stock: 4, imgKey: 'dress_maxi_casual', categoryId: dresses.id },
    { name: 'Denim Maxi Dress', description: 'Stylish denim maxi with button details', price: 89.99, size: 'M', stock: 6, imgKey: 'dress_maxi_denim', categoryId: dresses.id },
    { name: 'Vibrant Floral Maxi', description: 'Bold floral print maxi dress', price: 79.99, size: 'S', stock: 2, imgKey: 'dress_maxi_floral', categoryId: dresses.id },
    { name: 'Striped Maxi Dress', description: 'Colorful striped maxi for summer', price: 69.99, size: 'M', stock: 8, imgKey: 'dress_maxi_striped', categoryId: dresses.id },
    { name: 'Black Elegant Dress', description: 'Sophisticated black maxi with clean lines', price: 149.99, size: 'S', stock: 4, imgKey: 'dress_black_elegant', categoryId: dresses.id },
    // Accessories
    { name: 'Leather Belt', description: 'Classic brown leather belt', price: 45.99, size: 'M', stock: 25, imgKey: 'cap', categoryId: accessories.id },
    { name: 'Sunglasses', description: 'UV protection aviator style', price: 89.99, size: 'One Size', stock: 18, imgKey: 'cap', categoryId: accessories.id },
    { name: 'Backpack', description: 'Canvas everyday backpack', price: 79.99, size: 'One Size', stock: 12, imgKey: 'hoodie', categoryId: accessories.id },
    { name: 'Watch', description: 'Minimalist leather strap watch', price: 129.99, size: 'One Size', stock: 8, imgKey: 'sneakers', categoryId: accessories.id },
    // Shoes (reuse images)
    { name: 'Running Shoes', description: 'Lightweight running sneakers', price: 94.99, size: '10', stock: 6, imgKey: 'sneakers', categoryId: shoes.id },
    { name: 'Loafers', description: 'Classic leather loafers', price: 119.99, size: '9', stock: 5, imgKey: 'jacket', categoryId: shoes.id },
  ];

  const createdVariants: { id: string; sku: string }[] = [];

  for (let i = 0; i < productDefs.length; i++) {
    const p = productDefs[i];
    let imgUrl = PEXELS_IMAGES[p.imgKey];
    // Try Pexels API for dress images (dynamic fetch)
    if (!imgUrl && p.imgKey.startsWith('dress_')) {
      const pexelsResults = await searchPexelsImages(p.name, 1);
      imgUrl = pexelsResults[0] || PEXELS_IMAGES.dress_summer_floral;
    }
    if (!imgUrl) imgUrl = PEXELS_IMAGES.tshirt; // final fallback

    const product = await prisma.product.create({
      data: {
        name: p.name,
        description: p.description,
        brand: null,
        categoryId: p.categoryId,
        metadata: null,
        isSimulated: false,
      },
    });

    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `SKU-${p.name.replace(/\s/g, '-').toUpperCase()}-${i + 1}`,
        size: p.size,
        color: null,
        price: p.price,
        costPrice: p.price * 0.6,
        images: JSON.stringify([imgUrl]),
        inventory: {
          create: {
            quantity: p.stock,
            reservedQuantity: 0,
            reorderThreshold: 10,
            reorderQuantity: 50,
          },
        },
      },
    });
    createdVariants.push({ id: variant.id, sku: variant.sku });
  }

  console.log(`✅ Created ${productDefs.length} products across 4 categories`);

  // 4. Create demo customer (for ecom frontend demo-customer-001)
  console.log('\n👥 Creating customers...');
  const demoCustomer = await prisma.customer.create({
    data: {
      id: 'demo-customer-001',
      email: 'demo@lumiere.com',
      name: 'Demo Customer',
      phone: '+1-555-3980',
      isSimulated: false,
      addresses: {
        create: [
          { type: 'shipping', street: '123 Demo St', city: 'New York', state: 'NY', zip: '10001', country: 'US', isDefault: true },
          { type: 'billing', street: '123 Demo St', city: 'New York', state: 'NY', zip: '10001', country: 'US', isDefault: true },
        ],
      },
    },
  });

  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        email: 'john.doe@example.com',
        name: 'John Doe',
        phone: '+1-555-0101',
        isSimulated: false,
        addresses: {
          create: [
            { type: 'billing', street: '123 Main St', city: 'New York', state: 'NY', zip: '10001', country: 'US', isDefault: true },
            { type: 'shipping', street: '456 Oak Ave', city: 'New York', state: 'NY', zip: '10002', country: 'US', isDefault: false },
          ],
        },
      },
    }),
    prisma.customer.create({
      data: {
        email: 'sarah.smith@example.com',
        name: 'Sarah Smith',
        phone: '+1-555-0202',
        isSimulated: false,
        addresses: { create: { type: 'billing', street: '789 Elm St', city: 'Los Angeles', state: 'CA', zip: '90001', country: 'US', isDefault: true } },
      },
    }),
    prisma.customer.create({
      data: {
        email: 'mike.johnson@example.com',
        name: 'Mike Johnson',
        phone: '+1-555-0303',
        isSimulated: false,
        addresses: { create: { type: 'billing', street: '321 Pine Rd', city: 'Chicago', state: 'IL', zip: '60601', country: 'US', isDefault: true } },
      },
    }),
  ]);
  console.log(`✅ Created ${customers.length + 1} customers (incl. demo-customer-001)`);

  // 5. Create Sample Orders
  console.log('\n📦 Creating sample orders...');
  const demoAddress = await prisma.address.findFirst({ where: { customerId: demoCustomer.id, type: 'shipping' } });
  const johnAddress = await prisma.address.findFirst({ where: { customerId: customers[0].id, type: 'shipping' } });
  const sarahAddress = await prisma.address.findFirst({ where: { customerId: customers[1].id } });

  // Demo customer orders (for returns/orders pages)
  await prisma.order.create({
    data: {
      orderNumber: 'ORD-DEMO-001',
      customerId: demoCustomer.id,
      status: 'completed',
      subtotal: 144.98,
      tax: 13.05,
      shipping: 5.99,
      total: 164.02,
      shippingAddressId: demoAddress!.id,
      isSimulated: false,
      items: {
        create: [
          { variantId: createdVariants[0].id, quantity: 1, priceAtPurchase: 24.99, costAtPurchase: 15 },
          { variantId: createdVariants[2].id, quantity: 1, priceAtPurchase: 69.99, costAtPurchase: 42 },
          { variantId: createdVariants[4].id, quantity: 1, priceAtPurchase: 64.99, costAtPurchase: 39 },
        ],
      },
      payment: { create: { amount: 164.02, method: 'credit_card', status: 'completed', transactionId: 'TXN-DEMO-001' } },
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: 'ORD-001',
      customerId: customers[0].id,
      status: 'completed',
      subtotal: 104.98,
      tax: 9.45,
      shipping: 5.99,
      total: 120.42,
      shippingAddressId: johnAddress!.id,
      isSimulated: false,
      items: {
        create: [
          { variantId: createdVariants[0].id, quantity: 2, priceAtPurchase: 24.99, costAtPurchase: 15 },
          { variantId: createdVariants[1].id, quantity: 1, priceAtPurchase: 79.99, costAtPurchase: 48 },
        ],
      },
      payment: { create: { amount: 120.42, method: 'credit_card', status: 'completed', transactionId: 'TXN-001' } },
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: 'ORD-002',
      customerId: customers[1].id,
      status: 'processing',
      subtotal: 59.99,
      tax: 5.40,
      shipping: 5.99,
      total: 71.38,
      shippingAddressId: sarahAddress!.id,
      isSimulated: false,
      items: { create: { variantId: createdVariants[6].id, quantity: 1, priceAtPurchase: 59.99, costAtPurchase: 36 } },
      payment: { create: { amount: 71.38, method: 'paypal', status: 'completed', transactionId: 'TXN-002' } },
    },
  });
  console.log('✅ Created 2 sample orders');

  // 6. Create Abandoned Cart
  console.log('\n🛒 Creating abandoned cart...');
  await prisma.cart.create({
    data: {
      customerId: customers[2].id,
      abandonedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      items: {
        create: [
          { variantId: createdVariants[1].id, quantity: 1 },
          { variantId: createdVariants[5].id, quantity: 2 },
        ],
      },
    },
  });
  console.log('✅ Created 1 abandoned cart');

  // 7. Create Monitoring Rules
  console.log('\n📊 Creating monitoring rules...');
  await Promise.all([
    prisma.monitoringRule.create({ data: { ruleType: 'inventory_low', agentResponsible: 'warden', thresholdConfig: JSON.stringify({ threshold: 15, severity: 'high' }), enabled: true } }),
    prisma.monitoringRule.create({ data: { ruleType: 'abandoned_cart', agentResponsible: 'warden', thresholdConfig: JSON.stringify({ minValue: 50, hoursAbandoned: 2 }), enabled: true } }),
    prisma.monitoringRule.create({ data: { ruleType: 'sales_spike', agentResponsible: 'warden', thresholdConfig: JSON.stringify({ velocityMultiplier: 3, timeWindow: 24 }), enabled: true } }),
  ]);
  console.log('✅ Created 3 monitoring rules');

  // 8. Create Simulation Scenarios
  console.log('\n🎮 Creating simulation scenarios...');
  await Promise.all([
    prisma.simulationScenario.create({ data: { name: 'Black Friday Rush', description: '3x sales velocity', initialState: '{}', triggers: JSON.stringify({ type: 'sales_spike', multiplier: 3 }), isActive: false } }),
    prisma.simulationScenario.create({ data: { name: 'Supply Chain Delay', description: 'Simulate restock delay', initialState: '{}', triggers: JSON.stringify({ type: 'restock_delay', delayDays: 7 }), isActive: false } }),
    prisma.simulationScenario.create({ data: { name: 'Viral Trend', description: 'Product goes viral', initialState: '{}', triggers: JSON.stringify({ type: 'viral_spike', multiplier: 10 }), isActive: false } }),
  ]);
  console.log('✅ Created 3 simulation scenarios');

  // 9. Initial Agent Log
  await prisma.agentLog.create({
    data: { agentId: 'warden', eventType: 'system_initialized', severity: 'info', message: 'Warden Agent initialized', metadata: JSON.stringify({ timestamp: new Date().toISOString() }) },
  });

  console.log('\n✅ Database seeding completed!\n');
  console.log('📊 Summary: 4 categories, 20 products, 4 customers (incl. demo-customer-001), 3 orders, 1 abandoned cart\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
