import { AppService } from './app.service';
import { Component, OnInit } from '@angular/core';
import { map } from 'rxjs';
import { io } from "socket.io-client";
import * as $ from "jquery";

declare var ymaps: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Yandex';

  public myPlacemark: any;
  public currentPlaceLocation: any;
  public searchData: any;
  public coordinates: any;
  public myMap: any;
  public mySearchControl: any;
  public currentPlace: any
  public detectMyCurrentPlaceLocaion: [] = [];
  public from: any
  public from_location: {} = {}
  public to: any;
  public to_location: {} = {};
  public control: any;
  public getDistanceTime: any;
  public multiRoutePromise: any;
  public socket: any;
  public socketObj = {}
  public gettrip: any = []
  public currentlocation: any;
  public address: any
  public mobilelog: any = {}
  public driverlocation: any;
  public clientLifeLocation: any[] = [];
  public isActiveSearch: boolean = false;
  public drivers: any = []
  public driversData: any
  public currentDriverPlace:any;
  public fff:any
  public life:any[]=[]
  constructor(
    private _appService: AppService
  ) {
    this._inItYandexMap = this._inItYandexMap.bind(this);

  }

  public ngOnInit(): void {
    ymaps.ready(this._inItYandexMap)
    this.lifeGeoLocation();
    this.watchPosition();
    this.watchDriverPosition()
    this.socketConnectionOnMessage();

  }

  public socketConnectionOnMessage(): void {
    if (this.socket) return;
    this.socket = io("ws://localhost:80");
    this.socket.on("onMessage", (arg: any) => {
      if (this.isActiveSearch) {
        console.log(arg);
        this.driverlocation = arg.content.driverstartLocation
        const latitude = arg?.content?.driverstartLocation[0].latitude;
        const longitude = arg?.content?.driverstartLocation[0].longitude;
        this._placemarkDriver([latitude, longitude])
      }
    })
  }

  public watchDriverPosition(): void {
    let desLat = 0;
    let desLot = 0;
    let id = navigator.geolocation.watchPosition((driverlocation) => {      
      let latitude = driverlocation.coords.latitude
      let longitude = driverlocation.coords.longitude
      this.mobilelog = {
        latitude: driverlocation.coords.latitude,
        longitude: driverlocation.coords.longitude
      }
      let y = [latitude, longitude]
      this.life=y
      console.log(y);

      if (this.myPlacemark) {
        this.myPlacemark.geometry.setCoordinates(y);
        ymaps.DriverPlacemark(y)
      } else {
        this.myPlacemark = this._createDriverPlacemark(y);
        this.myMap.setCenter(y);
        this.myMap.geoObjects.add(this.myPlacemark);
        this.myPlacemark.events.add('dragend', () => {
          this._getAddress(this.myPlacemark.geometry.getCoordinates());
        });
      }
      this._getAddress(y);
      if (driverlocation.coords.latitude == desLat) {
        navigator.geolocation.clearWatch(id);
      }
    }, (error) => {
      console.log(error)
    }, {
      enableHighAccuracy: true,
      timeout: 100,
      maximumAge: 0
    })
  }

  public lifeGeoLocation(): void {
    if (!navigator.geolocation) {
      alert("location is not supported")
    }
    navigator.geolocation.getCurrentPosition((position) => {})
  }

  public watchPosition(): void {
    let desLat = 0;
    let desLot = 0;
    let id = navigator.geolocation.watchPosition((position) => {
      let latitude = position.coords.latitude
      let longitude = position.coords.longitude
      console.log(latitude,longitude);
      
      this.mobilelog = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }
      
      let y = [latitude, longitude]
      this.clientLifeLocation = y
      console.log(this.clientLifeLocation,"clientLifeLocation");
      
      if (this.myPlacemark) {
        this.myPlacemark.geometry.setCoordinates(y);
        ymaps.Placemark(y)
      } else {
        this.myPlacemark = this._createPlacemark(y);
        this.myMap.setCenter(y);
        this.myMap.geoObjects.add(this.myPlacemark);
        this.myPlacemark.events.add('dragend', () => {
          this._getAddress(this.myPlacemark.geometry.getCoordinates());
        });
      }
      this._getAddress(y);
      if (position.coords.latitude == desLat) {
        navigator.geolocation.clearWatch(id);
      }
    }, (error) => {
      console.log(error)
    }, {
      enableHighAccuracy: true,
      timeout: 100,
      maximumAge: 0
    })
  }

  private _inItYandexMap(): void {
    let latitudes = this.mobilelog.latitude;
    let longitudes = this.mobilelog.longitude;

    // CONNECTION TO MAP
    var geolocation = ymaps.geolocation;
    this.myMap = new ymaps.Map('information_map', {
      center: [latitudes, longitudes],
      zoom: 9,
      controls: ["routePanelControl"]
    }, {
      searchControlProvider: 'yandex#search'
    });
    this.control = this.myMap.controls.get('routePanelControl');
    // this.multiRoutePromise = this.control.routePanel.getRouteAsync(); // kaput keteric mekne hanum cuyc chi talis

    //Placemark from to 
    var multiRoutePromise = this.control.routePanel.getRouteAsync();
    multiRoutePromise.then(function (multiRoute: any) {
      multiRoute.options.set({
        wayPointVisible: false,
      });
    }, function (err: any) {
      console.log(err);
    });

    //ORDER TAXI

    var geolocationControl = new ymaps.control.GeolocationControl({
      data: { content: 'Order a Taxi ', image: 'none' },
      options: { noPlacemark: true, maxWidth: [30, 100, 100], position: { left: 10, top: 650 } }
    });
    this.myMap.controls.add(geolocationControl);
    geolocationControl.events.add('locationchange', (e: any) => {
      let latitude = this.mobilelog.latitude;
      let longitude = this.mobilelog.longitude;


      this._addMarker({ latitude, longitude });
      this.currentlocation = { latitude, longitude }
      this.myMap.panTo([latitude, longitude]);
      this.detectMyCurrentPlaceLocaion = e.get('position')
      ymaps.geocode(this.detectMyCurrentPlaceLocaion).then((res: any) => {
        this.from = res.geoObjects.get(0).properties._data.text;
        console.log(this.from);

        this.from_location = {
          form: this.from,
          latitude,
          longitude
        }
        // this.gettrip = [...this.gettrip, this.from_location]
        // this.socket.emit("location", {
        //   from: {
        //     form: this.from,
        //     latitude,
        //     longitude
        //   }
        // })
        this.control.routePanel.state.set({
          from: this.from,
        })
      })




    })

    //Get My current Location BUTTON
    var geolocationControl = new ymaps.control.GeolocationControl({
      data: { content: 'Client place', image: 'none' },
      options: { noPlacemark: true, maxWidth: [30, 100, 150], position: { left: 120, top: 650 } }
    });
    this.myMap.controls.add(geolocationControl);
    geolocationControl.events.add('locationchange', (e: any) => {
      let latitude = this.mobilelog.latitude;
      let longitude = this.mobilelog.longitude;

      this._addMarker({ latitude, longitude });
      this.currentlocation = { latitude, longitude }
      this.myMap.panTo([latitude, longitude]);
      this.detectMyCurrentPlaceLocaion = e.get('position')
      ymaps.geocode(this.detectMyCurrentPlaceLocaion).then((res: any) => {
        this.from = res.geoObjects.get(0).properties._data.text;
        console.log(this.from);

        this.from_location = {
          form: this.from,
          latitude,
          longitude
        }
        this.gettrip = [...this.gettrip, this.from_location]
        // this.socket.emit("location", {
        //   from: {
        //     form: this.from,
        //     latitude,
        //     longitude
        //   }
        // })
        this.control.routePanel.state.set({
          from: this.from,
        })
      })
    });

    var geolocationControl = new ymaps.control.GeolocationControl({
      data: { content: 'Driver place', image: 'none' },
      options: { noPlacemark: true, maxWidth: [30, 100, 150], position: { left: 240, top: 650 } }
    });
    this.myMap.controls.add(geolocationControl);
    geolocationControl.events.add('locationchange', (e: any) => {
      let latitude = this.mobilelog.latitude;
      let longitude = this.mobilelog.longitude;

      this._addMarker({ latitude, longitude });
      this.currentlocation = { latitude, longitude }
      this.myMap.panTo([latitude, longitude]);
      this.detectMyCurrentPlaceLocaion = e.get('position')
      ymaps.geocode(this.detectMyCurrentPlaceLocaion).then((res: any) => {
        this.from = res.geoObjects.get(0).properties._data.text;
        console.log(this.from);

        // let driversData = {
        //   type: 'Point',
        //   coordinates: [40.81414494941479, 43.845233759277335]
        // }

        this.radius(latitude, longitude, [latitude, longitude])
        this.from_location = {
          form: this.from,
          latitude,
          longitude
        }
        // this._appService.postDriverLifeLocation(this.from_location)
        this.gettrip = [...this.gettrip, this.from_location]
        let driverstartLocation = this.gettrip
        setInterval(() => {
          this.socket.emit("location", {
            driverstartLocation
          })
          this.watchDriverPosition()
          this.isActiveSearch = true
        }, 3000)
        this.isActiveSearch = false
        this.control.routePanel.state.set({
          from: this.from,
        })
      })
    });

    // Get GeoCoordinates where clicked

    this.myMap.events.add('click', (e: any) => {
      const [latitude, longitude] = e.get('coords');


      // this._placemark(e.get('coords'))
      ymaps.geocode(e.get('coords')).then((res: any) => {
        this.to = res.geoObjects.get(0).properties._data.text
        this.control.routePanel.state.set({
          to: this.to
        })

        this.to_location = {
          to: this.to,
          latitude,
          longitude
        }
        console.log(latitude,
          longitude);

        this.gettrip = [...this.gettrip, this.to_location]
        // this.socket.emit("location", {
        //   to: {
        //     to: this.to,
        //     latitude,
        //     longitude
        //   }
        // })
      })
    })
    if (!this.myPlacemark) {
    }
    else {
      this.myMap.geoObjects.add(this.myPlacemark)
    }

    let self = this;
    this.multiRoutePromise?.then((multiRoute: any) => {
      let distance: any;
      let duration: any;

      multiRoute.model.events.add('requestsuccess', function () {
        let activeRoute = multiRoute.getActiveRoute();

        if (activeRoute) {
          let road: {}
          distance = activeRoute.properties.get("distance").text;
          duration = activeRoute.properties.get("duration").text
          road = {
            distance,
            duration
          }
          self.gettrip = [...self.gettrip, road]
          let tripData = self.gettrip
          self.socket.emit("location", {
            tripData
          })
          // console.log(self.gettrip)
          // console.log(tripData,"tripdata")
        }
      });
    }, (err: any) => {
      console.log(err);
    })

    //Get geoLocation via Browser
    geolocation.get({
      provider: 'browser',
      mapStateAutoApply: true
    }).then((result: any) => {
      var userAddress = result.geoObjects.get(0).properties.get('text');
      var userCoodinates = result.geoObjects.get(0).geometry.getCoordinates();
      result.geoObjects.options.set('preset', 'islands#blueCircleIcon');
      this.myMap.geoObjects.add(result.geoObjects)
    })
    self.socket.emit("location", {

    })
  }

  private _placemark(coords: any) {
    // this.myPlacemark = new ymaps.Placemark(coords)
    console.log(coords);

    // this.myMap.geoObjects.add(this.myPlacemark)
    this.currentPlace = coords    
    var placemark = new ymaps.Placemark(this.currentPlace, {
      // iconCaption: 'searching...'
    }, {
      draggable: true,
      iconLayout: 'default#imageWithContent',
      iconImageHref: './assets/img/pin.png',
      iconImageSize: [42, 54],
      iconImageOffset: [-20, -50,],
      iconContentOffset: [15, 15],
    })
    console.log(placemark);

    return placemark;
  }

  private _placemarkDriver(coords: any) {
    console.log(coords);
    
    this.currentDriverPlace = coords
    var DriverPlacemark = new ymaps.Placemark(this.currentDriverPlace, {
      
    }, {
      draggable: true,
      iconLayout: 'default#imageWithContent',
      iconImageHref: './assets/img/car.png',
      iconImageSize: [30, 42],
      iconImageOffset: [-20, -50,],
      iconContentOffset: [15, 15],
    })
    console.log(DriverPlacemark);
    // this.myMap.geoObjects.add(DriverPlacemark)

    return DriverPlacemark;
  }

  private _addMarker(coordinates: { latitude: number, longitude: number }): void {
    const { latitude, longitude } = coordinates;
    this.coordinates = [latitude, longitude]
    const coords = [latitude, longitude];

    if (this.myPlacemark) {
      this.myPlacemark.geometry.setCoordinates(coords);
    } else {
      this.myPlacemark = this._createPlacemark(coords);
      this.myMap.setCenter(coords);
      this.myMap.geoObjects.add(this.myPlacemark);
      // this.myPlacemark.events.add('dragend', () => {
      //   this._getAddress(this.myPlacemark.geometry.getCoordinates());
      // });
    }
    // this._getAddress(coords);
  }

  private _createPlacemark(coords: any) {
    return this._placemark(coords)
  }
  private _createDriverPlacemark(coords: any) {
    return this._placemarkDriver(coords)
  }

  private _getAddress(coords: any) {
    this.myPlacemark.properties.set('iconCaption', 'searching...');
    ymaps.geocode(coords).then((res: any) => {
      var firstGeoObject = res.geoObjects.get(0);
      this.myPlacemark.properties
        .set({
          iconCaption: [
            firstGeoObject.getLocalities().length ? firstGeoObject.getLocalities() : firstGeoObject.getAdministrativeAreas(),
            firstGeoObject.getThoroughfare() || firstGeoObject.getPremise()
          ].filter(Boolean).join(', '),
          balloonContent: firstGeoObject.getAddressLine()
        });
    });
  }

  public radius(latitude: any, longitude: any, coords: any): void {
    var myCircle = new ymaps.Circle([
      [latitude, longitude],
      500
    ], {
      draggable: true,
      fillColor: "#DB709377",
      strokeColor: "#990066",
      strokeOpacity: 0.8,
      strokeWidth: 5
    })
    this.myMap.geoObjects.add(myCircle);
    console.log(coords)
    this.drivers = [
      {
        type: 'Point',
        coordinates: coords
      },
      // {
      //   type: 'Point',
      //   coordinates: [40.78755006966454, 43.849932989471405]
      // },
      // {
      //   type: 'Point',
      //   coordinates: [40.79110639104804, 43.84275405704307]
      // }
    ]

    console.log(this.drivers, "555666");

    let objects = ymaps.geoQuery(this.drivers)
      .addToMap(this.myMap)
    console.log(objects, "11111111111")
    //   circle = new ymaps.Circle([[latitude, longitude], 10000], null, { draggable: true });
    var objectsInsideCircle = objects.searchInside(myCircle);
    objectsInsideCircle.setOptions('preset', 'islands#redIcon');
    objects.remove(objectsInsideCircle).setOptions('preset', 'islands#blueIcon')
  }

}
