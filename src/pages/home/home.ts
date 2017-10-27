import { Component, ViewChild, ElementRef } from '@angular/core';
import { NavController } from 'ionic-angular';
import { RestProvider } from '../../providers/rest/rest';
import { ModalController } from 'ionic-angular';
import { ModalPage } from '../modal/modal';
import { Geolocation } from '@ionic-native/geolocation';

declare var google: any;

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  chargingLocations: any;
  errorMessage: string;
  @ViewChild('map') mapRef: ElementRef;
  map: any;
  markers: any = [];
  connectorTypesFilters: string[] = [];
  connectorTypesSelected: string = '';
  addresses: string[] = [];
  directionsService = new google.maps.DirectionsService;
  directionsDisplay = new google.maps.DirectionsRenderer;
  currentPostition: any;

  constructor(public navCtrl: NavController, public rest: RestProvider, public modalCtrl: ModalController, public geolocation: Geolocation) {

  }

  ionViewDidLoad() {
    this.getChargingLocations();
  }

  getChargingLocations() {
    this.rest.getChargingLocations()
       .subscribe(
        chargingLocations => {
          this.chargingLocations = chargingLocations;
          this.geolocation.getCurrentPosition().then((resp) => {
            console.log(resp);
            this.currentPostition = new google.maps.LatLng(resp.coords.latitude, resp.coords.longitude);
          });
          this.showMap();
        },
         error =>  this.errorMessage = <any>error);
  }

  showMap() {
    let location: any = new google.maps.LatLng(55.86515, -4.25763);

    let options: any = {
      center: location,
      zoom: 14
    }
    this.map = new google.maps.Map(this.mapRef.nativeElement, options);
    this.directionsDisplay.setMap(this.map);
    this.loadMarkers();
  }

  loadMarkers() {
    this.chargingLocations.forEach(x => {
      if (!x.SubscriptionRequiredFlag) {
        let a24H: string = '';
        let connectorsTypes: string = '';
        let address: string = 'No address registered';
        let paymentDetails: string = 'No payment details registered';
        if (x.Accesible24Hours) {
          a24H = 'Yes';
        } else {
          a24H = 'No';
        }
        for (var index = 0; index < x.Connector.length; index++) {
          if (index !== 0) {
            if (connectorsTypes.indexOf(x.Connector[index].ConnectorType) === -1) {
              connectorsTypes += ', ' + x.Connector[index].ConnectorType;
              if (this.connectorTypesFilters.indexOf(x.Connector[index].ConnectorType) === -1) {
                this.connectorTypesFilters.push(x.Connector[index].ConnectorType);
              }
            }
          } else {
            connectorsTypes += x.Connector[index].ConnectorType;
          }
        }
        if (x.ChargeDeviceLocation.Address.Street !== '') {
          address = x.ChargeDeviceLocation.Address.Street + ', ' + x.ChargeDeviceLocation.Address.PostTown + ' ' + x.ChargeDeviceLocation.Address.PostCode;
          if(this.addresses.indexOf(address) === -1) {
            this.addresses.push(address);
          }
        }
        if (x.PaymentDetails !== '') {
          paymentDetails = x.PaymentDetails;
        }

    let markerPos = new google.maps.LatLng(x.ChargeDeviceLocation.Latitude, x.ChargeDeviceLocation.Longitude);
     var marker = new google.maps.Marker({
      map: this.map,
      animation: google.maps.Animation.DROP,
      position: markerPos,
      connectors: connectorsTypes,
      address: address
        
    });  
    var infoWindowContent = `
      <h4>${x.ChargeDeviceName}</h1>
      <div>
        <p><b>Addres:</b> ${address}</p>
        <p><b>Accesibility 24 Hours:</b> ${a24H}</p>
        <p><b>Connectors type:</b> ${connectorsTypes}</p>
        <p><b>Payment Details:</b> ${paymentDetails}</p>
      </div>
      `;
      this.addInfoWindow(marker, infoWindowContent, x);
      this.markers.push(marker);
      }
    });
  }

  public filterMarkers(connectorType) {
    this.markers.forEach(x => {
      if (x.connectors.indexOf(connectorType) !== -1) {
        x.setVisible(false);
      } else {
        x.setVisible(true);
      }
    });
  }

  addInfoWindow(marker, message, x) {
    var infoWindow = new google.maps.InfoWindow({
      content: message
  });

  google.maps.event.addListener(marker, 'click', function () {
      infoWindow.open(this.map, marker);
  });
  }

  openModal() {
    let modal = this.modalCtrl.create(ModalPage, this.addresses);

    modal.onDidDismiss(data => {
      if (data !== '' && data !== undefined) {
        this.getSearchedItem(data);
        this.calculateAndDisplayRoute(data);
      }
    });

    modal.present();
  }

  getSearchedItem(data) {
    this.markers.forEach(x => {
      if (x.address.indexOf(data) === -1) {
        x.setVisible(false);
      } else {
        x.setVisible(true);
      }
    });
  }

  clearAll() {
    this.markers.forEach(x => {
        x.setVisible(true);
    });
    this.connectorTypesSelected = '';
  }

  calculateAndDisplayRoute(data) {
    let destination: any = this.markers.find(x => x.address === data).position;
    this.map.setCenter(this.currentPostition);
    this.directionsService.route({
      origin: this.currentPostition,
      destination: destination,
      travelMode: 'DRIVING'
    }, (response, status) => {
      if (status === 'OK') {
        this.directionsDisplay.setDirections(response);
      } else {
        window.alert('Directions request failed.');
      }
    });
  }

}
