function greetUser(name) {
    if (!name) {
        return "Hello, Guest!";
    }
    return `Hello, ${name}!`;
}

const user = "Antony";
console.log(greetUser(user));

module.exports = { greetUser };