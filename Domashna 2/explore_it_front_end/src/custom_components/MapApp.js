import React from 'react';
import {POI} from './POI'
import '../custom_css/Map.css';
import * as L from 'leaflet/dist/leaflet-src'
import '../myIcon.png'
import 'leaflet/dist/leaflet.css'
import i18next, {t} from "i18next";
import {Cookies} from "react-cookie";
import 'bootstrap/dist/css/bootstrap.min.css';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Button from 'react-bootstrap/Button';
import {ToggleButton} from "react-bootstrap";

export class MapApp extends React.Component {

    constructor() {
        super(undefined);

        this.state = {
            poi_elements: [], map_view: null, defaultIcon: new L.Icon({
                iconUrl: require("../myIcon.png"), iconSize: [50, 50], iconAnchor: [25, -10],
            }), userLocationIcon: new L.Icon({
                iconUrl: require("leaflet/dist/images/marker-icon-2x.png"), iconSize: [20, 30]
            }), defaultCoordinates: {
                latitude: 41.99591947737088, longitude: 21.431464162426444
            }, markerLayer: null, userMarker: null, language: "", atms: false, catering: false
        }
    }

    addPoiElement(jsonElement) {
        let temp_array = this.state.poi_elements;
        temp_array.push(new POI(jsonElement));

        this.setState({
            poi_elements: temp_array
        });
    }

    fill_state_with_results(query) {
        // Store API result in browser storage or cookies?
        this.setState({poi_elements: []});
        return fetch(`http://localhost:8080/api/location/${query}`)
            .then(object_array => {
                console.log(`Promise for ${query} resolved`)
                return object_array.json();
            }, () => {
                console.log(`Promise for ${query} rejected`)
                return Promise.reject();
            })
            .then(el => {
                for (let i = 0; i < el.length; i++) this.addPoiElement(el[i]);
            });
    }

