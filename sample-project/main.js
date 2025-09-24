function calculateTotal(items) {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
        total += items[i].price;
    }
    return total;
}

let products = [
    { name: "Laptop", price: 999 },
    { name: "Mouse", price: 25 }
];

console.log("Total: " + calculateTotal(products));