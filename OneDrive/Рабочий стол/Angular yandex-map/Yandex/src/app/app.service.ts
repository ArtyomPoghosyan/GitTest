import { environment } from './../environments/environment';
import { Injectable } from "@angular/core";
import {HttpClient} from "@angular/common/http"

@Injectable()
export class AppService{

    private _api_url = environment.api_url;

    constructor(
        private http:HttpClient
    ){}

    public postDriverLifeLocation(location:any){
        console.log(location);
        console.log(`${this._api_url}driver/driver-location`);
        
        return this.http.post(`${this._api_url}driver/driver-location`,location)
    }
}