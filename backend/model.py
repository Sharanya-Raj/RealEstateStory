from dataclasses import dataclass

@dataclass
class Apartment:
    name: str
    address: str
    price: str
    bedrooms: int
    latitude: float
    longitude: float
    source: str
    score: float = 0.0
