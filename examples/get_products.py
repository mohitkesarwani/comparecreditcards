import requests
import json
import pprint

BASE_URL = "https://api.anz/cds-au/v1"

HEADERS = {
    "x-v": "2",
    "Accept": "application/json"
}

def list_products():
    response = requests.get(BASE_URL + "/banking/products", headers=HEADERS)
    response.raise_for_status()
    return response.json()

def get_product_detail(product_id):
    response = requests.get(f"{BASE_URL}/banking/products/{product_id}", headers=HEADERS)
    response.raise_for_status()
    return response.json()

if __name__ == "__main__":
    products = list_products()
    print("Product list:")
    pprint.pprint(products)

    first_product_id = products.get("data", {}).get("products", [{}])[0].get("productId")
    if first_product_id:
        detail = get_product_detail(first_product_id)
        print("\nProduct detail:")
        pprint.pprint(detail)
    else:
        print("No products returned")
