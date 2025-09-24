def process_data(data: list) -> list:
    result = []
    for item in data:
        if item > 0:
            result.append(item * 2)
    return result

def validate_input(value):
    print("Validating:", value)
    return value is not None

numbers = [1,2,3,-1,0]
processed = process_data(numbers)

if validate_input(numbers):
    print("Input is valid")
else:
    print("Input is invalid")