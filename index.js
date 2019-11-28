var map;
var placeSearch;
var autocomplete;
var poly;

/**
 * @typedef {Object} DBObject
 * @property {string} [street_number]
 * @property {string} [route]
 * @property {string} [locality]
 * @property {string} [administrative_area_level_1]
 * @property {string} [country]
 * @property {string} [postal_code]
 */

/**
 * @returns {DBObject}
 */
function compToDBObject(components) {
  var componentForm = {
    street_number: "short_name",
    route: "long_name",
    locality: "long_name",
    administrative_area_level_2: "short_name",
    administrative_area_level_1: "short_name",
    country: "long_name",
    postal_code: "short_name",
  };
  var result = {};
  for (var i = 0; i < components.length; i++) {
    var addressType = components[i].types[0];
    if (componentForm[addressType]) {
      var val = components[i][componentForm[addressType]];
      result[addressType] = val;
    }
  }
  return result;
}

function url(q) {
  return [
    "https://nominatim.openstreetmap.org/search.php?q=",
    q,
    "&polygon_geojson=1&format=json",
  ].join("");
}

function makePoly(data) {
  var paths = new Array();
  for (var i = 0; i < data.length; i++) {
    paths[i] = new google.maps.LatLng(data[i][1], data[i][0]);
  }
  return new google.maps.Polygon({
    paths: paths,
    strokeColor: "#6666FF",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: "#6666FF",
    fillOpacity: 0.35,
  });
}

/**
 * @param {DBObject} dbObj
 */
function getPoly(query) {
  console.log("query >>>", url(query));
  return fetch(url(query))
    .then(res => res.json())
    .then(json => {
      // Check the response json
      // then get the item that has longes long lat list
      var data = json.reduce((acc, cur) => {
        const c = cur.geojson.coordinates[0];
        if (!c.length) {
          return acc;
        }
        if (!acc) {
          return c;
        }
        if (acc.length < c.length) {
          acc = c;
        }
        return acc;
      }, null);
      return makePoly(data);
    });
}

function initAutocomplete() {
  autocomplete = new google.maps.places.Autocomplete(
    document.getElementById("autocomplete"),
    { types: ["geocode"] }
  );
  // address_component for street_number, city, country, etc
  // geometry for the bound object
  autocomplete.setFields(["address_component", "geometry"]);
  autocomplete.addListener("place_changed", handlePlaceChanged);
}

function handlePlaceChanged() {
  var place = autocomplete.getPlace();
  var padding = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  map.fitBounds(place.geometry.viewport, padding);
  console.log("place >>>", place.address_components);
  const dbObj = compToDBObject(place.address_components);
  document.querySelector("#dbObj").innerText = JSON.stringify(dbObj, null, 2);
  var query = document.querySelector("#autocomplete").value
  getPoly(query).then(pl => {
    if (poly) {
      poly.setMap(null);
    }
    poly = pl;
    poly.setMap(map);
  });
}
/**
 * If user grant location permission, get the current location of user
 * for the autocomplete reference
 */
function geolocate() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var geolocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      var circle = new google.maps.Circle({
        center: geolocation,
        radius: position.coords.accuracy,
      });
      autocomplete.setBounds(circle.getBounds());
    });
  }
}

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    // Default: Ho chi minh city
    center: { lat: 10.6497452, lng: 106.761979373444 },
    zoom: 8,
  });
  initAutocomplete();
  document.querySelector("#loading").classList.add("hidden");
}
