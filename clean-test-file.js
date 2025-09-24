function calculateSum(a, b) {
    let result = a + b;
    console.log("Sum is: " + result);
    return result;
}

let numbers = [1, 2, 3, 4, 5];
for (let i = 0; i < numbers.length; i++) {
    console.log(numbers[i]);
}

function greetUser(userName) {
    console.log("Hello " + userName);
}

let sum = calculateSum(5, 3);
greetUser("Antony");