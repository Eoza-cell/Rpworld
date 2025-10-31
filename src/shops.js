const shops = {
  paris: [
    {
      id: 'supermarche_paris',
      name: 'Supermarché Franprix',
      inventory: [
        { id: 'pain', name: 'Baguette', price: 1 },
        { id: 'eau', name: 'Bouteille d\'eau', price: 2 },
      ],
    },
  ],
  tokyo: [
    {
      id: 'konbini_tokyo',
      name: '7-Eleven',
      inventory: [
        { id: 'onigiri', name: 'Onigiri', price: 150 },
        { id: 'ramen', name: 'Ramen instantané', price: 300 },
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

    const item = shop.inventory.find((i) => i.id === itemId);

    if (!item) {
      return { success: false, message: 'Article non trouvé.' };
    }

    if (player.inventory.money < item.price) {
      return { success: false, message: 'Argent insuffisant.' };
    }

    player.inventory.money -= item.price;
    if (!player.inventory.items) {
      player.inventory.items = [];
    }
    player.inventory.items.push(item);

    return { success: true, message: `Vous avez acheté ${item.name} pour ${item.price}$.` };
  }
}

export default new ShopManager();