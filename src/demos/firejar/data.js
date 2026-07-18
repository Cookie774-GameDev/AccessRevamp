export const PRODUCTS = [
  { id: 'ember', name: 'Ember Crunch', heat: 1, price: 12, note: 'Fictional sample product; nutrition and allergen details are not real.' },
  { id: 'flare', name: 'Flare & Honey', heat: 2, price: 14, note: 'Fictional sample product; contains a sample peanut disclosure.' },
  { id: 'wildfire', name: 'Wildfire Cocoa', heat: 3, price: 15, note: 'Fictional sample product; stock and shipping are simulated.' }
];
export const findProduct = (id) => PRODUCTS.find((product) => product.id === id);