    componentDidMount() {
        this.setState({

            map_view: new L.Map('map', {
                center: [this.state.defaultCoordinates.latitude, this.state.defaultCoordinates.longitude], zoom: 12
            }).addLayer(L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
               maxZoom: 20, attribution: '© <a href="https://stadiamaps.com/">Stadia Maps</a>'
            }))
        });

        if (navigator.geolocation) {
            navigator.permissions
                .query({name: "geolocation"})
                .then((result) => {
                    console.log("Result: " + result.state);
                    if (result.state === "granted" || result.state === "prompt") {
                        this.positionMarker();
                    } else if (result.state === "denied") {
                        console.log("geolocation denied.")
                    }
                }, () => {
                    console.log("geolocation promise rejected");
                });
        }

        let tempCookie = new Cookies().get("lang");
        if (tempCookie === undefined) {
            new Cookies().set("lang", "mk");
            tempCookie = "mk";
        }

        this.changeLanguage(tempCookie)

    }

    positionMarker() {

        let options = {
            enableHighAccuracy: true, timeout: 5000, maximumAge: 0,
        };

        navigator.geolocation.getCurrentPosition((position) => {
            this.setUserLocation(position);
            console.log(position)
        }, () => {
            console.log("error prompt geolocation")
        }, options);

    }

    setUserLocation(position) {
        this.setState({
            defaultCoordinates: {
                latitude: position.coords.latitude, longitude: position.coords.longitude
            }
        }, () => {
            this.resetUserMarker();
        });
    }

    resetUserMarker() {
        this.setState({
            userMarker: new L.Marker([this.state.defaultCoordinates.latitude, this.state.defaultCoordinates.longitude], {icon: this.state.userLocationIcon})
                .bindPopup(t("user_position"), {offset: [0, -10]})
        }, () => {
            this.state.userMarker.addTo(this.state.map_view);
            this.flyToDefaultPosition();
        })
    }

    flyToDefaultPosition() {
        this.state.map_view.flyTo(new L.LatLng(this.state.defaultCoordinates.latitude, this.state.defaultCoordinates.longitude))
    }

    removeMarkers() {
        if (this.state.markerLayer !== null) this.state.map_view.removeLayer(this.state.markerLayer);
        this.setState({
            poi_elements: [], markerLayer: null
        })
    }

    addMarkersToMap(icon) {
        let d_icon = icon;
        let temp_Layer = L.layerGroup().addTo(this.state.map_view);
        this.state.poi_elements.forEach((poi) => {
            let poiLat = poi.getLatitude();
            let poiLon = poi.getLongitude();
            let poiName = poi.getName();
            let poiType = poi.getType();
            let p_type = t('type');
            let p_id = t('id');

            let poiId = poi.getId();
            new L.Marker([poiLat, poiLon], {icon: d_icon})
                .bindPopup(`<h3>${poiName}</h3><p>${p_type}: ${poiType}</p><p>${p_id}: ${poiId}</p>`)
                .addTo(temp_Layer);
        })
        this.setState({markerLayer: temp_Layer});
    }

    changeLanguage(desiredLang) {
        if (this.state.language !== desiredLang) {
            i18next.changeLanguage(desiredLang).then(r => {
                this.setState({language: desiredLang})
                new Cookies().set("lang", desiredLang, {maxAge: 3600});
            });
        }
    }

    reloadMap() {
        this.resetUserMarker();
        if (this.state.markerLayer !== null) {
            this.state.map_view.removeLayer(this.state.markerLayer);
            this.addMarkersToMap(this.state.defaultIcon);
        }
    }

    showAtms() {
        this.removeMarkers();
        this.flyToDefaultPosition();
        this.fill_state_with_results("atms")
            .then(() => {
                // atms promise is resolved.
                this.addMarkersToMap(this.state.defaultIcon);
            }, () => {
                // atms promise is not resolved.
                alert("Atms - API Call failed.")
            });
    }

    showCatering() {
        this.removeMarkers();
        this.flyToDefaultPosition();
        this.fill_state_with_results("caterings")
            .then(() => {
                this.addMarkersToMap(this.state.defaultIcon);
                this.setState({caterings: true});
            }, () => {
                alert("Caterings - API Call Failed.");
            });
    }

    showFoodshops() {
        this.removeMarkers();
        this.flyToDefaultPosition();
        this.fill_state_with_results("foodshops")
            .then(() => {
                // atms promise is resolved.
                this.addMarkersToMap(this.state.defaultIcon);
            }, () => {
                // atms promise is not resolved.
                alert("Foodshops - API Call failed.")
            });
    }

    showHotels() {
        this.removeMarkers();
        this.flyToDefaultPosition();
        this.fill_state_with_results("hotels")
            .then(() => {
                // atms promise is resolved.
                this.addMarkersToMap(this.state.defaultIcon);
            }, () => {
                // atms promise is not resolved.
                alert("Hotels - API Call failed.")
            });
    }

    showPubs() {
        this.removeMarkers();
        this.flyToDefaultPosition();
        this.fill_state_with_results("pubs")
            .then(() => {
                // atms promise is resolved.
                this.addMarkersToMap(this.state.defaultIcon);
            }, () => {
                // atms promise is not resolved.
                alert("Pubs - API Call failed.")
            });
    }

    render() {
        return (
            <div id="main">
                <h2 id="title">Explore IT</h2>
                <ButtonGroup className="button_container">
                    <ToggleButton value="mk"
                                  type="radio"
                                  variant="outline-dark"
                                  onClick={() => {
                                      this.changeLanguage("mk");
                                      this.reloadMap();
                                  }}
                                  checked={new Cookies().get("lang") === "mk"}
                    >{t('mkd_lang_button')}
                    </ToggleButton>

                    <ToggleButton
                        value="en"
                        type="radio"
                        variant="outline-dark"
                        onClick={() => {
                            this.changeLanguage("en");
                            this.reloadMap();
                        }}
                        checked={new Cookies().get("lang") === "en"}
                    >{t('eng_lang_button')}
                    </ToggleButton>

                    <ToggleButton
                        value="al"
                        type="radio"
                        variant="outline-dark"
                        onClick={() => {
                            this.changeLanguage("al");
                            this.reloadMap();
                        }}
                        checked={new Cookies().get("lang") === "al"}
                    >{t('alb_lang_button')}
                    </ToggleButton>

                </ButtonGroup>
                <br/>
                <ButtonGroup className="button_container" id="poi_button_container">

                    <Button variant="outline-dark" onClick={() => {
                        this.showAtms()
                    }}>{t("show_atms")}</Button>

                    <Button variant="outline-dark" onClick={() => {
                        this.showCatering()
                    }}>{t("show_caterings")}</Button>

                    <Button variant="outline-dark" onClick={() => {
                        this.showFoodshops()
                    }}>{t("show_foodshops")}
                    </Button>

                    <Button variant="outline-dark" onClick={() => {
                        this.showHotels()
                    }}>{t("show_hotels")}</Button>

                    <Button variant="outline-dark" onClick={() => {
                        this.showPubs()
                    }}>{t("show_pubs")}</Button>

                </ButtonGroup>
                <br/>
                <Button variant="danger" id="clearMapButton" onClick={() => {
                    this.removeMarkers();
                }}>Исчисти мапа</Button>
                <div id="map"></div>
            </div>)
    }
}



