const shops = {
  paris: [
    {
      id: 'franprix_paris',
      name: 'Supermarché Franprix',
      type: 'supermarket',
      location: 'paris',
      inventory: [
        { id: 'baguette', name: 'Baguette Tradition', price: 1, type: 'food' },
        { id: 'eau_evian', name: 'Eau Evian (1L)', price: 2, type: 'food' },
        { id: 'fromage_camembert', name: 'Fromage Camembert', price: 5, type: 'food' },
        { id: 'vin_rouge', name: 'Vin Rouge (75cl)', price: 10, type: 'food' },
        { id: 'croissant', name: 'Croissant au beurre', price: 1, type: 'food' },
        { id: 'pain_chocolat', name: 'Pain au Chocolat', price: 1, type: 'food' },
      ],
    },
    {
      id: 'lafayette_paris',
      name: 'Galeries Lafayette',
      type: 'department_store',
      location: 'paris',
      inventory: [
        { id: 'tshirt_luxe', name: 'T-shirt de Créateur', price: 250, type: 'clothing' },
        { id: 'jean_luxe', name: 'Jean de Luxe', price: 500, type: 'clothing' },
        { id: 'montre_luxe', name: 'Montre de Luxe', price: 5000, type: 'accessory' },
        { id: 'parfum_chanel', name: 'Parfum Chanel N°5', price: 150, type: 'accessory' },
      ],
    },
  ],
  tokyo: [
    {
      id: '7eleven_tokyo',
      name: '7-Eleven Konbini',
      type: 'convenience_store',
      location: 'tokyo',
      inventory: [
        { id: 'onigiri_saumon', name: 'Onigiri Saumon', price: 150, type: 'food' },
        { id: 'ramen_tonkotsu', name: 'Ramen Tonkotsu Instantané', price: 350, type: 'food' },
        { id: 'bento_katsudon', name: 'Bento Katsudon', price: 600, type: 'food' },
        { id: 'the_vert', name: 'Thé Vert (bouteille)', price: 120, type: 'food' },
      ],
    },
    {
      id: 'yodobashi_tokyo',
      name: 'Yodobashi Camera',
      type: 'electronics',
      location: 'tokyo',
      inventory: [
        { id: 'smartphone_sony', name: 'Smartphone Sony Xperia', price: 80000, type: 'electronics' },
        { id: 'appareil_photo_canon', name: 'Appareil photo Canon EOS', price: 120000, type: 'electronics' },
        { id: 'ecouteurs_audio_technica', name: 'Écouteurs Audio-Technica', price: 20000, type: 'electronics' },
        { id: 'console_nintendo', name: 'Console Nintendo Switch', price: 30000, type: 'electronics' },
      ],
    },
  ],
  new_york: [
    {
      id: 'wholefoods_ny',
      name: 'Whole Foods Market',
      type: 'supermarket',
      location: 'new_york',
      inventory: [
        { id: 'pain_bio', name: 'Pain Bio Complet', price: 6, type: 'food' },
        { id: 'eau_fiji', name: 'Eau Fiji (1L)', price: 4, type: 'food' },
        { id: 'salade_kale', name: 'Salade de Kale', price: 10, type: 'food' },
        { id: 'cafe_starbucks', name: 'Café Starbucks (grains)', price: 15, type: 'food' },
      ],
    },
    {
      id: 'bestbuy_ny',
      name: 'Best Buy',
      type: 'electronics',
      location: 'new_york',
      inventory: [
        { id: 'laptop_macbook', name: 'Laptop MacBook Pro', price: 2500, type: 'electronics' },
        { id: 'drone_dji', name: 'Drone DJI Mavic', price: 1200, type: 'electronics' },
        { id: 'casque_vr_oculus', name: 'Casque VR Oculus Quest', price: 400, type: 'electronics' },
        { id: 'smartphone_iphone', name: 'Smartphone iPhone 15', price: 1100, type: 'electronics' },
      ],
    },
    {
        id: 'gunstore_ny',
        name: 'NYC Gun Store',
        type: 'gun_store',
        location: 'new_york',
        inventory: [
            { id: 'pistolet_glock', name: 'Pistolet Glock 19', price: 600, type: 'weapon' },
            { id: 'munitions_9mm', name: 'Boîte de 50 munitions 9mm', price: 30, type: 'ammo' },
        ],
    },
    {
        id: 'ford_ny',
        name: 'Ford Dealership',
        type: 'car_dealership',
        location: 'new_york',
        inventory: [
            { id: 'ford_mustang', name: 'Ford Mustang', price: 45000, type: 'vehicle' },
            { id: 'ford_explorer', name: 'Ford Explorer SUV', price: 55000, type: 'vehicle' },
        ],
    },
  ],
};

class ShopManager {
  getShops(location) {
    return shops[location] || [];
  }

  buyItem(player, shopId, itemId) {
    const shop = Object.values(shops)
      .flat()
      .find((s) => s.id === shopId);

    if (!shop) {
      return { success: false, message: 'Boutique non trouvée.' };
    }

    if (player.position.location !== shop.location) {
      return { success: false, message: 'Vous n\'êtes pas dans la bonne ville pour acheter dans cette boutique.' };
    }

    const item = shop.inventory.find((i) => i.id === itemId);

    if (!item) {
      return { success: false, message: 'Article non trouvé.' };
    }

    if (player.inventory.money < item.price) {
      return { success: false, message: 'Argent insuffisant.' };
    }

    // Logique d'achat spécifique par type d'article
    if (item.type === 'vehicle') {
        player.inventory.vehicles.push({ name: item.name, fuel: 100 });
    } else {
        if (!player.inventory.items) {
            player.inventory.items = [];
        }
        player.inventory.items.push({ name: item.name, type: item.type });
    }

    player.inventory.money -= item.price;

    return { success: true, message: `Vous avez acheté ${item.name} pour ${item.price}$.` };
  }
}

export default new ShopManager();
