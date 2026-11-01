# Infraestrutura de Mapas Open Source VOZTRI

Esta pasta contém as diretrizes e arquivos de configuração para a pilha de geolocalização e mapas 100% gratuita do VOZTRI.

## 1. OSRM (Open Source Routing Machine)
O serviço de roteamento é executado localmente sem custos de API:

```bash
# Baixar o extrato OSM da região desejada (ex: São Paulo ou Sudeste Brasil)
wget https://download.geofabrik.de/south-america/brazil/sudeste-latest.osm.pbf -O maps.osm.pbf

# Extrair e preparar o grafo viário de tráfego de automóveis (car.lua)
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/maps.osm.pbf
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/maps.osrm
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/maps.osrm

# Subir o servidor HTTP de roteamento OSRM
docker run -t -i -p 5000:5000 -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-routed --algorithm mld /data/maps.osrm
```

## 2. Servidor de Tiles Vetoriais
- **MapLibre GL**: Tanto o app móvel quanto o painel web consomem estilos MapLibre no padrão CartoDB / Positron (light) e Dark Matter (dark) ou servidos localmente via Martin Tile Server.
- Estilo claro: `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`
- Estilo escuro (Azul escuro #0B1026): `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`
