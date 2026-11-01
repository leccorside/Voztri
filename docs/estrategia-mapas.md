# Estratégia de Mapas 100% Gratuitos e Open Source

## 1. Princípios
A infraestrutura de mapas do VOZTRI foi projetada para eliminar qualquer dependência comercial paga (como Google Maps Platform ou Mapbox API), viabilizando operação com custo zero de licenciamento cartográfico através da stack:
- **Camada Cartográfica**: OpenStreetMap (OSM) sob licença ODbL com tiles vetoriais/raster servidos localmente ou por mirrors open source de alta disponibilidade.
- **Renderização nos Apps**: MapLibre GL Native para React Native (`@maplibre/maplibre-react-native`) e MapLibre GL JS no Painel Web. Suporte a tema escuro (Dark Mode #0B1026) e claro nativos com renderização em hardware 60fps.
- **Roteamento Viário & Matriz de Distância**: OSRM (Open Source Routing Machine) ou Valhalla executado em container local com perfil de trânsito automotivo (`car.lua`).
- **Geocodificação & Busca de Endereços**: Photon (baseado em Elasticsearch e OSM) / Pelias para busca autocompletar e geocodificação reversa local.

## 2. Abstração e Interfaces de Mapa
Toda a lógica é isolada através de interfaces TypeScript e PHP:
```php
interface RoutingServiceInterface {
    public function calculateRoute(Point $origin, Point $destination, array $waypoints = []): RouteResult;
    public function calculateDistanceMatrix(array $origins, array $destinations): array;
}

interface GeocodingServiceInterface {
    public function searchAddress(string $query, ?Point $proximity = null): array;
    public function reverseGeocode(float $latitude, float $longitude): ?AddressResult;
}
```

## 3. Navegação Passo a Passo (Turn-by-Turn)
O OSRM retorna instruções detalhadas de manobra (`turn left`, `roundabout`, `arrive`), nomes de vias e distâncias parciais. O aplicativo do motorista decodifica a polyline e calcula a aproximação em tempo real com anúncio sonoro/háptico a 100m da manobra.

