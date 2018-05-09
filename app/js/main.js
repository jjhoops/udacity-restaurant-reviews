let restaurants,
  neighborhoods,
  cuisines;
var map;
var markers = [];
let firstLoad = true;
let liveMap = false;

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener("DOMContentLoaded", event => {
  //updateRestaurants();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) {
      // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById("neighborhoods-select");
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement("option");
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById("cuisines-select");

  cuisines.forEach(cuisine => {
    const option = document.createElement("option");
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  console.log("initMap");
  updateRestaurants();
  DBHelper.nextPending();
};

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
  const cSelect = document.getElementById("cuisines-select");
  const nSelect = document.getElementById("neighborhoods-select");

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;
  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  });
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = restaurants => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById("restaurants-list");
  ul.innerHTML = "";

  // Remove all map markers
  self
    .markers
    .forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const switchToLiveMap = event => {
  updateRestaurants();
  if (liveMap)
    return;

  document
    .getElementById("mapImg")
    .remove();

  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google
    .maps
    .Map(document.getElementById("map"), {
      zoom: 12,
      center: loc,
      scrollwheel: false
    });

  liveMap = true;
};

const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById("restaurants-list");
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  if (firstLoad) {
    fetchNeighborhoods();
    fetchCuisines();
    const mapURL = DBHelper.getStaticAllRestaurantsMapImage(self.restaurants);
    const mapDiv = document.getElementById("map");
    const mapImg = document.createElement("img");
    mapImg.id = "mapImg";
    mapImg.onclick = e => switchToLiveMap();
    mapImg.src = mapURL;
    mapDiv.append(mapImg);

    firstLoad = false;
  } else {
    addMarkersToMap();
  }
};

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = restaurant => {
  const li = document.createElement("li");

  const image = document.createElement("img");
  image.className = "restaurant-img";
  const imgurlbase = DBHelper.imageUrlForRestaurant(restaurant, "tiles");
  const imgurl1x = imgurlbase + "_1x.jpg";
  const imgurl2x = imgurlbase + "_2x.jpg";
  image.src = imgurl1x;
  image.srcset = `${imgurl1x} 300w, ${imgurl2x} 600w`;
  image.alt = restaurant.name + " restaurant promotional image";
  li.append(image);

  const div = document.createElement("div");
  div.className = "restaurant-text-area";
  li.append(div);

  const name = document.createElement("h2");
  name.innerHTML = restaurant.name;
  div.append(name);

  console.log("is_favorite: ", restaurant["is_favorite"]);
  const isFavorite = (restaurant["is_favorite"] && restaurant["is_favorite"].toString() === "true") ? true : false;
  const favoriteDiv = document.createElement("div");
  favoriteDiv.className = "favorite-icon";
  const favorite = document.createElement("button");
  favorite.style.background = isFavorite
    ? `url("/icons/002-like.svg") no-repeat`
    : `url("icons/001-like-1.svg") no-repeat`;
  favorite.innerHTML = isFavorite
    ? restaurant.name + " is a favorite"
    : restaurant.name + " is not a favorite";
  favorite.id = "favorite-icon-" + restaurant.id;
  favorite.onclick = event => handleFavoriteClick(restaurant.id, !isFavorite);
  favoriteDiv.append(favorite);
  div.append(favoriteDiv);

  const neighborhood = document.createElement("p");
  neighborhood.innerHTML = restaurant.neighborhood;
  div.append(neighborhood);

  const address = document.createElement("p");
  address.innerHTML = restaurant.address;
  div.append(address);

  const more = document.createElement("button");
  more.innerHTML = "View Details";
  more.onclick = function () {
    const url = DBHelper.urlForRestaurant(restaurant);
    window.location = url;
  };
  div.append(more);

  return li;
};

const handleFavoriteClick = (id, newState) => {
  // Update properties of the restaurant data object
  const favorite = document.getElementById("favorite-icon-" + id);
  const restaurant = self
    .restaurants
    .filter(r => r.id === id)[0];
  if (!restaurant)
    return;
  restaurant["is_favorite"] = newState;
  favorite.onclick = event => handleFavoriteClick(restaurant.id, !restaurant["is_favorite"]);
  DBHelper.handleFavoriteClick(id, newState);
};

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google
      .maps
      .event
      .addListener(marker, "click", () => {
        window.location.href = marker.url;
      });
    self
      .markers
      .push(marker);
  });
};
