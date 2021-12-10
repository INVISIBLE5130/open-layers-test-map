const target = document.getElementById('map')
let defaultCenter = [3171025.343207729, 6313381.5165618025]

const iconFeature = new ol.Feature({
    geometry: new ol.geom.Point([0, 0]),
    // name: 'Null Island',
    population: 4000,
    rainfall: 500,
    name: 'Point'
});

const iconStyle = new ol.style.Style({
    image: new ol.style.Icon({
        anchor: [0.5, 46],
        anchorXUnits: 'fraction',
        anchorYUnits: 'pixels',
        src: 'https://img.icons8.com/ios-filled/50/000000/marker-p.png',
    }),
});

iconFeature.setStyle(iconStyle);

//Map

const viewCenter = new ol.View({
    center: defaultCenter,
    zoom: 0,
    maxZoom: 15,
    minZoom: 0,
    enableRotation: true,
    // projection: 34
})

function viewCenterAnimation(center) {
    viewCenter.animate({
        center: center,
        duration: 2000,
        zoom: 1
    })
}

const tileLayer = new ol.layer.Tile({
    source: new ol.source.OSM({
        wrapX: false,
    }),
});

const source = new ol.source.Vector({
    wrapX: false,
    features: [iconFeature],
});

source.on('addfeature', e => {
    // console.log(e)
})

const vector = new ol.layer.Vector({
    source: source,
});

const rasterLayer = new ol.layer.Tile({
    source: new ol.source.TileJSON({
        url: 'https://a.tiles.mapbox.com/v3/aj.1x1-degrees.json?secure=1',
        crossOrigin: '',
    }),
});

class CurrentLocation extends ol.control.Control {
    constructor(opt_options) {
        const options = opt_options || {};

        const button = document.createElement('button'),
            img = document.createElement('img')
        img.setAttribute('src', './images/navigation.svg')
        button.appendChild(img);

        const element = document.createElement('div');
        element.className = 'navigation ol-unselectable ol-control';
        element.appendChild(button);

        super({
            element: element,
            target: options.target,
        });

        button.addEventListener('click', this.navigationHandler.bind(this), false);
    }

    navigationHandler() {
        this.getMap().getView().setCenter(defaultCenter)
    }
}

const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');

/**
 * Create an overlay to anchor the popup to the map.
 */
const overlay = new ol.Overlay({
    element: container,
    autoPan: true,
    autoPanAnimation: {
        duration: 250,
    },
});

closer.onclick = function () {
    overlay.setPosition(undefined);
    closer.blur();
    return false;
};

const map = new ol.Map({
    controls: ol.control.defaults().extend([new CurrentLocation()]),
    target: target,
    layers: [
        tileLayer,
        vector,
        rasterLayer
    ],
    view: viewCenter,
    geolocation: new ol.Geolocation({
        tracking: true
    }),
    overlays: [overlay],
});

//Custom icon

const modify = new ol.interaction.Modify({
    hitDetection: vector,
    source: source,
});
modify.on(['modifystart', 'modifyend'], function (evt) {
    target.style.cursor = evt.type === 'modifystart' ? 'grabbing' : 'pointer';
});
const overlaySource = modify.getOverlay().getSource();
overlaySource.on(['addfeature', 'removefeature'], function (evt) {
    target.style.cursor = evt.type === 'addfeature' ? 'pointer' : '';
});

map.addInteraction(modify)

//Adding points to the map

map.on('click', e => {
    const coordinates = map
        .getFeaturesAtPixel(e.pixel, {})[0]
        .getGeometry()
        .flatCoordinates
    console.log(map.getFeaturesAtPixel(e.pixel, {}))
    console.log(map.getFeaturesAtPixel(e.pixel, {})[0].get('name'))
    console.log(coordinates)
    const hdms = ol.coordinate.toStringHDMS(ol.proj.toLonLat(coordinates));

    content.innerHTML = '<p>You clicked here:</p><code>' + hdms + '</code>';
    overlay.setPosition(coordinates);
    const x = ol.proj.toLonLat(e.coordinate)[0]
    const y = ol.proj.toLonLat(e.coordinate)[1]
    addRandomFeature(x, y)
})

function addRandomFeature(x, y) {
    const geom = new ol.geom.Point(ol.proj.fromLonLat([x, y]));
    const feature = new ol.Feature(geom);
    source.addFeature(feature);
}

//Navigation to current geolocation

const geolocation = new ol.Geolocation({
    trackingOptions: {
        enableHighAccuracy: true,
    },
    projection: viewCenter.getProjection(),
});

geolocation.setTracking(true);

geolocation.on('error', function (error) {
    const info = document.getElementById('info');
    info.innerHTML = error.message;
    info.style.display = '';
});

const accuracyFeature = new ol.Feature();
geolocation.on('change:accuracyGeometry', function () {
    accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
});

const positionFeature = new ol.Feature();
positionFeature.setStyle(
    new ol.style.Style({
        image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({
                color: '#3399CC',
            }),
            stroke: new ol.style.Stroke({
                color: '#fff',
                width: 2,
            }),
        }),
    })
);

geolocation.on('change:position', function () {
    const coordinates = geolocation.getPosition();
    defaultCenter = coordinates
    positionFeature.setGeometry(
        coordinates
            ? new ol.geom.Point(coordinates)
            : null
    );
    viewCenterAnimation(coordinates)
});

new ol.layer.Vector({
    map: map,
    source: new ol.source.Vector({
        features: [accuracyFeature, positionFeature, iconFeature],
    }),
});